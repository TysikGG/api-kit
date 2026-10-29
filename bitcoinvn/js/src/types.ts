/** Order states documented for `GET /api/orders/{id}`. */
export type OrderStatus =
  | "new"
  | "pending"
  | "settle_data_error"
  | "on_hold"
  | "processing"
  | "completed"
  | "canceled";

/** `GET /api/health` body. */
export interface HealthStatus {
  /** Current service health status. The documented value is `ok`. */
  status: "ok";
}

/** Asset record from `GET /api/info`. */
export interface Asset {
  /** Unique asset ticker symbol. */
  id: string;
  /** Human-readable asset name. */
  name: string;
  /** Percentage-based fee on currency conversions involving this asset. */
  exchangeFee: number;
  /** Percentage-based fee for cross-network bridge operations. */
  bridgeFee: number;
  /** Classification tags such as `crypto`, `fiat`, or `stablecoin`. */
  tags: string[];
  /** When set, this asset is an alias of another asset. */
  sameAs?: string | null;
}

/** One external payout field required by a transfer method. */
export interface SettleDataField {
  name: string;
  required: boolean;
}

/** Method-specific details. `banks` lists fiat bank ids when present. */
export interface TransferMethodDetails {
  banks?: string[];
  [key: string]: unknown;
}

/** Transfer method from `GET /api/info`. Use `id` exactly as returned. */
export interface TransferMethod {
  /** Active when deposit or settlement is enabled. */
  enabled: boolean;
  /** Unique transfer method identifier, for example `btc` or `vnd`. */
  id: string;
  /** Asset ticker this method belongs to. */
  asset: string;
  /** Decimal places for amounts. */
  decimals: number;
  /** Whether this method can be used for a deposit. */
  depositEnabled: boolean;
  /** Whether this method can be used for a payout. */
  settleEnabled: boolean;
  /** Whether this method is an internal account balance. */
  internalBalance: boolean;
  /** Classification tags. */
  tags: string[];
  /** External payout fields for order `settleData`. Omitted for internal balances. */
  settleDataFields?: SettleDataField[];
  /** Whether settlements are grouped. */
  batched?: boolean;
  /** Estimated settlement wait time in seconds. */
  predictedSettleWaitTime?: number;
  /** Network id. Omitted or null when the method has no network. */
  network?: string | null;
  /** Extra label when several methods share an asset. */
  extraLabel?: string | null;
  /** Flat network fee charged on deposits and settlements. */
  networkFee?: number;
  /** Flat fee charged on deposits. */
  depositFee?: number;
  /** Flat fee charged on settlements. */
  settleFee?: number;
  /** Percentage fee on conversions involving this method. */
  exchangeFee?: number;
  /** Liquidity modifier. Positive discounts deposits; negative discounts settlements. */
  exchangeBalanceIndex?: number;
  /** URL with more information about this method. */
  infoUrl?: string | null;
  /** Minimum order size in USD equivalent. */
  minOrderSize?: number | null;
  /** Maximum order size in USD equivalent. Null means no limit. */
  maxOrderSize?: number | null;
  /** Whether the method is invoice-based, such as Lightning. */
  invoice?: boolean;
  /** Warning message, when the API sends one. */
  warning?: string;
  /** Contract or token address for token methods. */
  tokenId?: string | null;
  /** Method-specific details, including `banks` for fiat methods. */
  details?: TransferMethodDetails | null;
}

/** Public catalogs from `GET /api/info`. */
export interface Info {
  /** Assets keyed by asset id. A record can exist when no method is active. */
  assets: Record<string, Asset>;
  /** Methods keyed by the exact id clients must send. */
  transferMethods: Record<string, TransferMethod>;
}

/** Pair rate and deposit range from `GET /api/pairs/{deposit}/{settle}`. */
export interface Pair {
  /** Rate from deposit method to settle method, including percentage fees. */
  rate: number;
  /** Minimum deposit amount in the deposit asset. */
  min: number;
  /**
   * Maximum deposit amount in the deposit asset.
   * Null means no pair-level maximum. If `max` is less than `min`, there is no valid range.
   */
  max?: number | null;
}

/** Public ticker from `GET /api/ticker/{base}/{quote}`. */
export interface Ticker {
  /** Rate including exchange fees. One base asset equals this many quote assets. */
  rate: number;
  /** 24-hour volume denominated in the quote asset. */
  volume24h: number;
}

/** Result of `GET /api/addresses/validate`. */
export interface AddressValidation {
  /** Whether the address or invoice is valid for the transfer method. */
  valid: boolean;
  /** Reason validation failed. Omitted when `valid` is true. */
  error?: string | null;
}

