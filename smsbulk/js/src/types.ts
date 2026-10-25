/**
 * Client configuration options for SMSBulk.
 */
export interface SMSBulkClientOptions {
  /**
   * SMSBulk API key (defaults to process.env.SMSBULK_API_KEY).
   */
  apiKey?: string;
  /**
   * Base URL for the SMSBulk API. Defaults to https://smsbulk.net/api.
   */
  baseURL?: string;
  /**
   * HTTP request timeout in milliseconds. Defaults to 30000 (30 seconds).
   */
  timeoutMs?: number;
  /**
   * Optional custom User-Agent header.
   */
  userAgent?: string;
}

/**
 * Wallet balance response.
 */
export interface BalanceResponse {
  balance: string;
  currency: string;
}

/**
 * Wallet transaction item.
 */
export interface Transaction {
  id: string;
  amount: string;
  currency: string;
  type: string;
  description?: string;
  createdAt: string;
}

/**
 * Wallet transactions list response.
 */
export interface TransactionListResponse {
  data: Transaction[];
  nextCursor: string | null;
}

/**
 * Service catalog summary item.
 */
export interface ServiceCatalogItem {
  code: string;
  slug: string;
  name: string;
  nameLocalized?: Record<string, string>;
  category?: string;
  iconUrl?: string;
  countryCount: number;
  totalStock: number;
  minPrice: string;
}

/**
 * Services catalog list response.
 */
export interface ServicesResponse {
  data: ServiceCatalogItem[];
  count: number;
}

/**
 * Country catalog summary item.
 */
export interface CountryCatalogItem {
  isoCode: string;
  seoSlug?: string | null;
  name: string;
  nameLocalized?: Record<string, string>;
  flagEmoji?: string;
}

/**
 * Countries catalog list response.
 */
export interface CountriesResponse {
  data: CountryCatalogItem[];
  count: number;
}

/**
 * Country price and stock item for a specific service.
 */
export interface ServiceCountryItem {
  isoCode: string;
  slug?: string | null;
  name: string;
  nameLocalized?: Record<string, string>;
  flagEmoji?: string;
  price: string;
  currency: string;
  stock: number;
  speedTier?: string;
  avgArrivalSeconds?: number | null;
  availability: string;
}

/**
 * Service countries response.
 */
export interface ServiceCountriesResponse {
  service: {
    code: string;
    slug: string;
    name: string;
  };
  countries: ServiceCountryItem[];
  count: number;
}

/**
 * Parameters for reserving a virtual number.
 */
export interface CreateActivationParams {
  /** Service code (e.g. 'wa', 'tg') */
  serviceCode: string;
  /** Country ISO 3166-1 alpha-2 code (e.g. 'US', 'TR') */
  countryIso: string;
  /** Optional telecom carrier filter */
  operator?: string;
  /** Optional price lock: maximum USD price accepted */
  maxPrice?: string;
}

/**
 * Virtual number activation status.
 */
export type ActivationStatus =
  | "PENDING"
  | "WAITING"
  | "RECEIVED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED"
  | "ERROR";

/**
 * Virtual number activation details.
 */
export interface Activation {
  id: string;
  status: ActivationStatus;
  phoneNumber: string;
  smsCode?: string | null;
  purged: boolean;
  operator?: string | null;
  userCost: string;
  currency: string;
  service: {
    code: string;
    slug: string;
    name: string;
  };
  country: {
    isoCode: string;
    name: string;
    flagEmoji?: string;
  };
  createdAt: string;
  expiresAt?: string | null;
  receivedAt?: string | null;
  cancelledAt?: string | null;
  completedAt?: string | null;
  cancellable: boolean;
  cancellableAt?: string | null;
}

/**
 * Activation list response.
 */
export interface ActivationListResponse {
  data: Activation[];
  nextCursor: string | null;
}

/**
 * Email domain pricing and stock item.
 */
export interface EmailDomainItem {
  name: string;
  price: number;
  count: number;
  currency: string;
  disabled: boolean;
}

/**
 * Parameters for purchasing a temporary email address.
 */
export interface CreateEmailActivationParams {
  /** Target site the email will be used on (e.g. 'telegram.com') */
  site: string;
  /** Email provider domain (e.g. 'gmx.com') */
  domain: string;
}

/**
 * Email activation status.
 */
export type EmailActivationStatus =
  | "WAITING"
  | "RECEIVED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED"
  | "ERROR";

/**
 * Email activation details.
 */
export interface EmailActivation {
  id: string;
  site: string;
  domain: string;
  emailAddress?: string | null;
  status: EmailActivationStatus;
  otpValue?: string | null;
  htmlMessage?: string | null;
  userCost: string;
  currency: string;
  expiresAt?: string | null;
  receivedAt?: string | null;
  createdAt: string;
  reorderBlockedAt?: string | null;
}

/**
 * Email activation list response.
 */
export interface EmailActivationListResponse {
  data: EmailActivation[];
  nextCursor: string | null;
}
