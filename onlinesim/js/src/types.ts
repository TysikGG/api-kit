/**
 * Configuration options for OnlineSim client.
 */
export interface OnlineSimOptions {
  /**
   * API key obtained from OnlineSIM dashboard.
   */
  apiKey: string;

  /**
   * Base URL for the OnlineSIM API (defaults to https://onlinesim.io/api).
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds (defaults to 30000).
   */
  timeout?: number;
}

/**
 * Options for ordering a phone number.
 */
export interface GetNumOptions {
  /**
   * Service identifier name (e.g. 'vk', 'telegram', 'whatsapp').
   */
  service: string;

  /**
   * Country code (e.g. 7 for Russia, 380 for Ukraine, 49 for Germany).
   */
  country?: number | string;

  /**
   * Reject numbers with specific prefixes or operators.
   */
  reject?: string;

  /**
   * Specific phone number to request.
   */
  number?: string;

  /**
   * Clean session flag.
   */
  clean?: boolean | number;
}

/**
 * Result of ordering a phone number.
 */
export interface OrderResult {
  tzid: number;
  response: string | number;
}

/**
 * State of an ordered activation.
 */
export interface ActivationState {
  tzid: number;
  response: string;
  number?: string;
  service?: string;
  time?: number;
  msg?: string;
  form?: string;
  country?: number;
  [key: string]: unknown;
}

/**
 * Options for ordering a long-term rent number.
 */
export interface GetRentNumOptions {
  country: number | string;
  days: number;
  extension?: boolean;
}
