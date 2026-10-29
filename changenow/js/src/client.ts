import axios, { AxiosError, AxiosInstance, AxiosProxyConfig } from "axios";
import {
  ChangeNowError,
  ChangeNowNetworkError,
  ChangeNowTimeoutError,
  createChangeNowError,
} from "./errors.js";
import { TERMINAL_EXCHANGE_STATUSES } from "./link.js";
import type {
  AddressValidation,
  AvailablePair,
  ChangeNowClientOptions,
  ChangeNowCurrency,
  ContinueExchangeParams,
  ContinueExchangeResult,
  CreateExchangeParams,
  CreatePrivateTransferParams,
  CreatedExchange,
  CreatedPrivateTransfer,
  ExchangeActions,
  ExchangeStatus,
  ExchangesPage,
  EstimatedAmount,
  GetAvailablePairsParams,
  GetCurrenciesParams,
  GetEstimatedAmountParams,
  GetExchangesParams,
  GetMarketEstimateParams,
  GetNetworkFeeParams,
  GetPrivateTransferEstimateParams,
  MarketEstimate,
  MinAmountResult,
  NetworkFeeResult,
  PairParams,
  PrivateTransferEstimate,
  RangeResult,
  RefundExchangeParams,
  RefundExchangeResult,
  UserAddressesResult,
  ValidateAddressParams,
  AssetListEnvelope,
  CreatePublicTransactionParams,
  GetPublicTransactionParams,
  ListAssetsParams,
  PublicAssetDetail,
  PublicEstimate,
  PublicEstimateParams,
  PublicTransaction,
  PublicTransactionCreated,
  V1CreateTransactionParams,
  V1CreatedTransaction,
  V1CurrenciesParams,
  V1Currency,
  V1CurrencyInfo,
  V1Estimate,
  V1FixedRateAmountParams,
  V1ListTransactionsParams,
  V1Range,
  V1TransactionStatus,
  WaitForExchangeOptions,
} from "./types.js";

/**
 * Header that carries the partner API key.
 *
 * The published v2 collection and its 401 text send the partner key as
 * `x-changenow-api-key`. The available-pairs sample in that same collection
 * is the exception and uses `x-api-key`.
 *
 * TODO: Partner attribution header is pending confirmation from ChangeNOW.
 * Partner revenue is attributed through the partner API key sent in this
 * header. Change only this constant if ChangeNOW confirms a different name.
 * Do not add a second partner header until they confirm one.
 */
export const CHANGENOW_API_KEY_HEADER = "x-changenow-api-key";

const DEFAULT_BASE_URL = "https://api.changenow.io/v2";
const DEFAULT_V1_BASE_URL = "https://api.changenow.io/v1";
const DEFAULT_PUBLIC_BASE_URL = "https://vip-api.changenow.io";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseProxy(proxy: string): AxiosProxyConfig {
  let url: URL;
  try {
    url = new URL(proxy);
  } catch {
    throw new ChangeNowError(`Invalid proxy URL: ${proxy}`);
  }
  const protocol = url.protocol.replace(":", "") || "http";
  const port = url.port ? Number(url.port) : protocol === "https" ? 443 : 80;
  const config: AxiosProxyConfig = { host: url.hostname, port, protocol };
  if (url.username) {
    config.auth = {
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    };
  }
  return config;
}

function retryAfterSeconds(header: unknown): number | undefined {
  if (header === undefined || header === null || header === "") {
    return undefined;
  }
  const text = String(header).trim();
  const asNumber = Number(text);
  if (Number.isFinite(asNumber)) {
    return Math.max(0, asNumber);
  }
  const when = Date.parse(text);
  if (Number.isNaN(when)) {
    return undefined;
  }
  return Math.max(0, (when - Date.now()) / 1000);
}

interface ParsedError {
  message: string;
  code?: string;
  field?: string;
  fieldErrors?: Record<string, unknown>;
  help?: string;
}

function definedParams(input: Record<string, unknown>): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    params[key] = typeof value === "boolean" ? String(value) : value;
  }
  return params;
}

function definedBody(input: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    body[key] = value;
  }
  return body;
}

function amountValue(value: number | string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return String(value);
}

