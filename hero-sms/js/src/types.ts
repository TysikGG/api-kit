/**
 * HeroSMS API Types
 * Based on OpenAPI specification for HeroSMS / SMS-Activate compatible API.
 */

/**
 * Activation status codes for setStatus action.
 */
export enum ActivationStatusCode {
  /** SMS sent - inform about readiness to receive code */
  SMS_SENT = 1,
  /** Request resending of SMS */
  REQUEST_RESEND = 3,
  /** Complete activation (code received and confirmed) */
  COMPLETE = 6,
  /** Cancel activation (return money) */
  CANCEL = 8,
}

/**
 * Supported languages for API responses.
 */
export type Language = "ru" | "en" | "cn" | "de" | "es" | "pt" | "fr";

/**
 * Response from getNumberV2 endpoint.
 */
export interface GetNumberV2Response {
  activationId: string;
  phoneNumber: string;
  activationCost: number;
  currency: number;
  countryCode: number;
  countryPhoneCode: number;
  canGetAnotherSms: boolean;
  activationTime: string;
  activationEndTime: string;
  activationOperator: string;
}

/**
 * SMS information in activation status.
 */
export interface SmsInfo {
  dateTime: string;
  code: string;
  text: string;
}

/**
 * Call information in activation status.
 */
export interface CallInfo {
  from: string;
  text: string;
  code: string;
  dateTime: string;
  url: string;
  parsingCount: number;
}

/**
 * Response from getStatusV2 endpoint.
 */
export interface ActivationStatusV2 {
  verificationType: number;
  sms: SmsInfo;
  call: CallInfo;
}

/**
 * Single active activation item.
 */
export interface ActiveActivation {
  activationId: string;
  serviceCode: string;
  phoneNumber: string;
  activationCost: number;
  activationStatus: string;
  smsCode: string | null;
  smsText: string | null;
  activationTime: string;
  discount: string;
  repeated: string;
  countryCode: string;
  countryName: string;
  canGetAnotherSms: string;
  currency: string;
}

/**
 * Response from getActiveActivations endpoint.
 */
export interface ActiveActivationsResponse {
  status: string;
  data: ActiveActivation[];
}

/**
 * Single activation history item.
 */
export interface ActivationHistoryItem {
  id: string;
  date: string;
  phone: string;
  sms: string;
  cost: number;
  status: string;
  currency: number;
}

/**
 * Country information.
 */
export interface Country {
  id: number;
  rus: string;
  eng: string;
  chn: string;
  visible: 0 | 1;
  retry: 0 | 1;
}

/**
 * Countries response - object keyed by country ID.
 */
export type CountriesResponse = Record<string, Country>;

/**
 * Service information.
 */
export interface Service {
  code: string;
  name: string;
}

/**
 * Response from getServicesList endpoint.
 */
export interface ServicesListResponse {
  status: string;
  services: Service[];
}

/**
 * Response from getOperators endpoint.
 */
export interface OperatorsResponse {
  status: string;
  countryOperators: Record<string, string[]>;
}

/**
 * Price information for a service in a country.
 */
export interface PriceInfo {
  cost: number;
  count: number;
  physicalCount: number;
}

/**
 * Prices by country: Record<countryId, Record<serviceCode, PriceInfo>>
 */
export type PricesByCountry = Record<string, Record<string, PriceInfo>>;

/**
 * Top country info for a single service.
 */
export interface TopCountryInfo {
  physicalTotalCount: number;
  physicalCountForDefaultPrice: number;
  physicalPriceMap: Record<string, number>;
  retail_price: number;
  country: number;
  price: number;
  count: number;
}

/**
 * Known API error codes.
 */
export type ApiErrorCode =
  | "BAD_ACTION"
  | "BAD_KEY"
  | "NO_KEY"
  | "ERROR_SQL"
  | "BAD_SERVICE"
  | "BAD_STATUS"
  | "NO_NUMBERS"
  | "NO_ACTIVATION"
  | "WRONG_ACTIVATION_ID"
  | "WRONG_MAX_PRICE"
  | "EARLY_CANCEL_DENIED"
  | "CHANNELS_LIMIT"
  | "OPERATORS_NOT_FOUND"
  | "ORDER_ALREADY_EXISTS"
  | "NO_ACTIVATIONS"
  | "ACCOUNT_INACTIVE"
  | "SERVICE_NOT_AVAILABLE"
  | "SIM_OFFLINE"
  | "NO_BALANCE"
  | "UNPROCESSABLE_ENTITY"
  | "FREE_CANCELLATION_EXPIRED"
  | "OTP_RECEIVED"
  | "NEW_OTP_RECEIVED"
  | "ACTIVATION_NOT_ACTIVE"
  | "FINISHED"
  | "REFUNDED"
  | "CANCELED"
  | "BAD_DURATION"
  | "WRONG_COUNTRY"
  | "WRONG_SERVICE"
  | "WRONG_CURRENCY"
  | "NOT_FOUND"
  | "SERVER_ERROR"
  | "BANNED";

