import axios, { AxiosError, AxiosInstance } from "axios";
import { StealthEXError } from "./errors.js";
import type {
  CreateExchangeParams,
  EstimateResult,
  ExchangeDetails,
  MinAmountResult,
  RangeResult,
  StealthEXClientOptions,
  StealthEXCurrency,
} from "./types.js";

/**
 * Client for interacting with the StealthEX cryptocurrency exchange API.
 */
export class StealthEX {
  private readonly apiKey?: string;
  private readonly http: AxiosInstance;

  /**
   * Creates an instance of the StealthEX client.
   *
   * @example
   * ```typescript
   * import { StealthEX } from "stealthex-client";
   *
   * const client = new StealthEX({ apiKey: "your-api-key" });
   * const currencies = await client.getCurrencies();
   * console.log(`Available currencies: ${currencies.length}`);
   * ```
   */
  constructor(options: StealthEXClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.STEALTHEX_API_KEY;
    const baseURL = (options.baseURL || "https://api.stealthex.io").replace(/\/+$/, "");
    const timeout = options.timeoutMs ?? 30000;
    const userAgent = options.userAgent || "stealthex-client/0.1.0";

    const headers: Record<string, string> = {
      "User-Agent": userAgent,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
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
      const query: Record<string, unknown> = {
        ...(this.apiKey && { api_key: this.apiKey }),
        ...options?.params,
      };

      const response = await this.http.request<T>({
        method,
        url: path,
        params: query,
        data: options?.data,
      });

      return response.data;
    } catch (err: unknown) {
      if (err instanceof StealthEXError) {
        throw err;
      }
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
        const data = axiosErr.response?.data;
        const status = axiosErr.response?.status;
        const msg =
          (typeof data === "object" && data !== null && (data.message || data.error)) ||
          axiosErr.message ||
          "StealthEX API request failed";

        throw new StealthEXError(String(msg), {
          statusCode: status,
          responseBody: data,
        });
      }
      throw new StealthEXError(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Retrieves all supported currencies and networks.
   *
   * @example
   * ```typescript
   * const currencies = await client.getCurrencies();
   * console.log(`Currencies: ${currencies.length}`);
   * ```
   */
  async getCurrencies(params?: { fixed?: boolean }): Promise<StealthEXCurrency[]> {
    return this.request<StealthEXCurrency[]>("GET", "/api/v2/currency", {
      params: params ? { fixed: params.fixed } : undefined,
    });
  }

  /**
   * Retrieves information for a single currency by symbol.
   *
   * @example
   * ```typescript
   * const btc = await client.getCurrency("btc");
   * console.log(`Currency: ${btc.name}`);
   * ```
   */
  async getCurrency(symbol: string): Promise<StealthEXCurrency> {
    return this.request<StealthEXCurrency>(
      "GET",
      `/api/v2/currency/${encodeURIComponent(symbol)}`
    );
  }

  /**
   * Retrieves available pairs for exchange.
   *
   * @example
   * ```typescript
   * const pairs = await client.getPairs("btc");
   * console.log(`Pairs for BTC: ${pairs.length}`);
   * ```
   */
  async getPairs(symbol?: string): Promise<string[]> {
    const path = symbol
      ? `/api/v2/pairs/${encodeURIComponent(symbol)}`
      : "/api/v2/pairs";
    return this.request<string[]>("GET", path);
  }

  /**
   * Retrieves minimum and maximum deposit range for a pair.
   *
   * @example
   * ```typescript
   * const range = await client.getRange("btc", "eth");
   * console.log(`Min: ${range.min_amount}`);
   * ```
   */
  async getRange(
    fromCurrency: string,
    toCurrency: string,
    fixed?: boolean
  ): Promise<RangeResult> {
    return this.request<RangeResult>(
      "GET",
      `/api/v2/range/${encodeURIComponent(fromCurrency)}/${encodeURIComponent(toCurrency)}`,
      { params: fixed !== undefined ? { fixed } : undefined }
    );
  }

  /**
   * Retrieves minimal deposit amount required for a pair.
   *
   * @example
   * ```typescript
   * const min = await client.getMinAmount("btc", "eth");
   * console.log(`Minimal amount: ${min.min_amount}`);
   * ```
   */
  async getMinAmount(
    fromCurrency: string,
    toCurrency: string,
    fixed?: boolean
  ): Promise<MinAmountResult> {
    return this.request<MinAmountResult>(
      "GET",
      `/api/v2/min/${encodeURIComponent(fromCurrency)}/${encodeURIComponent(toCurrency)}`,
      { params: fixed !== undefined ? { fixed } : undefined }
    );
  }

  /**
   * Retrieves estimated return amount for an exchange pair.
   *
   * @example
   * ```typescript
   * const est = await client.getEstimate("btc", "eth", "0.1");
   * console.log(`Estimated ETH: ${est.estimated_amount}`);
   * ```
   */
  async getEstimate(
    fromCurrency: string,
    toCurrency: string,
    amount: number | string,
    fixed?: boolean
  ): Promise<EstimateResult> {
    return this.request<EstimateResult>(
      "GET",
      `/api/v2/estimate/${encodeURIComponent(fromCurrency)}/${encodeURIComponent(toCurrency)}`,
      {
        params: {
          amount: String(amount),
          ...(fixed !== undefined && { fixed }),
        },
      }
    );
  }

  /**
   * Creates a cryptocurrency exchange order.
   *
   * @example
   * ```typescript
   * const order = await client.createExchange({
   *   currencyFrom: "btc",
   *   currencyTo: "eth",
   *   amountFrom: "0.1",
   *   addressTo: "0xReceiverEthereumAddress...",
   * });
   * console.log(`Deposit address: ${order.address_from}`);
   * ```
   */
  async createExchange(params: CreateExchangeParams): Promise<ExchangeDetails> {
    const payload: Record<string, unknown> = {
      currency_from: params.currencyFrom,
      currency_to: params.currencyTo,
      amount_from: String(params.amountFrom),
      address_to: params.addressTo,
    };
    if (params.amountTo !== undefined) payload.amount_to = String(params.amountTo);
    if (params.extraIdTo) payload.extra_id_to = params.extraIdTo;
    if (params.refundAddress) payload.refund_address = params.refundAddress;
    if (params.refundExtraId) payload.refund_extra_id = params.refundExtraId;
    if (params.rateId) payload.rate_id = params.rateId;
    if (params.fixed !== undefined) payload.fixed = params.fixed;
    if (params.referral) payload.referral = params.referral;

    return this.request<ExchangeDetails>("POST", "/api/v2/exchange", { data: payload });
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
  async getExchange(id: string): Promise<ExchangeDetails> {
    return this.request<ExchangeDetails>(
      "GET",
      `/api/v2/exchange/${encodeURIComponent(id)}`
    );
  }

  /**
   * Lists past transactions.
   *
   * @example
   * ```typescript
   * const txs = await client.getExchanges(10);
   * console.log(`Transactions found: ${txs.length}`);
   * ```
   */
  async getExchanges(limit?: number): Promise<ExchangeDetails[]> {
    return this.request<ExchangeDetails[]>("GET", "/api/v2/exchanges/", {
      params: limit !== undefined ? { limit } : undefined,
    });
  }
}
