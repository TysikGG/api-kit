import axios, { type AxiosInstance, type AxiosProxyConfig, isAxiosError } from "axios";

import {
  GiveSmsAbortError,
  GiveSmsError,
  GiveSmsTimeoutError,
  NetworkError,
  ResendRequiredError,
} from "./errors.js";
import {
  assertEnvelope,
  cleanParams,
  joinServices,
  parseAccessNumber,
  parseActivation,
  parseBalance,
  parseCode,
  parseHandlerBalance,
  parseHandlerStatus,
  parseJsonText,
  parseRentOrder,
  parseRentProlong,
  parseRentSms,
  throwIfHandlerError,
} from "./parse.js";
import {
  API_V1_PATH,
  DEFAULT_BASE_URL,
  HANDLER_PATH,
  HandlerSetStatus,
  RENT_PATH,
  type ActivationNumber,
  type ApiResponse,
  type CodeResult,
  type GetCountOptions,
  type GetNumberOptions,
  type GiveSmsOptions,
  type HandlerGetNumberOptions,
  type HandlerNumbersStatusOptions,
  type HandlerPricesOptions,
  type HandlerStatusResult,
  type ReactivationOptions,
  type ReactivationResult,
  type RentDataOptions,
  type RentOrder,
  type RentOrderOptions,
  type RentProlongOptions,
  type RentProlongResult,
  type RentSmsList,
  type RentWaitOptions,
  type WaitOptions,
} from "./types.js";

/** @internal Partner attribution. Do not change. */
export const PARTNER_KEY = "pk_39579ba6dfd61e59";

const WAITING_HANDLER_STATUSES = new Set(["STATUS_WAIT_CODE", "STATUS_WAIT_RETRY"]);

export interface ReactivateOptions {
  /** Minutes. Must be one of the durations from {@link GiveSms.getReactivationOptions}. */
  duration?: number;
  /** Expected price. The server rejects the call with status 507 / `price_changed` if it moved. */
  price?: number;
}

/**
 * Client for the Give-SMS native JSON API, the SMS-Activate compatible handler,
 * and the long-term number rent API.
 *
 * @example
 * ```ts
 * const client = new GiveSms({ apiKey: process.env.GIVE_SMS_API_KEY! });
 * const balance = await client.getBalance();
 * ```
 */
/** Native order bound to the client that created it. */
export class Activation {
  public constructor(
    public readonly client: GiveSms,
    public readonly id: string | number,
    public readonly number: string,
    public readonly startTime?: string,
  ) {}

  public getCode(): Promise<CodeResult> {
    return this.client.getCode(this.id);
  }

  public waitForCode(options?: WaitOptions): Promise<CodeResult> {
    return this.client.waitForCode(this.id, options);
  }

  public wrongCode(lastId?: string | number): Promise<CodeResult> {
    return this.client.wrongCode(this.id, lastId);
  }

  public repeatCode(lastId?: string | number): Promise<boolean> {
    return this.client.repeatCode(this.id, lastId);
  }

  public cancel(): Promise<boolean> {
    return this.client.cancelNumber(this.id);
  }

  public ban(): Promise<boolean> {
    return this.client.banNumber(this.id);
  }
}

export class GiveSms {
  private readonly client: AxiosInstance;
  private readonly apiKey: string;
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly retryOn: Array<string | number>;

  public constructor(options: string | GiveSmsOptions) {
    const config = typeof options === "string" ? { apiKey: options } : options;
    if (!config.apiKey) {
      throw new GiveSmsError("API key is required");
    }
    this.apiKey = config.apiKey;
    this.retries = config.retries ?? 0;
    this.retryDelayMs = config.retryDelayMs ?? 1000;
    this.retryOn = config.retryOn ?? [502, "ERROR_SQL"];
    this.client = axios.create({
      baseURL: (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
      timeout: config.timeout ?? 30_000,
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "give-sms/0.1.0",
        ...config.headers,
      },
      proxy: config.proxy ? parseProxy(config.proxy) : undefined,
      validateStatus: () => true,
    });
  }

