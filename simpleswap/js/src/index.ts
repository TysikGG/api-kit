export { SimpleSwap, DEFAULT_BASE_URL, DEFAULT_USER_AGENT, SIMPLESWAP_API_KEY_HEADER, exchangeId } from "./client.js";
export {
  SimpleSwapAuthError,
  SimpleSwapBadRequestError,
  SimpleSwapError,
  SimpleSwapForbiddenError,
  SimpleSwapNetworkError,
  SimpleSwapNotFoundError,
  SimpleSwapRateLimitError,
  SimpleSwapServerError,
  SimpleSwapTimeoutError,
  SimpleSwapValidationError,
  createSimpleSwapError,
  parseRetryAfter,
} from "./errors.js";
export { ExchangeStatus, TERMINAL_EXCHANGE_STATUSES } from "./types.js";

export type {
  CheckExchangeParams,
  CheckExchangeResult,
  ConfirmExchangeParams,
  CreateExchangeParams,
  EstimateResult,
  ExchangeOrder,
  ExchangeStatusName,
  GetEstimateParams,
  GetExchangesParams,
  GetPairsParams,
  GetRangesParams,
  MarketRate,
  PairsMap,
  RangesResult,
  SimpleSwapClientOptions,
  SimpleSwapCurrency,
  WaitForExchangeOptions,
} from "./types.js";
