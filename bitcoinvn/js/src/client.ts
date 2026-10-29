import axios, { type AxiosInstance, type AxiosProxyConfig, type AxiosRequestConfig } from "axios";

import {
  BitcoinVnError,
  BitcoinVnTimeoutError,
  BitcoinVnTransportError,
  errorFromBody,
  headerNumber,
} from "./errors.js";
import type {
  AddressValidation,
  BalanceHistoryParams,
  Balances,
  BitcoinVnOptions,
  BooleanConfiguration,
  CreateOrderParams,
  CreateQuoteParams,
  EnsResolution,
  HealthStatus,
  Info,
  LedgerItem,
  ListAllLedgerParams,
  ListAllOrdersParams,
  ListOrdersParams,
  Order,
  OrderSettleData,
  OrderStatus,
  Pair,
  Quote,
  RateLimit,
  SettleDataCorrection,
  SubmitDepositParams,
  SwapOptions,
  Ticker,
  Vault,
  WaitForOrderParams,
} from "./types.js";
import { readWebhook, verifyWebhookSignature, type WebhookRead } from "./webhook.js";

const DEFAULT_BASE_URL = "https://bitcoinvn.io";
const USER_AGENT = "bitcoinvn/0.1.0";

/** Orders returned by one `GET /api/orders` page. */
export const ORDERS_PAGE_SIZE = 10;

/** Ledger rows returned by one `GET /api/balances/history` page. */
export const LEDGER_PAGE_SIZE = 25;

/** Statuses that stop `waitForOrder` when the caller does not pass `statuses`. */
export const DEFAULT_WAIT_STATUSES: readonly OrderStatus[] = [
  "completed",
  "canceled",
  "settle_data_error",
];

/** Documented order states. */
export const ORDER_STATUSES: readonly OrderStatus[] = [
  "new",
  "pending",
  "settle_data_error",
  "on_hold",
  "processing",
  "completed",
  "canceled",
];

/** @internal */
export const REFERRER = "35b2eec68a1741ac";

/**
 * Client for the BitcoinVN exchange API.
 *
 * Public reads, quotes, and order creation do not need a key. Send `X-API-KEY`
 * by passing `apiKey` when you call an account endpoint. The key is created on
 * the API keys page at bitcoinvn.io. This client does not manage keys.
 *
 * `createOrder`, `fixedSwap`, and `variableSwap` always send `referrer` in the
 * JSON body and ignore any other value.
 *
 * @example
 * ```ts
 * const client = new BitcoinVn();
 * const ticker = await client.getTicker("BTC", "USDT");
 * ```
 */
export class BitcoinVn {
  /** Rate-limit headers from the most recent response, when the API sent any. */
  lastRateLimit?: RateLimit;

  private readonly apiKey?: string;
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly maxRetryDelayMs: number;
  private readonly retryMutations: boolean;
  private readonly extraHeaders: Record<string, string>;
  private readonly nowFn: () => number;
  private readonly sleepFn?: (ms: number) => Promise<void>;

  /**
   * @param options API key string, or settings. A blank key is treated as no key.
   *
   * @example
   * ```ts
   * const client = new BitcoinVn({ apiKey: process.env.BITCOINVN_API_KEY });
   * ```
   */
  constructor(options: BitcoinVnOptions | string = {}) {
    const config: BitcoinVnOptions = typeof options === "string" ? { apiKey: options } : options;
    const key = config.apiKey?.trim();
    this.apiKey = key ? key : undefined;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.retries = Math.max(0, config.retries ?? 0);
    this.retryDelayMs = Math.max(0, config.retryDelayMs ?? 200);
    this.maxRetryDelayMs = Math.max(0, config.maxRetryDelayMs ?? 5_000);
    this.retryMutations = config.retryMutations ?? false;
    this.extraHeaders = config.headers ?? {};
    this.nowFn = config.now ?? (() => Date.now());
    this.sleepFn = config.sleep;
    this.http =
      config.axios ??
      axios.create({
        baseURL: this.baseUrl,
        timeout: config.timeoutMs ?? 30_000,
        proxy: config.proxy === undefined ? undefined : normalizeProxy(config.proxy),
      });
  }

