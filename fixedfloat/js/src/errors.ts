/**
 * Error thrown when an API request to FixedFloat fails.
 */
export class FixedFloatError extends Error {
  /**
   * Numeric response code from FixedFloat API (0 indicates success).
   * `-1` means the failure happened before a FixedFloat status code was available.
   */
  readonly code: number;

  /**
   * Additional data or details returned by the API if present.
   */
  readonly data?: unknown;

  /**
   * When true, the client may retry this failure (network, timeout, HTTP 429 or 5xx).
   */
  readonly retryable: boolean;

  /**
   * HTTP status that accompanied the failure, when the server responded.
   */
  readonly status?: number;

  constructor(
    message: string,
    code: number = -1,
    data?: unknown,
    retryable = false,
    status?: number,
  ) {
    super(message);
    this.name = "FixedFloatError";
    this.code = code;
    this.data = data;
    this.retryable = retryable;
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** FixedFloat returned a non-zero `code` in the JSON envelope. */
export class FixedFloatApiError extends FixedFloatError {
  constructor(message: string, code: number, data?: unknown, retryable = false, status?: number) {
    super(message, code, data, retryable, status);
    this.name = "FixedFloatApiError";
  }
}

/** The HTTP layer failed before a usable FixedFloat envelope was returned. */
export class FixedFloatHttpError extends FixedFloatError {
  constructor(message: string, status: number, data?: unknown, retryable = false) {
    super(message, status, data, retryable, status);
    this.name = "FixedFloatHttpError";
  }
}

/** API key or signature was rejected (HTTP 401 or 403). */
export class FixedFloatAuthError extends FixedFloatError {
  constructor(message: string, code: number = 401, data?: unknown, status?: number) {
    super(message, code, data, false, status ?? 401);
    this.name = "FixedFloatAuthError";
  }
}

/**
 * The per-minute weight limit was hit (HTTP 429).
 * `/create` costs 50 weight units; every other method costs 1. The cap is 250 per minute.
 */
export class FixedFloatRateLimitError extends FixedFloatError {
  constructor(message: string, code: number = 429, data?: unknown, status = 429) {
    super(message, code, data, true, status);
    this.name = "FixedFloatRateLimitError";
  }
}

/** DNS, connection, or other transport failure. */
export class FixedFloatNetworkError extends FixedFloatError {
  constructor(message: string) {
    super(message, -1, undefined, true);
    this.name = "FixedFloatNetworkError";
  }
}

/** A single HTTP call timed out, or order polling exceeded its deadline. */
export class FixedFloatTimeoutError extends FixedFloatError {
  constructor(message: string, retryable = true) {
    super(message, -1, undefined, retryable);
    this.name = "FixedFloatTimeoutError";
  }
}

/** Narrow unknown exceptions to {@link FixedFloatError}. */
export function isFixedFloatError(error: unknown): error is FixedFloatError {
  return error instanceof FixedFloatError;
}
