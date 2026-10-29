/**
 * Options for configuring the FixedFloat client.
 */
export interface FixedFloatOptions {
  /**
   * Your FixedFloat API key.
   */
  apiKey?: string;

  /**
   * Your FixedFloat API secret used for HMAC-SHA256 signature generation.
   */
  apiSecret?: string;

  /**
   * Custom base URL for the FixedFloat API.
   * @defaultValue "https://ff.io/api/v2"
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds.
   * @defaultValue 15000
   */
  timeout?: number;

  /**
   * HTTP or HTTPS proxy URL, for example `http://user:pass@127.0.0.1:8080`.
   * Applied to JSON API calls and to the XML rates export.
   */
  proxy?: string;

  /**
   * Extra attempts after a transient failure (network, timeout, HTTP 429 or 5xx).
   * Business errors (`code != 0` on HTTP 2xx) are never retried.
   * `POST /create` is never retried, because a repeat can open a second order.
   * @defaultValue 2
   */
  retries?: number;

  /**
   * Base delay in milliseconds for exponential backoff between retries.
   * Attempt n waits `retryDelay * 2^n` milliseconds.
   * @defaultValue 200
   */
  retryDelay?: number;

  /**
   * Origin that serves `GET /rates/float.xml` and `GET /rates/fixed.xml`.
   * @defaultValue "https://ff.io"
   */
  ratesBaseUrl?: string;

  /**
   * Extra headers sent on every JSON request. Authentication headers overwrite these.
   */
  headers?: Record<string, string>;
}

/**
 * Standard API response wrapper from FixedFloat v2.
 */
export interface ApiResponse<T> {
  /**
   * Status code: 0 indicates success.
   */
  code: number;

  /**
   * Status or error message ("OK", "success", etc.).
   */
  msg: string;

  /**
   * Response payload.
   */
  data: T;
}

/**
 * Represents a cryptocurrency supported by FixedFloat.
 */
export interface Currency {
  /**
   * Currency identifier code (e.g. "BTC", "ETH", "USDTTRC").
   */
  code: string;

  /**
   * Coin symbol name.
   */
  coin: string;

  /**
   * Blockchain network name (e.g. "BTC", "ETH", "BSC", "TRX").
   */
  network: string;

  /**
   * Full human-readable name of the cryptocurrency.
   */
  name: string;

  /**
   * Whether receiving (deposit) is supported. The API may send `1`/`0` or a boolean.
   */
  recv: number | boolean;

  /**
   * Whether sending (withdrawal) is supported. The API may send `1`/`0` or a boolean.
   */
  send: number | boolean;

  /**
   * Memo or destination tag name if required by the network.
   */
  tag: string | null;

  /**
   * Logo image URL.
   */
  logo: string;

  /**
   * Brand color hex code.
   */
  color: string;

  /**
   * Display priority sorting index.
   */
  priority: number | string;

  /**
   * Token contract address when the asset is not native to the network.
   */
  contract?: string | null;
}

/**
 * Rate type for exchanges: fixed or float.
 */
export type OrderType = "fixed" | "float";

/**
 * Exchange direction: "from" (deposit amount specified) or "to" (receive amount specified).
 */
export type ExchangeDirection = "from" | "to";

/**
 * Parameters for requesting exchange price estimates.
 */
export interface GetPriceParams {
  /**
   * Source cryptocurrency code (e.g. "BTC").
   */
  fromCcy: string;

  /**
   * Destination cryptocurrency code (e.g. "ETH").
   */
  toCcy: string;

  /**
   * Exchange amount.
   */
  amount: number;

  /**
   * Exchange direction.
   */
  direction: ExchangeDirection;

  /**
   * Rate type: "fixed" or "float".
   */
  type: OrderType;

  /**
   * Optional custom affiliate tax percent if applicable.
   * The library always sends its affiliate `refcode` alongside this value.
   */
  afftax?: number;

  /**
   * When true, the response includes `ccies` with send/receive availability.
   */
  ccies?: boolean;

