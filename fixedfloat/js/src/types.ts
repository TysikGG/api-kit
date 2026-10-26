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
   * Currency identifier code (e.g. "BTC", "ETH").
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
   * Flag indicating whether receiving (deposit) is supported (1 = yes, 0 = no).
   */
  recv: number;

  /**
   * Flag indicating whether sending (withdrawal) is supported (1 = yes, 0 = no).
   */
  send: number;

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
  priority: number;
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
   */
  afftax?: number;
}

/**
 * Price quote side details (from or to).
 */
export interface PriceSide {
  code: string;
  network: string;
  coin: string;
  amount: string;
  rate: string;
  min: string;
  max: string;
}

/**
 * Price calculation result.
 */
export interface PriceResult {
  from: PriceSide;
  to: PriceSide;
  errors?: string[];
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
   */
  toAddress: string;

  /**
   * Optional destination tag, memo, or extra ID for destination address.
   */
  extraId?: string;

  /**
   * Optional refund wallet address in case of order cancellation or mismatch.
   */
  refundAddress?: string;

  /**
   * Optional destination tag or memo for the refund address.
   */
  refundExtraId?: string;

  /**
   * Optional affiliate tax percent.
   */
  afftax?: number;
}

/**
 * Order transaction details.
 */
export interface OrderTx {
  id?: string;
  amount?: string;
  fee?: string;
  ccyfee?: string;
  timeReg?: number;
  confirmations?: number;
}

/**
 * Order currency and deposit/destination side details.
 */
export interface OrderSide {
  code: string;
  network: string;
  coin: string;
  amount: string;
  address?: string;
  extraId?: string;
  tx?: OrderTx;
}

/**
 * Exchange order details.
 */
export interface Order {
  id: string;
  type: OrderType;
  email?: string;
  status: string;
  time: {
    reg: number;
    start?: number;
    finish?: number;
    update?: number;
    expiration?: number;
    left?: number;
  };
  from: OrderSide;
  to: OrderSide;
  token: string;
}

/**
 * Emergency choice options.
 */
export type EmergencyChoice = "EXCHANGE" | "REFUND";

/**
 * Parameters for setting emergency choice on an order.
 */
export interface SetEmergencyParams {
  id: string;
  token: string;
  choice: EmergencyChoice;
  address?: string;
  extraId?: string;
}

/**
 * QR code response.
 */
export interface QrResult {
  src: string;
}
