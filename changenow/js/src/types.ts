/**
 * Standard (floating) or fixed-rate exchange flow.
 */
export type ExchangeFlow = "standard" | "fixed-rate";

/**
 * Direct estimates set the deposit amount. Reverse estimates set the payout amount.
 */
export type ExchangeType = "direct" | "reverse";

/**
 * Client configuration options for ChangeNOW.
 */
export interface ChangeNowClientOptions {
  /**
   * ChangeNOW partner API key (defaults to process.env.CHANGENOW_API_KEY).
   * Sent in the `x-changenow-api-key` header. Partner attribution uses this key.
   */
  apiKey?: string;
  /**
   * Base URL for the ChangeNOW API. Defaults to https://api.changenow.io/v2.
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
  /**
   * End-user IP address. Sent as the documented `x-forwarded-for` header.
   */
  userIp?: string;
}

/**
 * Filters for `GET /exchange/currencies`.
 */
export interface GetCurrenciesParams {
  /** Return only active currencies when true. */
  active?: boolean;
  /** Exchange flow filter. Defaults to standard on the API when omitted. */
  flow?: ExchangeFlow;
  /** Return only currencies available to buy. */
  buy?: boolean;
  /** Return only currencies available to sell. */
  sell?: boolean;
}

/**
 * Currency row from `GET /exchange/currencies`.
 */
export interface ChangeNowCurrency {
  ticker: string;
  name: string;
  image: string;
  hasExternalId: boolean;
  isExtraIdSupported: boolean;
  isFiat: boolean;
  featured: boolean;
  isStable: boolean;
  supportsFixedRate: boolean;
  network: string;
  tokenContract: string | null;
  buy: boolean;
  sell: boolean;
  legacyTicker: string;
}

/**
 * Filters for `GET /exchange/available-pairs`.
 */
export interface GetAvailablePairsParams {
  fromCurrency?: string;
  toCurrency?: string;
  fromNetwork?: string;
  toNetwork?: string;
  flow?: ExchangeFlow;
}

/**
 * One tradable currency pair, including which flows are enabled.
 */
export interface AvailablePair {
  fromCurrency: string;
  fromNetwork: string;
  toCurrency: string;
  toNetwork: string;
  flow: {
    standard: boolean;
    "fixed-rate": boolean;
  };
}

/**
 * Shared currency-pair query used by min amount, range, and estimates.
 */
export interface PairParams {
  fromCurrency: string;
  toCurrency: string;
  fromNetwork?: string;
  toNetwork?: string;
  flow?: ExchangeFlow;
}

/**
 * Minimal deposit amount for a pair.
 */
export interface MinAmountResult {
  fromCurrency: string;
  fromNetwork: string;
  toCurrency: string;
  toNetwork: string;
  flow: string;
  minAmount: number;
}

/**
 * Minimum and maximum deposit amount for a pair. `maxAmount` is null when uncapped.
 */
export interface RangeResult {
  fromCurrency: string;
  fromNetwork: string;
  toCurrency: string;
  toNetwork: string;
  flow: string;
  minAmount: number;
  maxAmount: number | null;
}

/**
 * Parameters for `GET /exchange/estimated-amount` (standard and fixed-rate).
 */
export interface GetEstimatedAmountParams extends PairParams {
  /** Required when `type` is direct (the default). */
  fromAmount?: number | string;
  /** Required when `type` is reverse. */
  toAmount?: number | string;
  /** Direction. Defaults to direct on the API when omitted. */
  type?: ExchangeType;
  /**
   * When true on a fixed-rate estimate, the response includes `rateId` and
   * `validUntil` so the amount can be locked on create.
   */
  useRateId?: boolean;
  /**
   * Estimate a balance top-up without the withdrawal fee.
   * Disabled in the public collection sample; supported when the API accepts it.
   */
  isTopUp?: boolean;
}

/**
 * Estimated exchange amount, fees, and optional fixed-rate lock.
 */
export interface EstimatedAmount {
  fromCurrency: string;
  fromNetwork: string;
  toCurrency: string;
  toNetwork: string;
  flow: string;
  type: string;
  rateId: string | null;
  validUntil: string | null;
  transactionSpeedForecast: string | null;
  warningMessage: string | null;
  depositFee: number;
  withdrawalFee: number;
  userId: number | string | null;
  fromAmount: number;
  toAmount: number;
}

/**
 * Arbitrary partner payload. ChangeNOW allows up to five fields, each up to 64 characters.
 * Must be enabled with partners@changenow.io ("Special partner fields").
 */
export type PartnerPayload = Record<string, string> | string;

/**
 * Body for `POST /exchange`.
 *
 * Partner attribution is the API key header. `userId`, `payload`, `contactEmail`,
 * and `source` are optional fields documented on create.
 */
