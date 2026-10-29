import * as crypto from "node:crypto";
import axios, { AxiosInstance, AxiosProxyConfig } from "axios";
import {
  FixedFloatApiError,
  FixedFloatAuthError,
  FixedFloatError,
  FixedFloatHttpError,
  FixedFloatNetworkError,
  FixedFloatRateLimitError,
  FixedFloatTimeoutError,
} from "./errors.js";
import {
  assertQuoteOk,
  filterRates,
  orderStatusText,
  parsePriceShorthand,
  parseRatesXml,
  TERMINAL_ORDER_STATUSES,
} from "./rates.js";
import {
  ApiResponse,
  CreateOrderParams,
  Currency,
  FixedFloatOptions,
  GetPriceParams,
  GetRatesOptions,
  Order,
  OrderType,
  PriceResult,
  QrCode,
  QrResult,
  RateItem,
  RawRequestOptions,
  SetEmergencyParams,
  WaitForOrderOptions,
} from "./types.js";

/** @internal Affiliate code attached to price and create calls. Do not change. */
export const DEFAULT_REFCODE = "gfc1h2fb";

const DEFAULT_BASE_URL = "https://ff.io/api/v2";
const DEFAULT_RATES_BASE_URL = "https://ff.io";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 200;
const DEFAULT_WAIT_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_WAIT_INTERVAL_MS = 5_000;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    if (signal?.aborted) {
      return Promise.reject(new FixedFloatError("The order wait was aborted"));
    }
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new FixedFloatError("The order wait was aborted"));
    };
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer);
        reject(new FixedFloatError("The order wait was aborted"));
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FixedFloatError("The order wait was aborted");
  }
}

/** Builds the axios proxy config from a URL such as `http://user:pass@host:8080`. */
export function proxyConfigFromUrl(proxyUrl: string): AxiosProxyConfig {
  let parsed: URL;
  try {
    parsed = new URL(proxyUrl);
  } catch {
    throw new FixedFloatError(`Invalid proxy URL: ${proxyUrl}`);
  }
  if (!parsed.hostname) {
    throw new FixedFloatError(`Invalid proxy URL: ${proxyUrl}`);
  }
  const protocol = parsed.protocol.replace(":", "") || "http";
  const fallbackPort = protocol === "https" ? 443 : 80;
  const config: AxiosProxyConfig = {
    protocol,
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : fallbackPort,
  };
  if (parsed.username) {
    config.auth = {
      username: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
    };
  }
  return config;
}

function normalizeQr(data: unknown): QrResult {
  if (Array.isArray(data)) {
    const codes: QrCode[] = data.map((item) => {
      const row = (item ?? {}) as Partial<QrCode>;
      return {
        title: String(row.title ?? ""),
        src: String(row.src ?? ""),
        checked: Boolean(row.checked),
      };
    });
    const selected = codes.find((code) => code.checked) ?? codes[0];
    return {
      src: selected?.src ?? "",
      title: selected?.title,
      checked: selected?.checked,
      codes,
    };
  }

  if (data && typeof data === "object") {
    const row = data as Partial<QrResult> & { codes?: QrCode[] };
    const src = String(row.src ?? "");
    const codes =
      row.codes ??
      (src
        ? [{ title: String(row.title ?? ""), src, checked: row.checked ?? true }]
        : []);
    return {
      src,
      title: row.title,
      checked: row.checked,
      codes,
    };
  }

  return { src: "", codes: [] };
}

/**
 * FixedFloat API v2 client for cryptocurrency swaps and rates.
 */
export class FixedFloat {
  private readonly http: AxiosInstance;
  private readonly apiKey?: string;
  private readonly apiSecret?: string;
  private readonly retries: number;
  private readonly retryDelay: number;
  private readonly ratesBaseUrl: string;
  private readonly extraHeaders: Record<string, string>;

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
    this.retries = Math.max(0, options.retries ?? DEFAULT_RETRIES);
    this.retryDelay = Math.max(0, options.retryDelay ?? DEFAULT_RETRY_DELAY_MS);
    this.ratesBaseUrl = (options.ratesBaseUrl ?? DEFAULT_RATES_BASE_URL).replace(/\/$/, "");
    this.extraHeaders = { ...(options.headers ?? {}) };

