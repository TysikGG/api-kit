/**
 * Documented CapMonster Cloud error codes.
 *
 * @see https://docs.capmonster.cloud/docs/api/api-errors/
 */
export const CAPMONSTER_ERRORS: Record<string, string> = {
  ERROR_KEY_DOES_NOT_EXIST:
    "API key not found or provided in an incorrect format",
  ERROR_PROXY_CREDENTIALS_INVALID_CHARACTER:
    "Proxy login or password contains an invalid character",
  ERROR_ZERO_BALANCE: "Insufficient funds on the account to solve captchas",
  ERROR_TOO_BIG_CAPTCHA_FILESIZE:
    "The uploaded image exceeds the maximum allowed size of 50 KB",
  ERROR_ZERO_CAPTCHA_FILESIZE:
    "The image size is too small (less than 100 bytes)",
  ERROR_NO_SUCH_CAPCHA_ID: "Captcha task id was not found",
  WRONG_CAPTCHA_ID: "Captcha task id is missing, expired, or invalid",
  ERROR_CAPTCHA_UNSOLVABLE:
    "The captcha could not be solved. Unsolved tasks are not charged",
  CAPTCHA_NOT_READY: "The task is still being solved",
  ERROR_IP_NOT_ALLOWED: "Requests from this IP with the current key are denied",
  ERROR_IP_BANNED:
    "The IP address has been temporarily blocked due to invalid requests",
  ERROR_NO_SUCH_METHOD: "An incorrect task type was specified",
  ERROR_TOO_MUCH_REQUESTS: "The allowed request limit has been exceeded",
  ERROR_DOMAIN_NOT_ALLOWED: "Solving captchas from this domain is forbidden",
  ERROR_TOKEN_EXPIRED: "The provided token or challenge has expired",
  ERROR_RECAPTCHA_INVALID_SITEKEY: "An invalid websiteKey was provided",
  ERROR_RECAPTCHA_INVALID_DOMAIN:
    "The domain does not match the sitekey, or websiteURL is not a full http(s) URL",
  ERROR_RECAPTCHA_TIMEOUT: "The captcha solving time has expired",
  ERROR_IP_BLOCKED:
    "Access from this IP is blocked due to a high number of failed requests",
  ERROR_PROXY_CONNECT_REFUSED: "The proxy server refused the connection",
  ERROR_PROXY_BANNED: "The specified proxy is blocked by the target website",
  ERROR_PROXY_MISSING: "Proxy parameters are missing or proxyType is incorrect",
  ERROR_PROXY_NOT_AUTHORISED: "Proxy login or password is incorrect",
  ERROR_PROXY_READ_TIMEOUT: "The response timed out while using the proxy",
  ERROR_TASK_NOT_SUPPORTED: "The specified task type is unsupported or invalid",
  ERROR_TASK_ABSENT: "The task object is missing or the JSON is invalid",
  ERROR_WRONG_USERAGENT: "An invalid User-Agent was provided",
  ERROR_SERVICE_NOT_AVAILABLE: "The service is temporarily unavailable",
  ERROR_INVALID_TASK: "The task is syntactically valid but contains invalid data",
  TIMEOUT: "Polling timed out before the captcha was solved",
  ABORTED: "The operation was aborted",
  MISSING_CLIENT_KEY: "Client key is required",
  EMPTY_USER_AGENT: "The user-agent endpoint returned an empty body",
};

/**
 * Transport and API codes that are safe to retry.
 * Polling uses `CAPTCHA_NOT_READY` itself and must not retry that code here.
 *
 * @see https://docs.capmonster.cloud/docs/api/api-errors/
 */
export const RETRYABLE_ERROR_CODES = [
  "ERROR_SERVICE_NOT_AVAILABLE",
  "ERROR_TOO_MUCH_REQUESTS",
  "ERROR_PROXY_READ_TIMEOUT",
  "ERROR_PROXY_CONNECT_REFUSED",
] as const;

export const RETRYABLE_HTTP_STATUSES = [429, 502, 503, 504] as const;

/**
 * Error thrown by the CapMonster Cloud client.
 * Specific API codes use subclasses so `instanceof` can distinguish them.
 * Every subclass remains a `CapMonsterError`.
 */
