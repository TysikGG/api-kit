/**
 * Error thrown by the ChangeNOW client when an API operation fails.
 * Specialized subclasses stay `instanceof ChangeNowError`.
 */
export class ChangeNowError extends Error {
  /** HTTP status code returned by ChangeNOW */
  public readonly statusCode?: number;
  /** API error code (`error`, `code`, or a version-3 field error) when present */
  public readonly code?: string;
  /** Full response body from ChangeNOW */
  public readonly responseBody?: unknown;
  /** Parameter the version-3 API named as the cause, when the body is field-keyed */
  public readonly field?: string;
  /** Field-keyed error details from a version-3 refusal */
  public readonly fieldErrors?: Record<string, unknown>;
  /** Manual pointer returned with a version-3 refusal */
  public readonly help?: string;
  /** Seconds to wait before another attempt, from `Retry-After` or a rate-limit body */
  public readonly retryAfter?: number;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      code?: string;
      responseBody?: unknown;
      field?: string;
      fieldErrors?: Record<string, unknown>;
      help?: string;
      retryAfter?: number;
    }
  ) {
    super(message);
    this.name = "ChangeNowError";
    this.statusCode = options?.statusCode;
    this.code = options?.code;
    this.responseBody = options?.responseBody;
    this.field = options?.field;
    this.fieldErrors = options?.fieldErrors;
    this.help = options?.help;
    this.retryAfter = options?.retryAfter;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** The request never received an HTTP response. */
export class ChangeNowNetworkError extends ChangeNowError {
  constructor(message: string, options?: ConstructorParameters<typeof ChangeNowError>[1]) {
    super(message, options);
    this.name = "ChangeNowNetworkError";
  }
}

/** HTTP 400, or a version-3 code that means the request has to change. */
export class ChangeNowValidationError extends ChangeNowError {
  constructor(message: string, options?: ConstructorParameters<typeof ChangeNowError>[1]) {
    super(message, options);
    this.name = "ChangeNowValidationError";
  }
}

/** `AMOUNT_OUT_OF_RANGE`. `responseBody` still carries min, max, and unit when the API sent them. */
export class ChangeNowAmountError extends ChangeNowValidationError {
  constructor(message: string, options?: ConstructorParameters<typeof ChangeNowError>[1]) {
    super(message, options);
    this.name = "ChangeNowAmountError";
  }
}

/** `INVALID_ADDRESS`. */
export class ChangeNowAddressError extends ChangeNowValidationError {
  constructor(message: string, options?: ConstructorParameters<typeof ChangeNowError>[1]) {
    super(message, options);
    this.name = "ChangeNowAddressError";
  }
}

/** `UNKNOWN_ASSET`, `UNKNOWN_NETWORK`, or `AMBIGUOUS_ASSET`. */
export class ChangeNowAssetError extends ChangeNowValidationError {
  constructor(message: string, options?: ConstructorParameters<typeof ChangeNowError>[1]) {
    super(message, options);
    this.name = "ChangeNowAssetError";
  }
}

/** `PAIR_NOT_AVAILABLE`. */
export class ChangeNowPairError extends ChangeNowValidationError {
  constructor(message: string, options?: ConstructorParameters<typeof ChangeNowError>[1]) {
    super(message, options);
    this.name = "ChangeNowPairError";
  }
}

/** `RATE_UNAVAILABLE`, including an expired `rateId`. */
export class ChangeNowRateError extends ChangeNowValidationError {
  constructor(message: string, options?: ConstructorParameters<typeof ChangeNowError>[1]) {
    super(message, options);
    this.name = "ChangeNowRateError";
  }
}

/** HTTP 401 or `AUTHENTICATION_REQUIRED`. */
export class ChangeNowAuthError extends ChangeNowError {
  constructor(message: string, options?: ConstructorParameters<typeof ChangeNowError>[1]) {
    super(message, options);
    this.name = "ChangeNowAuthError";
  }
}

/** HTTP 403 or `NOT_ALLOWED`. */
export class ChangeNowForbiddenError extends ChangeNowError {
  constructor(message: string, options?: ConstructorParameters<typeof ChangeNowError>[1]) {
    super(message, options);
    this.name = "ChangeNowForbiddenError";
  }
}

/** HTTP 404 or `NOT_FOUND`. A malformed public order id uses this class too. */
export class ChangeNowNotFoundError extends ChangeNowError {
  constructor(message: string, options?: ConstructorParameters<typeof ChangeNowError>[1]) {
    super(message, options);
    this.name = "ChangeNowNotFoundError";
  }
}

/** HTTP 429 or `RATE_LIMITED`. */
export class ChangeNowRateLimitError extends ChangeNowError {
  constructor(message: string, options?: ConstructorParameters<typeof ChangeNowError>[1]) {
    super(message, options);
    this.name = "ChangeNowRateLimitError";
  }
}

/** HTTP 5xx, `UPSTREAM_UNAVAILABLE`, or `INTERNAL_ERROR`. */
export class ChangeNowServerError extends ChangeNowError {
  constructor(message: string, options?: ConstructorParameters<typeof ChangeNowError>[1]) {
    super(message, options);
    this.name = "ChangeNowServerError";
  }
}

/** `waitForExchange` or `waitForPublicTransaction` exceeded `timeoutMs`. */
export class ChangeNowTimeoutError extends ChangeNowError {
  constructor(message: string, options?: ConstructorParameters<typeof ChangeNowError>[1]) {
    super(message, options);
    this.name = "ChangeNowTimeoutError";
  }
}

type ErrorOptions = ConstructorParameters<typeof ChangeNowError>[1];

const CODE_CLASS: Record<string, new (message: string, options?: ErrorOptions) => ChangeNowError> = {
  MISSING_PARAMETER: ChangeNowValidationError,
  INVALID_PARAMETER: ChangeNowValidationError,
  UNKNOWN_PARAMETER: ChangeNowValidationError,
  METHOD_NOT_ALLOWED: ChangeNowValidationError,
  UNSUPPORTED_MEDIA_TYPE: ChangeNowValidationError,
  AMOUNT_OUT_OF_RANGE: ChangeNowAmountError,
  INVALID_ADDRESS: ChangeNowAddressError,
  UNKNOWN_ASSET: ChangeNowAssetError,
  UNKNOWN_NETWORK: ChangeNowAssetError,
  AMBIGUOUS_ASSET: ChangeNowAssetError,
  PAIR_NOT_AVAILABLE: ChangeNowPairError,
  RATE_UNAVAILABLE: ChangeNowRateError,
  AUTHENTICATION_REQUIRED: ChangeNowAuthError,
  NOT_ALLOWED: ChangeNowForbiddenError,
  NOT_FOUND: ChangeNowNotFoundError,
  RATE_LIMITED: ChangeNowRateLimitError,
  UPSTREAM_UNAVAILABLE: ChangeNowServerError,
  INTERNAL_ERROR: ChangeNowServerError,
};

/** Machine codes documented by the anonymous version-3 API. */
export const CHANGENOW_ERROR_CODES = Object.keys(CODE_CLASS);

export function createChangeNowError(message: string, options?: ErrorOptions): ChangeNowError {
  const code = options?.code;
  const status = options?.statusCode;
  const byCode = code ? CODE_CLASS[code] : undefined;
  if (byCode) {
    return new byCode(message, options);
  }
  if (status === 400 || status === 422) {
    return new ChangeNowValidationError(message, options);
  }
  if (status === 401) {
    return new ChangeNowAuthError(message, options);
  }
  if (status === 403) {
    return new ChangeNowForbiddenError(message, options);
  }
  if (status === 404) {
    return new ChangeNowNotFoundError(message, options);
  }
  if (status === 429) {
    return new ChangeNowRateLimitError(message, options);
  }
  if (status !== undefined && status >= 500) {
    return new ChangeNowServerError(message, options);
  }
  return new ChangeNowError(message, options);
}
