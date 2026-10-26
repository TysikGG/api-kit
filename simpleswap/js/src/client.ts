import axios, { AxiosError, AxiosInstance } from "axios";
import { SimpleSwapError } from "./errors.js";
import type {
  CheckExchangeParams,
  CheckExchangeResult,
  CreateExchangeParams,
  EstimateResult,
  ExchangeOrder,
  GetEstimateParams,
  GetExchangesParams,
  GetRangesParams,
  RangesResult,
  SimpleSwapClientOptions,
  SimpleSwapCurrency,
} from "./types.js";

/**
 * Client for interacting with the SimpleSwap cryptocurrency exchange API (v3).
 */
export class SimpleSwap {
  private readonly apiKey?: string;
  private readonly http: AxiosInstance;

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
    const baseURL = (options.baseURL || "https://api.simpleswap.io").replace(/\/+$/, "");
    const timeout = options.timeoutMs ?? 30000;
    const userAgent = options.userAgent || "simpleswap-client/0.1.0";

    const headers: Record<string, string> = {
      "User-Agent": userAgent,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }

    this.http = axios.create({
      baseURL,
      timeout,
      headers,
    });
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    options?: { params?: Record<string, unknown>; data?: unknown }
  ): Promise<T> {
    try {
      const response = await this.http.request<{
        traceId?: string;
        result?: T;
        error?: boolean;
        message?: string;
      }>({
        method,
        url: path,
        params: options?.params,
        data: options?.data,
      });

      const body = response.data;
      if (body && typeof body === "object" && body.error === true) {
        throw new SimpleSwapError(body.message || "SimpleSwap error", {
          statusCode: response.status,
          traceId: body.traceId,
          responseBody: body,
        });
      }

      if (body && typeof body === "object" && "result" in body) {
        return body.result as T;
      }

      return body as unknown as T;
    } catch (err: unknown) {
      if (err instanceof SimpleSwapError) {
        throw err;
      }
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError<{
          message?: string;
          error?: boolean;
          traceId?: string;
        }>;
        const data = axiosErr.response?.data;
        const status = axiosErr.response?.status;
        const msg =
          (typeof data === "object" && data !== null && data.message) ||
          axiosErr.message ||
          "SimpleSwap request failed";
        const traceId = typeof data === "object" && data !== null ? data.traceId : undefined;

        throw new SimpleSwapError(String(msg), {
          statusCode: status,
          traceId,
          responseBody: data,
        });
      }
      throw new SimpleSwapError(err instanceof Error ? err.message : String(err));
    }
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

    return this.request<CheckExchangeResult>("GET", "/v3/exchanges/check", { params: query });
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
   * Retrieves details and status of an exchange by ID.
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
   * Lists previous exchanges created by this account.
   *
   * @example
   * ```typescript
   * const exchanges = await client.getExchanges({ limit: 10 });
   * console.log(`Orders found: ${exchanges.length}`);
   * ```
   */
  async getExchanges(params?: GetExchangesParams): Promise<ExchangeOrder[]> {
    return this.request<ExchangeOrder[]>("GET", "/v3/exchanges", {
      params: params as unknown as Record<string, unknown>,
    });
  }
}