function readError(data: unknown, fallback: string): ParsedError {
  if (typeof data === "string" && data.trim()) {
    return { message: data.trim() };
  }
  if (Array.isArray(data)) {
    const message = data.map((item) => String(item)).join("; ");
    return { message: message || fallback };
  }
  if (data && typeof data === "object") {
    const body = data as {
      message?: unknown;
      error?: unknown;
      code?: unknown;
      errors?: unknown;
      help?: unknown;
    };
    if (body.errors && typeof body.errors === "object" && !Array.isArray(body.errors)) {
      const entries = Object.entries(body.errors as Record<string, unknown>);
      const [field, value] = entries[0] ?? [];
      if (value && typeof value === "object") {
        const fieldError = value as { message?: unknown; code?: unknown };
        return {
          message: fieldError.message ? String(fieldError.message) : fallback,
          code: fieldError.code === undefined ? undefined : String(fieldError.code),
          field,
          fieldErrors: body.errors as Record<string, unknown>,
          help: body.help === undefined ? undefined : String(body.help),
        };
      }
      if (typeof value === "string") {
        return {
          message: value,
          field,
          fieldErrors: body.errors as Record<string, unknown>,
          help: body.help === undefined ? undefined : String(body.help),
        };
      }
    }
    const codeSource = body.error ?? body.code;
    const code = codeSource === undefined || codeSource === null ? undefined : String(codeSource);
    const messageSource = body.message ?? body.error ?? body.code;
    let message = fallback;
    if (Array.isArray(messageSource)) {
      message = messageSource.map((item) => String(item)).join("; ") || fallback;
    } else if (messageSource !== undefined && messageSource !== null && messageSource !== "") {
      message = String(messageSource);
    }
    return { message, code };
  }
  return { message: fallback };
}

/**
 * Client for the ChangeNOW cryptocurrency exchange API (v2).
 */
export class ChangeNow {
  private readonly apiKey?: string;
  private readonly http: AxiosInstance;
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly retryUnsafe: boolean;
  private readonly v1BaseURL: string;
  private readonly publicBaseURL: string;

