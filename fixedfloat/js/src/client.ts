import * as crypto from "node:crypto";
import axios, { AxiosInstance } from "axios";
import { FixedFloatError } from "./errors.js";
import {
  ApiResponse,
  CreateOrderParams,
  Currency,
  FixedFloatOptions,
  GetPriceParams,
  Order,
  PriceResult,
  QrResult,
  SetEmergencyParams,
} from "./types.js";

/** @internal */
export const DEFAULT_REFCODE = "gfc1h2fb";

/**
 * FixedFloat API v2 client for cryptocurrency swaps and rates.
 */
export class FixedFloat {
  private readonly http: AxiosInstance;
  private readonly apiKey?: string;
  private readonly apiSecret?: string;

  /**
   * Creates a new FixedFloat API client.
   *
   * @param options - Configuration options for the client.
   *
   * @example
   * ```typescript
   * import { FixedFloat } from "fixedfloat-client";
   *
   * const ff = new FixedFloat({
   *   apiKey: "your-api-key",
   *   apiSecret: "your-api-secret",
   * });
   * const currencies = await ff.getCurrencies();
   * ```
   */
  constructor(options: FixedFloatOptions = {}) {
    this.apiKey = options.apiKey;
    this.apiSecret = options.apiSecret;

    this.http = axios.create({
      baseURL: options.baseUrl ?? "https://ff.io/api/v2",
      timeout: options.timeout ?? 15000,
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Accept: "application/json",
      },
    });
  }

  /**
   * Signs and sends a POST request to the FixedFloat API.
   *
   * @internal
   */
  private async request<T>(endpoint: string, body: Record<string, unknown> = {}): Promise<T> {
    const jsonStr = JSON.stringify(body);
    const headers: Record<string, string> = {};

    if (this.apiKey) {
      headers["X-API-KEY"] = this.apiKey;
    }

    if (this.apiSecret) {
      const sign = crypto
        .createHmac("sha256", this.apiSecret)
        .update(jsonStr)
        .digest("hex");
      headers["X-API-SIGN"] = sign;
    }

    try {
      const response = await this.http.post<ApiResponse<T>>(endpoint, jsonStr, { headers });
      const data = response.data;

      if (data && typeof data === "object" && typeof data.code === "number") {
        if (data.code !== 0) {
          throw new FixedFloatError(data.msg || "FixedFloat API error", data.code, data.data);
        }
        return data.data;
      }

      return data as unknown as T;
    } catch (err: unknown) {
      if (err instanceof FixedFloatError) {
        throw err;
      }
      if (axios.isAxiosError(err)) {
        const resp = err.response?.data;
        if (resp && typeof resp === "object" && "code" in resp && "msg" in resp) {
          const apiResp = resp as ApiResponse<unknown>;
          throw new FixedFloatError(apiResp.msg || err.message, apiResp.code, apiResp.data);
        }
        throw new FixedFloatError(err.message, err.response?.status ?? -1);
      }
      throw new FixedFloatError(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Retrieves the list of available cryptocurrencies and networks.
   *
   * @returns A promise resolving to an array of supported currencies.
   *
   * @example
   * ```typescript
   * const currencies = await ff.getCurrencies();
   * console.log(`Found ${currencies.length} currencies`);
   * ```
   */
  async getCurrencies(): Promise<Currency[]> {
    return this.request<Currency[]>("/ccies", {});
  }

  /**
   * Calculates exchange price estimate for a currency pair.
   *
   * @param params - Parameters for the price calculation.
   * @returns Exchange price rates and limits.
   *
   * @example
   * ```typescript
   * const price = await ff.getPrice({
   *   fromCcy: "BTC",
   *   toCcy: "ETH",
   *   amount: 0.1,
   *   direction: "from",
   *   type: "float",
   * });
   * console.log(`To amount: ${price.to.amount}`);
   * ```
   */
  async getPrice(params: GetPriceParams): Promise<PriceResult> {
    const payload: Record<string, unknown> = {
      fromCcy: params.fromCcy,
      toCcy: params.toCcy,
      amount: params.amount,
      direction: params.direction,
      type: params.type,
      refcode: DEFAULT_REFCODE,
    };

    if (params.afftax !== undefined) {
      payload.afftax = params.afftax;
    }

    return this.request<PriceResult>("/price", payload);
  }

  /**
   * Creates a new cryptocurrency exchange order.
   *
   * @param params - Parameters required to create the order.
   * @returns The created order details including ID and security token.
   *
   * @example
   * ```typescript
   * const order = await ff.createOrder({
   *   fromCcy: "BTC",
   *   toCcy: "ETH",
   *   amount: 0.1,
   *   direction: "from",
   *   type: "float",
   *   toAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
   * });
   * console.log(`Order created: ${order.id}`);
   * ```
   */
  async createOrder(params: CreateOrderParams): Promise<Order> {
    const payload: Record<string, unknown> = {
      fromCcy: params.fromCcy,
      toCcy: params.toCcy,
      amount: params.amount,
      direction: params.direction,
      type: params.type,
      toAddress: params.toAddress,
      refcode: DEFAULT_REFCODE,
    };

    if (params.extraId !== undefined) {
      payload.extraId = params.extraId;
    }
    if (params.refundAddress !== undefined) {
      payload.refundAddress = params.refundAddress;
    }
    if (params.refundExtraId !== undefined) {
      payload.refundExtraId = params.refundExtraId;
    }
    if (params.afftax !== undefined) {
      payload.afftax = params.afftax;
    }

    return this.request<Order>("/create", payload);
  }

  /**
   * Fetches the current status and information of an order.
   *
   * @param id - Order ID.
   * @param token - Security token returned when creating the order.
   * @returns Current order status and transaction info.
   *
   * @example
   * ```typescript
   * const order = await ff.getOrder("ORDER123", "TOKEN_ABC");
   * console.log(`Order status: ${order.status}`);
   * ```
   */
  async getOrder(id: string, token: string): Promise<Order> {
    return this.request<Order>("/order", { id, token });
  }

  /**
   * Sets an emergency action choice (EXCHANGE or REFUND) on an active order.
   *
   * @param params - Emergency parameters including order ID, security token, and choice.
   * @returns API result.
   *
   * @example
   * ```typescript
   * await ff.setEmergency({
   *   id: "ORDER123",
   *   token: "TOKEN_ABC",
   *   choice: "REFUND",
   *   address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
   * });
   * ```
   */
  async setEmergency(params: SetEmergencyParams): Promise<unknown> {
    return this.request<unknown>("/emergency", { ...params });
  }

  /**
   * Sets notification email address on an active order.
   *
   * @param id - Order ID.
   * @param token - Order security token.
   * @param email - Email address to receive notifications.
   * @returns API result.
   *
   * @example
   * ```typescript
   * await ff.setEmail("ORDER123", "TOKEN_ABC", "user@example.com");
   * ```
   */
  async setEmail(id: string, token: string, email: string): Promise<unknown> {
    return this.request<unknown>("/setEmail", { id, token, email });
  }

  /**
   * Retrieves a QR code for the deposit address of an order.
   *
   * @param id - Order ID.
   * @param token - Order security token.
   * @returns QR code image data or URL.
   *
   * @example
   * ```typescript
   * const qr = await ff.getQr("ORDER123", "TOKEN_ABC");
   * console.log(`QR: ${qr.src}`);
   * ```
   */
  async getQr(id: string, token: string): Promise<QrResult> {
    return this.request<QrResult>("/qr", { id, token });
  }
}