/** Body for `POST /api/quotes`. Send at most one of the amount fields. */
export interface CreateQuoteParams {
  /** Deposit method id from `GET /api/info`. */
  depositMethod: string;
  /** Settlement method id from `GET /api/info`. */
  settleMethod: string;
  /** Positive amount to send. Omit for a fixed settlement or variable quote. */
  depositAmount?: number;
  /** Positive amount to receive. Omit for a fixed deposit or variable quote. */
  settleAmount?: number;
  /** Markup greater than 0 and no more than 0.10. */
  markupRate?: number;
}

/** Quote returned by `POST /api/quotes` and nested on an order. */
export interface Quote {
  /** Transfer method id for the deposit side. */
  depositMethod: string;
  /** Transfer method id for the settlement side. */
  settleMethod: string;
  /** Quote UUID. */
  id?: string;
  /** Amount to deposit. */
  depositAmount?: number | null;
  /** Deposit-side fixed fee plus network fee, in deposit-asset units. */
  depositFee?: number;
  /** Amount to receive. */
  settleAmount?: number | null;
  /** Settlement-side fixed fee plus network fee, in settlement-asset units. */
  settleFee?: number;
  /** Locked rate including percentage fees and markup. */
  rate?: number;
  /** Market rate before fees. */
  rawRate?: number;
  /** ISO 8601 creation time. */
  createdAt?: string;
  /** Rate acceptance deadline. Creating an order does not extend it. */
  expiresAt?: string;
  /** Whether the linked order currently accepts this rate and deposit. */
  accepted?: boolean;
  /** Markup from quote creation, or null. */
  markupRate?: number | null;
}

/** Cryptocurrency address payout. */
export interface CryptoAddressSettleData {
  /** Settlement address, or an ASCII ENS name when `ensResolutionToken` is set. */
  address: string;
  /** Token from `GET /api/addresses/resolve`. Valid for 15 minutes. */
  ensResolutionToken?: string;
}

/** BOLT11 Lightning payout. */
export interface LightningSettleData {
  /** BOLT11 Lightning invoice. */
  invoice: string;
}

/** Address plus a destination tag, without a memo. */
export interface DestinationTagSettleData {
  address: string;
  ensResolutionToken?: string;
  /** Destination tag, such as an XRP tag. */
  destinationTag: string;
  memo?: never;
}

/** Address plus a memo, without a destination tag. */
export interface MemoSettleData {
  address: string;
  ensResolutionToken?: string;
  /** Destination memo, such as an XLM or ATOM memo. */
  memo: string;
  destinationTag?: never;
}

/** Tagged-address payout. Send a destination tag or a memo, not both. */
export type TaggedAddressSettleData = DestinationTagSettleData | MemoSettleData;

/** VND bank payout. `bank` comes from `transferMethods.vnd.details.banks`. */
export interface VndBankSettleData {
  /** VND bank account number. */
  accountNumber: string;
  /** Bank identifier from `GET /api/info`. */
  bank: string;
  /** Optional account holder name. */
  accountHolder?: string;
  /** Optional transfer note. */
  note?: string;
}

/** Internal-balance payout. Omit `settleData` to credit the authenticated account. */
export interface InternalBalanceSettleData {
  /** Email of the internal-balance beneficiary. */
  user?: string;
  /** Optional internal transfer note. */
  note?: string;
}

/** Cash pickup payout. */
export interface CashPickupSettleData {
  /** Optional phone number for the cash pickup. */
  phone?: string;
}

/** Payout object accepted by `POST /api/orders`. Omit it when the method needs no destination. */
export type OrderSettleData =
  | CryptoAddressSettleData
  | LightningSettleData
  | TaggedAddressSettleData
  | VndBankSettleData
  | InternalBalanceSettleData
  | CashPickupSettleData;

/**
 * Payout object accepted by `PUT /api/orders/{id}/settle-data`.
 * The spec allows an address, Lightning invoice, tagged address, or VND bank.
 */
export type SettleDataCorrection =
  | CryptoAddressSettleData
  | LightningSettleData
  | TaggedAddressSettleData
  | VndBankSettleData;

/** Fields shared by every `POST /api/orders` shape. `referrer` is not accepted here. */
export interface OrderRequestCommon {
  /** Client id, at most 64 characters, unique per authenticated user. */
  customOrderId?: string;
  /**
   * HTTPS webhook URL. Production allows port 443 or no port, a public domain,
   * and no credentials or fragment.
   */
  webhookUrl?: string;
  /** Payout details. Omit when the settlement method needs none. */
  settleData?: OrderSettleData;
}

/** Fixed quote, or an amountless internal-balance settlement quote, with no top-level amount. */
export interface QuotedOrderRequest extends OrderRequestCommon {
  /** Quote UUID. */
  quote: string;
  depositAmount?: never;
  settleAmount?: never;
  depositMethod?: never;
  settleMethod?: never;
}

