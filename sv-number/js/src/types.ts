import type { AxiosInstance } from "axios";

/** Options for configuring the SvNumber client. */
export interface SvNumberOptions {
  /** API key from the SV Number account dashboard. */
  apiKey: string;

  /** Base URL for SV Number. Defaults to `https://sms-verification-number.com`. */
  baseUrl?: string;

  /** Request timeout in milliseconds. Defaults to 30000ms. */
  timeoutMs?: number;

  /** Preferred language for country and service names (`en`, `ru`, etc.). */
  lang?: string;

  /** Custom Axios instance, useful for testing or proxy routing. */
  axios?: AxiosInstance;
}

export interface GetNumberParams {
  /** Service identifier (e.g. `wa` for WhatsApp, `tg` for Telegram). */
  service: string;

  /** Country code or ID. Defaults to `0` (or any available). */
  country?: string | number;

  /** Specific telecom operator name, or `any`. */
  operator?: string;
}

export interface OrderedNumber {
  activationId: string;
  phoneNumber: string;
}

export interface OrderedNumberV2 extends OrderedNumber {
  activationCost?: number;
  countryCode?: string;
  service?: string;
}

export type ActivationStatusName =
  | "STATUS_WAIT_CODE"
  | "STATUS_WAIT_RETRY"
  | "STATUS_WAIT_RESEND"
  | "STATUS_CANCEL"
  | "STATUS_OK";

export interface ActivationStatus {
  status: ActivationStatusName | string;
  code?: string;
}

export interface ServiceCostItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export type PricesByCountry = Record<
  string,
  Record<string, { cost: number; count: number }>
>;

export interface WaitForCodeOptions {
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ReceivedCode {
  code: string;
  status: "STATUS_OK";
}
