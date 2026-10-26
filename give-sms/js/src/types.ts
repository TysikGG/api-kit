/**
 * Options for configuring GiveSms client.
 */
export interface GiveSmsOptions {
  /**
   * Give-SMS API key.
   */
  apiKey: string;

  /**
   * Base URL for requests (defaults to https://give-sms.com).
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds (defaults to 30000).
   */
  timeout?: number;
}

/**
 * Options for requesting available number count.
 */
export interface GetCountOptions {
  /**
   * Country code or name (e.g. kazakhstan, russia).
   */
  country?: string;

  /**
   * Mobile operator name.
   */
  operator?: string;
}

/**
 * Service availability item.
 */
export interface ServiceAvailability {
  cost?: number;
  count: number;
}

/**
 * Options for ordering a phone number.
 */
export interface GetNumberOptions {
  /**
   * Target service identifier (e.g. 'vk', 'tg', 'wa').
   */
  service: string;

  /**
   * Country name or ID (e.g. 'kazakhstan' or '2').
   */
  country?: string | number;

  /**
   * Operator name.
   */
  operator?: string;

  /**
   * Maximum acceptable price in account currency.
   */
  maxPrice?: number;
}

/**
 * Result of ordering a phone number.
 */
export interface ActivationNumber {
  /**
   * Order ID.
   */
  id: string | number;

  /**
   * Allocated phone number.
   */
  number: string;
}

/**
 * Result of checking SMS code.
 */
export interface CodeResult {
  /**
   * Received verification code.
   */
  code?: string;

  /**
   * Activation status string.
   */
  status: string;

  /**
   * Extra data returned by the API.
   */
  extra?: unknown;
}

/**
 * Status response for handler API.
 */
export interface HandlerStatusResult {
  status: string;
  code?: string;
}

/**
 * Generic API response from /api/v1/
 */
export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
}
