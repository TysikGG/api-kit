import axios, { AxiosError, AxiosInstance } from "axios";
import { SwapzoneError } from "./errors.js";
import type {
  CreateTransactionParams,
  DEXBlockchain,
  DEXQuoteParams,
  GetRateParams,
  RateOffer,
  SupportedCurrency,
  SwapzoneClientOptions,
  TransactionResult,
  TransactionStatus,
  ValidateAddressParams,
  ValidateAddressResult,
} from "./types.js";

/**
 * Client for interacting with the Swapzone cryptocurrency exchange API.
 */
export class Swapzone {
  private readonly apiKey?: string;
  private readonly http: AxiosInstance;

  /**
   * Creates an instance of the Swapzone client.
   *
   * @example
   * ```typescript
   * import { Swapzone } from "swapzone-client";
   *
   * const client = new Swapzone({ apiKey: "your-api-key" });
   * const currencies = await client.getCurrencies();
   * console.log(`Supported currencies: ${currencies.length}`);
   * ```
   */
  constructor(options: SwapzoneClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.SWAPZONE_API_KEY;
    const baseURL = (options.baseURL || "https://api.swapzone.io").replace(/\/+$/, "");
    const timeout = options.timeoutMs ?? 30000;
    const userAgent = options.userAgent || "swapzone-client/0.1.0";

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
      const response = await this.http.request<T>({
        method,
        url: path,
        params: options?.params,
        data: options?.data,
      });

      const data = response.data;
      if (data && typeof data === "object" && "error" in data) {
        const errorVal = (data as { error: unknown; message?: string }).error;
        if (errorVal === true) {
          throw new SwapzoneError(
            (data as { message?: string }).message || "Swapzone API error",
            {
              statusCode: response.status,
              responseBody: data,
            }
          );
        }
      }

      return data;
    } catch (err: unknown) {
      if (err instanceof SwapzoneError) {
        throw err;
      }
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError<{ message?: string; error?: boolean }>;
        const data = axiosErr.response?.data;
        const status = axiosErr.response?.status;
        const msg =
          (typeof data === "object" && data !== null && data.message) ||
          axiosErr.message ||
          "Swapzone network error";

        throw new SwapzoneError(String(msg), {
          statusCode: status,
          responseBody: data,
        });
      }
      throw new SwapzoneError(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Retrieves all supported currencies across instant exchange adapters.
   *
   * @example
   * ```typescript
   * const currencies = await client.getCurrencies();
   * console.log(`Available currencies: ${currencies.length}`);
   * ```
   */
  async getCurrencies(): Promise<SupportedCurrency[]> {
    return this.request<SupportedCurrency[]>("GET", "/v1/exchange/currencies");
  }

  /**
   * Retrieves the best or all rate offers for exchanging between two assets.
   *
   * @example
   * ```typescript
   * const rate = await client.getRate({
   *   from: "btc",
   *   to: "eth",
   *   amount: "0.1",
   * });
   * console.log(`Estimated ETH: ${rate.amountTo} (via ${rate.adapter})`);
   * ```
   */
  async getRate(params: GetRateParams): Promise<RateOffer> {
    const query: Record<string, unknown> = {
      from: params.from,
      to: params.to,
      amount: String(params.amount),
    };
    if (params.rateType) query.rateType = params.rateType;
    if (params.availableInUSA !== undefined) query.availableInUSA = params.availableInUSA;
    if (params.chooseRate) query.chooseRate = params.chooseRate;
    if (params.noRefundAddress !== undefined) query.noRefundAddress = params.noRefundAddress;
    if (params.fromNetwork) query.fromNetwork = params.fromNetwork;
    if (params.toNetwork) query.toNetwork = params.toNetwork;
    if (params.amountTo !== undefined) query.amountTo = String(params.amountTo);
    if (params.timeout !== undefined) query.timeout = String(params.timeout);

    return this.request<RateOffer>("GET", "/v1/exchange/get-rate", { params: query });
  }

  /**
   * Creates an exchange transaction order with a selected provider.
   *
   * @example
   * ```typescript
   * const order = await client.createTransaction({
   *   from: "btc",
   *   to: "eth",
   *   amountDeposit: "0.1",
   *   addressReceive: "0xReceiverAddress...",
   *   quotaId: rate.quotaId,
   * });
   * console.log(`Deposit address: ${order.addressDeposit}`);
   * ```
   */
  async createTransaction(params: CreateTransactionParams): Promise<TransactionResult> {
    return this.request<TransactionResult>("POST", "/v1/exchange/create", {
      data: params,
    });
  }

  /**
   * Retrieves the current status of an exchange transaction.
   *
   * @example
   * ```typescript
   * const status = await client.getTransaction("transaction-id");
   * console.log(`Transaction status: ${status.status}`);
   * ```
   */
  async getTransaction(id: string): Promise<TransactionStatus> {
    return this.request<TransactionStatus>("GET", "/v1/exchange/tx", {
      params: { id },
    });
  }

  /**
   * Validates a cryptocurrency recipient address.
   *
   * @example
   * ```typescript
   * const res = await client.validateAddress({
   *   currency: "eth",
   *   network: "ETH",
   *   address: "0x57f31ad4b64095347F87eDB1675566DAfF5EC886",
   * });
   * console.log(`Address valid: ${res.result}`);
   * ```
   */
  async validateAddress(params: ValidateAddressParams): Promise<ValidateAddressResult> {
    return this.request<ValidateAddressResult>("GET", "/v1/exchange/validate/address", {
      params: {
        currency: params.currency,
        address: params.address,
        ...(params.network && { network: params.network }),
      },
    });
  }

  /**
   * Retrieves bulk rate markets for instant exchange pairs.
   *
   * @example
   * ```typescript
   * const markets = await client.getMarkets("fixed");
   * console.log(`Markets count: ${markets.length}`);
   * ```
   */
  async getMarkets(rateType?: "all" | "fixed" | "floating"): Promise<unknown[]> {
    return this.request<unknown[]>("GET", "/v1/exchange/markets", {
      params: rateType ? { rateType } : undefined,
    });
  }

  /**
   * Retrieves supported blockchains for decentralized (DEX) swaps.
   *
   * @example
   * ```typescript
   * const chains = await client.getDEXBlockchains();
   * console.log(`DEX blockchains: ${chains.length}`);
   * ```
   */
  async getDEXBlockchains(): Promise<DEXBlockchain[]> {
    const res = await this.request<{ error: boolean; result: DEXBlockchain[] }>(
      "GET",
      "/v1/dex/blockchains"
    );
    return res.result || [];
  }

  /**
   * Retrieves supported tokens for DEX swaps.
   *
   * @example
   * ```typescript
   * const tokens = await client.getDEXTokens();
   * console.log(`DEX tokens: ${tokens.length}`);
   * ```
   */
  async getDEXTokens(): Promise<unknown[]> {
    const res = await this.request<{ error: boolean; result: unknown[] }>(
      "GET",
      "/v1/dex/tokens"
    );
    return res.result || [];
  }

  /**
   * Gets a cross-chain or on-chain DEX quote.
   *
   * @example
   * ```typescript
   * const quote = await client.getDEXQuote({
   *   fromChainId: 1,
   *   toChainId: 56,
   *   fromTokenAddress: "0x...",
   *   toTokenAddress: "0x...",
   *   fromAmount: "0.05",
   * });
   * ```
   */
  async getDEXQuote(params: DEXQuoteParams): Promise<unknown> {
    return this.request<unknown>("GET", "/v1/dex/quote", { params: params as unknown as Record<string, unknown> });
  }

  /**
   * Gets the status of a DEX swap.
   *
   * @example
   * ```typescript
   * const status = await client.getDEXSwapStatus("swap-id");
   * ```
   */
  async getDEXSwapStatus(swapId: string, fromHash?: string): Promise<unknown> {
    return this.request<unknown>("GET", "/v1/dex/status", {
      params: { swapId, ...(fromHash && { fromHash }) },
    });
  }
}