  /**
   * `GET /api/health`. Returns `{ status: "ok" }` when the API is available.
   *
   * @example
   * ```ts
   * const health = await client.getHealth();
   * ```
   */
  getHealth(): Promise<HealthStatus> {
    return this.request("GET", "/api/health");
  }

  /**
   * `GET /api/info`. Returns assets and transfer methods. Use method `id` values
   * exactly as returned. `enabled` does not by itself mean a direction is open:
   * check `depositEnabled` or `settleEnabled`.
   *
   * @example
   * ```ts
   * const info = await client.getInfo();
   * ```
   */
  getInfo(): Promise<Info> {
    return this.request("GET", "/api/info");
  }

  /** Alias of `getInfo`. */
  info(): Promise<Info> {
    return this.getInfo();
  }

  /**
   * `GET /api/pairs/{depositMethodId}/{settleMethodId}`.
   * A 200 response does not reserve liquidity. If `max` is less than `min`, the pair
   * has no valid deposit range. An API key applies the account minimum to `min`.
   *
   * @example
   * ```ts
   * const pair = await client.getPair("btc", "xmr");
   * ```
   */
  getPair(depositMethodId: string, settleMethodId: string): Promise<Pair> {
    return this.request(
      "GET",
      `/api/pairs/${segment(depositMethodId)}/${segment(settleMethodId)}`,
    );
  }

  /** Alias of `getPair`. */
  pair(depositMethodId: string, settleMethodId: string): Promise<Pair> {
    return this.getPair(depositMethodId, settleMethodId);
  }

  /**
   * `GET /api/ticker/{baseAssetId}/{quoteAssetId}`.
   * Asset ids are case-sensitive. The rate is quote units per one base unit, including fees.
   *
   * @example
   * ```ts
   * const ticker = await client.getTicker("BTC", "USDT");
   * ```
   */
  getTicker(baseAssetId: string, quoteAssetId: string): Promise<Ticker> {
    return this.request(
      "GET",
      `/api/ticker/${segment(baseAssetId)}/${segment(quoteAssetId)}`,
    );
  }

  /**
   * `GET /api/addresses/validate`. For Lightning, pass the BOLT11 invoice as `address`
   * and set `invoiceAmount` when it must match the order amount.
   *
   * @example
   * ```ts
   * const result = await client.validateAddress({
   *   transferMethod: "btc",
   *   address: "bc1qexample",
   * });
   * ```
   */
  validateAddress(params: {
    transferMethod: string;
    address: string;
    invoiceAmount?: number;
  }): Promise<AddressValidation> {
    return this.request("GET", "/api/addresses/validate", {
      query: {
        transferMethod: params.transferMethod,
        address: params.address,
        invoiceAmount: params.invoiceAmount,
      },
    });
  }

  /**
   * `POST /api/quotes`. Send `depositAmount`, `settleAmount`, or neither, but not both.
   * A quote does not move funds. It creates a production quote. Asset-conversion quotes
   * last 15 minutes; same-asset quotes last one day.
   *
   * @example
   * ```ts
   * const quote = await client.createQuote({
   *   depositMethod: "btc",
   *   settleMethod: "xmr",
   *   depositAmount: 0.01,
   * });
   * ```
   */
  createQuote(params: CreateQuoteParams): Promise<Quote> {
    return this.request("POST", "/api/quotes", { body: definedRecord(params) });
  }

  /** Alias of `createQuote`. */
  quote(params: CreateQuoteParams): Promise<Quote> {
    return this.createQuote(params);
  }

  /**
   * `GET /api/orders`. Requires `X-API-KEY`. Pages contain 10 orders.
   *
   * @example
   * ```ts
   * const orders = await client.listOrders({ page: 1 });
   * ```
   */
  listOrders(params: ListOrdersParams = {}): Promise<Order[]> {
    return this.request("GET", "/api/orders", {
      query: { page: params.page, customOrderId: params.customOrderId },
    });
  }

  /** Alias of `listOrders`. */
  orders(params: ListOrdersParams = {}): Promise<Order[]> {
    return this.listOrders(params);
  }

