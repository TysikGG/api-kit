import axios, { AxiosError, AxiosInstance } from "axios";
import { ChangeNowError } from "./errors.js";
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

function readError(data: unknown, fallback: string): { message: string; code?: string } {
  if (typeof data === "string" && data.trim()) {
    return { message: data.trim() };
  }
  if (data && typeof data === "object") {
    const body = data as { message?: unknown; error?: unknown; code?: unknown };
    const codeSource = body.error ?? body.code;
    const code = codeSource === undefined || codeSource === null ? undefined : String(codeSource);
    const messageSource = body.message ?? body.error ?? body.code;
    const message =
      messageSource === undefined || messageSource === null || messageSource === ""
        ? fallback
        : String(messageSource);
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
    const timeout = options.timeoutMs ?? 30000;
    const userAgent = options.userAgent || "changenow-client/0.1.0";

    const headers: Record<string, string> = {
      "User-Agent": userAgent,
      Accept: "application/json",
      "Content-Type": "application/json",
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
      if (err instanceof ChangeNowError) {
        throw err;
      }
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError;
        const data = axiosErr.response?.data;
        const status = axiosErr.response?.status;
        const parsed = readError(data, axiosErr.message || "ChangeNOW API request failed");
        throw new ChangeNowError(parsed.message, {
          statusCode: status,
          code: parsed.code,
          responseBody: data,
        });
      }
      throw new ChangeNowError(err instanceof Error ? err.message : String(err));
    }
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
}
