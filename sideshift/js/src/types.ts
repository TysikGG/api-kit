/**
 * Configuration options for the SideShift client.
 */
export interface SideShiftOptions {
  /**
   * Account secret key (required only for private endpoints like /account).
   */
  secret?: string;

  /**
   * End-user IP address (forwarded as x-user-ip when requests are sent from a backend).
   */
  userIp?: string;

  /**
   * Base URL for the SideShift API (defaults to https://sideshift.ai/api/v2).
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds (defaults to 30000).
   */
  timeout?: number;
}

/**
 * Supported coin information.
 */
export interface Coin {
  coin: string;
  name: string;
  networks: string[];
  mainnet?: string;
  hasMemo?: boolean;
  fixedOnly?: boolean;
  variableOnly?: boolean;
  depositVariableOnly?: boolean;
  settleVariableOnly?: boolean;
  depositOffline?: boolean;
  settleOffline?: boolean;
  [key: string]: unknown;
}

/**
 * Exchange pair rate and limits.
 */
export interface PairRate {
  depositCoin: string;
  depositNetwork: string;
  settleCoin: string;
  settleNetwork: string;
  rate: string;
  min: string;
  max: string;
  [key: string]: unknown;
}

/**
 * Parameters for requesting a fixed rate quote.
 */
export interface RequestQuoteParams {
  depositCoin: string;
  depositNetwork: string;
  settleCoin: string;
  settleNetwork: string;
  depositAmount?: string | number;
  settleAmount?: string | number;
  commissionRate?: string | number;
  [key: string]: unknown;
}

/**
 * Fixed rate quote response.
 */
export interface Quote {
  id: string;
  createdAt: string;
  expiresAt: string;
  depositCoin: string;
  depositNetwork: string;
  settleCoin: string;
  settleNetwork: string;
  depositAmount: string;
  settleAmount: string;
  rate: string;
  affiliateId?: string;
  [key: string]: unknown;
}

/**
 * Parameters for creating a fixed shift.
 */
export interface CreateFixedShiftParams {
  quoteId: string;
  settleAddress: string;
  refundAddress?: string;
  commissionRate?: string | number;
  [key: string]: unknown;
}

/**
 * Parameters for creating a variable shift.
 */
export interface CreateVariableShiftParams {
  depositCoin: string;
  depositNetwork: string;
  settleCoin: string;
  settleNetwork: string;
  settleAddress: string;
  refundAddress?: string;
  commissionRate?: string | number;
  [key: string]: unknown;
}

/**
 * Shift details.
 */
export interface Shift {
  id: string;
  createdAt: string;
  expiresAt?: string;
  depositCoin: string;
  depositNetwork: string;
  settleCoin: string;
  settleNetwork: string;
  depositAddress: string;
  settleAddress: string;
  depositMin?: string;
  depositMax?: string;
  type: 'fixed' | 'variable';
  status: string;
  rate?: string;
  depositAmount?: string;
  settleAmount?: string;
  refundAddress?: string;
  [key: string]: unknown;
}

/**
 * Permissions response.
 */
export interface Permissions {
  createShift: boolean;
  [key: string]: unknown;
}

/**
 * XAI coin statistics.
 */
export interface XaiStats {
  totalSupply: number;
  circulatingSupply: number;
  numberOfStakers: number;
  totalStaked: string;
  xaiPriceUsd?: string;
  [key: string]: unknown;
}

/**
 * SideShift account data.
 */
export interface Account {
  id: string;
  createdAt: string;
  commissionRate?: string;
  [key: string]: unknown;
}
