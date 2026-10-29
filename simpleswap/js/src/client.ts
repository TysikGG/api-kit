import axios, { AxiosError, AxiosInstance, type AxiosProxyConfig } from "axios";
import {
  SimpleSwapError,
  SimpleSwapNetworkError,
  SimpleSwapRateLimitError,
  SimpleSwapTimeoutError,
  createSimpleSwapError,
  parseRetryAfter,
} from "./errors.js";
import {
  TERMINAL_EXCHANGE_STATUSES,
  type CheckExchangeParams,
  type CheckExchangeResult,
  type ConfirmExchangeParams,
  type CreateExchangeParams,
  type EstimateResult,
  type ExchangeOrder,
  type GetEstimateParams,
  type GetExchangesParams,
  type GetPairsParams,
  type GetRangesParams,
  type MarketRate,
  type PairsMap,
  type RangesResult,
  type SimpleSwapClientOptions,
  type SimpleSwapCurrency,
  type WaitForExchangeOptions,
} from "./types.js";

/**
 * Header that carries the partner API key.
 * v3 attributes partner revenue through this header. Do not rename it.
 */
export const SIMPLESWAP_API_KEY_HEADER = "x-api-key";

/** Default User-Agent. Do not change this string; it is the client attribution token. */
export const DEFAULT_USER_AGENT = "simpleswap-client/0.1.0";

export const DEFAULT_BASE_URL = "https://api.simpleswap.io";

const MAX_RETRY_DELAY_MS = 60_000;

interface RequestOptions {
  params?: Record<string, unknown>;
  data?: unknown;
}

