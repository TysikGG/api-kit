import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

import { BitcoinVnError, errorFromBody, parseRetryAfter } from "./errors.js";
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
  ListOrdersParams,
  Order,
  Pair,
  Quote,
  SettleDataCorrection,
  SubmitDepositParams,
  Ticker,
  Vault,
} from "./types.js";

const DEFAULT_BASE_URL = "https://bitcoinvn.io";
const USER_AGENT = "bitcoinvn/0.1.0";

/** @internal */
export const REFERRER = "35b2eec68a1741ac";

/**
 * Client for the BitcoinVN exchange API.
 *
 * Public reads, quotes, and order creation do not need a key. Send `X-API-KEY`
 * by passing `apiKey` when you call an account endpoint. The key is created on
 * the API keys page at bitcoinvn.io. This client does not manage keys.
 *
 * @example
 * ```ts
 * const client = new BitcoinVn();
 * const ticker = await client.getTicker("BTC", "USDT");
 * ```
 */
export class BitcoinVn {
  private readonly apiKey?: string;
  private readonly http: AxiosInstance;

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
    this.http =
      config.axios ??
      axios.create({
        baseURL: (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, ""),
        timeout: config.timeoutMs ?? 30_000,
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

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json, text/plain",
      "User-Agent": USER_AGENT,
    };
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
      if (axios.isAxiosError(error) && error.response) {
        throw errorFromBody(
          error.response.status,
          error.response.data,
          parseRetryAfter(error.response.headers),
        );
      }
      throw new BitcoinVnError(error instanceof Error ? error.message : "Request failed", {
        status: 0,
        code: 0,
        raw: error,
      });
    }

    const retryAfter = parseRetryAfter(response.headers);
    if (response.status >= 400) {
      throw errorFromBody(response.status, response.data, retryAfter);
    }
    return response.data;
  }
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
