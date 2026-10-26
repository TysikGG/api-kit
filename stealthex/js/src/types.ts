/**
 * Client configuration options for StealthEX.
 */
export interface StealthEXClientOptions {
  /**
   * StealthEX API key (defaults to process.env.STEALTHEX_API_KEY).
   */
  apiKey?: string;
  /**
   * Base URL for the StealthEX API. Defaults to https://api.stealthex.io.
   */
  baseURL?: string;
  /**
   * HTTP request timeout in milliseconds. Defaults to 30000 (30 seconds).
   */
  timeoutMs?: number;
  /**
   * Custom User-Agent header string.
   */
  userAgent?: string;
}

/**
 * Currency information returned by StealthEX.
 */
export interface StealthEXCurrency {
  symbol: string;
  name: string;
  network?: string;
  image?: string;
  has_extra_id?: boolean;
  extra_id?: string | null;
  address_explorer?: string;
  tx_explorer?: string;
  validation_address?: string | null;
  validation_extra?: string | null;
  warnings_from?: string[];
  warnings_to?: string[];
}

/**
 * Range bounds for an exchange pair.
 */
export interface RangeResult {
  min_amount: string | null;
  max_amount?: string | null;
}

/**
 * Minimal amount required for an exchange pair.
 */
export interface MinAmountResult {
  min_amount: string;
}

/**
 * Estimated receiving amount.
 */
export interface EstimateResult {
  estimated_amount: string;
  rate_id?: string | null;
  valid_until?: string | null;
}

/**
 * Parameters for creating an exchange on StealthEX.
 */
export interface CreateExchangeParams {
  currencyFrom: string;
  currencyTo: string;
  addressTo: string;
  amountFrom: number | string;
  amountTo?: number | string;
  extraIdTo?: string;
  refundAddress?: string;
  refundExtraId?: string;
  rateId?: string;
  fixed?: boolean;
  referral?: string;
}

/**
 * Exchange details returned by StealthEX.
 */
export interface ExchangeDetails {
  id: string;
  type?: string;
  timestamp?: string;
  updated_at?: string;
  currency_from: string;
  currency_to: string;
  amount_from: string;
  amount_to: string;
  address_from: string;
  address_to: string;
  extra_id_from?: string | null;
  extra_id_to?: string | null;
  tx_from?: string | null;
  tx_to?: string | null;
  status: string;
  refund_address?: string | null;
  refund_extra_id?: string | null;
  [key: string]: unknown;
}
