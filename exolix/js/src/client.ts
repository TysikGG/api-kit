import axios, { AxiosError, AxiosInstance } from "axios";
import { ExolixError } from "./errors.js";
import type {
  CreateTransactionParams,
  Currency,
  ExolixClientOptions,
  GetCurrenciesParams,
  GetNetworksParams,
  GetRateParams,
  GetTransactionsParams,
  Network,
  Paginated,
  Rate,
  Transaction,
} from "./types.js";

/**
 * Header that carries the affiliate API key.
 *
 * Partner attribution is the API key itself. The default affiliate share is
 * 0.3%. There is no referral parameter.
 */
export const EXOLIX_API_KEY_HEADER = "Authorization";

const DEFAULT_BASE_URL = "https://exolix.com/api/v2";

function definedParams(input: Record<string, unknown>): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        continue;
      }
      params[key] = value.join(",");
      continue;
    }
    params[key] = typeof value === "boolean" ? String(value) : value;
  }
  return params;
}

function amountValue(value: number | string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return String(value);
}

function readError(data: unknown, fallback: string): { message: string; code?: string } {
  if (typeof data === "string" && data.trim()) {
    return { message: data.trim() };
  }
  if (data && typeof data === "object") {
    const body = data as { message?: unknown; error?: unknown };
    const codeSource = body.error;
    const code = codeSource === undefined || codeSource === null ? undefined : String(codeSource);
    let messageSource: unknown = body.message ?? body.error;
    if (Array.isArray(messageSource)) {
      messageSource = messageSource.map((item) => String(item)).join(", ");
    }
    const message =
      messageSource === undefined || messageSource === null || messageSource === ""
        ? fallback
        : String(messageSource);
    return { message, code };
  }
  return { message: fallback };
}

/**
 * Client for the Exolix cryptocurrency exchange API (v2).
 */
export class Exolix {
  private readonly apiKey?: string;
  private readonly http: AxiosInstance;