    this.http = axios.create({
      baseURL: options.baseUrl ?? DEFAULT_BASE_URL,
      timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Accept: "application/json",
      },
      proxy: options.proxy ? proxyConfigFromUrl(options.proxy) : undefined,
    });
  }

  /**
   * Signs and sends a POST request to the FixedFloat API.
   *
   * @internal
   */
  private async request<T>(
    endpoint: string,
    body: Record<string, unknown> = {},
    idempotent = true,
  ): Promise<T> {
    const jsonStr = JSON.stringify(body);
    const headers: Record<string, string> = { ...this.extraHeaders };

    if (this.apiKey) {
      headers["X-API-KEY"] = this.apiKey;
    }

    if (this.apiSecret) {
      headers["X-API-SIGN"] = crypto
        .createHmac("sha256", this.apiSecret)
        .update(jsonStr)
        .digest("hex");
    }

    const attempts = idempotent ? this.retries + 1 : 1;
    let lastError: FixedFloatError | undefined;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await this.http.post<ApiResponse<T>>(endpoint, jsonStr, { headers });
        return decodeSuccess<T>(response.data);
      } catch (err: unknown) {
        const wrapped = wrapRequestError(err);
        lastError = wrapped;
        const canRetry = wrapped.retryable && attempt < attempts - 1;
        if (!canRetry) {
          throw wrapped;
        }
        const delay = this.retryDelay * 2 ** attempt;
        if (delay > 0) {
          await sleep(delay);
        }
      }
    }

    throw lastError ?? new FixedFloatError("Request failed");
  }

  private async requestText(url: string): Promise<string> {
    const attempts = this.retries + 1;
    let lastError: FixedFloatError | undefined;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await this.http.get<unknown>(url, {
          responseType: "text",
          transformResponse: [(data) => data],
          headers: { Accept: "application/xml, text/xml, */*" },
        });
        if (typeof response.data !== "string") {
          throw new FixedFloatError("Rates export was not XML text");
        }
        return response.data;
      } catch (err: unknown) {
        const wrapped = err instanceof FixedFloatError ? err : wrapRequestError(err);
        lastError = wrapped;
        const canRetry = wrapped.retryable && attempt < attempts - 1;
        if (!canRetry) {
          throw wrapped;
        }
        const delay = this.retryDelay * 2 ** attempt;
        if (delay > 0) {
          await sleep(delay);
        }
      }
    }

    throw lastError ?? new FixedFloatError("Request failed");
  }

  /**
   * Retrieves the list of available cryptocurrencies and networks.
   *
   * @returns A promise resolving to an array of supported currencies.
   */
  async getCurrencies(): Promise<Currency[]> {
    return this.request<Currency[]>("/ccies", {});
  }

  /** Alias of {@link FixedFloat.getCurrencies}. Matches the official PHP method name. */
  async ccies(): Promise<Currency[]> {
    return this.getCurrencies();
  }

  /**
   * Calculates an exchange quote for a currency pair.
   *
   * Pass either a parameter object, or the fixedfloat-api shorthand
   * (`"0.1 ETH", "BTC"` / `"ETH", "0.1 BTC"`).
   */
  async getPrice(params: GetPriceParams): Promise<PriceResult>;
  async getPrice(from: string, to: string, type?: OrderType): Promise<PriceResult>;
  async getPrice(
    paramsOrFrom: GetPriceParams | string,
    to?: string,
    type?: OrderType,
  ): Promise<PriceResult> {
    const params =
      typeof paramsOrFrom === "string"
        ? parsePriceShorthand(paramsOrFrom, to ?? "", type ?? "float")
        : paramsOrFrom;

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
    if (params.ccies !== undefined) {
      payload.ccies = params.ccies;
    }
    if (params.usd !== undefined) {
      payload.usd = params.usd;
    }

    return this.request<PriceResult>("/price", payload);
  }

  /** Alias of {@link FixedFloat.getPrice}. */
  async price(params: GetPriceParams): Promise<PriceResult>;
  async price(from: string, to: string, type?: OrderType): Promise<PriceResult>;
  async price(
    paramsOrFrom: GetPriceParams | string,
    to?: string,
    type?: OrderType,
  ): Promise<PriceResult> {
    if (typeof paramsOrFrom === "string") {
      return this.getPrice(paramsOrFrom, to ?? "", type);
    }
    return this.getPrice(paramsOrFrom);
  }

  /**
   * Same as {@link FixedFloat.getPrice}, then throws when `errors` is not empty.
   */
  async getPriceOrThrow(params: GetPriceParams): Promise<PriceResult> {
    const quote = await this.getPrice(params);
    assertQuoteOk(quote);
    return quote;
  }

  /**
   * Creates a new cryptocurrency exchange order.
   * This call costs 50 rate-limit weight units and is not retried.
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

    if (params.tag !== undefined) {
      payload.tag = params.tag;
    } else if (params.extraId !== undefined) {
      payload.tag = params.extraId;
    }
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

    return this.request<Order>("/create", payload, false);
  }

  /** Alias of {@link FixedFloat.createOrder}. */
  async create(params: CreateOrderParams): Promise<Order> {
    return this.createOrder(params);
  }

  /**
   * Fetches the current status and information of an order.
   *
   * @param id - Order ID (6 characters).
   * @param token - Security token returned when creating the order.
   */
  async getOrder(id: string, token: string): Promise<Order> {
    return this.request<Order>("/order", { id, token });
  }

  /** Alias of {@link FixedFloat.getOrder}. */
  async order(id: string, token: string): Promise<Order> {
    return this.getOrder(id, token);
  }

  /** Human-readable label for an order status. */
  statusText(status: string): string {
    return orderStatusText(status);
  }

  /**
   * Polls {@link FixedFloat.getOrder} until the status is one of `statuses`,
   * or the timeout elapses.
   */
  async waitForOrder(id: string, token: string, options: WaitForOrderOptions = {}): Promise<Order> {
    const statuses = options.statuses ?? [...TERMINAL_ORDER_STATUSES];
    const timeoutMs = options.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS;
    const intervalMs = options.intervalMs ?? DEFAULT_WAIT_INTERVAL_MS;
    const deadline = Date.now() + timeoutMs;

    for (;;) {
      throwIfAborted(options.signal);
      const current = await this.getOrder(id, token);
      if (statuses.includes(current.status)) {
        return current;
      }
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new FixedFloatTimeoutError(
          `Order ${id} was still ${current.status} after ${timeoutMs}ms`,
          false,
        );
      }
      await sleep(Math.min(intervalMs, remaining), options.signal);
    }
  }

  /**
   * Sets an emergency action choice (EXCHANGE or REFUND) on an active order.
   * `REFUND` requires `address`.
   */
  async setEmergency(params: SetEmergencyParams): Promise<boolean> {
    const payload: Record<string, unknown> = {
      id: params.id,
      token: params.token,
      choice: params.choice,
    };
    if (params.address !== undefined) {
      payload.address = params.address;
    }
    if (params.tag !== undefined) {
      payload.tag = params.tag;
    } else if (params.extraId !== undefined) {
      payload.tag = params.extraId;
    }
    if (params.extraId !== undefined) {
      payload.extraId = params.extraId;
    }
    return this.request<boolean>("/emergency", payload);
  }

  /** Alias of {@link FixedFloat.setEmergency}. */
  async emergency(params: SetEmergencyParams): Promise<boolean> {
    return this.setEmergency(params);
  }

  /**
   * Subscribes an email address to status notifications for an order.
   * Returns true when FixedFloat accepts the subscription.
   */
  async setEmail(id: string, token: string, email: string): Promise<boolean> {
    return this.request<boolean>("/setEmail", { id, token, email });
  }

  /** Alias of {@link FixedFloat.setEmail}. */
  async setEmailNotification(id: string, token: string, email: string): Promise<boolean> {
    return this.setEmail(id, token, email);
  }

  /** Alias of {@link FixedFloat.setEmail}. */
  async subscribe(id: string, token: string, email: string): Promise<boolean> {
    return this.setEmail(id, token, email);
  }

  /**
   * Retrieves QR codes for the deposit address of an order.
   * `src` is the default image. `codes` is the full list.
   */
  async getQr(id: string, token: string): Promise<QrResult> {
    const data = await this.request<unknown>("/qr", { id, token });
    return normalizeQr(data);
  }

  /** Alias of {@link FixedFloat.getQr}. */
  async qr(id: string, token: string): Promise<QrResult> {
    return this.getQr(id, token);
  }

  /** Full QR list for an order (`title`, `src`, `checked`). */
  async getQrCodes(id: string, token: string): Promise<QrCode[]> {
    const result = await this.getQr(id, token);
    return result.codes;
  }

  /** Alias of {@link FixedFloat.getQrCodes}. */
  async getQRCodes(id: string, token: string): Promise<QrCode[]> {
    return this.getQrCodes(id, token);
  }

  /**
   * Downloads the public XML rates export. No API key is required.
   * @param type - `"float"` (0.5% service fee) or `"fixed"` (1% service fee).
   */
  async getRatesXml(type: OrderType = "float"): Promise<string> {
    if (type !== "fixed" && type !== "float") {
      throw new FixedFloatError(`Unknown rates type: ${String(type)}`);
    }
    return this.requestText(`${this.ratesBaseUrl}/rates/${type}.xml`);
  }

  /**
   * Parsed rows from the XML rates export, optionally filtered to one pair.
   * Use this to read every pair. Use {@link FixedFloat.getPrice} for one amount.
   */
  async getRates(options: GetRatesOptions = {}): Promise<RateItem[]> {
    const xml = await this.getRatesXml(options.type ?? "float");
    return filterRates(parseRatesXml(xml), options.from, options.to);
  }

  /**
   * Sends a signed POST to any `/api/v2` path and returns the `data` field.
   * Use this if FixedFloat adds a method this package does not wrap yet.
   * Paths other than `/create` are retried on transient failures.
   */
  async rawRequest<T = unknown>(
    endpoint: string,
    body: Record<string, unknown> = {},
    options: RawRequestOptions = {},
  ): Promise<T> {
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const idempotent = options.idempotent ?? path !== "/create";
    return this.request<T>(path, body, idempotent);
  }
}

