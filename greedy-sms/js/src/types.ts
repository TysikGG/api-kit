/**
 * Greedy SMS API Types
 * Based on OpenAPI 3.0.3 specification for api.greedy-sms.com.
 */

// ============================================================================
// System & User
// ============================================================================

export interface HealthResponse {
  status: "ok";
}

export interface UserPurchases {
  /** Number of activations */
  activations: number;
  /** Number of rentals */
  rents: number;
}

export interface UserDiscount {
  /** Personal link discount tier / level */
  level: string;
  /** Discount percentage */
  percent: number;
}

export interface UserInfo {
  id: string;
  purchases: UserPurchases;
  discount: UserDiscount;
  /** Current account balance in rubles */
  balance: number;
  /** Current referral balance in rubles */
  referralBalance: number;
}

// ============================================================================
// Common Pagination
// ============================================================================

export interface PaginationOptions {
  /** Page number (1-based) */
  page?: number;
  /** Number of items per page */
  pageSize?: number;
}

export interface PaginatedResponse {
  total: number;
  totalPages: number;
  pageSize: number;
  nextPage: number;
  prevPage: number;
}

// ============================================================================
// Activations
// ============================================================================

export interface OperatorCountryInfo {
  country: string;
  operators: string[];
}

export interface CountryTitle {
  rus: string;
  eng: string;
}

export interface CountryItem {
  id: number;
  title: CountryTitle;
  image?: string;
}

export interface GetCountriesResponse extends PaginatedResponse {
  countries: CountryItem[];
}

export interface ServiceItem {
  id: string;
  name: string;
}

export interface GetServicesOptions extends PaginationOptions {
  /** Service language: 'rus' | 'eng' */
  language?: "rus" | "eng";
  /** Country ID filter */
  country?: number;
}

export interface GetServicesResponse extends PaginatedResponse {
  services: ServiceItem[];
}

export interface PriceServiceItem {
  name: string;
  count: number;
  price: number;
}

export interface PriceCountryItem {
  country: number;
  services: PriceServiceItem[];
}

export interface GetPricesOptions extends PaginationOptions {
  country?: number;
  service?: string;
}

export interface GetPricesResponse extends PaginatedResponse {
  countries: PriceCountryItem[];
}

export interface NumberStatusItem {
  id: string;
  count: number;
}

export interface GetNumbersStatusOptions {
  service: string;
  page: number;
  pageSize?: number;
}

export interface GetNumbersStatusResponse extends PaginatedResponse {
  numbers: NumberStatusItem[];
}

export interface TopCountryPriceItem {
  country: number;
  price: number;
}

export interface TopCountryFullItem {
  id: number;
  count: number;
  price: number;
}

export interface GetTopCountriesOptions {
  service: string;
  page: number;
  pageSize?: number;
}

export interface GetTopCountriesResponse extends PaginatedResponse {
  countries: TopCountryFullItem[];
}

export type VerificationType = 1 | 2; // 1: SMS (default), 2: incoming call number

export interface GetNumberOptions {
  service: string;
  country: number;
  /** 1: SMS (default), 2: incoming call number */
  verificationType?: VerificationType;
  /** Maximum price mode. When max=true, maxPrice is required */
  max?: boolean;
  /** Maximum total price in rubles */
  maxPrice?: number | string;
  /** Legacy alias for maxPrice */
  max_price?: number | string;
  /** Specific provider ID */
  providerId?: number;
}

export interface OrderedNumber {
  activationId: number;
  phone: string;
  price: number;
}

export type ActivationAction = "Cancel" | "Finish" | "NewCode";

export interface ActivationStatusResponse {
  status: string;
}

export interface ActivationHistorySmsItem {
  code: string;
  date: string;
}

export interface ActivationHistoryItem {
  id: number;
  sourceId: number;
  source: "API" | "BOT";
  canManageViaApi: boolean;
  date: string;
  phone: string;
  service: string;
  country: number;
  sms: ActivationHistorySmsItem[];
  price?: number;
  status?: string | number;
}

export interface GetHistoryOptions extends PaginationOptions {
  /** Filter only active activations */
  active?: boolean;
}

export interface GetHistoryResponse extends PaginatedResponse {
  activations: ActivationHistoryItem[];
}

// ============================================================================
// Rental
// ============================================================================

export interface GetRentPricesOptions {
  service: string;
  operator?: string;
  country?: number;
}

export interface RentItem {
  id: number;
  sourceId: number;
  source: string;
  canManageViaApi: boolean;
  date: string;
  phone: string;
  service: string;
  country: number;
  price: number;
  endDate: string;
  status?: string | number;
  sms?: Array<{ phone: string; text: string; date: string }>;
}

export interface GetRentListResponse extends PaginatedResponse {
  rents: RentItem[];
}

export interface RentSmsItem {
  phone: string;
  text: string;
  date: string;
}

export interface GetRentStatusOptions {
  rentId: number | string;
  page: number;
  pageSize: number;
}

export interface GetRentStatusResponse extends PaginatedResponse {
  sms: RentSmsItem[];
}

export interface GetRentNumberOptions {
  service: string;
  country: number;
  /** Rental duration in hours */
  time: number;
  operator?: string;
}

export interface OrderedRentNumber {
  rentId: number;
  phone: string;
  price: number;
  endDate: string;
  lockCancelTime?: string;
}

export interface ContinuedRentNumber {
  rentId: number;
  phone: string;
  price: number;
  endDate: string;
}

// ============================================================================
// Mail (Disposable Email)
// ============================================================================

export interface MailDomainItem {
  name: string;
  cost: number;
  count: number;
}

export interface MailPriceQuote {
  cost: number;
  domain: string;
  url: string;
}

export interface OrderedMailDomain {
  id: number;
  email: string;
  price: number;
  site: string;
  status: string;
}

export interface MailStatusResponse {
  email: string;
  site: string;
  status: string;
  message: string;
  value: string;
}

export interface CancelMailOrderResponse {
  balance: number;
  status: string;
}

export interface MailOrderItem {
  id: number;
  email: string;
  site: string;
  price: number;
  status: string;
  date: string;
}

export interface GetMailOrdersResponse extends PaginatedResponse {
  orders: MailOrderItem[];
}

// ============================================================================
// Error Payload & Client Options
// ============================================================================

export interface PublicApiErrorPayload {
  status: "error";
  code: number | string;
  errorCode?: string;
  reasonCode?: string;
  providerCode?: string;
  message: string;
  retryAfterSeconds?: number;
  fields?: Array<{ field: string; message: string }>;
  details?: Record<string, unknown>;
}

export interface GreedySMSOptions {
  /** API key for x-api-key authentication */
  apiKey?: string;
  /** Custom API base URL (default: https://api.greedy-sms.com) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}