  /**
   * When true, amounts that fall outside limits are adjusted using the USD equivalent.
   */
  usd?: boolean;
}

/**
 * One currency inside a price response when `ccies: true` was requested.
 */
export interface PriceCurrencyAvailability {
  code: string;
  recv: number | boolean;
  send: number | boolean;
}

/**
 * Quote problems returned in `PriceResult.errors` while the HTTP call itself succeeds.
 * An empty array means an order can be created with those parameters.
 */
export type PriceErrorCode =
  | "MAINTENANCE_FROM"
  | "MAINTENANCE_TO"
  | "OFFLINE_FROM"
  | "OFFLINE_TO"
  | "RESERVE_FROM"
  | "RESERVE_TO"
  | "LIMIT_MIN"
  | "LIMIT_MAX";

/**
 * Price quote side details (from or to).
 */
export interface PriceSide {
  code: string;
  network: string;
  coin: string;
  amount: number | string;
  rate: number | string;
  min: number | string;
  max: number | string;
  /** Rounding precision. */
  precision?: number;
  /** USD equivalent of this side. */
  usd?: number;
  /** BTC equivalent of the amount the client sends. Present on `from` only. */
  btc?: number;
}

/**
 * Price calculation result.
 */
export interface PriceResult {
  from: PriceSide;
  to: PriceSide;
  errors?: Array<PriceErrorCode | string>;
  /** Present when the quote was requested with `ccies: true`. */
  ccies?: PriceCurrencyAvailability[];
}

/**
 * Parameters for creating an exchange order.
 */
export interface CreateOrderParams {
  /**
   * Source cryptocurrency code (e.g. "BTC").
   */
  fromCcy: string;

  /**
   * Destination cryptocurrency code (e.g. "ETH").
   */
  toCcy: string;

  /**
   * Exchange amount.
   */
  amount: number;

  /**
   * Exchange direction.
   */
  direction: ExchangeDirection;

  /**
   * Order type: "fixed" or "float".
   */
  type: OrderType;

  /**
   * Destination wallet address to receive the exchanged funds.
   * A memo can also be appended as `address:memo`.
   */
  toAddress: string;

  /**
   * Memo or destination tag. Official API field name.
   * You can also pass {@link CreateOrderParams.extraId}; it is sent as `tag`.
   */
  tag?: string;

  /**
   * Alias of {@link CreateOrderParams.tag}. Kept for existing callers.
   * Sent both as `tag` (official) and `extraId`.
   */
  extraId?: string;

  /**
   * Optional refund wallet address. Kept for existing callers.
   * The public create method documents `tag` and the destination address;
   * this field is forwarded when you set it.
   */
  refundAddress?: string;

  /**
   * Optional destination tag or memo for the refund address.
   * Kept for existing callers and forwarded when set.
   */
  refundExtraId?: string;

  /**
   * Optional affiliate tax percent.
   */
  afftax?: number;
}

/**
 * Lifecycle status of an exchange order.
 */
export type OrderStatus =
  | "NEW"
  | "PENDING"
  | "EXCHANGE"
  | "WITHDRAW"
  | "DONE"
  | "EXPIRED"
  | "EMERGENCY";

/**
 * Why an order entered EMERGENCY. Several values can be present at once.
 */
export type EmergencyStatus = "EXPIRED" | "LESS" | "MORE" | "LIMIT";

/**
 * Choice stored on an emergency order. `NONE` means the customer has not chosen yet.
 */
export type EmergencyChoiceState = "NONE" | "EXCHANGE" | "REFUND";

/**
 * Order transaction details.
 */
export interface OrderTx {
  id?: string | null;
  amount?: string | null;
  fee?: string | null;
  ccyfee?: string | null;
  timeReg?: number | null;
  timeBlock?: number | null;
  confirmations?: number | null;
}

/**
 * Order currency and deposit/destination/refund side details.
 */
