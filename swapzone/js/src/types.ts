/**
 * Client configuration options for Swapzone.
 */
export interface SwapzoneClientOptions {
  /**
   * Swapzone API key (defaults to process.env.SWAPZONE_API_KEY).
   */
  apiKey?: string;
  /**
   * Base URL for the Swapzone API. Defaults to https://api.swapzone.io.
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
 * Supported cryptocurrency information.
 */
export interface SupportedCurrency {
  name: string;
  ticker: string;
  network: string;
  defaultAmount?: number;
  smartContract?: string | null;
  alias?: string[];
  hasExternalId?: boolean;
}

/**
 * Parameters for querying exchange rates.
 */
export interface GetRateParams {
  /** Ticker of the deposited currency (e.g. 'btc') */
  from: string;
  /** Ticker of the received currency (e.g. 'eth') */
  to: string;
  /** Exchange deposit amount */
  amount: number | string;
  /** Rate type: 'all', 'fixed', or 'floating' (default: 'all') */
  rateType?: "all" | "fixed" | "floating";
  /** Filter for partners that work with USA clients */
  availableInUSA?: boolean;
  /** Selection strategy: 'best', 'all', or 'recommended' (default: 'best') */
  chooseRate?: "best" | "all" | "recommended";
  /** Exchangers with optional return address */
  noRefundAddress?: boolean;
  /** Network of the deposit currency */
  fromNetwork?: string;
  /** Network of the received currency */
  toNetwork?: string;
  /** Amount to receive after exchange (for reverse rate) */
  amountTo?: number | string;
  /** Timeout in ms to limit exchanger response time */
  timeout?: number | string;
}

/**
 * Rate offer result returned by getRate.
 */
export interface RateOffer {
  adapter: string;
  from: string;
  fromNetwork?: string;
  to: string;
  toNetwork?: string;
  amountFrom: number;
  amountTo: number;
  amountFromUSD?: number;
  amountToUSD?: number;
  quotaId?: string;
  minAmount?: number;
  maxAmount?: number;
  time?: number;
  accuracyRate?: number;
  [key: string]: unknown;
}

/**
 * Parameters for creating an exchange transaction.
 */
export interface CreateTransactionParams {
  /** Ticker of the currency to exchange */
  from: string;
  /** Ticker of the currency to receive */
  to: string;
  /** Amount to deposit */
  amountDeposit: number | string;
  /** Destination address to receive exchanged funds */
  addressReceive: string;
  /** Memo or extra ID for destination address (optional) */
  extraIdReceive?: string;
  /** Address for refunds if the exchange fails (optional) */
  refundAddress?: string;
  /** Memo for refund address (optional) */
  refundExtraId?: string;
  /** Quota ID obtained from getRate */
  quotaId?: string;
  /** Skip quota ID requirement */
  noQuotaId?: boolean;
  /** Network for deposit currency */
  fromNetwork?: string;
  /** Network for receive currency */
  toNetwork?: string;
  /** Reference ID for fixed-rate flows */
  offerReferenceId?: string;
}

/**
 * Transaction creation response.
 */
export interface TransactionResult {
  id: string;
  quotaId?: string;
  from: string;
  fromNetwork?: string;
  to: string;
  toNetwork?: string;
  status: string;
  addressReceive: string;
  addressDeposit: string;
  extraIdReceive?: string;
  amountDeposit: number;
  amountEstimated: number;
  createdAt: string;
  refundAddress?: string;
  refundExtraId?: string;
  payTill?: string;
  [key: string]: unknown;
}

/**
 * Transaction status response.
 */
export interface TransactionStatus {
  id: string;
  status: string;
  from: string;
  to: string;
  amountDeposit: number;
  amountEstimated: number;
  addressDeposit?: string;
  addressReceive?: string;
  hashDeposit?: string | null;
  hashReceive?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/**
 * Parameters for address validation.
 */
export interface ValidateAddressParams {
  currency: string;
  address: string;
  network?: string;
}

/**
 * Address validation result.
 */
export interface ValidateAddressResult {
  result: boolean;
  message?: string | null;
}

/**
 * DEX supported blockchain item.
 */
export interface DEXBlockchain {
  chainId: number;
  name: string;
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls?: string[];
  explorerUrls?: string[];
  [key: string]: unknown;
}

/**
 * Parameters for getting a DEX quote.
 */
export interface DEXQuoteParams {
  fromChainId: number | string;
  toChainId: number | string;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: number | string;
  slippage?: number | string;
}
