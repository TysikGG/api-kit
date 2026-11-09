import axios, { AxiosError, AxiosInstance } from "axios";
import { createSteelProxyError, SteelProxyError } from "./errors.js";
import {
  APIResponse,
  CreatedOrder,
  CreateOrderParams,
  CreateOrderWebhookParams,
  ExtendedOrder,
  ExtendOrderParams,
  GetLocationsParams,
  GetOrdersParams,
  GetPricesParams,
  GetTermsParams,
  LocationItem,
  OrderDetail,
  OrderList,
  PriceItem,
  ProxyTypeItem,
  SteelProxyClientOptions,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.steelproxy.com/v1";

/**
 * Client for the Steel Proxy Reseller and Franchise API.
 */
export class SteelProxy {
  private readonly apiKey?: string;
  private readonly http: AxiosInstance;

  /**
   * Creates an instance of the SteelProxy client.
   *
   * @param options - Configuration options for the client.
   *
   * @example
   * ```typescript
   * import { SteelProxy } from "steelproxy";
   *
   * const client = new SteelProxy({ apiKey: "sp_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXX" });
   * const types = await client.getProxyTypes();
   * console.log(types);
   * ```
   */
  constructor(options: SteelProxyClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.STEELPROXY_API_KEY;
    const baseURL = (options.baseURL || DEFAULT_BASE_URL).replace(/\/+$/, "");
    const timeout = options.timeoutMs ?? 30000;
    const userAgent = options.userAgent || "steelproxy/0.1.0";

    const headers: Record<string, string> = {
      "User-Agent": userAgent,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    this.http = axios.create({
      baseURL,
      timeout,
      headers,
    });
  }

  /**
   * Internal request handler with response envelope unpacking and error handling.
   */
  private async request<T>(
    method: "GET" | "POST",
    path: string,
    options?: {
      params?: Record<string, unknown>;
      data?: unknown;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    try {
      const response = await this.http.request<APIResponse<T> | T>({
        method,
        url: path,
        params: options?.params,
        data: options?.data,
        headers: options?.headers,
      });

      const body = response.data;
      if (body && typeof body === "object" && "status" in body) {
        const envelope = body as APIResponse<T>;
        if (typeof envelope.status === "number" && envelope.status >= 400) {
          throw createSteelProxyError(envelope.status, envelope);
        }
        if ("data" in envelope) {
          return envelope.data;
        }
      }

      return body as T;
    } catch (err: unknown) {
      if (err instanceof SteelProxyError) {
        throw err;
      }
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError<unknown>;
        const status = axiosErr.response?.status;
        const resData = axiosErr.response?.data;
        throw createSteelProxyError(status, resData, axiosErr.message);
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new SteelProxyError(message);
    }
  }

  /**
   * Retrieves the list of available proxy categories (server, residential, rotation).
   *
   * @returns Array of proxy categories with code and title.
   *
   * @example
   * ```typescript
   * import { SteelProxy } from "steelproxy";
   *
   * const client = new SteelProxy();
   * const types = await client.getProxyTypes();
   * for (const t of types) {
   *   console.log(`${t.code}: ${t.title}`);
   * }
   * ```
   */
  async getProxyTypes(): Promise<ProxyTypeItem[]> {
    return this.request<ProxyTypeItem[]>("GET", "/proxy-types");
  }

  /**
   * Retrieves locations (nodes) with available duration options.
   *
   * @param params - Optional filter by proxy type code.
   * @returns Array of locations with node_id, country_code, title, and terms_days.
   *
   * @example
   * ```typescript
   * import { SteelProxy } from "steelproxy";
   *
   * const client = new SteelProxy();
   * const locations = await client.getLocations({ proxy_type: "residential" });
   * for (const loc of locations) {
   *   console.log(`Node #${loc.node_id} (${loc.country_code}) - Terms: ${loc.terms_days.join(", ")} days`);
   * }
   * ```
   */
  async getLocations(params?: GetLocationsParams): Promise<LocationItem[]> {
    const query: Record<string, unknown> = {};
    if (params?.proxy_type) {
      query.proxy_type = params.proxy_type;
    }
    return this.request<LocationItem[]>("GET", "/locations", { params: query });
  }

  /**
   * Retrieves a flat list of all available duration terms in days.
   *
   * @param params - Optional filter by proxy type code.
   * @returns Array of day counts (e.g. [1, 7, 14, 30]).
   *
   * @example
   * ```typescript
   * import { SteelProxy } from "steelproxy";
   *
   * const client = new SteelProxy();
   * const terms = await client.getTerms({ proxy_type: "server" });
   * console.log(`Available terms: ${terms.join(", ")} days`);
   * ```
   */
  async getTerms(params?: GetTermsParams): Promise<number[]> {
    const query: Record<string, unknown> = {};
    if (params?.proxy_type) {
      query.proxy_type = params.proxy_type;
    }
    return this.request<number[]>("GET", "/terms", { params: query });
  }

  /**
   * Retrieves reseller purchase prices including personal discount.
   *
   * @param params - Optional filters for proxy_type and country_code.
   * @returns Array of prices per location and term.
   *
   * @example
   * ```typescript
   * import { SteelProxy } from "steelproxy";
   *
   * const client = new SteelProxy();
   * const prices = await client.getPrices({ country_code: "US" });
   * for (const p of prices) {
   *   console.log(`${p.proxy_type} ${p.country_code} for ${p.term_days}d: ${p.price} ${p.currency}`);
   * }
   * ```
   */
  async getPrices(params?: GetPricesParams): Promise<PriceItem[]> {
    const query: Record<string, unknown> = {};
    if (params?.proxy_type) {
      query.proxy_type = params.proxy_type;
    }
    if (params?.country_code) {
      query.country_code = params.country_code;
    }
    return this.request<PriceItem[]>("GET", "/prices", { params: query });
  }

  /**
   * Creates an order, deducts cost from account balance, and returns allocated proxies.
   *
   * @param params - Order parameters (proxy_type, node_id, term_days, quantity, etc.).
   * @returns Details of created order with proxy credentials.
   *
   * @example
   * ```typescript
   * import { SteelProxy } from "steelproxy";
   *
   * const client = new SteelProxy();
   * const order = await client.createOrder({
   *   proxy_type: "residential",
   *   node_id: 5,
   *   term_days: 7,
   *   quantity: 2,
   *   buyer_reference: "order-1234",
   * });
   * console.log(`Order #${order.order_id} created: ${order.proxies.length} proxies`);
   * ```
   */
  async createOrder(params: CreateOrderParams): Promise<CreatedOrder> {
    if (!params.proxy_type) {
      throw new SteelProxyError("proxy_type is required");
    }
    if (typeof params.node_id !== "number") {
      throw new SteelProxyError("node_id is required");
    }
    if (typeof params.term_days !== "number" || params.term_days <= 0) {
      throw new SteelProxyError("term_days must be a positive integer");
    }
    if (typeof params.quantity !== "number" || params.quantity <= 0) {
      throw new SteelProxyError("quantity must be a positive integer");
    }

    const payload: Record<string, unknown> = {
      proxy_type: params.proxy_type,
      node_id: params.node_id,
      term_days: params.term_days,
      quantity: params.quantity,
    };

    if (params.buyer_reference !== undefined) {
      payload.buyer_reference = params.buyer_reference;
    }
    if (params.rotation_mode !== undefined) {
      payload.rotation_mode = params.rotation_mode;
    }
    if (params.timer_interval_minutes !== undefined) {
      payload.timer_interval_minutes = params.timer_interval_minutes;
    }

    return this.request<CreatedOrder>("POST", "/orders", { data: payload });
  }

  /**
   * Retrieves details and proxy credentials of an existing order.
   *
   * @param orderId - The order ID.
   * @returns Order details including status and provisioned proxies.
   *
   * @example
   * ```typescript
   * import { SteelProxy } from "steelproxy";
   *
   * const client = new SteelProxy();
   * const order = await client.getOrder(118432);
   * console.log(`Status: ${order.status}, Expiration: ${order.expires_at}`);
   * for (const p of order.proxies) {
   *   console.log(p.connection_string_http);
   * }
   * ```
   */
  async getOrder(orderId: number): Promise<OrderDetail> {
    if (typeof orderId !== "number" || isNaN(orderId)) {
      throw new SteelProxyError("order_id must be a valid number");
    }
    return this.request<OrderDetail>("GET", `/orders/${orderId}`);
  }

  /**
   * Retrieves a paginated list of reseller orders.
   *
   * @param params - Pagination parameters (page and page_size).
   * @returns Paginated list of orders.
   *
   * @example
   * ```typescript
   * import { SteelProxy } from "steelproxy";
   *
   * const client = new SteelProxy();
   * const list = await client.getOrders({ page: 1, page_size: 20 });
   * console.log(`Total orders: ${list.total}, Current page items: ${list.items.length}`);
   * ```
   */
  async getOrders(params?: GetOrdersParams): Promise<OrderList> {
    const query: Record<string, unknown> = {};
    if (params?.page !== undefined) {
      query.page = params.page;
    }
    if (params?.page_size !== undefined) {
      query.page_size = params.page_size;
    }
    return this.request<OrderList>("GET", "/orders", { params: query });
  }

  /**
   * Extends the duration of proxies in an existing order.
   *
   * @param orderId - The order ID to extend.
   * @param params - Extension parameters (months: 1, 2, 3, or 6).
   * @returns Extended order confirmation with new expiration date.
   *
   * @example
   * ```typescript
   * import { SteelProxy } from "steelproxy";
   *
   * const client = new SteelProxy();
   * const ext = await client.extendOrder(118432, { months: 1 });
   * console.log(`Order #${ext.order_id} extended to ${ext.expires_at}`);
   * ```
   */
  async extendOrder(orderId: number, params: ExtendOrderParams): Promise<ExtendedOrder> {
    if (typeof orderId !== "number" || isNaN(orderId)) {
      throw new SteelProxyError("order_id must be a valid number");
    }
    if (!params || typeof params.months !== "number") {
      throw new SteelProxyError("months must be a valid number (1, 2, 3, or 6)");
    }
    return this.request<ExtendedOrder>("POST", `/orders/${orderId}/extend`, {
      data: { months: params.months },
    });
  }

  /**
   * Creates an order via the webhook endpoint (compatible with marketplace platforms).
   *
   * @param params - Webhook query and body parameters.
   * @returns Created order details.
   *
   * @example
   * ```typescript
   * import { SteelProxy } from "steelproxy";
   *
   * const client = new SteelProxy();
   * const order = await client.createOrderWebhook({
   *   proxy_type: "residential",
   *   country_code: "US",
   *   term_days: 7,
   *   count: 2,
   *   buyer: "order-8841",
   * });
   * ```
   */
  async createOrderWebhook(params: CreateOrderWebhookParams): Promise<CreatedOrder> {
    const apiKey = params.api_key || this.apiKey;
    if (!apiKey) {
      throw new SteelProxyError("api_key is required for webhook creation");
    }
    if (!params.proxy_type) {
      throw new SteelProxyError("proxy_type is required");
    }
    if (!params.country_code) {
      throw new SteelProxyError("country_code is required");
    }
    if (typeof params.term_days !== "number" || params.term_days <= 0) {
      throw new SteelProxyError("term_days must be a positive integer");
    }

    const query: Record<string, unknown> = {
      api_key: apiKey,
      proxy_type: params.proxy_type,
      country_code: params.country_code,
      term_days: params.term_days,
    };
    if (params.rotation_mode) {
      query.rotation_mode = params.rotation_mode;
    }
    if (params.timer_interval !== undefined && params.timer_interval !== null) {
      query.timer_interval = params.timer_interval;
    }

    const body: Record<string, unknown> = {
      count: params.count ?? 1,
    };
    if (params.buyer) {
      body.buyer = params.buyer;
    }
    if (params.user) {
      body.user = params.user;
    }

    return this.request<CreatedOrder>("POST", "/orders/webhook", {
      params: query,
      data: body,
    });
  }

  /**
   * Helper to build a static webhook URL for marketplace/bot integration.
   *
   * @param params - Static product parameters (proxy_type, country_code, term_days, etc.).
   * @returns Full webhook URL string.
   *
   * @example
   * ```typescript
   * import { SteelProxy } from "steelproxy";
   *
   * const client = new SteelProxy({ apiKey: "sp_live_key" });
   * const webhookUrl = client.buildWebhookUrl({
   *   proxy_type: "residential",
   *   country_code: "US",
   *   term_days: 7,
   * });
   * console.log(webhookUrl);
   * ```
   */
  buildWebhookUrl(
    params: Omit<CreateOrderWebhookParams, "count" | "buyer" | "user">
  ): string {
    const apiKey = params.api_key || this.apiKey;
    if (!apiKey) {
      throw new SteelProxyError("api_key is required to build webhook URL");
    }
    const baseURL = this.http.defaults.baseURL || DEFAULT_BASE_URL;
    const url = new URL(`${baseURL.replace(/\/+$/, "")}/orders/webhook`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("proxy_type", params.proxy_type);
    url.searchParams.set("country_code", params.country_code);
    url.searchParams.set("term_days", String(params.term_days));

    if (params.rotation_mode) {
      url.searchParams.set("rotation_mode", params.rotation_mode);
    }
    if (params.timer_interval !== undefined && params.timer_interval !== null) {
      url.searchParams.set("timer_interval", String(params.timer_interval));
    }

    return url.toString();
  }

  /**
   * Checks API server health status.
   *
   * @returns Health status payload.
   *
   * @example
   * ```typescript
   * import { SteelProxy } from "steelproxy";
   *
   * const client = new SteelProxy();
   * const status = await client.health();
   * console.log(status); // { status: "ok" }
   * ```
   */
  async health(): Promise<{ status: string }> {
    // Health endpoint lives at https://api.steelproxy.com/health
    const baseURL = this.http.defaults.baseURL || DEFAULT_BASE_URL;
    const origin = new URL(baseURL).origin;
    const res = await axios.get<{ status: string }>(`${origin}/health`, {
      timeout: this.http.defaults.timeout,
    });
    return res.data;
  }
}