function finiteNumber(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function axiosProxy(proxyUrl: string): AxiosProxyConfig {
  let url: URL;
  try {
    url = new URL(proxyUrl);
  } catch {
    throw new SimpleSwapError(`Invalid proxy URL: ${proxyUrl}`);
  }
  if (!url.hostname) {
    throw new SimpleSwapError(`Invalid proxy URL: ${proxyUrl}`);
  }
  const protocol = url.protocol.replace(/:$/, "") || "http";
  const port = url.port ? Number(url.port) : protocol === "https" ? 443 : 80;
  const config: AxiosProxyConfig = { protocol, host: url.hostname, port };
  if (url.username) {
    config.auth = {
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    };
  }
  return config;
}

function payloadMessage(data: unknown, fallback: string): { message: string; traceId?: string; code?: string | number } {
  if (typeof data === "string" && data.trim()) {
    return { message: data.trim() };
  }
  if (data && typeof data === "object") {
    const body = data as { message?: unknown; error?: unknown; traceId?: unknown; code?: unknown };
    const messageFromBody =
      typeof body.message === "string" && body.message
        ? body.message
        : typeof body.error === "string" && body.error
          ? body.error
          : undefined;
    const traceId = typeof body.traceId === "string" ? body.traceId : undefined;
    const code =
      typeof body.code === "string" || typeof body.code === "number" ? body.code : undefined;
    return { message: messageFromBody ?? fallback, traceId, code };
  }
  return { message: fallback };
}

/**
 * Reads `publicId` or `id` from an exchange payload.
 */
export function exchangeId(order: { id?: string; publicId?: string } | null | undefined): string {
  const value = order?.publicId || order?.id;
  if (!value) {
    throw new SimpleSwapError("Exchange response did not include publicId or id");
  }
  return value;
}

/**
 * Client for interacting with the SimpleSwap cryptocurrency exchange API (v3).
 */
export class SimpleSwap {
  private readonly apiKey?: string;
  private readonly http: AxiosInstance;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly pollingIntervalMs: number;
  private readonly pollingTimeoutMs: number;

  /**
   * Creates an instance of the SimpleSwap client.
   *
   * @example
   * ```typescript
   * import { SimpleSwap } from "simpleswap-client";
   *
   * const client = new SimpleSwap({ apiKey: "your-api-key" });
   * const currencies = await client.getCurrencies();
   * console.log(`Available currencies: ${currencies.length}`);
   * ```
   */
  constructor(options: SimpleSwapClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.SIMPLESWAP_API_KEY;
    const baseURL = (options.baseURL || options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
    const timeout = options.timeoutMs ?? options.timeout ?? 30_000;
    const userAgent = options.userAgent || DEFAULT_USER_AGENT;
    this.maxRetries = Math.max(0, finiteNumber(options.maxRetries, 2));
    this.retryDelayMs = Math.max(0, finiteNumber(options.retryDelayMs, 200));
    this.pollingIntervalMs = Math.max(0, finiteNumber(options.pollingIntervalMs, 5_000));
    this.pollingTimeoutMs = Math.max(0, finiteNumber(options.pollingTimeoutMs, 600_000));

    const headers: Record<string, string> = {
      "User-Agent": userAgent,
      "x-user-agent": userAgent,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers[SIMPLESWAP_API_KEY_HEADER] = this.apiKey;
    }
    if (options.clientIp) {
      headers["x-client-ip"] = options.clientIp;
    }

    this.http = axios.create({
      baseURL,
      timeout,
      headers,
      proxy: options.proxy ? axiosProxy(options.proxy) : undefined,
    });
  }

  private sleep(ms: number): Promise<void> {
    if (ms <= 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private shouldRetry(method: string, error: SimpleSwapError): boolean {
    if (!error.retryable) {
      return false;
    }
    if (method === "GET") {
      return true;
    }
    return error instanceof SimpleSwapRateLimitError || error.statusCode === 429;
  }

  private async request<T>(method: "GET" | "POST" | "PUT", path: string, options?: RequestOptions): Promise<T> {
    const attempts = this.maxRetries + 1;
    let attempt = 0;
    for (;;) {
      try {
        return await this.requestOnce<T>(method, path, options);
      } catch (err: unknown) {
        const wrapped =
          err instanceof SimpleSwapError
            ? err
            : new SimpleSwapError(err instanceof Error ? err.message : String(err));
        attempt += 1;
        if (!this.shouldRetry(method, wrapped) || attempt >= attempts) {
          throw wrapped;
        }
        const delay = Math.min(wrapped.retryAfterMs ?? this.retryDelayMs * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS);
        await this.sleep(delay);
      }
    }
  }

  private async requestOnce<T>(method: "GET" | "POST" | "PUT", path: string, options?: RequestOptions): Promise<T> {
    try {
      const response = await this.http.request<{
        traceId?: string;
        result?: T;
        error?: boolean | string;
        message?: string;
        code?: string | number;
      }>({
        method,
        url: path,
        params: options?.params,
        data: options?.data,
      });

      const body = response.data;
      if (body && typeof body === "object") {
        const failed =
          body.error === true || (typeof body.error === "string" && !("result" in body));
        if (failed) {
          const parsed = payloadMessage(body, "SimpleSwap error");
          throw createSimpleSwapError(parsed.message, {
            statusCode: response.status,
            traceId: parsed.traceId ?? body.traceId,
            responseBody: body,
            code: parsed.code ?? body.code,
          });
        }
        if ("result" in body) {
          return body.result as T;
        }
      }
      return body as unknown as T;
    } catch (err: unknown) {
      if (err instanceof SimpleSwapError) {
        throw err;
      }
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError;
        const parsed = payloadMessage(axiosErr.response?.data, axiosErr.message || "SimpleSwap request failed");
        const status = axiosErr.response?.status;
        const retryAfterMs = parseRetryAfter(axiosErr.response?.headers?.["retry-after"]);
        if (!axiosErr.response) {
          throw new SimpleSwapNetworkError(parsed.message, {
            code: axiosErr.code,
            responseBody: axiosErr.response,
            retryable: true,
          });
        }
        throw createSimpleSwapError(parsed.message, {
          statusCode: status,
          traceId: parsed.traceId,
          responseBody: axiosErr.response.data,
          code: parsed.code ?? axiosErr.code,
          retryAfterMs,
        });
      }
      throw new SimpleSwapError(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Returns true when `address` matches a currency validation regex.
   * An empty pattern accepts any non-empty address. The match must cover the whole address.
   */
  isValidAddress(address: string, patternOrCurrency?: string | null | SimpleSwapCurrency): boolean {
    if (!address || !address.trim()) {
      return false;
    }
    const pattern =
      patternOrCurrency && typeof patternOrCurrency === "object"
        ? patternOrCurrency.validationAddress
        : patternOrCurrency;
    if (pattern == null || pattern === "") {
      return true;
    }
    let regex: RegExp;
    try {
      regex = new RegExp(pattern);
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new SimpleSwapError(`Invalid address validation pattern: ${reason}`);
    }
    const match = regex.exec(address);
    return !!match && match.index === 0 && match[0].length === address.length;
  }

  /**
   * Retrieves all supported currencies and networks.
   *
   * @example
   * ```typescript
   * const currencies = await client.getCurrencies();
   * console.log(`Currencies count: ${currencies.length}`);
   * ```
   */
  async getCurrencies(): Promise<SimpleSwapCurrency[]> {
    return this.request<SimpleSwapCurrency[]>("GET", "/v3/currencies");
  }

  /** Alias of `getCurrencies` kept for callers coming from the legacy method name. */
  async getAllCurrencies(): Promise<SimpleSwapCurrency[]> {
    return this.getCurrencies();
  }

  /**
   * Retrieves details for a specific currency on a given network.
   *
   * @example
   * ```typescript
   * const btc = await client.getCurrency("btc", "btc");
   * console.log(`Currency: ${btc.name}`);
   * ```
   */
  async getCurrency(ticker: string, network: string): Promise<SimpleSwapCurrency> {
    return this.request<SimpleSwapCurrency>(
      "GET",
      `/v3/currencies/${encodeURIComponent(ticker)}/${encodeURIComponent(network)}`
    );
  }

  /**
   * Lists exchange pairs.
   * Call with no ticker to list every pair (`GET /v3/pairs`).
   * Call with ticker and network to list destinations for that currency.
   */
  async getPairs(ticker?: string, network?: string, params?: GetPairsParams): Promise<PairsMap> {
    if ((ticker === undefined) !== (network === undefined)) {
      throw new SimpleSwapError("getPairs requires both ticker and network, or neither for all pairs");
    }
    const query: Record<string, unknown> = {};
    if (params?.fixed !== undefined) {
      query.fixed = params.fixed;
    }
    const path =
      ticker === undefined || network === undefined
        ? "/v3/pairs"
        : `/v3/pairs/${encodeURIComponent(ticker)}/${encodeURIComponent(network)}`;
    return this.request<PairsMap>("GET", path, { params: query });
  }

  /** Alias of `getPairs()` with no ticker. */
  async getAllPairs(params?: GetPairsParams): Promise<PairsMap> {
    return this.getPairs(undefined, undefined, params);
  }

  /**
   * Retrieves estimated receiving amount for an exchange.
   *
   * @example
   * ```typescript
   * const estimate = await client.getEstimate({
   *   tickerFrom: "btc",
   *   tickerTo: "eth",
   *   networkFrom: "btc",
   *   networkTo: "eth",
   *   amount: "0.1",
   * });
   * console.log(`Estimated ETH: ${estimate.estimatedAmount}`);
   * ```
   */
  async getEstimate(params: GetEstimateParams): Promise<EstimateResult> {
    const query: Record<string, unknown> = {
      tickerFrom: params.tickerFrom,
      tickerTo: params.tickerTo,
      amount: String(params.amount),
    };
    if (params.networkFrom) query.networkFrom = params.networkFrom;
    if (params.networkTo) query.networkTo = params.networkTo;
    if (params.fixed !== undefined) query.fixed = params.fixed;
    if (params.reverse !== undefined) query.reverse = params.reverse;
    if (params.customFee !== undefined && params.customFee !== null) {
      query.customFee = String(params.customFee);
    }

    return this.request<EstimateResult>("GET", "/v3/estimates", { params: query });
  }

  /** Alias of `getEstimate` for the legacy `get_estimated` name. */
  async getEstimated(params: GetEstimateParams): Promise<EstimateResult> {
    return this.getEstimate(params);
  }

  /**
   * Retrieves deposit ranges (minimum and maximum amounts) for a pair.
   *
   * @example
   * ```typescript
   * const ranges = await client.getRanges({
   *   tickerFrom: "btc",
   *   tickerTo: "eth",
   *   networkFrom: "btc",
   *   networkTo: "eth",
   * });
   * console.log(`Min: ${ranges.min}, Max: ${ranges.max}`);
   * ```
   */
  async getRanges(params: GetRangesParams): Promise<RangesResult> {
    const query: Record<string, unknown> = {
      tickerFrom: params.tickerFrom,
      tickerTo: params.tickerTo,
    };
    if (params.networkFrom) query.networkFrom = params.networkFrom;
    if (params.networkTo) query.networkTo = params.networkTo;
    if (params.fixed !== undefined) query.fixed = params.fixed;
    if (params.reverse !== undefined) query.reverse = params.reverse;

    return this.request<RangesResult>("GET", "/v3/ranges", { params: query });
  }

  /**
   * Legacy name for the minimum deposit. Returns `getRanges().min`.
   */
  async getMin(params: GetRangesParams): Promise<string | null> {
    const ranges = await this.getRanges(params);
    if (ranges && typeof ranges === "object" && "min" in ranges) {
      return ranges.min ?? null;
    }
    return null;
  }

  /**
   * Checks if an exchange can be created with the specified parameters.
   *
   * @example
   * ```typescript
   * const check = await client.checkExchange({
   *   tickerFrom: "btc",
   *   tickerTo: "eth",
   *   networkFrom: "btc",
   *   networkTo: "eth",
   *   amount: "0.1",
   * });
   * console.log(`Can create: ${check.canCreate}`);
   * ```
   */
  async checkExchange(params: CheckExchangeParams): Promise<CheckExchangeResult> {
    const query: Record<string, unknown> = {
      tickerFrom: params.tickerFrom,
      tickerTo: params.tickerTo,
      amount: String(params.amount),
    };
    if (params.networkFrom) query.networkFrom = params.networkFrom;
    if (params.networkTo) query.networkTo = params.networkTo;
    if (params.fixed !== undefined) query.fixed = params.fixed;
    if (params.reverse !== undefined) query.reverse = params.reverse;

    const result = await this.request<CheckExchangeResult | boolean>("GET", "/v3/exchanges/check", {
      params: query,
    });
    if (typeof result === "boolean") {
      return { canCreate: result };
    }
    return result;
  }

  /**
   * Creates a cryptocurrency exchange order.
   *
   * @example
   * ```typescript
   * const order = await client.createExchange({
   *   tickerFrom: "btc",
   *   tickerTo: "eth",
   *   networkFrom: "btc",
   *   networkTo: "eth",
   *   amount: "0.1",
   *   addressTo: "0xReceiverEthereumAddress...",
   * });
   * console.log(`Deposit address: ${order.addressFrom}`);
   * ```
   */
  async createExchange(params: CreateExchangeParams): Promise<ExchangeOrder> {
    const payload: Record<string, unknown> = {
      tickerFrom: params.tickerFrom,
      tickerTo: params.tickerTo,
      amount: String(params.amount),
      addressTo: params.addressTo,
    };
    if (params.networkFrom) payload.networkFrom = params.networkFrom;
    if (params.networkTo) payload.networkTo = params.networkTo;
    if (params.fixed !== undefined) payload.fixed = params.fixed;
    if (params.reverse !== undefined) payload.reverse = params.reverse;
    if (params.extraIdTo) payload.extraIdTo = params.extraIdTo;
    if (params.userRefundAddress) payload.userRefundAddress = params.userRefundAddress;
    if (params.userRefundExtraId) payload.userRefundExtraId = params.userRefundExtraId;
    if (params.rateId) payload.rateId = params.rateId;
    if (params.customFee !== undefined && params.customFee !== null) {
      payload.customFee = params.customFee;
    }

    return this.request<ExchangeOrder>("POST", "/v3/exchanges", { data: payload });
  }

  /**
   * Confirms a provider-side deposit (`PUT /v3/exchanges`).
   * Use this when your service accepted the user's deposit and must hand the
   * transaction id to SimpleSwap. Wallet-to-deposit-address swaps do not need it.
   */
  async confirmExchange(params: ConfirmExchangeParams): Promise<ExchangeOrder> {
    const payload: Record<string, unknown> = { publicId: params.publicId };
    if (params.txFrom) payload.txFrom = params.txFrom;
    if (params.providerUserDepositAddress) {
      payload.providerUserDepositAddress = params.providerUserDepositAddress;
    }
    if (params.targetAddress) payload.targetAddress = params.targetAddress;
    return this.request<ExchangeOrder>("PUT", "/v3/exchanges", { data: payload });
  }

  /**
   * Retrieves details and status of an exchange by public id.
   *
   * @example
   * ```typescript
   * const order = await client.getExchange("exchange-id");
   * console.log(`Status: ${order.status}`);
   * ```
   */
  async getExchange(id: string): Promise<ExchangeOrder> {
    return this.request<ExchangeOrder>("GET", `/v3/exchanges/${encodeURIComponent(id)}`);
  }

  /**
   * Polls `getExchange` until the status matches or the timeout elapses.
   * The default stop set is finished, failed, refunded, and expired.
   */
  async waitForExchange(id: string, options: WaitForExchangeOptions = {}): Promise<ExchangeOrder> {
    const timeoutMs = options.timeoutMs ?? this.pollingTimeoutMs;
    const intervalMs = options.intervalMs ?? this.pollingIntervalMs;
    const statuses = new Set(options.statuses ?? TERMINAL_EXCHANGE_STATUSES);
    const started = Date.now();
    let last: ExchangeOrder | undefined;

    for (;;) {
      if (options.signal?.aborted) {
        throw new SimpleSwapError("Exchange wait was aborted", { code: "ABORTED", responseBody: last });
      }
      const order = await this.getExchange(id);
      last = order;
      options.onUpdate?.(order);
      if (statuses.has(order.status)) {
        return order;
      }
      if (Date.now() - started >= timeoutMs) {
        throw new SimpleSwapTimeoutError(
          `Timed out waiting for exchange ${id} (last status: ${order.status || "unknown"})`,
          { responseBody: order }
        );
      }
      if (options.signal?.aborted) {
        throw new SimpleSwapError("Exchange wait was aborted", { code: "ABORTED", responseBody: order });
      }
      await this.sleep(intervalMs);
    }
  }

  /**
   * Lists previous exchanges created by this account.
   *
   * @example
   * ```typescript
   * const exchanges = await client.getExchanges({ limit: 10 });
   * console.log(`Orders found: ${exchanges.length}`);
   * ```
   */
  async getExchanges(params?: GetExchangesParams): Promise<ExchangeOrder[]> {
    const query: Record<string, unknown> = {};
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.offset !== undefined) query.offset = params.offset;
    if (params?.startDate) query.startDate = params.startDate;
    if (params?.finishDate) query.finishDate = params.finishDate;
    return this.request<ExchangeOrder[]>("GET", "/v3/exchanges", { params: query });
  }

  /**
   * Fixed-rate market table (`GET /v3/market`): min, max, rate, miner fee, and rate id.
   */
  async getMarket(): Promise<MarketRate[]> {
    return this.request<MarketRate[]>("GET", "/v3/market");
  }

  /** Alias of `getMarket` for the legacy `get_market_info` name. */
  async getMarketInfo(): Promise<MarketRate[]> {
    return this.getMarket();
  }
}