  /**
   * Creates an instance of the Exolix client.
   *
   * The affiliate API key is optional for public reads and required for
   * transaction history. Pass it as `apiKey`. It is sent only in the
   * `Authorization` header and is not read from the environment.
   *
   * @example
   * ```typescript
   * import { Exolix } from "exolix-client";
   *
   * const client = new Exolix({ apiKey: "your-api-key" });
   * const currencies = await client.getCurrencies({ page: 1, size: 10 });
   * console.log(`Available currencies: ${currencies.count}`);
   * ```
   */
  constructor(options: ExolixClientOptions = {}) {
    this.apiKey = options.apiKey;
    const baseURL = (options.baseURL || DEFAULT_BASE_URL).replace(/\/+$/, "");
    const timeout = options.timeoutMs ?? 30000;
    const userAgent = options.userAgent || "exolix-client/0.1.0";

    const headers: Record<string, string> = {
      "User-Agent": userAgent,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers[EXOLIX_API_KEY_HEADER] = this.apiKey;
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
      const response = await this.http.request<T>({
        method,
        url: path,
        params: options?.params,
        data: options?.data,
      });
      return response.data;
    } catch (err: unknown) {
      if (err instanceof ExolixError) {
        throw err;
      }
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError;
        const data = axiosErr.response?.data;
        const status = axiosErr.response?.status;
        const parsed = readError(data, axiosErr.message || "Exolix API request failed");
        throw new ExolixError(parsed.message, {
          statusCode: status,
          code: parsed.code,
          responseBody: data,
        });
      }
      throw new ExolixError(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Lists currencies. Set `withNetworks` to include each coin's networks.
   *
   * @example
   * ```typescript
   * const page = await client.getCurrencies({ search: "BTC", withNetworks: true });
   * console.log(page.data[0].code);
   * ```
   */
  async getCurrencies(params: GetCurrenciesParams = {}): Promise<Paginated<Currency>> {
    return this.request<Paginated<Currency>>("GET", "/currencies", {
      params: definedParams({
        page: params.page,
        size: params.size,
        search: params.search,
        withNetworks: params.withNetworks,
      }),
    });
  }

  /**
   * Lists networks for one currency code.
   *
   * @example
   * ```typescript
   * const networks = await client.getCurrencyNetworks("ETH");
   * console.log(networks[0].network);
   * ```
   */
  async getCurrencyNetworks(code: string): Promise<Network[]> {
    return this.request<Network[]>("GET", `/currencies/${encodeURIComponent(code)}/networks`);
  }

  /**
   * Lists every network in the catalog.
   *
   * @example
   * ```typescript
   * const networks = await client.getNetworks({ page: 1, size: 50 });
   * console.log(networks.count);
   * ```
   */
  async getNetworks(params: GetNetworksParams = {}): Promise<Paginated<Network>> {
    return this.request<Paginated<Network>>("GET", "/currencies/networks", {
      params: definedParams({
        page: params.page,
        size: params.size,
        search: params.search,
      }),
    });
  }

  /**
   * Quotes a fixed or floating rate.
   *
   * Pass `amount` for the deposit size, or `withdrawalAmount` for the size
   * you want to receive. Partner attribution is the API key, not a query field.
   *
   * @example
   * ```typescript
   * const quote = await client.getRate({
   *   coinFrom: "BTC",
   *   coinTo: "ETH",
   *   amount: "0.1",
   *   rateType: "float",
   * });
   * console.log(quote.toAmount);
   * ```
   */
  async getRate(params: GetRateParams): Promise<Rate> {
    return this.request<Rate>("GET", "/rate", {
      params: definedParams({
        coinFrom: params.coinFrom,
        networkFrom: params.networkFrom,
        coinTo: params.coinTo,
        networkTo: params.networkTo,
        amount: amountValue(params.amount),
        withdrawalAmount: amountValue(params.withdrawalAmount),
        rateType: params.rateType,
      }),
    });
  }

  /**
   * Creates an exchange and returns the deposit address.
   *
   * This sends funds instructions to Exolix. Call it only when a swap should
   * actually be opened.
   *
   * @example
   * ```typescript
   * const tx = await client.createTransaction({
   *   coinFrom: "ETH",
   *   networkFrom: "ETH",
   *   coinTo: "USDT",
   *   networkTo: "ETH",
   *   amount: 0.5,
   *   withdrawalAddress: "0x0E29D1E501f90649Ad5982E900c455006e4522FC",
   *   rateType: "float",
   * });
   * console.log(tx.depositAddress);
   * ```
   */
  async createTransaction(params: CreateTransactionParams): Promise<Transaction> {
    return this.request<Transaction>("POST", "/transactions", {
      data: definedParams({
        coinFrom: params.coinFrom,
        networkFrom: params.networkFrom,
        coinTo: params.coinTo,
        networkTo: params.networkTo,
        amount: params.amount,
        withdrawalAmount: params.withdrawalAmount,
        withdrawalAddress: params.withdrawalAddress,
        withdrawalExtraId: params.withdrawalExtraId,
        rateType: params.rateType,
        refundAddress: params.refundAddress,
        refundExtraId: params.refundExtraId,
        slippage: params.slippage,
      }),
    });
  }

  /**
   * Fetches one transaction by id.
   *
   * @example
   * ```typescript
   * const tx = await client.getTransaction("ab93061434dd0s");
   * console.log(tx.status);
   * ```
   */
  async getTransaction(id: string): Promise<Transaction> {
    return this.request<Transaction>("GET", `/transactions/${encodeURIComponent(id)}`);
  }

  /**
   * Lists transaction history for the affiliate API key.
   *
   * Exolix enables this route per key. A rejected request means history is
   * not activated for that key.
   *
   * @example
   * ```typescript
   * const history = await client.getTransactions({ page: 1, size: 25, order: "desc" });
   * console.log(history.count);
   * ```
   */
  async getTransactions(params: GetTransactionsParams = {}): Promise<Paginated<Transaction>> {
    return this.request<Paginated<Transaction>>("GET", "/transactions", {
      params: definedParams({
        page: params.page,
        size: params.size,
        search: params.search,
        sort: params.sort,
        order: params.order,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        statuses: params.statuses,
      }),
    });
  }
}
