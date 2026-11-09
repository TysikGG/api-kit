/**
 * Known proxy type codes supported by Steel Proxy.
 */
export const ProxyType = {
  /** Server / Datacenter static proxies */
  SERVER: "server",
  /** Residential static proxies */
  RESIDENTIAL: "residential",
  /** Rotating mobile/residential proxies */
  ROTATION: "rotation",
} as const;

export type ProxyTypeCode = (typeof ProxyType)[keyof typeof ProxyType] | string;

/**
 * IP rotation modes for rotating proxies (proxy_type=rotation).
 */
export const RotationMode = {
  /** IP changes automatically at a periodic timer interval */
  TIMER: "timer",
  /** IP changes on demand via personal HTTP link */
  LINK: "link",
} as const;

export type RotationModeCode = (typeof RotationMode)[keyof typeof RotationMode] | string;

/**
 * Order status values returned by the API.
 */
export const OrderStatus = {
  /** Order is active and proxies are functioning */
  ACTIVE: "active",
  /** Order was fully refunded */
  REFUNDED: "refunded",
  /** Order was partially refunded by administrator */
  PARTIALLY_REFUNDED: "partially_refunded",
} as const;

export type OrderStatusCode = (typeof OrderStatus)[keyof typeof OrderStatus] | string;

/**
 * Proxy type catalog entry.
 */
export interface ProxyTypeItem {
  /** Identifier code (e.g. "server", "residential", "rotation") */
  code: string;
  /** Human-readable title */
  title: string;
}

/**
 * Location / node catalog entry with available lease terms.
 */
export interface LocationItem {
  /** Location node identifier */
  node_id: number;
  /** ISO two-letter country code (e.g. "RU", "US") */
  country_code: string;
  /** Human-readable location / country title */
  title: string;
  /** Proxy category code */
  proxy_type: string;
  /** Array of available lease terms in days (e.g. [1, 7, 14, 30]) */
  terms_days: number[];
}

/**
 * Filter parameters for fetching locations.
 */
export interface GetLocationsParams {
  /** Filter by proxy type code */
  proxy_type?: string;
}

/**
 * Filter parameters for fetching terms.
 */
export interface GetTermsParams {
  /** Filter by proxy type code */
  proxy_type?: string;
}

/**
 * Filter parameters for fetching prices.
 */
export interface GetPricesParams {
  /** Filter by proxy type code */
  proxy_type?: string;
  /** Filter by ISO country code */
  country_code?: string;
}

/**
 * Price catalog item with reseller discount applied.
 */
export interface PriceItem {
  /** Proxy type code */
  proxy_type: string;
  /** ISO two-letter country code */
  country_code: string;
  /** Location node ID */
  node_id: number;
  /** Lease duration in days */
  term_days: number;
  /** Unit price formatted as decimal string (e.g. "47.50") */
  price: string;
  /** Price currency code (e.g. "RUB") */
  currency: string;
}

/**
 * Connection credentials and endpoint details for an allocated proxy.
 */
export interface ProxyCredentials {
  /** Proxy authentication username */
  username: string;
  /** Proxy authentication password */
  password: string;
  /** Proxy host IP or custom domain */
  host: string;
  /** HTTP proxy port */
  http_port: string;
  /** SOCKS5 proxy port */
  socks5_port: string;
  /** Ready-to-use HTTP connection string in login:pass@host:port format */
  connection_string_http: string;
  /** Ready-to-use SOCKS5 connection string in login:pass@host:port format */
  connection_string_socks5: string;
  /** Personal IP rotation link (for rotating proxies with link rotation mode) */
  rotate_link?: string | null;
}

/**
 * Parameters for creating a new proxy order.
 */
export interface CreateOrderParams {
  /** Proxy type code (e.g. "server", "residential", "rotation") */
  proxy_type: string;
  /** Location node identifier (see GET /v1/locations) */
  node_id: number;
  /** Lease term in days (see terms_days in location or 60/90/180) */
  term_days: number;
  /** Number of proxies to purchase (1-1000) */
  quantity: number;
  /** Optional customer / external order reference ID */
  buyer_reference?: string | null;
  /** Rotation mode for proxy_type=rotation ("timer" or "link") */
  rotation_mode?: string | null;
  /** Rotation timer interval in minutes (required when rotation_mode="timer") */
  timer_interval_minutes?: number | null;
}

/**
 * Order creation response payload.
 */