/**
 * Parsed number response from getNumber.
 */
export interface ParsedNumberResponse {
  activationId: number;
  phoneNumber: string;
}

/**
 * Parsed status response from getStatus.
 */
export interface ParsedStatusResponse {
  status: "STATUS_WAIT_CODE" | "STATUS_WAIT_RETRY" | "STATUS_WAIT_RESEND" | "STATUS_CANCEL" | "STATUS_OK";
  code?: string;
}

/**
 * Options for getNumber and getNumberV2 requests.
 */
export interface GetNumberOptions {
  service: string;
  country: number;
  maxPrice?: number;
  /** Purchasing strictly at the specified maxPrice */
  fixedPrice?: string;
  /** Excluding phone number prefixes (comma-separated, max 20) */
  phoneException?: string;
  operator?: string;
}

/**
 * Options for getHistory request.
 */
export interface GetHistoryOptions {
  start?: number;
  end?: number;
  offset?: number;
  size?: number;
}

/**
 * Options for getServicesList request.
 */
export interface GetServicesListOptions {
  country?: number;
  lang?: Language;
}

/**
 * Options for getPrices request.
 */
export interface GetPricesOptions {
  service?: string;
  country?: number;
}

/**
 * Options for getTopCountriesByService request.
 */
export interface GetTopCountriesOptions {
  service?: string;
  freePrice?: boolean;
}

/**
 * Options for getActiveActivations request.
 */
export interface GetActiveActivationsOptions {
  /** Offset for pagination (default: 0) */
  start?: number;
  /** Maximum number of results (max: 100) */
  limit?: number;
}

/**
 * Options for getAllSms request.
 */
export interface GetAllSmsOptions {
  /** Activation ID */
  id: string | number;
  /** Number of items per page */
  size?: number;
  /** Page number */
  page?: number;
}

/**
 * Options for serviceCountRent request.
 */
export interface GetRentPricesOptions {
  service: string;
  country?: number;
  operator?: string;
  currency?: number;
}

/**
 * Options for getRentServicesAndCountries request.
 */
export interface GetRentServicesAndCountriesOptions {
  country: number;
  duration: number;
}

/**
 * Options for getRentNumber request.
 */
export interface GetRentNumberOptions {
  service: string;
  country: number;
  duration: number;
  operator?: string;
  currency?: number;
}

/**
 * OTP / SMS item from getAllSms endpoint.
 */
export interface OtpItem {
  id: string;
  phoneFrom: string;
  code?: string | null;
  text?: string | null;
  service: string;
  date: string;
  type: "sms" | "call";
}

/**
 * Response from getAllSms endpoint.
 */
export interface GetAllSmsResponse {
  data: OtpItem[];
  meta: {
    total: number;
    service: string;
  };
}

/**
 * Rent price/count info for a single duration.
 */
export interface RentPriceCount {
  price: number;
  count: number;
}

/**
 * Response from serviceCountRent endpoint.
 * Record<countryId, Record<durationId, RentPriceCount>>
 */
export type RentCountByService = Record<string, Record<string, RentPriceCount>>;

/**
 * Service info in getRentServicesAndCountries response.
 */
export interface RentServiceInfo {
  quantity: number;
  price: number;
  retail_price: number;
}

/**
 * Response from getRentServicesAndCountries endpoint.
 */
export interface GetRentServicesAndCountriesResponse {
  operators: Record<string, string>;
  services: Record<string, RentServiceInfo>;
}

/**
 * Response from reactivationPrice endpoint.
 */
export interface ReactivationPriceResponse {
  data: {
    price: number;
    currency?: number;
  };
}

/**
 * Account banned information (from JSON error responses).
 */
export interface AccountBannedInfo {
  scope: "global" | "specific";
  banned_until: number;
  retry_after_seconds: number;
  readable_date?: string;
}

/**
 * Base structured error response (JSON error format).
 */
export interface BaseErrorResponse {
  title: string;
  details: string;
  info?: Record<string, unknown>;
}

/**
 * Webhook payload for sms-incoming events.
 */
export interface WebhookPayload {
  activationId: string;
  service: string;
  text: string | null;
  code?: string | null;
  country: number;
  receivedAt: string;
}

/**
 * Configuration options for HeroSMS client.
 */
export interface HeroSMSOptions {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for the API (default: https://hero-sms.com/stubs/handler_api.php) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Alias for HeroSMSOptions for backwards compatibility.
 */
export type HeroSMSClientOptions = HeroSMSOptions;
