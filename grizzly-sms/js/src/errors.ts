const KNOWN_ERROR_CODES = new Set([
  "BAD_KEY",
  "BAD_ACTION",
  "BAD_SERVICE",
  "BAD_STATUS",
  "BAD_COUNTRY",
  "NO_BALANCE",
  "NO_NUMBERS",
  "NO_ACTIVATION",
  "NO_KEY",
  "ERROR_SQL",
  "SQL_ERROR",
  "SERVICE_UNAVAILABLE_REGION",
  "WRONG_MAX_PRICE",
  "USERS_IP_IS_NOT_ALLOWED",
  "INVALID_TIME",
  "NO_ID_RENT",
  "RENT_DIE",
  "SERVER_ERROR",
  "CANT_CANCEL",
  "ALREADY_FINISH",
  "ALREADY_CANCEL",
  "INCORECT_STATUS",
  "INCORRECT_STATUS",
  "INVALID_PHONE",
  "OPERATORS_NOT_FOUND",
  "OUT_OF_STOCK",
  "ORDER_ALREADY_EXISTS",
]);

/** API codes that are safe to retry on a read request. */
export const RETRYABLE_API_CODES = new Set([
  "ERROR_SQL",
  "SQL_ERROR",
  "SERVER_ERROR",
]);

export const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

/** Actions that buy, extend, or change an activation. Not retried unless asked. */
export const MUTATING_ACTIONS = new Set([
  "getNumber",
  "getNumberV2",
  "setStatus",
  "getRentNumber",
  "continueRentNumber",
  "setRentStatus",
]);

/**
 * Error thrown for API status strings, HTTP failures, and client-side checks.
 *
 * Known API codes also have subclasses (`NoNumbersError`, `BadKeyError`, …).
 * `instanceof GrizzlySmsError` matches every subclass.
 *
 * @example
 * ```ts
 * try {
 *   await sms.getNumber({ service: "tg" });
 * } catch (error) {
 *   if (error instanceof NoNumbersError) {
 *     // choose another country
 *   }
 * }
 * ```
 */
export class GrizzlySmsError extends Error {
  readonly code: string;
  readonly raw: unknown;

  /**
   * @param code Stable error code, for example `NO_NUMBERS` or `BAD_KEY`.
   * @param raw Original response body. The message is `raw` when it is a non-empty string.
   *
   * @example
   * ```ts
   * throw new GrizzlySmsError("NO_NUMBERS", "NO_NUMBERS");
   * ```
   */
  constructor(code: string, raw: unknown = code) {
    super(typeof raw === "string" && raw.trim() ? raw.trim() : code);
    this.name = new.target.name;
    this.code = code;
    this.raw = raw;
  }
}

export class BadKeyError extends GrizzlySmsError {}
export class BadActionError extends GrizzlySmsError {}
export class BadServiceError extends GrizzlySmsError {}
export class BadStatusError extends GrizzlySmsError {}
export class BadCountryError extends GrizzlySmsError {}
export class NoBalanceError extends GrizzlySmsError {}
export class NoNumbersError extends GrizzlySmsError {}
export class NoActivationError extends GrizzlySmsError {}
export class NoKeyError extends GrizzlySmsError {}
export class ErrorSqlError extends GrizzlySmsError {}
export class SqlErrorError extends GrizzlySmsError {}
export class ServiceUnavailableRegionError extends GrizzlySmsError {}
export class WrongMaxPriceError extends GrizzlySmsError {}
export class UsersIpNotAllowedError extends GrizzlySmsError {}
export class ServiceProhibitedError extends GrizzlySmsError {}
export class EmptyResponseError extends GrizzlySmsError {}
export class NetworkError extends GrizzlySmsError {}
export class TimeoutError extends GrizzlySmsError {}
export class AbortedError extends GrizzlySmsError {}
export class UnexpectedResponseError extends GrizzlySmsError {}
export class InvalidTimeError extends GrizzlySmsError {}
export class NoIdRentError extends GrizzlySmsError {}
export class RentDieError extends GrizzlySmsError {}
export class ServerError extends GrizzlySmsError {}
export class CantCancelError extends GrizzlySmsError {}
export class AlreadyFinishError extends GrizzlySmsError {}
export class AlreadyCancelError extends GrizzlySmsError {}
export class IncorrectStatusError extends GrizzlySmsError {}
export class InvalidPhoneError extends GrizzlySmsError {}
export class OperatorsNotFoundError extends GrizzlySmsError {}
export class OutOfStockError extends GrizzlySmsError {}
export class OrderAlreadyExistsError extends GrizzlySmsError {}