export interface CreateExchangeParams {
  fromCurrency: string;
  toCurrency: string;
  address: string;
  fromNetwork?: string;
  toNetwork?: string;
  fromAmount?: number | string;
  toAmount?: number | string;
  extraId?: string;
  refundAddress?: string;
  refundExtraId?: string;
  /**
   * Permanent partner-side user id. Requires the "Special partner fields" feature.
   */
  userId?: string | number;
  /**
   * Up to five arbitrary partner fields. Requires the "Special partner fields" feature.
   */
  payload?: PartnerPayload;
  contactEmail?: string;
  /**
   * Optional partner source label from ChangeNOW's public create example.
   */
  source?: string;
  flow?: ExchangeFlow;
  type?: ExchangeType;
  /** Required for fixed-rate. Value returned by an estimate with `useRateId`. */
  rateId?: string;
}

/**
 * Exchange created by `POST /exchange`.
 */
export interface CreatedExchange {
  id: string;
  fromAmount: number | string;
  toAmount: number | string;
  flow: string;
  type: string;
  payinAddress: string;
  payoutAddress: string;
  payinExtraId?: string | null;
  payoutExtraId?: string | null;
  fromCurrency: string;
  fromNetwork: string;
  toCurrency: string;
  toNetwork: string;
  refundAddress?: string | null;
  refundExtraId?: string | null;
  payoutExtraIdName?: string | null;
  rateId?: string | null;
  validUntil?: string | null;
}

/**
 * Related, repeated, or original exchange summary nested in a status response.
 */
export interface RelatedExchangeInfo {
  id?: string;
  status?: string;
  createdAt?: string;
  fromCurrency?: string;
  amountFrom?: number | null;
  amountTo?: number | null;
  fromNetwork?: string;
}

/**
 * Transaction status from `GET /exchange/by-id`.
 */
export interface ExchangeStatus {
  id: string;
  status: string;
  actionsAvailable?: boolean;
  fromCurrency: string;
  fromNetwork: string;
  toCurrency: string;
  toNetwork: string;
  expectedAmountFrom?: number | null;
  expectedAmountTo?: number | null;
  amountFrom?: number | null;
  amountTo?: number | null;
  payinAddress?: string;
  payoutAddress?: string;
  payinExtraId?: string | null;
  payoutExtraId?: string | null;
  refundAddress?: string | null;
  refundExtraId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  validUntil?: string | null;
  depositReceivedAt?: string | null;
  payinHash?: string | null;
  payoutHash?: string | null;
  fromLegacyTicker?: string;
  toLegacyTicker?: string;
  refundHash?: string | null;
  refundAmount?: number | null;
  userId?: number | string | null;
  payload?: PartnerPayload | null;
  originalExchangeInfo?: RelatedExchangeInfo | null;
  relatedExchangesInfo?: RelatedExchangeInfo[] | null;
  repeatedExchangesInfo?: RelatedExchangeInfo[] | null;
}

/**
 * Parameters for `GET /validate/address`.
 */
export interface ValidateAddressParams {
  /** Currency ticker. The docs describe this value as the address network. */
  currency: string;
  address: string;
}

/**
 * Address validation result. Invalid addresses are still HTTP 200 with `result: false`.
 */
export interface AddressValidation {
  result: boolean;
  message: string | null;
  isActivated?: boolean | null;
}

/**
 * One address resolved from a FIO name or Unstoppable domain.
 */
export interface NamedAddress {
  currency: string;
  chain: string;
  address: string;
  protocol: string;
}

/**
 * Result of `GET /addresses-by-name`. Unknown names return `success: false`.
 */
export interface UserAddressesResult {
  success: boolean;
  addresses?: NamedAddress[];
  message?: string;
  error?: string;
}

/**
 * Parameters for `GET /exchange/network-fee`.
 */
export interface GetNetworkFeeParams extends PairParams {
  fromAmount: number | string;
  convertedCurrency?: string;
  convertedNetwork?: string;
}

/**
 * Fee amount denominated in a currency and network.
 */
export interface FeeAmount {
  currency: string;
  network: string;
  amount: number;
}

/**
 * Estimated network fees. The docs state this value is already included in the exchange estimate.
 */
export interface NetworkFeeResult {
  estimatedFee: {
    deposit: FeeAmount;
    withdrawal: FeeAmount;
    totals: {
      from: FeeAmount;
      to: FeeAmount;
    };
    converted?: {
      currency: string;
      network: string;
      deposit: number;
      withdrawal: number;
      total: number;
    };
  };
}

/**
 * Parameters for `GET /markets/estimate` (crypto and fiat, informational, fees excluded).
 */
export interface GetMarketEstimateParams {
  fromCurrency: string;
  toCurrency: string;
  fromAmount?: number | string;
  toAmount?: number | string;
  type?: ExchangeType;
}