export class CapMonsterError extends Error {
  /** Numeric error ID from the API (0 is success). */
  readonly errorId: number;

  /** Symbolic error code (e.g. `ERROR_KEY_DOES_NOT_EXIST`, `ERROR_ZERO_BALANCE`). */
  readonly errorCode?: string;

  /** HTTP status code or 0 for client/transport errors. */
  readonly httpStatus: number;

  /** Raw response body from the server. */
  readonly response?: unknown;

  constructor(
    message: string,
    errorId: number = 0,
    errorCode?: string,
    httpStatus: number = 0,
    response?: unknown,
  ) {
    super(message);
    this.name = "CapMonsterError";
    this.errorId = errorId;
    this.errorCode = errorCode;
    this.httpStatus = httpStatus;
    this.response = response;
  }
}

type ErrorCtor = new (
  message: string,
  errorId?: number,
  errorCode?: string,
  httpStatus?: number,
  response?: unknown,
) => CapMonsterError;

function subclass(className: string): ErrorCtor {
  const Ctor = class extends CapMonsterError {
    constructor(
      message: string,
      errorId: number = 0,
      errorCode?: string,
      httpStatus: number = 0,
      response?: unknown,
    ) {
      super(message, errorId, errorCode, httpStatus, response);
      this.name = className;
    }
  };
  Object.defineProperty(Ctor, "name", { value: className });
  return Ctor;
}

export const KeyDoesNotExistError = subclass("KeyDoesNotExistError");
export const ProxyCredentialsInvalidCharacterError = subclass(
  "ProxyCredentialsInvalidCharacterError",
);
export const ZeroBalanceError = subclass("ZeroBalanceError");
export const TooBigCaptchaFileSizeError = subclass("TooBigCaptchaFileSizeError");
export const ZeroCaptchaFileSizeError = subclass("ZeroCaptchaFileSizeError");
export const NoSuchCaptchaIdError = subclass("NoSuchCaptchaIdError");
export const WrongCaptchaIdError = subclass("WrongCaptchaIdError");
export const CaptchaUnsolvableError = subclass("CaptchaUnsolvableError");
export const CaptchaNotReadyError = subclass("CaptchaNotReadyError");
export const IpNotAllowedError = subclass("IpNotAllowedError");
export const IpBannedError = subclass("IpBannedError");
export const NoSuchMethodError = subclass("NoSuchMethodError");
export const TooMuchRequestsError = subclass("TooMuchRequestsError");
export const DomainNotAllowedError = subclass("DomainNotAllowedError");
export const TokenExpiredError = subclass("TokenExpiredError");
export const RecaptchaInvalidSitekeyError = subclass("RecaptchaInvalidSitekeyError");
export const RecaptchaInvalidDomainError = subclass("RecaptchaInvalidDomainError");
export const RecaptchaTimeoutError = subclass("RecaptchaTimeoutError");
export const IpBlockedError = subclass("IpBlockedError");
export const ProxyConnectRefusedError = subclass("ProxyConnectRefusedError");
export const ProxyBannedError = subclass("ProxyBannedError");
export const ProxyMissingError = subclass("ProxyMissingError");
export const ProxyNotAuthorisedError = subclass("ProxyNotAuthorisedError");
export const ProxyReadTimeoutError = subclass("ProxyReadTimeoutError");
export const TaskNotSupportedError = subclass("TaskNotSupportedError");
export const TaskAbsentError = subclass("TaskAbsentError");
export const WrongUserAgentError = subclass("WrongUserAgentError");
export const ServiceNotAvailableError = subclass("ServiceNotAvailableError");
export const InvalidTaskError = subclass("InvalidTaskError");
export const TimeoutError = subclass("TimeoutError");
export const AbortedError = subclass("AbortedError");
export const MissingClientKeyError = subclass("MissingClientKeyError");
export const EmptyUserAgentError = subclass("EmptyUserAgentError");

