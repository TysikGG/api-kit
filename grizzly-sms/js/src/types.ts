import type { AxiosInstance } from "axios";

export interface GrizzlySmsOptions {
  /** API key from https://grizzlysms.com profile settings. */
  apiKey: string;
  /** Default `https://api.grizzlysms.com`. */
  baseUrl?: string;
  timeoutMs?: number;
  /** Inject a custom axios instance (tests, proxies). */
  axios?: AxiosInstance;
}

/** Status passed to `setStatus`. Both `-1` and `8` cancel an activation. */
export const ActivationAction = {
  /** Inform the service that an SMS was sent to the number. */
  Ready: 1,
  /** Wait for another code on the same number. */
  Retry: 3,
  /** Finish the activation. */
  Complete: 6,
  /** Cancel the activation. */
  Cancel: 8,
  /** Alternate cancel code documented alongside `8`. */
  CancelAlt: -1,
} as const;

export type ActivationActionValue =
  (typeof ActivationAction)[keyof typeof ActivationAction];

export interface GetNumberParams {
  service: string;
  /**
   * Country id. `"any"` or omitting the field lets Grizzly pick a country
   * by stock, price, and deliverability.
   */
  country?: string | number;
  maxPrice?: number;
  minPrice?: number;
  providerIds?: ReadonlyArray<string | number> | string;
  exceptProviderIds?: ReadonlyArray<string | number> | string;
  /**
   * Prefixes to skip. Each item is a country code plus 3–6 digits of the
   * number mask, for example `1628` or `147220`.
   */
  phoneException?: ReadonlyArray<string> | string;
}

export interface OrderedNumber {
  activationId: string;
  phoneNumber: string;
}

export interface OrderedNumberV2 extends OrderedNumber {
  activationCost: number;
  /** ISO 4217 numeric currency code. */
  currency: number;
  countryCode: string;
  canGetAnotherSms: boolean;
  /** Activation start, `YYYY-MM-DD HH:mm:ss`. */
  activationTime: string;
  /** Moment when cancellation becomes allowed. */
  activationCancel?: string;
  /** Activation expiry. */
  activationEnd?: string;
}

export type ActivationStatusName =
  | "STATUS_WAIT_CODE"
  | "STATUS_WAIT_RETRY"
  | "STATUS_WAIT_RESEND"
  | "STATUS_CANCEL"
  | "STATUS_OK";

export interface ActivationStatus {
  status: ActivationStatusName | string;
  /** Present for `STATUS_OK` (the code) and `STATUS_WAIT_RETRY` (last code). */
  code?: string;
}

export interface VerificationMessage {
  dateTime?: string;
  code?: string;
  text?: string;
  from?: string;
  url?: string;
  parsingCount?: number;
}

export interface ActivationStatusV2 {
  verificationType?: number;
  sms?: VerificationMessage | null;
  call?: VerificationMessage | null;
}

export type SetStatusResult =
  | "ACCESS_READY"
  | "ACCESS_RETRY_GET"
  | "ACCESS_ACTIVATION"
  | "ACCESS_CANCEL";

export interface PriceQuote {
  country: string;
  service: string;
  cost: number;
  count: number;
}

export type PricesByCountry = Record<
  string,
  Record<string, { cost: number; count: number }>
>;

/** Price bucket map from `getPricesV2`: price string -> available count. */
export type PricesV2 = Record<string, Record<string, Record<string, number>>>;

export interface ProviderOffer {
  count: number;
  price: number[];
  provider_id: number | string;
}

export interface PriceV3Offer {
  price: number;
  count: number;
  providers?: Record<string, ProviderOffer>;
}

export type PricesV3 = Record<string, Record<string, PriceV3Offer>>;

export interface ServiceInfo {
  code: string;
  name: string;
}

export interface CountryInfo {
  id: number;
  rus?: string;
  eng?: string;
  chn?: string;
  tur?: string;
  spa?: string;
  hin?: string;
  ara?: string;
  fra?: string;
}

export interface ActiveActivation {
  activationId: string;
  phoneNumber: string;
  serviceCode: string;
  countryCode: string;
  countryName?: string;
  activationCost: number;
  currency?: number;
  activationStatus?: number | string;
  activationTime?: string;
  canGetAnotherSms?: boolean;
  discount?: string;
  repeated?: string;
  smsCode?: string;
  smsText?: string;
}

export interface WalletParams {
  /** Example from the docs: `usdt`. */
  coin?: string;
  /** Example from the docs: `tron`. */
  network?: string;
}

export interface CryptoWallet {
  walletAddress: string;
}

export interface FindPricesParams {
  service?: string;
  country?: string | number;
  minCount?: number;
  maxPrice?: number;
}

export interface WaitForCodeOptions {
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ReceivedCode {
  code: string;
  status: "STATUS_OK";
}