/**
 * Market estimate. Not a tradable quote.
 */
export interface MarketEstimate {
  fromCurrency: string;
  toCurrency: string;
  type: string;
  fromAmount: number;
  toAmount: number;
}

/**
 * Filters for `GET /exchanges`. Listing requires a private API key.
 */
export interface GetExchangesParams {
  /** Default 100. Must be greater than 0 and less than 100. */
  limit?: number;
  offset?: number;
  sortDirection?: "ASC" | "DESC";
  sortField?: "createdAt" | "updatedAt";
  dateField?: "createdAt" | "updatedAt";
  /** ISO timestamp. Transactions created after this time. */
  dateFrom?: string;
  /** ISO timestamp. Transactions created before this time. */
  dateTo?: string;
  requestId?: string;
  userId?: string | number;
  payoutAddress?: string;
  /** One status or several. Arrays are sent as repeated query parameters. */
  statuses?: string | string[];
}

/**
 * Partner commission block on a listed exchange.
 */
export interface PartnerCommission {
  currency?: string;
  amount?: number | null;
  percent?: number | null;
  marketTicker?: string;
  network?: string;
  tokenContract?: string | null;
}

/**
 * One row from `GET /exchanges`.
 */
export interface PartnerExchange {
  createdAt?: string;
  exchangerCreatedAt?: string | null;
  updatedAt?: string;
  exchangerUpdatedAt?: string | null;
  exchangeId?: string | null;
  requestId?: string;
  status?: string;
  validUntil?: string | null;
  flow?: string;
  refund?: {
    currency?: string;
    address?: string | null;
    extraId?: string | null;
    hash?: string | null;
  };
  partnerInfo?: {
    commission?: PartnerCommission;
    userId?: string | null;
    payload?: PartnerPayload | null;
  };
  payin?: {
    currency?: string;
    address?: string;
    extraId?: string | null;
    amount?: number | null;
    expectedAmount?: number | null;
    hash?: string | null;
    marketTicker?: string;
    network?: string;
    tokenContract?: string | null;
  };
  payout?: {
    currency?: string;
    address?: string;
    extraId?: string | null;
    amount?: number | null;
    expectedAmount?: number | null;
    hash?: string | null;
    marketTicker?: string;
    network?: string;
    tokenContract?: string | null;
  };
}

/**
 * Page of partner exchanges.
 */
export interface ExchangesPage {
  count: number;
  exchanges: PartnerExchange[];
}

/**
 * Refund or push options for an exchange (`GET /exchange/actions`).
 */
export interface ExchangeActions {
  error: string | null;
  refund?: {
    available: boolean;
    amount?: string | number;
    address?: {
      address?: string | null;
      extraId?: string | null;
    };
    additionalAddressList?: string[];
  };
  continue?: {
    available: boolean;
    currentEstimate?: string | number;
  };
}

/**
 * Body for `POST /exchange/continue`.
 */
export interface ContinueExchangeParams {
  id: string;
}

/**
 * Result of pushing an exchange forward.
 */
export interface ContinueExchangeResult {
  result:
    | boolean
    | {
        result?: boolean;
        data?: {
          estimate?: {
            amount?: number;
            currency?: string;
            network?: string;
          };
        };
      };
}

/**
 * Body for `POST /exchange/refund`.
 */
export interface RefundExchangeParams {
  id: string;
  address?: string;
  extraId?: string;
}

/**
 * Result of requesting a refund.
 */
export interface RefundExchangeResult {
  result: boolean;
}

/**
 * Parameters for `GET /private-transfer/estimated-amount`.
 */
export interface GetPrivateTransferEstimateParams {
  currency: string;
  network: string;
  toAmount: number | string;
  /** Requires the "Special partner fields" feature. */
  userId?: string | number;
}

/**
 * Private-transfer estimate, including the rate id required to create one.
 */
export interface PrivateTransferEstimate {
  currency: string;
  network: string;
  fromAmount: number | string;
  toAmount: number | string;
  rateId: string;
  validUntil: string;
  warningMessage: string | null;
}

/**
 * Body for `POST /private-transfer`.
 */
export interface CreatePrivateTransferParams {
  currency: string;
  network: string;
  toAmount: number | string;
  address: string;
  extraId?: string;
  refundAddress?: string;
  refundExtraId?: string;
  rateId?: string;
}

/**
 * Private transfer created by the API.
 */
export interface CreatedPrivateTransfer {
  id: string;
  currency: string;
  network: string;
  fromAmount: number | string;
  toAmount: number | string;
  payinAddress: string;
  payoutAddress: string;
  payinExtraId?: string | null;
  payoutExtraId?: string | null;
  refundAddress?: string | null;
  refundExtraId?: string | null;
}