function decodeSuccess<T>(data: unknown): T {
  if (data && typeof data === "object" && "code" in data && typeof (data as ApiResponse<T>).code === "number") {
    const api = data as ApiResponse<T>;
    if (api.code !== 0) {
      throw new FixedFloatApiError(api.msg || "FixedFloat API error", api.code, api.data);
    }
    return api.data;
  }
  return data as T;
}

function errorFromHttp(status: number, data: unknown, fallback: string): FixedFloatError {
  if (data && typeof data === "object" && "code" in data && "msg" in data) {
    const api = data as ApiResponse<unknown>;
    const message = api.msg || fallback;
    const code = typeof api.code === "number" ? api.code : status;
    if (status === 429) {
      return new FixedFloatRateLimitError(message, code, api.data, status);
    }
    if (status === 401 || status === 403) {
      return new FixedFloatAuthError(message, code, api.data, status);
    }
    if (code !== 0) {
      return new FixedFloatApiError(message, code, api.data, status >= 500, status);
    }
  }

  if (status === 429) {
    return new FixedFloatRateLimitError(fallback, status, data, status);
  }
  if (status === 401 || status === 403) {
    return new FixedFloatAuthError(fallback, status, data, status);
  }
  return new FixedFloatHttpError(fallback, status, data, status >= 500);
}

function wrapRequestError(err: unknown): FixedFloatError {
  if (err instanceof FixedFloatError) {
    return err;
  }
  if (axios.isAxiosError(err)) {
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
      return new FixedFloatTimeoutError(err.message);
    }
    if (err.response) {
      return errorFromHttp(err.response.status, err.response.data, err.message);
    }
    return new FixedFloatNetworkError(err.message);
  }
  return new FixedFloatError(err instanceof Error ? err.message : String(err));
}
