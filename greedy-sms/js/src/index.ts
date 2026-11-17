/**
 * Greedy SMS API Client
 *
 * TypeScript client for the Greedy SMS activation, rental, and email verification API.
 *
 * @packageDocumentation
 */

export { DEFAULT_BASE_URL, GreedySMS, GreedySMSClient } from "./client.js";

export {
  AuthenticationError,
  ConflictError,
  ForbiddenError,
  GreedySMSError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
  createGreedySMSError,
  isPublicApiError,
} from "./errors.js";

export type {
  ActivationAction,
  ActivationHistoryItem,
  ActivationHistorySmsItem,
  ActivationStatusResponse,
  CancelMailOrderResponse,
  ContinuedRentNumber,
  CountryItem,
  CountryTitle,
  GetCountriesResponse,
  GetHistoryOptions,
  GetHistoryResponse,
  GetMailOrdersResponse,
  GetNumberOptions,
  GetNumbersStatusOptions,
  GetNumbersStatusResponse,
  GetPricesOptions,
  GetPricesResponse,
  GetRentListResponse,
  GetRentNumberOptions,
  GetRentPricesOptions,
  GetRentStatusOptions,
  GetRentStatusResponse,
  GetServicesOptions,
  GetServicesResponse,
  GetTopCountriesOptions,
  GetTopCountriesResponse,
  GreedySMSOptions,
  HealthResponse,
  MailDomainItem,
  MailOrderItem,
  MailPriceQuote,
  MailStatusResponse,
  NumberStatusItem,
  OperatorCountryInfo,
  OrderedMailDomain,
  OrderedNumber,
  OrderedRentNumber,
  PaginatedResponse,
  PaginationOptions,
  PriceCountryItem,
  PriceServiceItem,
  PublicApiErrorPayload,
  RentItem,
  RentSmsItem,
  ServiceItem,
  TopCountryFullItem,
  TopCountryPriceItem,
  UserDiscount,
  UserInfo,
  UserPurchases,
  VerificationType,
} from "./types.js";

export { GreedySMS as default } from "./client.js";