  /**
   * Yield every order, following `page` until a short page or `maxPages`.
   * Requires `X-API-KEY`.
   */
  async *iterateOrders(params: ListAllOrdersParams = {}): AsyncGenerator<Order> {
    const maxPages = params.maxPages ?? 100;
    for (let page = 1; page <= maxPages; page += 1) {
      const batch = await this.listOrders({ page, customOrderId: params.customOrderId });
      for (const order of batch) yield order;
      if (batch.length < ORDERS_PAGE_SIZE) return;
    }
  }

  /** Collect `iterateOrders` into an array. */
  async listAllOrders(params: ListAllOrdersParams = {}): Promise<Order[]> {
    const orders: Order[] = [];
    for await (const order of this.iterateOrders(params)) orders.push(order);
    return orders;
  }

  /**
   * `POST /api/orders`. Creates a production order. Funding it, or spending an
   * internal balance, moves real funds.
   *
   * Pass a quote id, or `depositMethod` and `settleMethod` for a variable-amount
   * order. Amountless internal-balance quotes also accept `depositAmount` or
   * `settleAmount` with the quote id. The client always sends
   * `referrer` in the JSON body and ignores any other value.
   *
   * @example
   * ```ts
   * const order = await client.createOrder({
   *   quote: "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
   *   settleData: { address: "4example" },
   * });
   * ```
   */
  createOrder(params: CreateOrderParams): Promise<Order> {
    const body = definedRecord(params);
    delete body.referrer;
    body.referrer = REFERRER;
    return this.request("POST", "/api/orders", { body });
  }

  /**
   * Create an order from a quote id.
   * A string `destination` is sent as `{ address }`. Omit it for an internal-balance credit.
   * The JSON body always includes `referrer`.
   */
  fixedSwap(
    quoteId: string,
    destination?: string | OrderSettleData | null,
    options: SwapOptions = {},
  ): Promise<Order> {
    return this.createOrder({
      quote: quoteId,
      settleData: normalizeDestination(destination),
      webhookUrl: options.webhookUrl,
      customOrderId: options.customOrderId,
    });
  }

  /**
   * Create a variable-amount order from method ids, without a quote.
   * A string `destination` is sent as `{ address }`. The JSON body always includes `referrer`.
   */
  variableSwap(
    depositMethod: string,
    settleMethod: string,
    destination?: string | OrderSettleData | null,
    options: SwapOptions = {},
  ): Promise<Order> {
    return this.createOrder({
      depositMethod,
      settleMethod,
      settleData: normalizeDestination(destination),
      webhookUrl: options.webhookUrl,
      customOrderId: options.customOrderId,
    });
  }

  /**
   * `GET /api/orders/{id}`. `id` is the 8-character `shortId`.
   * A key is optional. An account order returns 403 when another account's key is sent.
   *
   * @example
   * ```ts
   * const order = await client.getOrder("BV2MTZAF");
   * ```
   */
  getOrder(id: string): Promise<Order> {
    return this.request("GET", `/api/orders/${segment(id)}`);
  }

  /** Alias of `getOrder`. */
  order(id: string): Promise<Order> {
    return this.getOrder(id);
  }

  /**
   * Poll `getOrder` until `status` is one of `statuses`, or the timeout elapses.
   * The default stop statuses are `completed`, `canceled`, and `settle_data_error`.
   * A timeout throws `BitcoinVnTimeoutError` and includes the last order.
   */
  async waitForOrder(id: string, params: WaitForOrderParams = {}): Promise<Order> {
    const timeoutMs = params.timeoutMs ?? 120_000;
    const intervalMs = Math.max(0, params.intervalMs ?? 3_000);
    const wanted = new Set<OrderStatus>(params.statuses ?? DEFAULT_WAIT_STATUSES);
    const deadline = this.nowFn() + timeoutMs;
    for (;;) {
      if (params.signal?.aborted) {
        throw new BitcoinVnError("The wait was aborted", { status: 0, code: 0 });
      }
      const order = await this.getOrder(id);
      if (wanted.has(order.status)) return order;
      const current = this.nowFn();
      if (current >= deadline) {
        throw new BitcoinVnTimeoutError(
          `Order ${id} was still ${order.status} after ${timeoutMs} ms`,
          order,
        );
      }
      const delay = Math.min(intervalMs, Math.max(deadline - current, 0));
      await this.pause(delay, params.signal);
    }
  }