  /**
   * Low-level native `/api/v1/` call. `partner_key` is always attached.
   * Status `400` is returned (not thrown) only when listed in `allowStatuses`.
   */
  public async callApi<T = unknown>(
    method: string,
    extraParams: Record<string, unknown> = {},
    allowStatuses: number[] = [],
  ): Promise<ApiResponse<T>> {
    return this.withRetry(() => this.callApiOnce<T>(method, extraParams, allowStatuses));
  }

  /**
   * Low-level `/stubs/handler_api.php` call. Returns the trimmed plain-text body.
   * Known error tokens are thrown as {@link GiveSmsError} subclasses.
   */
  public async callHandler(
    action: string,
    extraParams: Record<string, unknown> = {},
  ): Promise<string> {
    return this.withRetry(() => this.callHandlerOnce(action, extraParams));
  }

  /** Account balance from `method=getbalance`. */
  public async getBalance(): Promise<number> {
    const res = await this.callApi<unknown>("getbalance");
    return parseBalance(res.data);
  }

  /** Available services, counts, and prices grouped by operator (`method=getcount`). */
  public async getCount(options: GetCountOptions = {}): Promise<Record<string, unknown>> {
    const res = await this.callApi<Record<string, unknown>>("getcount", {
      country: options.country,
      operator: options.operator,
    });
    const data = res.data;
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      throw new GiveSmsError("Unexpected getcount payload", undefined, data);
    }
    return data;
  }

  /**
   * Every country and the services available in it (`method=getallcount`).
   * Pass `service` to get price and count for that service in each country.
   */
  public async getAllCount(options: { service?: string } = {}): Promise<unknown> {
    const res = await this.callApi("getallcount", { service: options.service });
    return res.data;
  }

  /** Alias of {@link getAllCount}. Kept for compatibility with give-sms 0.1. */
  public async getAll(options: { service?: string } = {}): Promise<unknown> {
    return this.getAllCount(options);
  }

  /** Order a number (`method=getnumber`). The number is reserved for about 15 minutes. */
  public async getNumber(options: GetNumberOptions): Promise<ActivationNumber> {
    if (!options.service) {
      throw new GiveSmsError("service is required");
    }
    const res = await this.callApi("getnumber", {
      service: options.service,
      country: options.country,
      operator: options.operator,
      maxPrice: options.maxPrice,
    });
    return parseActivation(res.data);
  }

  /**
   * Read the SMS for an order (`method=getcode`).
   * Status `400` means the SMS has not arrived yet and is returned as `status: "WAIT"`.
   */
  public async getCode(id: string | number): Promise<CodeResult> {
    const res = await this.callApi("getcode", { order_id: id }, [400]);
    return parseCode(res);
  }

  /**
   * Ask for another SMS on the same order (`method=wrongcode`).
   * `lastId` is the `smsId` from the previous message. It defaults to the order id.
   */
  public async wrongCode(id: string | number, lastId?: string | number): Promise<CodeResult> {
    const res = await this.callApi(
      "wrongcode",
      { order_id: id, last_id: lastId ?? id },
      [400],
    );
    return parseCode(res);
  }

  /**
   * Request another SMS. Returns `true` when the API accepts the request
   * (including "SMS not here yet"). Prefer {@link wrongCode} to read the payload.
   */
  public async repeatCode(id: string | number, lastId?: string | number): Promise<boolean> {
    await this.wrongCode(id, lastId);
    return true;
  }

  /** Cancel an order and release the reserved balance (`method=refusenumber`). */
  public async cancelNumber(id: string | number): Promise<boolean> {
    await this.callApi("refusenumber", { order_id: id });
    return true;
  }

  /** Alias of {@link cancelNumber}. */
  public async refuseNumber(id: string | number): Promise<boolean> {
    return this.cancelNumber(id);
  }

  /** Ban a number that cannot be used for the service (`method=bannumber`). */
  public async banNumber(id: string | number): Promise<boolean> {
    await this.callApi("bannumber", { order_id: id });
    return true;
  }

  /** Durations and prices for reopening a finished order (`method=reactivationoptions`). */
  public async getReactivationOptions(id: string | number): Promise<ReactivationOptions> {
    const res = await this.callApi<ReactivationOptions>("reactivationoptions", { order_id: id });
    return res.data;
  }

  /** Alias of {@link getReactivationOptions}. */
  public async reactivationOptions(id: string | number): Promise<ReactivationOptions> {
    return this.getReactivationOptions(id);
  }

  /**
   * Reopen a finished order (`method=reactivation`).
   * The price is charged immediately and is not refunded. The response contains a new order id.
   */
  public async reactivate(
    id: string | number,
    options: ReactivateOptions = {},
  ): Promise<ReactivationResult> {
    const res = await this.callApi<ReactivationResult>("reactivation", {
      order_id: id,
      duration: options.duration,
      price: options.price,
    });
    return res.data;
  }

  /** Order a number and return a helper bound to this client. */
  public async purchase(options: GetNumberOptions): Promise<Activation> {
    const ordered = await this.getNumber(options);
    return new Activation(this, ordered.id, ordered.number, ordered.startTime);
  }

  /** Poll {@link getCode} until an SMS arrives, the order dies, or the timeout elapses. */
  public async waitForCode(id: string | number, options: WaitOptions = {}): Promise<CodeResult> {
    return this.poll(
      () => this.getCode(id),
      (result) => result.status !== "WAIT",
      options,
      "SMS code",
    );
  }

  /** Poll {@link wrongCode} until the next SMS arrives. */
  public async waitForNextCode(
    id: string | number,
    lastId?: string | number,
    options: WaitOptions = {},
  ): Promise<CodeResult> {
    return this.poll(
      () => this.wrongCode(id, lastId),
      (result) => result.status !== "WAIT",
      options,
      "next SMS code",
    );
  }

  /** Handler API balance (`action=getBalance`). */
  public async handlerGetBalance(): Promise<number> {
    return parseHandlerBalance(await this.callHandler("getBalance"));
  }

  /** Handler counts (`action=getNumbersStatus`). */
  public async handlerGetNumbersStatus(
    options: HandlerNumbersStatusOptions = {},
  ): Promise<Record<string, number>> {
    const text = await this.callHandler("getNumbersStatus", {
      country: options.country,
      operator: options.operator,
    });
    const parsed = parseJsonText(text, "getNumbersStatus");
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new GiveSmsError(`Unexpected getNumbersStatus payload: ${text}`, text, text);
    }
    return parsed as Record<string, number>;
  }

  /** Handler number order (`action=getNumber` → `ACCESS_NUMBER:id:number`). */
  public async handlerGetNumber(options: HandlerGetNumberOptions): Promise<ActivationNumber> {
    if (!options.service) {
      throw new GiveSmsError("service is required");
    }
    const text = await this.callHandler("getNumber", {
      service: options.service,
      country: options.country,
      operator: options.operator,
      maxPrice: options.maxPrice,
    });
    return parseAccessNumber(text);
  }

  /** Handler `action=setStatus`. */
  public async handlerSetStatus(id: string | number, status: number): Promise<string> {
    return this.callHandler("setStatus", { id, status });
  }

  /** Tell the service the number is ready for an SMS (`status=1`). */
  public async handlerReady(id: string | number): Promise<string> {
    return this.handlerSetStatus(id, HandlerSetStatus.Ready);
  }

  /** Request another free SMS (`status=3`). */
  public async handlerRequestAnotherSms(id: string | number): Promise<string> {
    return this.handlerSetStatus(id, HandlerSetStatus.RequestAnotherSms);
  }

  /** Finish the activation (`status=6`). */
  public async handlerComplete(id: string | number): Promise<string> {
    return this.handlerSetStatus(id, HandlerSetStatus.Complete);
  }

  /** Cancel the activation (`status=8`). */
  public async handlerCancel(id: string | number): Promise<string> {
    return this.handlerSetStatus(id, HandlerSetStatus.Cancel);
  }

  /** Handler activation state (`action=getStatus`). */
  public async handlerGetStatus(id: string | number): Promise<HandlerStatusResult> {
    return parseHandlerStatus(await this.callHandler("getStatus", { id }));
  }

  /**
   * Poll the handler until `STATUS_OK`.
   * `STATUS_CANCEL` and `STATUS_WAIT_RESEND` are thrown immediately.
   */
  public async handlerWaitForCode(
    id: string | number,
    options: WaitOptions = {},
  ): Promise<HandlerStatusResult> {
    return this.poll(
      () => this.handlerGetStatus(id),
      (result) => {
        if (result.status === "STATUS_CANCEL") {
          throw new GiveSmsError("Activation cancelled", "STATUS_CANCEL", result.raw);
        }
        if (result.status === "STATUS_WAIT_RESEND") {
          throw new ResendRequiredError(
            "The service must resend the SMS, then set status to 6",
            "STATUS_WAIT_RESEND",
            result.raw,
          );
        }
        return !WAITING_HANDLER_STATUSES.has(result.status);
      },
      options,
      "handler SMS code",
    );
  }

  /** Price catalog (`action=getPrices`). Use `tiers: 1` for every price level. */
  public async handlerGetPrices(options: HandlerPricesOptions = {}): Promise<unknown> {
    const text = await this.callHandler("getPrices", {
      country: options.country,
      service: options.service,
      tiers: options.tiers,
    });
    return parseJsonText(text, "getPrices");
  }

  /** Handler reactivation quote (`action=getReactivationOptions`). Map of minutes → price. */
  public async handlerGetReactivationOptions(id: string | number): Promise<Record<string, number>> {
    const text = await this.callHandler("getReactivationOptions", { id });
    const parsed = parseJsonText(text, "getReactivationOptions");
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new GiveSmsError(`Unexpected reactivation options: ${text}`, text, text);
    }
    return parsed as Record<string, number>;
  }

  /** Handler reactivation (`action=reactivation` → new `ACCESS_NUMBER`). */
  public async handlerReactivate(
    id: string | number,
    duration: number,
    price?: number,
  ): Promise<ActivationNumber> {
    const text = await this.callHandler("reactivation", { id, duration, price });
    return parseAccessNumber(text);
  }

  /** Rent catalog for one country (`method=getdatacountry`). */
  public async rentGetDataCountry(options: RentDataOptions): Promise<Record<string, unknown>> {
    return this.rentData("getdatacountry", { country: options.country });
  }

  /** Rent countries and operators (`method=countries`). */
  public async rentCountries(): Promise<Record<string, unknown>> {
    return this.rentData("countries");
  }

  /** All rent orders, active and finished (`method=allorders`). */
  public async rentAllOrders(): Promise<Record<string, unknown>> {
    return this.rentData("allorders");
  }

  /**
   * Rent a number for weeks or months (`method=createorder`).
   * Rentals are not refundable.
   */
  public async rentCreateOrder(options: RentOrderOptions): Promise<RentOrder> {
    const res = await this.callRent("createorder", {
      type: options.type,
      period: options.period,
      services: joinServices(options.services),
      country: options.country,
      operator: options.operator,
    });
    return parseRentOrder(res.data);
  }

  /** SMS received on a rented number (`method=getsms`). */
  public async rentGetSms(rentId: string | number): Promise<RentSmsList> {
    const res = await this.callRent("getsms", { rentid: rentId });
    return parseRentSms(res.data);
  }

  /** Extend a rental (`method=prolong`). */
  public async rentProlong(options: RentProlongOptions): Promise<RentProlongResult> {
    const res = await this.callRent("prolong", {
      rentid: options.rentId,
      type: options.type,
      period: options.period,
    });
    return parseRentProlong(res.data);
  }

  /** Poll {@link rentGetSms} until a message arrives. */
  public async rentWaitForSms(
    rentId: string | number,
    options: RentWaitOptions = {},
  ): Promise<RentSmsList> {
    return this.poll(
      () => this.rentGetSms(rentId),
      (page) => {
        const fresh =
          options.since === undefined
            ? page.messages
            : page.messages.filter((item) => (item.timestamp ?? 0) > options.since!);
        return fresh.length > 0;
      },
      options,
      "rented-number SMS",
    );
  }

  private async rentData(
    method: string,
    extra: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    const res = await this.callRent<Record<string, unknown>>(method, extra);
    if (res.data === null || typeof res.data !== "object" || Array.isArray(res.data)) {
      throw new GiveSmsError(`Unexpected ${method} payload`, res.status, res.data);
    }
    return res.data;
  }

  private async callRent<T = unknown>(
    method: string,
    extraParams: Record<string, unknown> = {},
  ): Promise<ApiResponse<T>> {
    return this.withRetry(() => this.callRentOnce<T>(method, extraParams));
  }

  private async callApiOnce<T>(
    method: string,
    extraParams: Record<string, unknown>,
    allowStatuses: number[],
  ): Promise<ApiResponse<T>> {
    const response = await this.send(API_V1_PATH, {
      ...cleanParams(extraParams),
      method,
      userkey: this.apiKey,
      partner_key: PARTNER_KEY,
    });
    return assertEnvelope<T>(response.data, allowStatuses);
  }

  private async callRentOnce<T>(
    method: string,
    extraParams: Record<string, unknown>,
  ): Promise<ApiResponse<T>> {
    const response = await this.send(RENT_PATH, {
      ...cleanParams(extraParams),
      method,
      userkey: this.apiKey,
      partner_key: PARTNER_KEY,
    });
    return assertEnvelope<T>(response.data, []);
  }

  private async callHandlerOnce(
    action: string,
    extraParams: Record<string, unknown>,
  ): Promise<string> {
    const response = await this.send(
      HANDLER_PATH,
      {
        ...cleanParams(extraParams),
        action,
        api_key: this.apiKey,
        partner_key: PARTNER_KEY,
      },
      "text",
    );
    const text =
      typeof response.data === "string" ? response.data.trim() : JSON.stringify(response.data);
    if (response.status >= 400 && !text) {
      throw new GiveSmsError(`Handler request failed with HTTP ${response.status}`, response.status);
    }
    throwIfHandlerError(text);
    return text;
  }

  private async send(
    path: string,
    params: Record<string, unknown>,
    responseType?: "text",
  ) {
    try {
      return await this.client.get(path, { params, responseType });
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const code = err.code === "ECONNABORTED" ? "TIMEOUT" : "NETWORK";
        const Cls = code === "TIMEOUT" ? GiveSmsTimeoutError : NetworkError;
        throw new Cls(err.message || "Request failed");
      }
      throw new NetworkError(err instanceof Error ? err.message : "Request failed");
    }
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await operation();
      } catch (err: unknown) {
        if (attempt >= this.retries || !this.isRetryable(err)) {
          throw err;
        }
        await delay(this.retryDelayMs * (attempt + 1));
      }
    }
  }

  private isRetryable(err: unknown): boolean {
    if (!(err instanceof GiveSmsError) || err.code === undefined) {
      return false;
    }
    if (err.code === "NETWORK" || err.code === "TIMEOUT") {
      return true;
    }
    return this.retryOn.some((code) => code === err.code || String(code) === String(err.code));
  }

  private async poll<T>(
    read: () => Promise<T>,
    ready: (value: T) => boolean,
    options: WaitOptions,
    label: string,
  ): Promise<T> {
    const timeoutMs = options.timeoutMs ?? 180_000;
    const intervalMs = options.intervalMs ?? 5_000;
    const started = Date.now();
    for (;;) {
      if (options.signal?.aborted) {
        throw new GiveSmsAbortError("Operation aborted");
      }
      const value = await read();
      if (ready(value)) {
        return value;
      }
      const elapsed = Date.now() - started;
      if (elapsed >= timeoutMs) {
        throw new GiveSmsTimeoutError(`Timed out after ${timeoutMs}ms waiting for ${label}`);
      }
      await delay(Math.min(intervalMs, timeoutMs - elapsed), options.signal);
    }
  }
}

function parseProxy(proxy: string): AxiosProxyConfig {
  let url: URL;
  try {
    url = new URL(proxy);
  } catch {
    throw new GiveSmsError(`Invalid proxy URL: ${proxy}`);
  }
  const config: AxiosProxyConfig = {
    protocol: url.protocol.replace(":", "") || "http",
    host: url.hostname,
    port: Number(url.port || (url.protocol === "https:" ? 443 : 80)),
  };
  if (url.username) {
    config.auth = {
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    };
  }
  return config;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new GiveSmsAbortError("Operation aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
