/**
 * Errors raised by the Give-SMS client.
 *
 * Handler responses use a symbolic `code` (`NO_NUMBERS`, `BAD_KEY`, …).
 * Native JSON responses use the numeric `status` (`401`, `504`, …).
 */

export class GiveSmsError extends Error {
  public readonly code?: string | number;
  public readonly responseData?: unknown;
  public readonly reason?: string;

  public constructor(
    message: string,
    code?: string | number,
    responseData?: unknown,
    reason?: string,
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.responseData = responseData;
    this.reason = reason;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class GiveSmsTimeoutError extends GiveSmsError {
  public constructor(message = "Timed out waiting for Give-SMS") {
    super(message, "TIMEOUT");
  }
}

export class GiveSmsAbortError extends GiveSmsError {
  public constructor(message = "Operation aborted") {
    super(message, "ABORTED");
  }
}

export class NetworkError extends GiveSmsError {
  public constructor(message: string) {
    super(message, "NETWORK");
  }
}
export class BadKeyError extends GiveSmsError {}
export class NoKeyError extends GiveSmsError {}
export class ErrorSqlError extends GiveSmsError {}
export class BadActionError extends GiveSmsError {}
export class BadServiceError extends GiveSmsError {}
export class NoActivationError extends GiveSmsError {}
export class BadStatusError extends GiveSmsError {}
export class NoBalanceError extends GiveSmsError {}
export class NoNumbersError extends GiveSmsError {}
export class WrongServiceError extends GiveSmsError {}
export class BadCountryError extends GiveSmsError {}
export class TemporaryBannedError extends GiveSmsError {}
export class WrongMaxPriceError extends GiveSmsError {}
export class TooManyActiveOrdersError extends GiveSmsError {}
export class TooManyAttemptsError extends GiveSmsError {}
export class NumberUnavailableError extends GiveSmsError {}
export class AlreadyActiveError extends GiveSmsError {}
export class BadDurationError extends GiveSmsError {}
export class PriceChangedError extends GiveSmsError {}
export class ResendRequiredError extends GiveSmsError {}

export class ApiStatus400Error extends GiveSmsError {}
export class ApiStatus401Error extends GiveSmsError {}
export class ApiStatus402Error extends GiveSmsError {}
export class ApiStatus404Error extends GiveSmsError {}
export class ApiStatus500Error extends GiveSmsError {}
export class ApiStatus501Error extends GiveSmsError {}
export class ApiStatus502Error extends GiveSmsError {}
export class ApiStatus503Error extends GiveSmsError {}
export class ApiStatus504Error extends GiveSmsError {}
export class ApiStatus505Error extends GiveSmsError {}
export class ApiStatus506Error extends GiveSmsError {}
export class ApiStatus507Error extends GiveSmsError {}
export class ApiStatus508Error extends GiveSmsError {}
export class ApiStatus509Error extends GiveSmsError {}

export const HANDLER_ERROR_CLASSES: Record<string, typeof GiveSmsError> = {
  BAD_KEY: BadKeyError,
  NO_KEY: NoKeyError,
  ERROR_SQL: ErrorSqlError,
  BAD_ACTION: BadActionError,
  BAD_SERVICE: BadServiceError,
  NO_ACTIVATION: NoActivationError,
  BAD_STATUS: BadStatusError,
  NO_BALANCE: NoBalanceError,
  NO_NUMBERS: NoNumbersError,
  WRONG_SERVICE: WrongServiceError,
  BAD_COUNTRY: BadCountryError,
  YOU_TEMPORARY_BANNED: TemporaryBannedError,
  WRONG_MAX_PRICE: WrongMaxPriceError,
  TOO_MANY_ACTIVE_ORDERS: TooManyActiveOrdersError,
  TOO_MANY_ATTEMPTS: TooManyAttemptsError,
  NUMBER_UNAVAILABLE: NumberUnavailableError,
  ALREADY_ACTIVE: AlreadyActiveError,
  BAD_DURATION: BadDurationError,
  PRICE_CHANGED: PriceChangedError,
};

export const API_STATUS_ERRORS: Record<number, typeof GiveSmsError> = {
  400: ApiStatus400Error,
  401: ApiStatus401Error,
  402: ApiStatus402Error,
  404: ApiStatus404Error,
  500: ApiStatus500Error,
  501: ApiStatus501Error,
  502: ApiStatus502Error,
  503: ApiStatus503Error,
  504: ApiStatus504Error,
  505: ApiStatus505Error,
  506: ApiStatus506Error,
  507: ApiStatus507Error,
  508: ApiStatus508Error,
  509: ApiStatus509Error,
};

const HANDLER_CODES_BY_LENGTH = Object.keys(HANDLER_ERROR_CLASSES).sort(
  (a, b) => b.length - a.length,
);

/** Match a handler plain-text error, or return null when `text` is a normal response. */
export function handlerError(text: string): GiveSmsError | null {
  for (const code of HANDLER_CODES_BY_LENGTH) {
    if (text === code || text.startsWith(`${code}:`)) {
      const Cls = HANDLER_ERROR_CLASSES[code];
      const detail = text.startsWith(`${code}:`) ? text.slice(code.length + 1) : undefined;
      return new Cls(`API error: ${text}`, code, detail ?? text);
    }
  }
  return null;
}

export function apiStatusError(
  status: number,
  message: string,
  responseData?: unknown,
  reason?: string,
): GiveSmsError {
  const Cls = API_STATUS_ERRORS[status] ?? GiveSmsError;
  return new Cls(message, status, responseData, reason);
}
