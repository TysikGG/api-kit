/**
 * Client configuration options for SimpleSwap.
 */
export interface SimpleSwapClientOptions {
  /**
   * SimpleSwap partner API key (defaults to process.env.SIMPLESWAP_API_KEY).
   * Sent in the `x-api-key` header. This is the v3 partner attribution credential.
   */
  apiKey?: string;
  /**
   * Base URL for the SimpleSwap API. Defaults to https://api.simpleswap.io.
   * Trailing slashes are removed. Paths inside the client already include `/v3`.
   */
  baseURL?: string;
  /**
   * Alias of `baseURL`. `baseURL` wins when both are set.
   */
  baseUrl?: string;
  /**
   * HTTP request timeout in milliseconds. Defaults to 30000 (30 seconds).
   */
  timeoutMs?: number;
  /**
   * Alias of `timeoutMs`. `timeoutMs` wins when both are set.
   */
  timeout?: number;
  /**
   * Custom User-Agent header. Also sent as `x-user-agent`.
   * The default remains `simpleswap-client/0.1.0`.
   */
  userAgent?: string;
  /**
   * End-user IP forwarded as `x-client-ip`, as documented by the public API.
   */
  clientIp?: string;
  /**
   * HTTP or HTTPS proxy URL, for example `http://user:pass@127.0.0.1:8888`.
   */
  proxy?: string;
  /**
   * Extra attempts after a retryable failure. Defaults to 2 (three tries total).
   * GET requests retry network errors, HTTP 408, 429, and 5xx.
   * POST and PUT retry only HTTP 429, so a create or confirm is not repeated
   * after a timeout or a server error.
   */
  maxRetries?: number;
  /**
   * Base delay in milliseconds before a retry. Doubles each attempt.
   * A `Retry-After` header replaces this value. Defaults to 200.
   * The delay is capped at 60 seconds.
   */
  retryDelayMs?: number;
  /**
   * Default interval between `waitForExchange` polls, in milliseconds.
   * Defaults to 5000.
   */
  pollingIntervalMs?: number;
  /**
   * Default `waitForExchange` timeout, in milliseconds. Defaults to 600000 (10 minutes).
   */
  pollingTimeoutMs?: number;
}

/**
 * Known exchange statuses published by SimpleSwap.
 * The API may add statuses; treat unknown strings as in progress unless they
 * are in `TERMINAL_EXCHANGE_STATUSES`.
 */
export const ExchangeStatus = {
  Waiting: "waiting",
  Confirming: "confirming",
  Exchanging: "exchanging",
  Sending: "sending",
  Finished: "finished",
  Failed: "failed",
  Refunded: "refunded",
  Expired: "expired",
  Verifying: "verifying",
} as const;

export type ExchangeStatusName = (typeof ExchangeStatus)[keyof typeof ExchangeStatus];

/** Statuses that mean the exchange will not move to another state on its own. */
export const TERMINAL_EXCHANGE_STATUSES: readonly ExchangeStatusName[] = [
  ExchangeStatus.Finished,
  ExchangeStatus.Failed,
  ExchangeStatus.Refunded,
  ExchangeStatus.Expired,
];

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
  confirmationsFrom?: string | number;
  legacySymbol?: string;
  warningsFrom?: string[];
  warningsTo?: string[];
}

/**
 * Map of `ticker:network` keys to destination `ticker:network` values.
 * Returned by `GET /v3/pairs` and `GET /v3/pairs/{ticker}/{network}`.
 */
export type PairsMap = Record<string, string[]>;

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
  /** Partner reward percent. The public API documents the range 0.4–5. */
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
 * A bare boolean from the API is normalized to this object.
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
  reverse?: boolean;
  extraIdTo?: string;
  userRefundAddress?: string;
  userRefundExtraId?: string;
  rateId?: string | null;
  /** Partner reward percent. Omitted when null so the key's default fee stays in place. */
  customFee?: number | string | null;
}

/**
 * Fixed-rate market row from `GET /v3/market`.
 */
export interface MarketRate {
  tickerFrom: string;
  networkFrom: string;
  tickerTo: string;
  networkTo: string;
  min?: string | null;
  max?: string | null;
  rate?: string;
  minerFee?: string;
  reserve?: string;
  untilTime?: string;
  rateId?: string;
  [key: string]: unknown;
}

/**
 * Body for `PUT /v3/exchanges` (confirm a provider deposit).
 */
export interface ConfirmExchangeParams {
  publicId: string;
  txFrom?: string;
  providerUserDepositAddress?: string;
  targetAddress?: string;
}

/**
 * Exchange order details.
 * v3 identifies an exchange with `publicId`. Some responses and older examples
 * also include `id`. Use `exchangeId()` to read whichever is present.
 */
export interface ExchangeOrder {
  id: string;
  publicId?: string;
  type?: string;
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
  validUntil?: string | null;
  currencies?: {
    currencyFrom?: SimpleSwapCurrency;
    currencyTo?: SimpleSwapCurrency;
  };
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

export interface GetPairsParams {
  fixed?: boolean;
}

/**
 * Options for `waitForExchange`.
 */
export interface WaitForExchangeOptions {
  /** Milliseconds to wait. Defaults to the client `pollingTimeoutMs` (10 minutes). */
  timeoutMs?: number;
  /** Milliseconds between polls. Defaults to the client `pollingIntervalMs` (5 seconds). */
  intervalMs?: number;
  /**
   * Statuses that end the wait. Defaults to finished, failed, refunded, and expired.
   */
  statuses?: readonly string[];
  /** Called with every poll response, including the one that completes the wait. */
  onUpdate?: (order: ExchangeOrder) => void;
  /** Abort the wait. The in-flight HTTP call is not cancelled. */
  signal?: AbortSignal;
}