  /**
   * Creates an instance of the ChangeNOW client.
   *
   * @example
   * ```typescript
   * import { ChangeNow } from "changenow-client";
   *
   * const client = new ChangeNow({ apiKey: "your-api-key" });
   * const currencies = await client.getCurrencies({ active: true });
   * console.log(`Available currencies: ${currencies.length}`);
   * ```
   */
  constructor(options: ChangeNowClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.CHANGENOW_API_KEY;
    const baseURL = (options.baseURL || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.v1BaseURL = (options.v1BaseURL || DEFAULT_V1_BASE_URL).replace(/\/+$/, "");
    this.publicBaseURL = (options.publicBaseURL || DEFAULT_PUBLIC_BASE_URL).replace(/\/+$/, "");
    const timeout = options.timeoutMs ?? 30000;
    const userAgent = options.userAgent || "changenow-client/0.1.0";
    this.retries = options.retries ?? 2;
    this.retryDelayMs = options.retryDelayMs ?? 200;
    this.retryUnsafe = options.retryUnsafe ?? false;

    const headers: Record<string, string> = {
      "User-Agent": userAgent,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.apiKey) {
      headers[CHANGENOW_API_KEY_HEADER] = this.apiKey;
    }
    if (options.userIp) {
      headers["x-forwarded-for"] = options.userIp;
    }

    this.http = axios.create({
      baseURL,
      timeout,
      headers,
      proxy: options.proxy ? parseProxy(options.proxy) : undefined,
    });
  }

  private requireApiKey(): string {
    if (!this.apiKey) {
      throw createChangeNowError(
        "A ChangeNOW API key is required for this method. Set apiKey or CHANGENOW_API_KEY.",
        { code: "AUTHENTICATION_REQUIRED" }
      );
    }
    return this.apiKey;
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    options?: {
      params?: Record<string, unknown>;
      data?: unknown;
      baseURL?: string;
      expectText?: boolean;
    }
  ): Promise<T> {
    const retryable = method === "GET" || this.retryUnsafe;
    const attempts = Math.max(0, this.retries) + 1;
    let lastError: ChangeNowError | undefined;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await this.http.request<T>({
          method,
          url: options?.baseURL ? `${options.baseURL}${path}` : path,
          params: options?.params,
          data: options?.data,
          responseType: options?.expectText ? "text" : "json",
        });
        return response.data;
      } catch (err: unknown) {
        const parsed = this.asError(err);
        lastError = parsed;
        const canRetry =
          retryable &&
          attempt < attempts &&
          (parsed instanceof ChangeNowNetworkError ||
            parsed.statusCode === 408 ||
            parsed.statusCode === 429 ||
            (parsed.statusCode !== undefined && parsed.statusCode >= 500) ||
            parsed.code === "RATE_LIMITED" ||
            parsed.code === "UPSTREAM_UNAVAILABLE" ||
            parsed.code === "INTERNAL_ERROR");
        if (!canRetry) {
          throw parsed;
        }
        const delaySeconds = parsed.retryAfter ?? this.retryDelayMs / 1000 * 2 ** (attempt - 1);
        await sleep(delaySeconds * 1000);
      }
    }
    throw lastError ?? new ChangeNowError("ChangeNOW API request failed");
  }

  private asError(err: unknown): ChangeNowError {
    if (err instanceof ChangeNowError) {
      return err;
    }
    if (axios.isAxiosError(err)) {
      const axiosErr = err as AxiosError;
      if (!axiosErr.response) {
        return new ChangeNowNetworkError(axiosErr.message || "ChangeNOW API request failed");
      }
      const data = axiosErr.response.data;
      const status = axiosErr.response.status;
      const parsed = readError(data, axiosErr.message || "ChangeNOW API request failed");
      const retryAfter = retryAfterSeconds(axiosErr.response.headers?.["retry-after"]);
      return createChangeNowError(parsed.message, {
        statusCode: status,
        code: parsed.code,
        responseBody: data,
        field: parsed.field,
        fieldErrors: parsed.fieldErrors,
        help: parsed.help,
        retryAfter,
      });
    }
    return new ChangeNowError(err instanceof Error ? err.message : String(err));
  }

  /**
   * Lists currencies. Filter by activity, flow, and buy or sell availability.
   *
   * @example
   * ```typescript
   * const currencies = await client.getCurrencies({ active: true, flow: "standard" });
   * ```
   */
  async getCurrencies(params: GetCurrenciesParams = {}): Promise<ChangeNowCurrency[]> {
    return this.request<ChangeNowCurrency[]>("GET", "/exchange/currencies", {
      params: definedParams({
        active: params.active,
        flow: params.flow,
        buy: params.buy,
        sell: params.sell,
      }),
    });
  }

  /**
   * Lists tradable pairs. The unfiltered list is very large; pass a currency or network filter.
   *
   * @example
   * ```typescript
   * const pairs = await client.getAvailablePairs({ fromCurrency: "btc", fromNetwork: "btc" });
   * ```
   */
  async getAvailablePairs(params: GetAvailablePairsParams = {}): Promise<AvailablePair[]> {
    return this.request<AvailablePair[]>("GET", "/exchange/available-pairs", {
      params: definedParams({ ...params }),
    });
  }

  /**
   * Returns the minimum deposit for a pair.
   *
   * @example
   * ```typescript
   * const min = await client.getMinAmount({
   *   fromCurrency: "btc",
   *   toCurrency: "eth",
   *   fromNetwork: "btc",
   *   toNetwork: "eth",
   *   flow: "standard",
   * });
   * ```
   */
  async getMinAmount(params: PairParams): Promise<MinAmountResult> {
    return this.request<MinAmountResult>("GET", "/exchange/min-amount", {
      params: definedParams({ ...params }),
    });
  }

  /**
   * Returns the minimum and maximum deposit for a pair.
   *
   * @example
   * ```typescript
   * const range = await client.getRange({
   *   fromCurrency: "btc",
   *   toCurrency: "eth",
   *   fromNetwork: "btc",
   *   toNetwork: "eth",
   * });
   * ```
   */
  async getRange(params: PairParams): Promise<RangeResult> {
    return this.request<RangeResult>("GET", "/exchange/range", {
      params: definedParams({ ...params }),
    });
  }

  /**
   * Estimates a standard or fixed-rate exchange.
   * Set `flow` to `"fixed-rate"` and `useRateId` to lock a `rateId` for create.
   *
   * @example
   * ```typescript
   * const estimate = await client.getEstimatedAmount({
   *   fromCurrency: "btc",
   *   toCurrency: "eth",
   *   fromNetwork: "btc",
   *   toNetwork: "eth",
   *   fromAmount: "0.1",
   *   flow: "standard",
   * });
   * ```
   */
  async getEstimatedAmount(params: GetEstimatedAmountParams): Promise<EstimatedAmount> {
    return this.request<EstimatedAmount>("GET", "/exchange/estimated-amount", {
      params: definedParams({
        fromCurrency: params.fromCurrency,
        toCurrency: params.toCurrency,
        fromNetwork: params.fromNetwork,
        toNetwork: params.toNetwork,
        flow: params.flow,
        type: params.type,
        fromAmount: amountValue(params.fromAmount),
        toAmount: amountValue(params.toAmount),
        useRateId: params.useRateId,
        isTopUp: params.isTopUp,
      }),
    });
  }

  /**
   * Creates an exchange and returns the deposit address.
   *
   * Optional partner fields are `userId`, `payload`, `contactEmail`, and `source`.
   * `userId` and `payload` stay off until ChangeNOW enables "Special partner fields".
   *
   * @example
   * ```typescript
   * const order = await client.createExchange({
   *   fromCurrency: "btc",
   *   toCurrency: "eth",
   *   fromNetwork: "btc",
   *   toNetwork: "eth",
   *   fromAmount: "0.1",
   *   address: "0xReceiver",
   *   flow: "standard",
   * });
   * ```
   */
  async createExchange(params: CreateExchangeParams): Promise<CreatedExchange> {
    return this.request<CreatedExchange>("POST", "/exchange", {
      data: definedBody({
        fromCurrency: params.fromCurrency,
        toCurrency: params.toCurrency,
        fromNetwork: params.fromNetwork,
        toNetwork: params.toNetwork,
        fromAmount: amountValue(params.fromAmount),
        toAmount: amountValue(params.toAmount),
        address: params.address,
        extraId: params.extraId,
        refundAddress: params.refundAddress,
        refundExtraId: params.refundExtraId,
        userId: params.userId,
        payload: params.payload,
        contactEmail: params.contactEmail,
        source: params.source,
        flow: params.flow ?? "standard",
        type: params.type,
        rateId: params.rateId,
      }),
    });
  }

  /**
   * Returns status and payout details for one exchange id.
   *
   * @example
   * ```typescript
   * const status = await client.getExchange("81cc9c3a9157a6");
   * console.log(status.status);
   * ```
   */
  async getExchange(id: string): Promise<ExchangeStatus> {
    return this.request<ExchangeStatus>("GET", "/exchange/by-id", {
      params: { id },
    });
  }

  /**
   * Validates a payout address. A failed checksum is `result: false`, not an HTTP error.
   *
   * @example
   * ```typescript
   * const check = await client.validateAddress({
   *   currency: "eth",
   *   address: "0x57f31ad4b64095347F87eDB1675566DAfF5EC886",
   * });
   * ```
   */
  async validateAddress(params: ValidateAddressParams): Promise<AddressValidation> {
    return this.request<AddressValidation>("GET", "/validate/address", {
      params: definedParams({ currency: params.currency, address: params.address }),
    });
  }

  /**
   * Resolves addresses bound to a FIO name or Unstoppable domain.
   *
   * @example
   * ```typescript
   * const named = await client.getUserAddresses("name@domain");
   * ```
   */
  async getUserAddresses(name: string): Promise<UserAddressesResult> {
    return this.request<UserAddressesResult>("GET", "/addresses-by-name", {
      params: { name },
    });
  }

  /**
   * Estimates network fees for an exchange. The fee is already included in the amount estimate.
   *
   * @example
   * ```typescript
   * const fees = await client.getNetworkFee({
   *   fromCurrency: "usdt",
   *   toCurrency: "usdt",
   *   fromNetwork: "eth",
   *   toNetwork: "eth",
   *   fromAmount: "100",
   * });
   * ```
   */
  async getNetworkFee(params: GetNetworkFeeParams): Promise<NetworkFeeResult> {
    return this.request<NetworkFeeResult>("GET", "/exchange/network-fee", {
      params: definedParams({
        fromCurrency: params.fromCurrency,
        toCurrency: params.toCurrency,
        fromNetwork: params.fromNetwork,
        toNetwork: params.toNetwork,
        flow: params.flow,
        fromAmount: amountValue(params.fromAmount),
        convertedCurrency: params.convertedCurrency,
        convertedNetwork: params.convertedNetwork,
      }),
    });
  }

  /**
   * Informational crypto or fiat market estimate. Fees are not included. Not a tradable quote.
   *
   * @example
   * ```typescript
   * const market = await client.getMarketEstimate({
   *   fromCurrency: "usdt",
   *   toCurrency: "btc",
   *   fromAmount: "1000",
   *   type: "direct",
   * });
   * ```
   */
  async getMarketEstimate(params: GetMarketEstimateParams): Promise<MarketEstimate> {
    return this.request<MarketEstimate>("GET", "/markets/estimate", {
      params: definedParams({
        fromCurrency: params.fromCurrency,
        toCurrency: params.toCurrency,
        fromAmount: amountValue(params.fromAmount),
        toAmount: amountValue(params.toAmount),
        type: params.type,
      }),
    });
  }

  /**
   * Lists partner exchanges. ChangeNOW requires a private API key for this method.
   *
   * @example
   * ```typescript
   * const page = await client.getExchanges({ limit: 10, offset: 0 });
   * ```
   */
  async getExchanges(params: GetExchangesParams = {}): Promise<ExchangesPage> {
    return this.request<ExchangesPage>("GET", "/exchanges", {
      params: definedParams({ ...params }),
    });
  }

  /**
   * Returns whether an exchange can be pushed or refunded.
   *
   * @example
   * ```typescript
   * const actions = await client.getExchangeActions("104305fa95353d");
   * ```
   */
  async getExchangeActions(id: string): Promise<ExchangeActions> {
    return this.request<ExchangeActions>("GET", "/exchange/actions", {
      params: { id },
    });
  }

  /**
   * Continues (pushes) an exchange that `getExchangeActions` marks as available.
   *
   * @example
   * ```typescript
   * const pushed = await client.continueExchange({ id: "104305fa95353d" });
   * ```
   */
  async continueExchange(params: ContinueExchangeParams): Promise<ContinueExchangeResult> {
    return this.request<ContinueExchangeResult>("POST", "/exchange/continue", {
      data: definedBody({ id: params.id }),
    });
  }

  /**
   * Refunds a deposit to the refund address or an address supplied here.
   *
   * @example
   * ```typescript
   * const refunded = await client.refundExchange({ id: "104305fa95353d" });
   * ```
   */
  async refundExchange(params: RefundExchangeParams): Promise<RefundExchangeResult> {
    return this.request<RefundExchangeResult>("POST", "/exchange/refund", {
      data: definedBody({
        id: params.id,
        address: params.address,
        extraId: params.extraId,
      }),
    });
  }

  /**
   * Estimates a private transfer and returns the `rateId` required to create one.
   *
   * @example
   * ```typescript
   * const quote = await client.getPrivateTransferEstimate({
   *   currency: "eth",
   *   network: "eth",
   *   toAmount: "10",
   * });
   * ```
   */
  async getPrivateTransferEstimate(
    params: GetPrivateTransferEstimateParams
  ): Promise<PrivateTransferEstimate> {
    return this.request<PrivateTransferEstimate>("GET", "/private-transfer/estimated-amount", {
      params: definedParams({
        currency: params.currency,
        network: params.network,
        toAmount: amountValue(params.toAmount),
        userId: params.userId,
      }),
    });
  }

  /**
   * Creates a private transfer and returns the deposit address.
   *
   * @example
   * ```typescript
   * const transfer = await client.createPrivateTransfer({
   *   currency: "eth",
   *   network: "eth",
   *   toAmount: "10",
   *   address: "0xReceiver",
   *   rateId: quote.rateId,
   * });
   * ```
   */
  async createPrivateTransfer(
    params: CreatePrivateTransferParams
  ): Promise<CreatedPrivateTransfer> {
    return this.request<CreatedPrivateTransfer>("POST", "/private-transfer", {
      data: definedBody({
        currency: params.currency,
        network: params.network,
        toAmount: amountValue(params.toAmount),
        address: params.address,
        extraId: params.extraId,
        refundAddress: params.refundAddress,
        refundExtraId: params.refundExtraId,
        rateId: params.rateId,
      }),
    });
  }

  /**
   * Alias of `getExchange`.
   */
  async getTransactionStatus(id: string): Promise<ExchangeStatus> {
    return this.getExchange(id);
  }

  /**
   * Alias of `getExchange`.
   */
  async getTransaction(id: string): Promise<ExchangeStatus> {
    return this.getExchange(id);
  }

  /**
   * Polls `getExchange` until the status is terminal or `timeoutMs` elapses.
   */
  async waitForExchange(id: string, options: WaitForExchangeOptions = {}): Promise<ExchangeStatus> {
    return this.poll(id, options, (exchangeId) => this.getExchange(exchangeId));
  }

  /**
   * Lists assets from the anonymous catalogue (`GET /v1/assets` on vip-api).
   * `format: "csv"` returns the complete selection as text.
   */
  async listAssets(params: ListAssetsParams & { format: "csv" }): Promise<string>;
  async listAssets(params?: ListAssetsParams): Promise<AssetListEnvelope>;
  async listAssets(params: ListAssetsParams = {}): Promise<AssetListEnvelope | string> {
    const expectText = params.format === "csv" || params.help === true;
    return this.request<AssetListEnvelope | string>("GET", "/v1/assets", {
      baseURL: this.publicBaseURL,
      expectText,
      params: definedParams({
        q: params.q,
        network: params.network,
        kind: params.kind,
        fixed_rate: params.fixed_rate,
        popular: params.popular,
        limit: params.limit,
        cursor: params.cursor,
        format: params.format,
        help: params.help,
      }),
    });
  }

  /**
   * Follows `next_cursor` until `has_more` is false.
   */
  async listAllAssets(
    params: Omit<ListAssetsParams, "format" | "help" | "cursor"> = {},
    options: { maxPages?: number } = {}
  ): Promise<AssetListEnvelope["assets"]> {
    const maxPages = options.maxPages ?? 100;
    const assets: AssetListEnvelope["assets"] = [];
    let cursor: string | undefined;
    for (let page = 0; page < maxPages; page += 1) {
      const envelope = await this.listAssets({ ...params, cursor });
      assets.push(...envelope.assets);
      if (!envelope.has_more || !envelope.next_cursor) {
        return assets;
      }
      cursor = envelope.next_cursor;
    }
    return assets;
  }

  /** One asset by canonical id, legacy ticker, or page slug. */
  async getAsset(asset: string): Promise<PublicAssetDetail> {
    return this.request<PublicAssetDetail>(
      "GET",
      `/v1/assets/${encodeURIComponent(asset)}`,
      { baseURL: this.publicBaseURL }
    );
  }

  /** Plain-text manual for the anonymous catalogue. */
  async getAssetManual(): Promise<string> {
    return this.request<string>("GET", "/v1/assets", {
      baseURL: this.publicBaseURL,
      expectText: true,
      params: { help: "true" },
    });
  }

  /**
   * Anonymous version-3 quote. Amounts in the answer are decimal strings.
   * Partner revenue is not attributed on this host; use `getEstimatedAmount` for that.
   */
  async getPublicEstimate(params: PublicEstimateParams): Promise<PublicEstimate | string> {
    return this.request<PublicEstimate | string>("GET", "/v3/exchange/estimate", {
      baseURL: this.publicBaseURL,
      expectText: params.help === true,
      params: definedParams({
        fromCurrency: params.fromCurrency,
        fromNetwork: params.fromNetwork,
        toCurrency: params.toCurrency,
        toNetwork: params.toNetwork,
        fromAmount: amountValue(params.fromAmount),
        toAmount: amountValue(params.toAmount),
        flow: params.flow,
        type: params.type,
        useRateId: params.useRateId,
        promoCode: params.promoCode,
        help: params.help,
      }),
    });
  }

  /** Plain-text manual for the version-3 estimate, create, and status calls. */
  async getPublicManual(): Promise<string> {
    return this.request<string>("GET", "/v3/exchange/estimate", {
      baseURL: this.publicBaseURL,
      expectText: true,
      params: { help: "true" },
    });
  }

  /**
   * Creates an anonymous version-3 order and returns the deposit address.
   * Creating an order moves no funds. Pass `help: true` to fetch the manual instead.
   */
  async createPublicTransaction(
    params: CreatePublicTransactionParams
  ): Promise<PublicTransactionCreated | string> {
    return this.request<PublicTransactionCreated | string>("POST", "/v3/transactions", {
      baseURL: this.publicBaseURL,
      expectText: params.help === true,
      data: definedBody({
        fromCurrency: params.fromCurrency,
        fromNetwork: params.fromNetwork,
        toCurrency: params.toCurrency,
        toNetwork: params.toNetwork,
        address: params.address,
        fromAmount: amountValue(params.fromAmount),
        toAmount: amountValue(params.toAmount),
        extraId: params.extraId,
        refundAddress: params.refundAddress,
        refundExtraId: params.refundExtraId,
        contactEmail: params.contactEmail,
        flow: params.flow,
        type: params.type,
        rateId: params.rateId,
        promoCode: params.promoCode,
        source: params.source,
        linkId: params.linkId,
        help: params.help,
      }),
    });
  }

  /** Reads one anonymous version-3 order. */
  async getPublicTransaction(
    id: string,
    params: GetPublicTransactionParams = {}
  ): Promise<PublicTransaction | string> {
    return this.request<PublicTransaction | string>(
      "GET",
      `/v3/transactions/${encodeURIComponent(id)}`,
      {
        baseURL: this.publicBaseURL,
        expectText: params.help === true,
        params: definedParams({ subId: params.subId, help: params.help }),
      }
    );
  }

  /** Polls `getPublicTransaction` until the status is terminal or the timeout elapses. */
  async waitForPublicTransaction(
    id: string,
    options: WaitForExchangeOptions & GetPublicTransactionParams = {}
  ): Promise<PublicTransaction> {
    return this.poll(id, options, (exchangeId) =>
      this.getPublicTransaction(exchangeId, { subId: options.subId })
    ) as Promise<PublicTransaction>;
  }

  private async poll<T extends { status?: string | null }>(
    id: string,
    options: WaitForExchangeOptions,
    fetchStatus: (id: string) => Promise<T | string>
  ): Promise<T> {
    const timeoutMs = options.timeoutMs ?? 600_000;
    const intervalMs = options.intervalMs ?? 5_000;
    const terminal = new Set(options.terminalStatuses ?? TERMINAL_EXCHANGE_STATUSES);
    const started = Date.now();
    let last: T | undefined;
    for (;;) {
      const row = await fetchStatus(id);
      if (typeof row === "string") {
        throw new ChangeNowError("Expected a JSON exchange status, received text");
      }
      last = row;
      const status = row.status ?? "";
      options.onStatus?.(status, row);
      if (terminal.has(status)) {
        return row;
      }
      if (Date.now() - started >= timeoutMs) {
        throw new ChangeNowTimeoutError(
          `Timed out after ${timeoutMs}ms waiting for a terminal exchange status (last status: ${status || "unknown"})`,
          { responseBody: last }
        );
      }
      const remaining = timeoutMs - (Date.now() - started);
      await sleep(Math.min(intervalMs, Math.max(0, remaining)));
    }
  }

  /** Legacy `GET /v1/currencies`. */
  async getCurrenciesV1(params: V1CurrenciesParams = {}): Promise<V1Currency[]> {
    return this.v1<V1Currency[]>("GET", "/currencies", {
      active: params.active,
      fixedRate: params.fixedRate,
    });
  }

  /** Legacy `GET /v1/currencies-to/{ticker}`. */
  async getCurrenciesToV1(ticker: string, params: { fixedRate?: boolean } = {}): Promise<V1Currency[]> {
    return this.v1<V1Currency[]>("GET", `/currencies-to/${encodeURIComponent(ticker)}`, {
      fixedRate: params.fixedRate,
    });
  }

  /** Legacy `GET /v1/currencies/{ticker}`. */
  async getCurrencyInfoV1(ticker: string): Promise<V1CurrencyInfo> {
    return this.v1<V1CurrencyInfo>("GET", `/currencies/${encodeURIComponent(ticker)}`);
  }

  /** Legacy `GET /v1/min-amount/{from}_{to}`. */
  async getMinAmountV1(from: string, to: string): Promise<{ minAmount: number }> {
    return this.v1("GET", `/min-amount/${encodeURIComponent(from)}_${encodeURIComponent(to)}`);
  }

  /** Legacy floating `GET /v1/exchange-amount/{amount}/{from}_{to}`. */
  async getExchangeAmountV1(amount: number | string, from: string, to: string): Promise<V1Estimate> {
    return this.v1(
      "GET",
      `/exchange-amount/${encodeURIComponent(String(amount))}/${encodeURIComponent(from)}_${encodeURIComponent(to)}`
    );
  }

  /** Legacy `GET /v1/exchange-range/{from}_{to}`. */
  async getExchangeRangeV1(from: string, to: string): Promise<V1Range> {
    return this.v1("GET", `/exchange-range/${encodeURIComponent(from)}_${encodeURIComponent(to)}`);
  }

  /**
   * Legacy fixed-rate `GET /v1/exchange-amount/fixed-rate/{amount}/{from}_{to}`.
   * The partner key is also sent as the documented `api_key` query when configured.
   */
  async getFixedRateAmountV1(params: V1FixedRateAmountParams): Promise<V1Estimate> {
    return this.v1(
      "GET",
      `/exchange-amount/fixed-rate/${encodeURIComponent(String(params.amount))}/${encodeURIComponent(params.from)}_${encodeURIComponent(params.to)}`,
      { useRateId: params.useRateId }
    );
  }

  /** Legacy `POST /v1/transactions/{apiKey}`. */
  async createTransactionV1(params: V1CreateTransactionParams): Promise<V1CreatedTransaction> {
    const apiKey = this.requireApiKey();
    return this.v1("POST", `/transactions/${encodeURIComponent(apiKey)}`, undefined, this.v1CreateBody(params));
  }

  /** Legacy `POST /v1/transactions/fixed-rate/{apiKey}`. */
  async createFixedRateTransactionV1(params: V1CreateTransactionParams): Promise<V1CreatedTransaction> {
    const apiKey = this.requireApiKey();
    return this.v1(
      "POST",
      `/transactions/fixed-rate/${encodeURIComponent(apiKey)}`,
      undefined,
      this.v1CreateBody(params)
    );
  }

  /** Legacy `GET /v1/transactions/{id}/{apiKey}`. */
  async getTransactionV1(id: string): Promise<V1TransactionStatus> {
    const apiKey = this.requireApiKey();
    return this.v1(
      "GET",
      `/transactions/${encodeURIComponent(id)}/${encodeURIComponent(apiKey)}`,
      {},
      undefined,
      false
    );
  }

  /** Legacy `GET /v1/transactions/{apiKey}`. */
  async listTransactionsV1(params: V1ListTransactionsParams = {}): Promise<V1TransactionStatus[]> {
    const apiKey = this.requireApiKey();
    return this.v1(
      "GET",
      `/transactions/${encodeURIComponent(apiKey)}`,
      {
        from: params.from,
        to: params.to,
        status: params.status,
        limit: params.limit,
        offset: params.offset,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      },
      undefined,
      false
    );
  }

  /** Legacy `GET /v1/market-info/available-pairs/`. Values look like `btc_eth`. */
  async getMarketPairsV1(): Promise<string[]> {
    return this.v1("GET", "/market-info/available-pairs/", {}, undefined, false);
  }

  /** Legacy `GET /v1/validate/address`. */
  async validateAddressV1(currency: string, address: string): Promise<AddressValidation> {
    return this.v1("GET", "/validate/address", { currency, address }, undefined, false);
  }

  private v1CreateBody(params: V1CreateTransactionParams): Record<string, unknown> {
    return definedBody({
      from: params.from,
      to: params.to,
      address: params.address,
      amount: amountValue(params.amount),
      extraId: params.extraId,
      refundAddress: params.refundAddress,
      refundExtraId: params.refundExtraId,
      userId: params.userId,
      payload: params.payload,
      contactEmail: params.contactEmail,
      rateId: params.rateId,
      flow: params.flow,
    });
  }

  private v1<T>(
    method: "GET" | "POST",
    path: string,
    params?: Record<string, unknown>,
    data?: unknown,
    withApiKeyQuery = true
  ): Promise<T> {
    const query = withApiKeyQuery ? { ...params, api_key: this.apiKey } : params;
    return this.request<T>(method, path, {
      baseURL: this.v1BaseURL,
      params: query ? definedParams(query) : undefined,
      data,
    });
  }
}
