/**
 * Error thrown by the SimpleSwap client when an API operation fails.
 */
export class SimpleSwapError extends Error {
  /** HTTP status code returned by SimpleSwap, when the call reached the API. */
  public readonly statusCode?: number;
  /** Request trace ID returned by SimpleSwap. */
  public readonly traceId?: string;
  /** Full response body from SimpleSwap, or the last exchange payload for polling timeouts. */
  public readonly responseBody?: unknown;
  /** API or transport error code (`code` field, or an Axios error code). */
  public readonly code?: string | number;
  /** Whether the client may retry this failure. */
  public readonly retryable: boolean;
  /** Server-provided Retry-After delay in milliseconds, when present. */
  public readonly retryAfterMs?: number;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      traceId?: string;
      responseBody?: unknown;
      code?: string | number;
      retryable?: boolean;
      retryAfterMs?: number;
    }
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = options?.statusCode;
    this.traceId = options?.traceId;
    this.responseBody = options?.responseBody;
    this.code = options?.code;
    this.retryable = options?.retryable ?? false;
    this.retryAfterMs = options?.retryAfterMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** HTTP 400. The pair, amount, address, or another parameter was rejected. */
export class SimpleSwapBadRequestError extends SimpleSwapError {}

/** HTTP 401. The API key is missing or not valid. */
export class SimpleSwapAuthError extends SimpleSwapError {}

/** HTTP 403. The key is not allowed to call this operation. */
export class SimpleSwapForbiddenError extends SimpleSwapError {}

/** HTTP 404. The currency, pair, or exchange id was not found. */
export class SimpleSwapNotFoundError extends SimpleSwapError {}

/** HTTP 422. The body or query failed validation. */
export class SimpleSwapValidationError extends SimpleSwapError {}

/** HTTP 429. The public API allows 50 requests per 10 seconds. */
export class SimpleSwapRateLimitError extends SimpleSwapError {}

/** HTTP 5xx. SimpleSwap failed while handling the request. */
export class SimpleSwapServerError extends SimpleSwapError {}

/** DNS, connection, or timeout failure before a response arrived. */
export class SimpleSwapNetworkError extends SimpleSwapError {}

/** `waitForExchange` did not see a matching status before the timeout. */
export class SimpleSwapTimeoutError extends SimpleSwapError {}

export interface SimpleSwapErrorDetails {
  statusCode?: number;
  traceId?: string;
  responseBody?: unknown;
  code?: string | number;
  retryable?: boolean;
  retryAfterMs?: number;
}

function errorClassForStatus(statusCode: number | undefined): typeof SimpleSwapError {
  switch (statusCode) {
    case 400:
      return SimpleSwapBadRequestError;
    case 401:
      return SimpleSwapAuthError;
    case 403:
      return SimpleSwapForbiddenError;
    case 404:
      return SimpleSwapNotFoundError;
    case 422:
      return SimpleSwapValidationError;
    case 429:
      return SimpleSwapRateLimitError;
    default:
      if (statusCode !== undefined && statusCode >= 500) {
        return SimpleSwapServerError;
      }
      return SimpleSwapError;
  }
}

export function isRetryableStatus(statusCode: number | undefined): boolean {
  return statusCode === 408 || statusCode === 429 || (statusCode !== undefined && statusCode >= 500);
}

/**
 * Builds the public error for an HTTP status or an `error: true` payload.
 */
export function createSimpleSwapError(
  message: string,
  details: SimpleSwapErrorDetails = {}
): SimpleSwapError {
  const retryable = details.retryable ?? isRetryableStatus(details.statusCode);
  const Cls = errorClassForStatus(details.statusCode);
  return new Cls(message, { ...details, retryable });
}

/**
 * Reads a Retry-After header into milliseconds.
 * Numeric values are seconds. HTTP-dates are timestamps. Invalid values return undefined.
 */
export function parseRetryAfter(value: unknown, now = Date.now()): number | undefined {
  if (value == null) {
    return undefined;
  }
  const raw = Array.isArray(value) ? value[0] : value;
  const text = String(raw).trim();
  if (!text) {
    return undefined;
  }
  if (/^\d+(\.\d+)?$/.test(text)) {
    return Number(text) * 1000;
  }
  const when = Date.parse(text);
  if (Number.isNaN(when)) {
    return undefined;
  }
  return Math.max(0, when - now);
}