/** Map of API / client codes to dedicated error classes. */
export const CAPMONSTER_ERROR_CLASSES: Record<string, ErrorCtor> = {
  ERROR_KEY_DOES_NOT_EXIST: KeyDoesNotExistError,
  ERROR_PROXY_CREDENTIALS_INVALID_CHARACTER: ProxyCredentialsInvalidCharacterError,
  ERROR_ZERO_BALANCE: ZeroBalanceError,
  ERROR_TOO_BIG_CAPTCHA_FILESIZE: TooBigCaptchaFileSizeError,
  ERROR_ZERO_CAPTCHA_FILESIZE: ZeroCaptchaFileSizeError,
  ERROR_NO_SUCH_CAPCHA_ID: NoSuchCaptchaIdError,
  WRONG_CAPTCHA_ID: WrongCaptchaIdError,
  ERROR_CAPTCHA_UNSOLVABLE: CaptchaUnsolvableError,
  CAPTCHA_NOT_READY: CaptchaNotReadyError,
  ERROR_IP_NOT_ALLOWED: IpNotAllowedError,
  ERROR_IP_BANNED: IpBannedError,
  ERROR_NO_SUCH_METHOD: NoSuchMethodError,
  ERROR_TOO_MUCH_REQUESTS: TooMuchRequestsError,
  ERROR_DOMAIN_NOT_ALLOWED: DomainNotAllowedError,
  ERROR_TOKEN_EXPIRED: TokenExpiredError,
  ERROR_RECAPTCHA_INVALID_SITEKEY: RecaptchaInvalidSitekeyError,
  ERROR_RECAPTCHA_INVALID_DOMAIN: RecaptchaInvalidDomainError,
  ERROR_RECAPTCHA_TIMEOUT: RecaptchaTimeoutError,
  ERROR_IP_BLOCKED: IpBlockedError,
  ERROR_PROXY_CONNECT_REFUSED: ProxyConnectRefusedError,
  ERROR_PROXY_BANNED: ProxyBannedError,
  ERROR_PROXY_MISSING: ProxyMissingError,
  ERROR_PROXY_NOT_AUTHORISED: ProxyNotAuthorisedError,
  ERROR_PROXY_READ_TIMEOUT: ProxyReadTimeoutError,
  ERROR_TASK_NOT_SUPPORTED: TaskNotSupportedError,
  ERROR_TASK_ABSENT: TaskAbsentError,
  ERROR_WRONG_USERAGENT: WrongUserAgentError,
  ERROR_SERVICE_NOT_AVAILABLE: ServiceNotAvailableError,
  ERROR_INVALID_TASK: InvalidTaskError,
  TIMEOUT: TimeoutError,
  ABORTED: AbortedError,
  MISSING_CLIENT_KEY: MissingClientKeyError,
  EMPTY_USER_AGENT: EmptyUserAgentError,
};

/**
 * Prefer the API description, then the local catalog, then the raw code.
 */
export function describeCapMonsterError(
  errorCode: string | undefined,
  errorDescription: string | undefined,
  errorId: number,
): string {
  if (errorDescription) return errorDescription;
  if (errorCode && CAPMONSTER_ERRORS[errorCode]) return CAPMONSTER_ERRORS[errorCode];
  if (errorCode) return errorCode;
  return `API error #${errorId}`;
}

/** Build a `CapMonsterError` subclass for a known code, or the base class. */
export function createCapMonsterError(
  message: string,
  errorId: number = 0,
  errorCode?: string,
  httpStatus: number = 0,
  response?: unknown,
): CapMonsterError {
  const Ctor = (errorCode && CAPMONSTER_ERROR_CLASSES[errorCode]) || CapMonsterError;
  return new Ctor(message, errorId, errorCode, httpStatus, response);
}

/** True when another attempt may succeed without changing the request. */
export function isRetryableCapMonsterError(err: unknown): boolean {
  if (!(err instanceof CapMonsterError)) return false;
  if (err.errorCode && (RETRYABLE_ERROR_CODES as readonly string[]).includes(err.errorCode)) {
    return true;
  }
  if (
    !err.errorCode &&
    (RETRYABLE_HTTP_STATUSES as readonly number[]).includes(err.httpStatus)
  ) {
    return true;
  }
  if (!err.errorCode && err.httpStatus === 0 && err.errorId === 0) {
    return err.errorCode !== "TIMEOUT" && err.name !== "AbortedError";
  }
  return false;
}
