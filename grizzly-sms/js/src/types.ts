import type { AxiosInstance } from "axios";

export interface GrizzlySmsOptions {
  /** API key from https://grizzlysms.com profile settings. */
  apiKey: string;
  /** Default `https://api.grizzlysms.com`. */
  baseUrl?: string;
  timeoutMs?: number;
  /**
   * Extra attempts after a failed read. Default `0`.
   * Network errors, HTTP 408/429/5xx, and `ERROR_SQL` / `SERVER_ERROR` are retried.
   * `getNumber`, `setStatus`, and rent purchases are not retried unless `retryMutations` is set.
   */
  retries?: number;
  /** Delay before a retry. Default `1000`. */
  retryDelayMs?: number;
  /** Also retry number purchases and status changes. Default `false`. */
  retryMutations?: boolean;
  /**
   * HTTP proxy URL, for example `http://user:pass@127.0.0.1:8080`.
   * Ignored when `axios` is set; configure the agent on that instance instead.
   */
  proxy?: string;
  /** Inject a custom axios instance (tests, proxies, mTLS). */
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
   * Country id. `"any"`, `"*"`, or omitting the field lets Grizzly pick a
   * country by stock, price, and deliverability.
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
  /** Mobile operator code when the country exposes one. */
  operator?: string;
  /** Ask for a number that can forward calls. `0` or `1`. */
  forward?: number | boolean;
  /** Activation type filter documented by the sms-activate-compatible protocol. */
  activationType?: number;
}

export interface GetBalanceOptions {
  /**
   * Pass `2` to request the reserve-aware balance (`version=2`).
   * The returned number is still the first amount in `ACCESS_BALANCE`.
   */
  version?: number;
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
  /** `1` when the country is shown in the catalog. */
  visible?: number;
  /** `1` when another SMS can be requested for numbers in this country. */
  retry?: number;
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
  /** Called with every poll result, including wait states. */
  onStatus?: (status: ActivationStatus) => void;
}

export interface ActivateOptions extends WaitForCodeOptions {
  /** Call `ready` (status `1`) before polling. Default `true`. */
  ready?: boolean;
  /** Cancel the number when the wait times out. Default `false`. */
  cancelOnTimeout?: boolean;
  /** Cancel the number when waiting fails for a reason other than timeout. */
  cancelOnError?: boolean;
}

export interface ActivationResult {
  order: OrderedNumberV2;
  code: string;
  status: "STATUS_OK";
}

export interface ReceivedMessage {
  code: string;
  text?: string;
  /** `sms` or `call`, from `getStatusV2`. */
  source: "sms" | "call";
  verificationType?: number;
}

export interface WaitForMessageOptions {
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onStatus?: (status: ActivationStatusV2) => void;
}

export interface NumbersStatusParams {
  country?: string | number;
  /** Operator code, or several codes separated by commas. */
  operator?: string;
}

/** One key from `getNumbersStatus`, for example `tg_0`. */
export interface NumberStock {
  key: string;
  service: string;
  /** Suffix after the service code. `0` means no redirect. */
  suffix: string;
  count: number;
}

export const RentAction = {
  /** Finish the rental. */
  Finish: 1,
  /** Cancel the rental. */
  Cancel: 2,
} as const;

export type RentActionValue = (typeof RentAction)[keyof typeof RentAction];

export interface RentNumberParams {
  service: string;
  country: string | number;
  /** Hours. The documented minimum is 4. */
  rentTime: number;
}

export interface RentPhone {
  id: string;
  number: string;
  endDate: string;
}

export interface RentMessage {
  phoneFrom?: string;
  service?: string;
  text?: string;
  date?: string;
}

export interface RentStatus {
  quantity: number;
  messages: RentMessage[];
}

export interface RentHistoryEntry {
  date?: string;
  price?: number;
  hours?: number;
}

export interface RentHistory {
  quantity: number;
  entries: RentHistoryEntry[];
}

export interface RentPrice {
  country: string;
  service: string;
  cost: number;
  count: number;
  maxHours?: number;
}

export interface RentPricesParams {
  service?: string;
  country?: string | number;
  /** Hours. The documented minimum is 4. */
  rentTime?: number;
}

/**
 * Body posted to a profile webhook URL.
 * Grizzly stores up to three URLs and uses the sms-activate-compatible shape.
 */
export interface ActivationWebhook {
  activationId: string;
  service?: string;
  text?: string;
  code?: string;
  country?: string;
  receivedAt?: string;
}

export interface ReceivedCode {
  code: string;
  status: "STATUS_OK";
}