  /**
   * `POST /api/orders/{id}/deposit`. Optional fast path after you broadcast a
   * supported on-chain deposit while the order is `new`. Fiat, Lightning,
   * internal-balance, and manual deposits do not use this call. The response
   * is the current order.
   *
   * @example
   * ```ts
   * const order = await client.submitDeposit("BV2MTZAF", {
   *   txid: "0x0123456789abcdef",
   * });
   * ```
   */
  submitDeposit(id: string, params: SubmitDepositParams): Promise<Order> {
    return this.request("POST", `/api/orders/${segment(id)}/deposit`, {
      body: { txid: params.txid },
    });
  }

  /**
   * `PUT /api/orders/{id}/settle-data`. Requires a key with write access.
   * The order must be in `settle_data_error`.
   *
   * @example
   * ```ts
   * const order = await client.updateSettleData("BV2MTZAF", {
   *   address: "bc1qexample",
   * });
   * ```
   */
  updateSettleData(id: string, settleData: SettleDataCorrection): Promise<Order> {
    return this.request("PUT", `/api/orders/${segment(id)}/settle-data`, {
      body: definedRecord(settleData),
    });
  }

  /**
   * `GET /api/balances`. Requires `X-API-KEY`.
   * Values are available amounts keyed by asset id.
   *
   * @example
   * ```ts
   * const balances = await client.getBalances();
   * ```
   */
  getBalances(): Promise<Balances> {
    return this.request("GET", "/api/balances");
  }

  /** Alias of `getBalances`. */
  balances(): Promise<Balances> {
    return this.getBalances();
  }

  /**
   * `GET /api/balances/history`. Requires `X-API-KEY`. Pages contain 25 rows.
   *
   * @example
   * ```ts
   * const history = await client.listBalanceHistory({ assetId: "BTC", page: 1 });
   * ```
   */
  listBalanceHistory(params: BalanceHistoryParams = {}): Promise<LedgerItem[]> {
    return this.request("GET", "/api/balances/history", {
      query: { assetId: params.assetId, page: params.page },
    });
  }

  /** Yield every ledger page until a short page or `maxPages`. Requires `X-API-KEY`. */
  async *iterateBalanceHistory(params: ListAllLedgerParams = {}): AsyncGenerator<LedgerItem> {
    const maxPages = params.maxPages ?? 100;
    for (let page = 1; page <= maxPages; page += 1) {
      const batch = await this.listBalanceHistory({ assetId: params.assetId, page });
      for (const row of batch) yield row;
      if (batch.length < LEDGER_PAGE_SIZE) return;
    }
  }

  /** Collect `iterateBalanceHistory` into an array. */
  async listAllBalanceHistory(params: ListAllLedgerParams = {}): Promise<LedgerItem[]> {
    const rows: LedgerItem[] = [];
    for await (const row of this.iterateBalanceHistory(params)) rows.push(row);
    return rows;
  }

  /**
   * `GET /api/staking`. Lists staking offers that have an active supply target.
   *
   * @example
   * ```ts
   * const offers = await client.listStakingOffers();
   * ```
   */
  listStakingOffers(): Promise<Vault[]> {
    return this.request("GET", "/api/staking");
  }

  /**
   * `PUT /api/staking/{id}/auto-stake`. Requires a key with write access.
   * `id` is the offer UUID from `listStakingOffers`.
   *
   * @example
   * ```ts
   * const setting = await client.setAutoStake(
   *   "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
   *   true,
   * );
   * ```
   */
  setAutoStake(id: string, value: boolean): Promise<BooleanConfiguration> {
    return this.request("PUT", `/api/staking/${segment(id)}/auto-stake`, {
      body: { value },
    });
  }

  /**
   * `PUT /api/staking/{id}/notifications`. Requires a key with write access.
   *
   * @example
   * ```ts
   * const setting = await client.setStakingNotifications(
   *   "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
   *   false,
   * );
   * ```
   */
  setStakingNotifications(id: string, value: boolean): Promise<BooleanConfiguration> {
    return this.request("PUT", `/api/staking/${segment(id)}/notifications`, {
      body: { value },
    });
  }

