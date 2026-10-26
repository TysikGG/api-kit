/**
 * Client configuration options for SimpleSwap.
 */
export interface SimpleSwapClientOptions {
  /**
   * SimpleSwap API key (defaults to process.env.SIMPLESWAP_API_KEY).
   */
  apiKey?: string;
  /**
   * Base URL for the SimpleSwap API. Defaults to https://api.simpleswap.io.
   */
  baseURL?: string;
  /**
   * HTTP request timeout in milliseconds. Defaults to 30000 (30 seconds).
   */
  timeoutMs?: number;
  /**
   * Custom User-Agent header.
   */
  userAgent?: string;
}

/**
 * Currency information returned by SimpleSwap.
 */
export interface SimpleSwapCurrency {
  ticker: string;
  network: string;
  name: string;
  image?: string;
  precision?: number;
  contractAddress?: string | null;
  enabled?: boolean;
  isFiat?: boolean;
  isAvailableFixed?: boolean;
  isAvailableFloat?: boolean;
  hasExtraId?: boolean;
  extraId?: string;
  validationAddress?: string | null;
  validationExtra?: string | null;
  addressExplorer?: string;
  txExplorer?: string;
  confirmationsFrom?: string;
  legacySymbol?: string;
  warningsFrom?: string[];
  warningsTo?: string[];
}

/**
 * Parameters for querying estimated exchange amounts.
 */
export interface GetEstimateParams {
  tickerFrom: string;
  tickerTo: string;
  networkFrom?: string;
  networkTo?: string;
  amount: number | string;
  fixed?: boolean;
  reverse?: boolean;
  customFee?: number | string | null;
}

/**
 * Result returned by getEstimate.
 */
export interface EstimateResult {
  estimatedAmount: string;
  rateId?: string | null;
  validUntil?: string | null;
}

/**
 * Parameters for querying deposit ranges (min/max).
 */
export interface GetRangesParams {
  tickerFrom: string;
  tickerTo: string;
  networkFrom?: string;
  networkTo?: string;
  fixed?: boolean;
  reverse?: boolean;
}

/**
 * Minimum and maximum deposit amounts.
 */
export interface RangesResult {
  min: string | null;
  max: string | null;
}

/**
 * Parameters for checking if an exchange can be created.
 */
export interface CheckExchangeParams {
  tickerFrom: string;
  tickerTo: string;
  networkFrom?: string;
  networkTo?: string;
  amount: number | string;
  fixed?: boolean;
  reverse?: boolean;
}

/**
 * Result of checkExchange.
 */
export interface CheckExchangeResult {
  canCreate: boolean;
}

/**
 * Parameters for creating an exchange.
 */
export interface CreateExchangeParams {
  tickerFrom: string;
  tickerTo: string;
  networkFrom?: string;
  networkTo?: string;
  amount: number | string;
  addressTo: string;
  fixed?: boolean;
  extraIdTo?: string;
  userRefundAddress?: string;
  userRefundExtraId?: string;
  rateId?: string | null;
  customFee?: number | string | null;
}

/**
 * Exchange order details.
 */
export interface ExchangeOrder {
  id: string;
  status: string;
  tickerFrom: string;
  tickerTo: string;
  networkFrom?: string;
  networkTo?: string;
  amountFrom: string;
  amountTo: string;
  addressFrom: string;
  addressTo: string;
  extraIdFrom?: string | null;
  extraIdTo?: string | null;
  userRefundAddress?: string;
  userRefundExtraId?: string;
  txFrom?: string | null;
  txTo?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/**
 * Parameters for listing exchanges.
 */
export interface GetExchangesParams {
  limit?: number;
  offset?: number;
  startDate?: string;
  finishDate?: string;
}