export interface OrderSide {
  code?: string;
  network?: string;
  coin?: string;
  name?: string;
  alias?: string;
  amount?: string | number;
  address?: string;
  tag?: string | null;
  /** Legacy alias some responses used before `tag`. */
  extraId?: string | null;
  addressMix?: string;
  reqConfirmations?: number;
  maxConfirmations?: number;
  tx?: OrderTx | null;
}

/**
 * Emergency block attached to an order.
 */
export interface OrderEmergency {
  status?: EmergencyStatus[];
  choice?: EmergencyChoiceState | string;
  /** True when a repeated deposit transaction was received for this order. */
  repeat?: boolean;
}

/**
 * Exchange order details.
 */
export interface Order {
  id: string;
  type: OrderType | string;
  email?: string;
  status: OrderStatus | string;
  time: {
    reg: number;
    start?: number | null;
    finish?: number | null;
    update?: number | null;
    expiration?: number | null;
    left?: number | null;
  };
  from: OrderSide;
  to: OrderSide;
  /** Refund side. Present once a refund address is known. */
  back?: OrderSide;
  emergency?: OrderEmergency;
  token: string;
}

/**
 * Emergency choice options for `POST /emergency`.
 */
export type EmergencyChoice = "EXCHANGE" | "REFUND";

/**
 * Parameters for setting emergency choice on an order.
 */
export interface SetEmergencyParams {
  id: string;
  token: string;
  choice: EmergencyChoice | string;
  /** Required when `choice` is `REFUND`. */
  address?: string;
  /**
   * Memo or destination tag for the refund address. Official field name.
   */
  tag?: string;
  /**
   * Alias of {@link SetEmergencyParams.tag}. Sent as `tag` and as `extraId`.
   */
  extraId?: string;
}

/**
 * One QR image returned by `POST /qr`.
 */
export interface QrCode {
  /** Label such as "With amount" or "Address". */
  title: string;
  /** `data:image/png;base64,...` payload. */
  src: string;
  /** True for the image FixedFloat marks as the default. */
  checked: boolean;
}

/**
 * QR code response.
 *
 * `src` is the default (checked) image, or the first image, so existing callers
 * that read `result.src` keep working. `codes` is the full list from the API.
 */
export interface QrResult {
  src: string;
  title?: string;
  checked?: boolean;
  codes: QrCode[];
}

/**
 * One currency pair from the public XML rates export.
 */
export interface RateItem {
  from: string;
  to: string;
  /** Amount of `from` used as the rate base (the XML `<in>` element). */
  in: string;
  /** Amount of `to` received for `<in>` (the XML `<out>` element). */
  out: string;
  /** Reserve indicator. This is not the maximum exchange amount. */
  amount: string;
  /** Network fee that is not included in the rate, for example `0.0004 ETH`. */
  toFee: string;
  minAmount: string;
  maxAmount: string;
}

/**
 * Options for {@link FixedFloat.getRates}.
 */
export interface GetRatesOptions {
  /** Which export file to download. @defaultValue "float" */
  type?: OrderType;
  /** Keep only pairs whose source code matches (case-insensitive). */
  from?: string;
  /** Keep only pairs whose destination code matches (case-insensitive). */
  to?: string;
}

/**
 * Options for {@link FixedFloat.waitForOrder}.
 */
export interface WaitForOrderOptions {
  /**
   * Statuses that end the wait. Defaults to DONE, EXPIRED and EMERGENCY.
   * EMERGENCY is included so the caller can submit a choice and wait again.
   */
  statuses?: Array<OrderStatus | string>;
  /**
   * Maximum wait in milliseconds, including the time spent on HTTP calls.
   * @defaultValue 1800000 (30 minutes, the usual order lifetime)
   */
  timeoutMs?: number;
  /**
   * Delay between polls in milliseconds.
   * @defaultValue 5000
   */
  intervalMs?: number;
  /** Abort the wait between polls. */
  signal?: AbortSignal;
}

/**
 * Options for {@link FixedFloat.rawRequest}.
 */
export interface RawRequestOptions {
  /**
   * When false, transport failures are not retried.
   * Defaults to false for `/create` and true for every other path.
   */
  idempotent?: boolean;
}