  /**
   * `GET /api/addresses/resolve`. Resolves an ASCII ENS name for a payout method.
   * `ensResolutionToken` is used as `settleData.ensResolutionToken` and expires in 15 minutes.
   *
   * @example
   * ```ts
   * const resolved = await client.resolveAddress({
   *   transferMethod: "eth",
   *   name: "alice.eth",
   * });
   * ```
   */
  resolveAddress(params: { transferMethod: string; name: string }): Promise<EnsResolution> {
    return this.request("GET", "/api/addresses/resolve", {
      query: { transferMethod: params.transferMethod, name: params.name },
    });
  }

  /**
   * `GET /api/guarantee/public-key`. Returns armored OpenPGP certificates as text.
   *
   * @example
   * ```ts
   * const certificates = await client.getGuaranteePublicKey();
   * ```
   */
  getGuaranteePublicKey(): Promise<string> {
    return this.request("GET", "/api/guarantee/public-key", { text: true });
  }

  /**
   * `GET /api/orders/{id}/guarantee`. Returns the stored clear-signed letter as text.
   * Uses the same access rules as `getOrder`. Older orders and some deposit types have no letter.
   *
   * @example
   * ```ts
   * const letter = await client.getOrderGuarantee("BV2MTZAF");
   * ```
   */
  getOrderGuarantee(id: string): Promise<string> {
    return this.request("GET", `/api/orders/${segment(id)}/guarantee`, { text: true });
  }

  /**
   * HTML swap form with methods preselected.
   * Uses the origin of `baseUrl`. A link does not reserve a quote.
   *
   * @example
   * ```ts
   * client.swapUrl("btc", "xmr");
   * // https://bitcoinvn.io/?deposit=btc&settle=xmr
   * ```
   */
  swapUrl(deposit?: string, settle?: string): string {
    const origin = new URL(this.baseUrl).origin;
    const params = new URLSearchParams();
    if (deposit) params.set("deposit", deposit);
    if (settle) params.set("settle", settle);
    const query = params.toString();
    return query ? `${origin}/?${query}` : `${origin}/`;
  }

  /**
   * Verify `X-Signature` with this client's API key.
   * Returns false when no key was configured.
   */
  verifyWebhook(rawBody: string | Buffer, signature?: string | null): boolean {
    if (!this.apiKey) return false;
    return verifyWebhookSignature(rawBody, signature, this.apiKey);
  }

  /**
   * Parse an order webhook. With `requireSignature`, a mismatch throws.
   * The key is this client's API key.
   */
  readWebhook(
    rawBody: string | Buffer,
    signature?: string | null,
    options?: { requireSignature?: boolean },
  ): WebhookRead {
    return readWebhook(rawBody, signature, this.apiKey, options);
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.extraHeaders)) {
      if (key.toLowerCase() === "x-api-key" || key.toLowerCase() === "user-agent") continue;
      headers[key] = value;
    }
    headers.Accept = headers.Accept ?? "application/json, text/plain";
    headers["User-Agent"] = USER_AGENT;
    if (this.apiKey) headers["X-API-KEY"] = this.apiKey;
    return headers;
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT",
    url: string,
    options: {
      query?: Record<string, string | number | undefined>;
      body?: Record<string, unknown>;
      text?: boolean;
    } = {},
  ): Promise<T> {
    const idempotent = method === "GET";
    const extra = idempotent || this.retryMutations ? this.retries : 0;
    const attempts = 1 + extra;
    let lastError: BitcoinVnError | undefined;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const config: AxiosRequestConfig = {
        method,
        url,
        headers: this.headers(),
        validateStatus: () => true,
        responseType: options.text ? "text" : "json",
      };
      const params = compactQuery(options.query);
      if (params) config.params = params;
      if (options.body) config.data = options.body;

      let response;
      try {
        response = await this.http.request<T>(config);
      } catch (error) {
        const transport = toTransportError(error);
        lastError = transport;
        if (this.canRetry(transport, attempt, attempts)) {
          await this.pause(this.retryDelay(transport, attempt));
          continue;
        }
        throw transport;
      }

      this.captureRateLimit(response.headers);
      if (response.status >= 400) {
        const apiError = errorFromBody(response.status, response.data, response.headers);
        lastError = apiError;
        if (this.canRetry(apiError, attempt, attempts)) {
          await this.pause(this.retryDelay(apiError, attempt));
          continue;
        }
        throw apiError;
      }
      return response.data;
    }

    // `attempts` is at least 1, so the loop returns or throws before here.
    /* istanbul ignore next */
    throw lastError ?? new BitcoinVnTransportError("Request failed", { status: 0, code: 0 });
  }

  private captureRateLimit(headers: unknown): void {
    const snapshot = readRateLimit(headers);
    if (snapshot) this.lastRateLimit = snapshot;
  }

  private canRetry(error: BitcoinVnError, attempt: number, attempts: number): boolean {
    if (attempt >= attempts - 1) return false;
    return error.status === 0 || error.status === 429 || error.status >= 500;
  }

  private retryDelay(error: BitcoinVnError, attempt: number): number {
    let delay = this.retryDelayMs * 2 ** attempt;
    if (error.retryAfter !== undefined) delay = Math.max(delay, error.retryAfter * 1000);
    if (!Number.isFinite(delay) || delay < 0) delay = 0;
    return Math.min(delay, this.maxRetryDelayMs);
  }

  private async pause(ms: number, signal?: AbortSignal): Promise<void> {
    if (ms <= 0) return;
    if (this.sleepFn) {
      await this.sleepFn(ms);
      if (signal?.aborted) {
        throw new BitcoinVnError("The wait was aborted", { status: 0, code: 0 });
      }
      return;
    }
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new BitcoinVnError("The wait was aborted", { status: 0, code: 0 }));
        return;
      }
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(timer);
        reject(new BitcoinVnError("The wait was aborted", { status: 0, code: 0 }));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
}