/** Amountless internal-balance quote priced from `depositAmount`. */
export interface InternalBalanceDepositAmountOrderRequest extends OrderRequestCommon {
  /** Amountless internal-balance quote UUID. */
  quote: string;
  /** Deposit-side amount. */
  depositAmount: number;
  settleAmount?: never;
  depositMethod?: never;
  settleMethod?: never;
}

/** Amountless internal-balance quote priced from `settleAmount`. */
export interface InternalBalanceSettleAmountOrderRequest extends OrderRequestCommon {
  /** Amountless internal-balance quote UUID. */
  quote: string;
  /** Settlement-side amount. */
  settleAmount: number;
  depositAmount?: never;
  depositMethod?: never;
  settleMethod?: never;
}

/** Variable-amount order created from method ids, without a quote or amount. */
export interface DirectVariableOrderRequest extends OrderRequestCommon {
  /** Deposit method id from `GET /api/info`. */
  depositMethod: string;
  /** Settlement method id from `GET /api/info`. */
  settleMethod: string;
  quote?: never;
  depositAmount?: never;
  settleAmount?: never;
}

/** One of the four `POST /api/orders` request shapes. */
export type CreateOrderParams =
  | QuotedOrderRequest
  | InternalBalanceDepositAmountOrderRequest
  | InternalBalanceSettleAmountOrderRequest
  | DirectVariableOrderRequest;

/** Order returned by create, fetch, deposit, and settle-data calls. */
export interface Order {
  /** Order UUID. */
  id: string;
  /** Eight-character id used in URLs and support. */
  shortId: string;
  /** Current order state. */
  status: OrderStatus;
  /** Deposit method id. */
  depositMethod: string;
  /** Deposit asset ticker. */
  depositAsset: string;
  /** Deposit fee plus deposit network fee. */
  depositFee: number;
  /** Where to send the deposit. */
  depositData: Record<string, unknown>;
  /** Settlement method id. */
  settleMethod: string;
  /** Settlement asset ticker. */
  settleAsset: string;
  /** Settlement fee plus settlement network fee. */
  settleFee: number;
  /** Payout destination stored on the order. */
  settleData: Record<string, unknown>;
  /** Minimum deposit amount for this order. */
  depositMin: number;
  /** ISO 8601 creation time. */
  createdAt: string;
  /** Deposit deadline. The order is canceled after this time if nothing arrives. */
  expiresAt: string;
  /** Client id, when one was sent. */
  customOrderId?: string;
  /** Amount to deposit. Null for a variable-amount order. */
  depositAmount?: number | null;
  /** Required confirmation count when known. Null means unknown, not zero. */
  depositConfsRequired?: number | null;
  /** Incoming deposit transaction ids. */
  depositTxns?: string[];
  /** Amount to receive after fees. */
  settleAmount?: number | null;
  /** Outgoing settlement transaction ids. */
  settleTxns?: string[];
  /** Settlement receipt URL. */
  settleReceiptUrl?: string;
  /** Monero settlement proof, when present. */
  settleProof?: Record<string, unknown> | null;
  /** Final rate including percentage fees. */
  rate?: number;
  /** Soft maximum deposit, unless KYC sets a hard limit. */
  depositMax?: number;
  /** Quote used to create the order. */
  quote?: Quote;
  /** Message from the operator, for example a hold reason. */
  adminMessage?: string | null;
}

/** Query for `GET /api/orders`. */
export interface ListOrdersParams {
  /** Page number. Pages contain 10 orders. */
  page?: number;
  /** Exact case-sensitive client id. Only orders owned by the key are returned. */
  customOrderId?: string;
}

/** Body for `POST /api/orders/{id}/deposit`. */
export interface SubmitDepositParams {
  /** Transaction hash of the broadcast deposit. */
  txid: string;
}

/** Available balances keyed by asset id. */
export type Balances = Record<string, number>;

/** Query for `GET /api/balances/history`. */
export interface BalanceHistoryParams {
  /** Asset ticker filter, for example `BTC`. Omit for every asset. */
  assetId?: string;
  /** Page number. Pages contain 25 ledger rows. */
  page?: number;
}

/** One ledger row. */
export interface LedgerItem {
  /** Ledger entry UUID. */
  id: string;
  /** Asset ticker. */
  asset: string;
  /** Credited (positive) or debited (negative) amount. */
  value: number;
  /** ISO 8601 creation time. */
  createdAt: string;
  /** Human-readable description. */
  note?: string;
}