/** HTTP status from the API host. `code` is `HTTP_<status>`. */
export class HttpStatusError extends GrizzlySmsError {
  readonly status: number;

  /**
   * @example
   * ```ts
   * throw new HttpStatusError(503, "unavailable");
   * ```
   */
  constructor(status: number, raw: unknown) {
    super(`HTTP_${status}`, raw);
    this.status = status;
  }
}

const ERROR_TYPES: Record<string, new (code: string, raw: unknown) => GrizzlySmsError> = {
  BAD_KEY: BadKeyError,
  BAD_ACTION: BadActionError,
  BAD_SERVICE: BadServiceError,
  BAD_STATUS: BadStatusError,
  BAD_COUNTRY: BadCountryError,
  NO_BALANCE: NoBalanceError,
  NO_NUMBERS: NoNumbersError,
  NO_ACTIVATION: NoActivationError,
  NO_KEY: NoKeyError,
  ERROR_SQL: ErrorSqlError,
  SQL_ERROR: SqlErrorError,
  SERVICE_UNAVAILABLE_REGION: ServiceUnavailableRegionError,
  WRONG_MAX_PRICE: WrongMaxPriceError,
  USERS_IP_IS_NOT_ALLOWED: UsersIpNotAllowedError,
  SERVICE_PROHIBITED: ServiceProhibitedError,
  EMPTY_RESPONSE: EmptyResponseError,
  NETWORK: NetworkError,
  TIMEOUT: TimeoutError,
  ABORTED: AbortedError,
  UNEXPECTED_RESPONSE: UnexpectedResponseError,
  INVALID_TIME: InvalidTimeError,
  NO_ID_RENT: NoIdRentError,
  RENT_DIE: RentDieError,
  SERVER_ERROR: ServerError,
  CANT_CANCEL: CantCancelError,
  ALREADY_FINISH: AlreadyFinishError,
  ALREADY_CANCEL: AlreadyCancelError,
  INCORECT_STATUS: IncorrectStatusError,
  INCORRECT_STATUS: IncorrectStatusError,
  INVALID_PHONE: InvalidPhoneError,
  OPERATORS_NOT_FOUND: OperatorsNotFoundError,
  OUT_OF_STOCK: OutOfStockError,
  ORDER_ALREADY_EXISTS: OrderAlreadyExistsError,
};

/**
 * Build the subclass for a known code. Unknown codes stay `GrizzlySmsError`.
 *
 * @example
 * ```ts
 * const error = errorFrom("NO_NUMBERS", "NO_NUMBERS");
 * ```
 */
export function errorFrom(code: string, raw: unknown = code): GrizzlySmsError {
  const Type = ERROR_TYPES[code] ?? GrizzlySmsError;
  return new Type(code, raw);
}

export function httpStatusError(status: number, raw: unknown): HttpStatusError {
  return new HttpStatusError(status, raw);
}

export function assertNotApiError(data: unknown): void {
  if (data && typeof data === "object") {
    const row = data as { status?: unknown; error?: unknown };
    if (row.status === "error" && typeof row.error === "string" && row.error.trim()) {
      const text = row.error.trim();
      const code = text.split(":")[0]?.trim() || text;
      throw errorFrom(KNOWN_ERROR_CODES.has(code) ? code : text, data);
    }
    return;
  }

  if (typeof data !== "string") return;

  const text = data.trim();
  if (!text) {
    throw new EmptyResponseError("EMPTY_RESPONSE", data);
  }

  if (/prohibited for sale/i.test(text)) {
    throw new ServiceProhibitedError("SERVICE_PROHIBITED", text);
  }

  const code = text.split(":")[0]?.trim() ?? text;
  if (text.startsWith("ACCESS_") || text.startsWith("STATUS_")) return;
  if (KNOWN_ERROR_CODES.has(text) || KNOWN_ERROR_CODES.has(code)) {
    throw errorFrom(KNOWN_ERROR_CODES.has(text) ? text : code, text);
  }
}

export function isRetryableApiBody(data: unknown): boolean {
  if (typeof data !== "string") {
    if (data && typeof data === "object") {
      const error = (data as { error?: unknown }).error;
      if (typeof error === "string") {
        const code = error.trim().split(":")[0]?.trim() ?? "";
        return RETRYABLE_API_CODES.has(code);
      }
    }
    return false;
  }
  const code = data.trim().split(":")[0]?.trim() ?? "";
  return RETRYABLE_API_CODES.has(code);
}
