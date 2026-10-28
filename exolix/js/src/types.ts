/**
 * Rate type: floating market rate or a locked fixed rate.
 */
export type RateType = "float" | "fixed";

/**
 * Sort direction for transaction history.
 */
export type SortOrder = "asc" | "desc";

/**
 * Known transaction statuses returned by Exolix.
 */
export type TransactionStatus =
  | "wait"
  | "confirmation"
  | "confirmed"
  | "exchanging"
  | "sending"
  | "success"
  | "overdue"
  | "refund"
  | "refunded";

/**
 * Client configuration options for Exolix.
 */
export interface ExolixClientOptions {
  /**
   * Affiliate API key.
   *
   * Sent as the `Authorization` header. Partner attribution is this key
   * (default affiliate share 0.3%). The library does not add a referral
   * parameter and does not read the key from the environment.
   */
  apiKey?: string;
  /**
   * API base URL. Defaults to https://exolix.com/api/v2.
   */
  baseURL?: string;
  /**
   * HTTP request timeout in milliseconds. Defaults to 30000.
   */
  timeoutMs?: number;
  /**
   * Custom User-Agent header.
   */
  userAgent?: string;
}

/**
 * A network available for a currency, or a row from the network catalog.
 */
export interface Network {
  network: string;
  name: string;
  shortName?: string | null;
  notes?: string | null;
  addressRegex?: string | null;
  isDefault?: boolean;
  blockExplorer?: string | null;
  memoNeeded?: boolean;
  memoName?: string | null;
  memoRegex?: string | null;
  precision?: number;
  decimal?: number | null;
  contract?: string | null;
  icon?: string | null;
}

/**
 * A currency listed by Exolix.
 */
export interface Currency {
  code: string;
  name: string;
  icon?: string;
  notes?: string | null;
  /** Present when the request sets `withNetworks`. */
  networks?: Network[];
}

/**
 * Paginated list envelope used by currencies, networks, and history.
 */
export interface Paginated<T> {
  data: T[];
  count: number;
}

/**
 * Filters for `GET /currencies`.
 */
export interface GetCurrenciesParams {
  page?: number;
  size?: number;
  search?: string;
  withNetworks?: boolean;
}

/**
 * Filters for `GET /currencies/networks`.
 */
export interface GetNetworksParams {
  page?: number;
  size?: number;
  search?: string;
}

/**
 * Parameters for `GET /rate`.
 *
 * Pass `amount` (what you send) or `withdrawalAmount` (what you want to receive).
 */
export interface GetRateParams {
  coinFrom: string;
  coinTo: string;
  networkFrom?: string;
  networkTo?: string;
  amount?: number | string;
  withdrawalAmount?: number | string;
  rateType: RateType;
}

/**
 * Quote returned by `GET /rate`.
 */
export interface Rate {
  fromAmount: number;
  toAmount: number;
  rate: number;
  message: string | null;
  minAmount: number;
  withdrawMin: number;
  maxAmount: number;
}

/**
 * Parameters for `POST /transactions`.
 */
export interface CreateTransactionParams {
  coinFrom: string;
  coinTo: string;
  networkFrom: string;
  networkTo: string;
  withdrawalAddress: string;
  amount?: number | string;
  withdrawalAmount?: number | string;
  withdrawalExtraId?: string;
  rateType?: RateType;
  refundAddress?: string;
  refundExtraId?: string;
  /**
   * Permissible percentage the rate may move. Exolix requires `refundAddress`
   * when slippage is set.
   */
  slippage?: number | string;
}

/**
 * Coin side embedded in a transaction.
 */
export interface TransactionCoin {
  coinCode: string;
  coinName: string;
  network: string;
  networkName: string;
  networkShortName?: string | null;
  icon?: string | null;
  memoName?: string | null;
  contract?: string | null;
}

/**
 * On-chain hash and explorer link for the deposit or payout.
 */
export interface TransactionHash {
  hash: string | null;
  link: string | null;
}

/**
 * A created or historical exchange transaction.
 */
export interface Transaction {
  id: string;
  amount: number;
  amountTo: number;
  coinFrom: TransactionCoin;
  coinTo: TransactionCoin;
  comment?: string | null;
  createdAt?: string;
  depositAddress?: string;
  depositExtraId?: string | null;
  withdrawalAddress?: string;
  withdrawalExtraId?: string | null;
  hashIn?: TransactionHash;
  hashOut?: TransactionHash;
  rate?: number;
  rateType?: RateType | string;
  refundAddress?: string | null;
  refundExtraId?: string | null;
  status: TransactionStatus | string;
  source?: string;
}

/**
 * Filters for `GET /transactions` (authenticated history).
 */
export interface GetTransactionsParams {
  page?: number;
  size?: number;
  search?: string;
  sort?: string;
  order?: SortOrder;
  dateFrom?: string;
  dateTo?: string;
  /** One status or several. Several are sent as a comma-separated list. */
  statuses?: string | string[];
}
