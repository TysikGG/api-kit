/**
 * HeroSMS API Client
 *
 * TypeScript client for the HeroSMS activation and rental API.
 *
 * @packageDocumentation
 */

export { DEFAULT_BASE_URL, DEFAULT_REF, HeroSMS, HeroSMSClient } from "./client.js";

export {
  ActivationStatusCode,
  type AccountBannedInfo,
  type ActivationHistoryItem,
  type ActivationStatusV2,
  type ActiveActivation,
  type ActiveActivationsResponse,
  type ApiErrorCode,
  type BaseErrorResponse,
  type CallInfo,
  type CountriesResponse,
  type Country,
  type GetActiveActivationsOptions,
  type GetAllSmsOptions,
  type GetAllSmsResponse,
  type GetHistoryOptions,
  type GetNumberOptions,
  type GetNumberV2Response,
  type GetPricesOptions,
  type GetRentNumberOptions,
  type GetRentPricesOptions,
  type GetRentServicesAndCountriesOptions,
  type GetRentServicesAndCountriesResponse,
  type GetServicesListOptions,
  type GetTopCountriesOptions,
  type HeroSMSClientOptions,
  type HeroSMSOptions,
  type Language,
  type OperatorsResponse,
  type OtpItem,
  type ParsedNumberResponse,
  type ParsedStatusResponse,
  type PriceInfo,
  type PricesByCountry,
  type ReactivationPriceResponse,
  type RentCountByService,
  type RentPriceCount,
  type RentServiceInfo,
  type Service,
  type ServicesListResponse,
  type SmsInfo,
  type TopCountryInfo,
  type WebhookPayload,
} from "./types.js";

export {
  AccountInactiveError,
  ActivationNotFoundError,
  ApiJsonError,
  AuthenticationError,
  BannedError,
  ChannelsLimitError,
  EarlyCancelError,
  ERROR_MESSAGES,
  HeroSMSError,
  isJsonErrorResponse,
  NoBalanceError,
  NoNumbersError,
  WrongMaxPriceError,
} from "./errors.js";

export { HeroSMS as default } from "./client.js";
