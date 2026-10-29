/**
 * Options for configuring the Give-SMS client.
 */
export interface GiveSmsOptions {
  /** Give-SMS API key (`userkey` / `api_key`). */
  apiKey: string;
  /** Base URL. Defaults to `https://give-sms.com`. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 30000. */
  timeout?: number;
  /**
   * Extra attempts after a network failure, a timeout, HTTP 502, or `ERROR_SQL`.
   * Defaults to 0.
   */
  retries?: number;
  /** Delay before the first retry, in milliseconds. Later attempts back off linearly. */
  retryDelayMs?: number;
  /**
   * Status codes and handler error symbols that should be retried, in addition
   * to network failures and timeouts. Defaults to `[502, "ERROR_SQL"]`.
   */
  retryOn?: Array<string | number>;
  /** HTTP proxy URL, for example `http://user:pass@host:8080`. */
  proxy?: string;
  /** Extra request headers. */
  headers?: Record<string, string>;
}

export interface GetCountOptions {
  /** Country slug (`kazakhstan`) or any value the API accepts. */
  country?: string | number;
  /** Operator name (`ANY`, `TELE2`, `MTS`, …). */
  operator?: string;
}

export interface ServiceStock {
  count: number;
  price?: string | number;
}

export interface GetNumberOptions {
  /** Service code (`tg`, `vk`, `wa`, …). See {@link SERVICES}. */
  service: string;
  /** Country slug or handler id. Defaults to Kazakhstan on the server. */
  country?: string | number;
  /** Operator name. Error 503 means this operator does not exist. */
  operator?: string;
  /** Highest price you will pay. The server charges the real price, capped by this value. */
  maxPrice?: number;
}

export interface ActivationNumber {
  /** Order id. Native responses use `order_id`; handler responses use the id from `ACCESS_NUMBER`. */
  id: string | number;
  /** Phone number in international format without a leading `+`. */
  number: string;
  /** Same as `number` when the API returns `phone`. */
  phone?: string;
  /** Native `order_id` when present. */
  orderId?: string | number;
  /** ISO timestamp when the order started. */
  startTime?: string;
}

export interface CodeResult {
  /** `OK` when an SMS arrived, `WAIT` when status is 400 (not an error). */
  status: string;
  /** Parsed verification code. May be missing when the SMS could not be parsed. */
  code?: string;
  /** Full SMS body (`fullSms`). */
  fullSms?: string;
  phone?: string;
  receivedDate?: string;
  sender?: string;
  /** SMS id. Pass it as `lastId` to {@link GiveSms.wrongCode}. */
  smsId?: string | number;
  phonePass?: string;
  message?: string;
  advice?: string;
  /** Raw `data` object. */
  extra?: unknown;
}

export interface ReactivationOption {
  duration: number;
  price: number;
}

export interface ReactivationOptions {
  order_id?: string | number;
  phone?: string;
  options?: ReactivationOption[];
  reason?: string;
}

export interface ReactivationResult {
  order_id?: string | number;
  id?: string | number;
  phone?: string;
  price?: number;
  duration?: number;
  start_time?: string;
  end_time?: string;
}

export interface HandlerStatusResult {
  status: string;
  code?: string;
  raw?: string;
}

export interface HandlerNumbersStatusOptions {
  country?: string | number;
  operator?: string;
}

export interface HandlerGetNumberOptions {
  service: string;
  country?: string | number;
  operator?: string;
  maxPrice?: number;
}

export interface HandlerPricesOptions {
  country?: string | number;
  service?: string;
  /** `1` returns every price tier (`price -> count`) instead of only the minimum. */
  tiers?: number;
}

export interface WaitOptions {
  /** Total time to wait, in milliseconds. Defaults to 180000. */
  timeoutMs?: number;
  /** Pause between polls, in milliseconds. Defaults to 5000 (the API suggests 5–10s). */
  intervalMs?: number;
  /** Cancel the wait. */
  signal?: AbortSignal;
}

/** SMS-Activate compatible `setStatus` codes supported by Give-SMS. */
export const HandlerSetStatus = {
  Ready: 1,
  RequestAnotherSms: 3,
  Complete: 6,
  Cancel: 8,
} as const;

export type HandlerSetStatusCode = (typeof HandlerSetStatus)[keyof typeof HandlerSetStatus];

export type RentPeriodType = "week" | "month";

export interface RentDataOptions {
  /** ISO-like country code used by the rent API (`KZ`, `AT`, …). */
  country: string;
}

export interface RentOrderOptions {
  type: RentPeriodType;
  /** Number of weeks or months. */
  period: number;
  /** Service ids, comma-separated or as a list (`82,1,4`). */
  services: string | Array<string | number>;
  country: string;
  operator?: string;
}

export interface RentOrder {
  orderId: string | number;
  phone: string;
  countryCode?: string;
  endTime?: string;
  endTimeTimestamp?: number;
  startTimestamp?: number;
  ordersCount?: number;
  orderIds?: Array<string | number>;
  raw: Record<string, unknown>;
}

export interface RentSmsMessage {
  date?: string;
  text?: string;
  timestamp?: number;
  raw: Record<string, unknown>;
}

export interface RentSmsList {
  message?: string;
  messages: RentSmsMessage[];
  raw: Record<string, unknown>;
}

export interface RentProlongOptions {
  rentId: string | number;
  type: RentPeriodType;
  period: number;
}

export interface RentProlongResult {
  message?: string;
  orderId?: string | number;
  days?: number;
  price?: number;
  rentAt?: number;
  rentAtFormatted?: string;
  raw: Record<string, unknown>;
}

export interface RentWaitOptions extends WaitOptions {
  /** Ignore messages at or before this UNIX timestamp. */
  since?: number;
}

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
}

export const DEFAULT_BASE_URL = "https://give-sms.com";
export const API_V1_PATH = "/api/v1/";
export const HANDLER_PATH = "/stubs/handler_api.php";
export const RENT_PATH = "/api/v2/rent/rent_number.php";