/** Staking offer from `GET /api/staking`. */
export interface Vault {
  /** Staking offer UUID. */
  id: string;
  /** Asset id of the staking receipt token. */
  asset: string;
  /** Share of exchange volume rewarded to stakers. */
  distribution: number;
  /** Positive maximum amount that can be staked. */
  supplyTarget: number;
  /** Total amount currently staked. */
  staked: number;
  /** APR based on the currently staked amount. */
  latestApr: number;
  /** APR based on the fully diluted supply. */
  latestFullyDilutedApr: number;
  /** Total value locked in USD. Omitted when unavailable. */
  tvl?: number;
  /** Fee rate charged when funds are unstaked. */
  unstakingFee?: number;
}

/** Body for staking preference updates. */
export interface BooleanConfiguration {
  /** Whether this staking preference is enabled. */
  value: boolean;
}

/** Signed ENS resolution from `GET /api/addresses/resolve`. Times are Unix seconds. */
export interface EnsResolution {
  name: string;
  address: string;
  transferMethod: string;
  networkId: string;
  networkName: string;
  chainId: number;
  resolvedAt: number;
  expiresAt: number;
  ensResolutionToken: string;
}

/** Values read from `X-RateLimit-*` response headers. */
export interface RateLimit {
  /** `X-RateLimit-Limit`. Maximum requests in the current window. */
  limit?: number;
  /** `X-RateLimit-Remaining`. Requests left in the current window. */
  remaining?: number;
  /** `X-RateLimit-Retry-After`. Seconds until the window resets. */
  retryAfter?: number;
}

/** Options for `waitForOrder`. */
export interface WaitForOrderParams {
  /** Milliseconds to wait. Defaults to 120000. */
  timeoutMs?: number;
  /** Milliseconds between polls. Defaults to 3000. */
  intervalMs?: number;
  /**
   * Statuses that end the wait. Defaults to `completed`, `canceled`, and
   * `settle_data_error`. `on_hold` keeps polling unless you include it.
   */
  statuses?: readonly OrderStatus[];
  /** Abort the wait. An abort throws `BitcoinVnError` with status 0. */
  signal?: AbortSignal;
}

/** Options for walking every order page. */
export interface ListAllOrdersParams {
  /** Exact case-sensitive client id filter. */
  customOrderId?: string;
  /** Maximum pages to request. Defaults to 100. Pages contain 10 orders. */
  maxPages?: number;
}

/** Options for walking every ledger page. */
export interface ListAllLedgerParams {
  /** Asset ticker filter. Omit for every asset. */
  assetId?: string;
  /** Maximum pages to request. Defaults to 100. Pages contain 25 rows. */
  maxPages?: number;
}

/** Optional fields for `fixedSwap` and `variableSwap`. */
export interface SwapOptions {
  /** HTTPS webhook URL. */
  webhookUrl?: string;
  /** Client id, at most 64 characters, unique per authenticated user. */
  customOrderId?: string;
}

/** Client settings. A missing or blank key sends no `X-API-KEY` header. */
export interface BitcoinVnOptions {
  /**
   * API key sent as `X-API-KEY`. Public reads, quotes, and order creation work
   * without it. Account reads and account writes require it.
   */
  apiKey?: string;
  /** Defaults to `https://bitcoinvn.io`. A trailing slash is removed. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 30000. */
  timeoutMs?: number;
  /**
   * Axios instance used instead of the built-in client.
   * `baseUrl`, `timeoutMs`, and `proxy` are ignored when this is set.
   */
  axios?: import("axios").AxiosInstance;
  /**
   * HTTP or HTTPS proxy used by the built-in Axios client.
   * A string is an absolute URL such as `http://user:pass@127.0.0.1:8080`.
   */
  proxy?: string | import("axios").AxiosProxyConfig;
  /**
   * Extra attempts for idempotent GET requests after a transport failure,
   * HTTP 429, or HTTP 5xx. Defaults to 0. POST and PUT are not retried unless
   * `retryMutations` is true.
   */
  retries?: number;
  /** Base delay in milliseconds before a retry. Doubles on each attempt. Defaults to 200. */
  retryDelayMs?: number;
  /**
   * Upper bound in milliseconds for a retry delay, including `Retry-After`.
   * Defaults to 5000.
   */
  maxRetryDelayMs?: number;
  /** When true, POST and PUT use `retries` as well. Defaults to false. */
  retryMutations?: boolean;
  /**
   * Extra request headers. `X-API-KEY` and `User-Agent` are always set by the client
   * and cannot be replaced here.
   */
  headers?: Record<string, string>;
  /** Clock used by `waitForOrder`. Defaults to `Date.now`. */
  now?: () => number;
  /** Sleep used by retries and `waitForOrder`. Defaults to `setTimeout`. */
  sleep?: (ms: number) => Promise<void>;
}