function toTransportError(error: unknown): BitcoinVnError {
  if (axios.isAxiosError(error) && error.response) {
    return errorFromBody(error.response.status, error.response.data, error.response.headers);
  }
  const message = error instanceof Error ? error.message : "Request failed";
  return new BitcoinVnTransportError(message, { status: 0, code: 0, raw: error });
}

export function readRateLimit(headers: unknown): RateLimit | undefined {
  const limit = headerNumber(headers, "x-ratelimit-limit");
  const remaining = headerNumber(headers, "x-ratelimit-remaining");
  const retryAfter = headerNumber(headers, "x-ratelimit-retry-after");
  if (limit === undefined && remaining === undefined && retryAfter === undefined) return undefined;
  const snapshot: RateLimit = {};
  if (limit !== undefined) snapshot.limit = limit;
  if (remaining !== undefined) snapshot.remaining = remaining;
  if (retryAfter !== undefined) snapshot.retryAfter = retryAfter;
  return snapshot;
}

function segment(value: string): string {
  return encodeURIComponent(value);
}

function compactQuery(
  query: Record<string, string | number | undefined> | undefined,
): Record<string, string | number> | undefined {
  if (!query) return undefined;
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    params[key] = value;
  }
  return Object.keys(params).length ? params : undefined;
}

function definedRecord(value: object): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined) record[key] = item;
  }
  return record;
}

function normalizeDestination(
  destination: string | OrderSettleData | null | undefined,
): OrderSettleData | undefined {
  if (destination == null || destination === "") return undefined;
  if (typeof destination === "string") return { address: destination };
  return destination;
}

export function normalizeProxy(proxy: string | AxiosProxyConfig): AxiosProxyConfig {
  if (typeof proxy !== "string") return proxy;
  let url: URL;
  try {
    url = new URL(proxy);
  } catch (error) {
    throw new BitcoinVnError("Proxy must be an http or https URL", {
      status: 0,
      code: 0,
      raw: error,
    });
  }
  const protocol = url.protocol.replace(":", "");
  if (protocol !== "http" && protocol !== "https") {
    throw new BitcoinVnError(`Unsupported proxy protocol: ${protocol}`, { status: 0, code: 0 });
  }
  const fallbackPort = protocol === "https" ? 443 : 80;
  const config: AxiosProxyConfig = {
    protocol,
    host: url.hostname,
    port: url.port ? Number(url.port) : fallbackPort,
  };
  if (url.username) {
    config.auth = {
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    };
  }
  return config;
}