export interface CreatedOrder {
  /** Unique order identifier */
  order_id: number;
  /** ISO 8601 timestamp of order creation */
  created_at: string;
  /** ISO 8601 timestamp of order expiration */
  expires_at: string;
  /** Proxy type code */
  proxy_type: string;
  /** Location code / title */
  location: string;
  /** Term in days */
  term_days: number;
  /** Number of proxies ordered */
  quantity: number;
  /** Total price formatted as decimal string */
  price: string;
  /** Currency code */
  currency: string;
  /** Reseller account balance remaining after the transaction */
  balance_after: string;
  /** List of provisioned proxy credentials */
  proxies: ProxyCredentials[];
  /** Rotation mode (for rotation proxies) */
  rotation_mode?: string | null;
  /** Timer interval in minutes (for rotation proxies) */
  timer_interval_minutes?: number | null;
}

/**
 * Full details of an existing proxy order.
 */
export interface OrderDetail {
  /** Unique order identifier */
  order_id: number;
  /** Order status ("active", "refunded", "partially_refunded") */
  status: string;
  /** Proxy type code */
  proxy_type: string;
  /** Location code / title */
  location: string;
  /** Term in days */
  term_days: number;
  /** Number of proxies */
  quantity: number;
  /** Total price formatted as decimal string */
  price: string;
  /** Currency code */
  currency: string;
  /** ISO 8601 creation timestamp */
  created_at: string;
  /** ISO 8601 expiration timestamp */
  expires_at?: string;
  /** Reseller customer / external order reference */
  buyer_reference?: string | null;
  /** List of proxy credentials */
  proxies: ProxyCredentials[];
  /** Rotation mode (for rotation proxies) */
  rotation_mode?: string | null;
  /** Timer interval in minutes (for rotation proxies) */
  timer_interval_minutes?: number | null;
}

/**
 * Pagination parameters for listing orders.
 */
export interface GetOrdersParams {
  /** Page number, starting at 1 (default: 1) */
  page?: number;
  /** Items per page, maximum 100 (default: 20) */
  page_size?: number;
}

/**
 * Summary order item in paginated orders list.
 */
export interface OrderListItem {
  /** Unique order identifier */
  order_id: number;
  /** Order status ("active", "refunded", "partially_refunded") */
  status: string;
  /** Proxy type code */
  proxy_type: string;
  /** Location title / code */
  location: string;
  /** Term in days */
  term_days: number;
  /** Number of proxies */
  quantity: number;
  /** Price formatted as decimal string */
  price: string;
  /** Currency code */
  currency: string;
  /** ISO 8601 creation timestamp */
  created_at: string;
  /** Reseller customer / external order reference */
  buyer_reference?: string | null;
}

/**
 * Paginated list of orders.
 */
export interface OrderList {
  /** Total count of orders matching criteria */
  total: number;
  /** Current page number */
  page: number;
  /** Page size */
  page_size: number;
  /** Orders list */
  items: OrderListItem[];
}

/**
 * Parameters for extending an order.
 */
export interface ExtendOrderParams {
  /** Duration to extend in months: 1, 2, 3, or 6 */
  months: number;
}

/**
 * Response payload when extending an order.
 */
export interface ExtendedOrder {
  /** Order identifier */
  order_id: number;
  /** Number of months added */
  months: number;
  /** Cost of extension */
  price: string;
  /** Currency code */
  currency: string;
  /** Previous expiration timestamp */
  previous_expires_at: string;
  /** New expiration timestamp */
  expires_at: string;
  /** Account balance remaining after payment */
  balance_after: string;
}

/**
 * Parameters for creating order via webhook endpoint.
 */
export interface CreateOrderWebhookParams {
  /** API key override (defaults to client key) */
  api_key?: string;
  /** Proxy type code */
  proxy_type: string;
  /** Country code (e.g. "US") */
  country_code: string;
  /** Lease term in days */
  term_days: number;
  /** Number of proxies (default: 1) */
  count?: number;
  /** External buyer identifier */
  buyer?: string | null;
  /** Alternative user identifier for bot platforms */
  user?: string | null;
  /** Rotation mode ("timer" or "link") */
  rotation_mode?: string | null;
  /** Timer interval in minutes */
  timer_interval?: number | null;
}

/**
 * Standard API response envelope.
 */
export interface APIResponse<T> {
  status: number;
  message: string;
  data: T;
}

/**
 * Options for configuring the SteelProxy client.
 */
export interface SteelProxyClientOptions {
  /** Reseller API key from Telegram bot (@SteelProxy_bot -> Profile -> API key) */
  apiKey?: string;
  /** Base URL for the API. Defaults to https://api.steelproxy.com/v1 */
  baseURL?: string;
  /** Request timeout in milliseconds. Defaults to 30000 (30 seconds) */
  timeoutMs?: number;
  /** Custom User-Agent header string */
  userAgent?: string;
}
