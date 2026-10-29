/**
 * Error types for the Peak CAPTCHA solving API.
 *
 * Every HTTP failure and every `success: false` envelope is mapped to a
 * subclass of {@link PeakError}, so existing `instanceof PeakError` checks
 * keep working.
 */

/** Stable identifiers for documented Peak failures. */
export const PeakErrorCode = {
  PEAK_ERROR: "peak_error",
  MISSING_API_KEY: "missing_api_key",
  UNAUTHORIZED: "unauthorized",
  INSUFFICIENT_BALANCE: "insufficient_balance",
  PACKAGE_EXHAUSTED: "package_solves_exhausted",
  BAD_REQUEST: "bad_request",
  RATE_LIMITED: "rate_limited",
  TASK_DISABLED: "task_disabled",
  UPSTREAM: "upstream",
  SOLVE_FAILED: "solve_failed",
  PROXY_CONNECTION_FAILED: "proxy_connection_failed",
  REQUEST_TIMED_OUT: "request_timed_out",
  IP_BLOCKED: "ip_blocked",
  NO_WAF_CHALLENGE: "no_waf_challenge",
  INVALID_SITEKEY: "invalid_sitekey",
  TURNSTILE_FLAGGED: "turnstile_flagged",
  UNSUPPORTED_USER_AGENT: "unsupported_user_agent",
  NETWORK: "network",
  RETRY_TIMEOUT: "retry_timeout",
} as const;

export type PeakErrorCode = (typeof PeakErrorCode)[keyof typeof PeakErrorCode];

const MESSAGE_CODES: Array<[string, PeakErrorCode]> = [
  ["missing api key", PeakErrorCode.MISSING_API_KEY],
  ["invalid api key", PeakErrorCode.UNAUTHORIZED],
  ["expired api key", PeakErrorCode.UNAUTHORIZED],
  ["api key", PeakErrorCode.UNAUTHORIZED],
  ["unauthorized", PeakErrorCode.UNAUTHORIZED],
  ["authentication", PeakErrorCode.UNAUTHORIZED],
  ["package solves exhausted", PeakErrorCode.PACKAGE_EXHAUSTED],
  ["insufficient balance", PeakErrorCode.INSUFFICIENT_BALANCE],
  ["exhausted", PeakErrorCode.PACKAGE_EXHAUSTED],
  ["rate limit", PeakErrorCode.RATE_LIMITED],
  ["disabled", PeakErrorCode.TASK_DISABLED],
  ["no solver", PeakErrorCode.TASK_DISABLED],
  ["proxy connection failed", PeakErrorCode.PROXY_CONNECTION_FAILED],
  ["ip address is blocked", PeakErrorCode.IP_BLOCKED],
  ["no waf challenge", PeakErrorCode.NO_WAF_CHALLENGE],
  ["invalid sitekey", PeakErrorCode.INVALID_SITEKEY],
  ["flagged", PeakErrorCode.TURNSTILE_FLAGGED],
  ["unsupported user agent", PeakErrorCode.UNSUPPORTED_USER_AGENT],
  ["request timed out", PeakErrorCode.REQUEST_TIMED_OUT],
  ["timed out", PeakErrorCode.REQUEST_TIMED_OUT],
];

/**
 * Error thrown by the Peak client when an API or HTTP error occurs.
 *
 * @example
 * ```ts
 * try {
 *   await client.solveTurnstile({ url: "https://example.com/", sitekey: "0x4AAA" });
 * } catch (err) {
 *   if (err instanceof PeakError) {
 *     console.error(`Peak error [${err.status}] ${err.code}: ${err.message}`);
 *   }
 * }
 * ```
 */
export class PeakError extends Error {
  /** HTTP status code, or `0` for a local / transport failure. */
  readonly status: number;

  /** Raw response body, when the server returned one. */
  readonly data?: unknown;

  /** Stable error code. See {@link PeakErrorCode}. */
  readonly code: PeakErrorCode;

  constructor(
    message: string,
    status: number = 0,
    data?: unknown,
    code: PeakErrorCode = PeakErrorCode.PEAK_ERROR,
  ) {
    super(message);
    this.name = "PeakError";
    this.status = status;
    this.data = data;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Alias of {@link PeakError.data} for callers that say "response". */
  get response(): unknown {
    return this.data;
  }
}

/** HTTP 401, or a message that says the API key is missing, invalid, or expired. */
export class AuthenticationError extends PeakError {
  constructor(
    message: string,
    status: number = 401,
    data?: unknown,
    code: PeakErrorCode = PeakErrorCode.UNAUTHORIZED,
  ) {
    super(message, status, data, code);
    this.name = "AuthenticationError";
  }
}

/** HTTP 402, insufficient pay-per-solve balance, or a used-up package. */
export class InsufficientBalanceError extends PeakError {
  constructor(
    message: string,
    status: number = 402,
    data?: unknown,
    code: PeakErrorCode = PeakErrorCode.INSUFFICIENT_BALANCE,
  ) {
    super(message, status, data, code);
    this.name = "InsufficientBalanceError";
  }
}

/** HTTP 400. The request is invalid and is not retried. */
export class BadRequestError extends PeakError {
  constructor(
    message: string,
    status: number = 400,
    data?: unknown,
    code: PeakErrorCode = PeakErrorCode.BAD_REQUEST,
  ) {
    super(message, status, data, code);
    this.name = "BadRequestError";
  }
}

/** HTTP 429. Safe to retry after a delay. */
export class RateLimitError extends PeakError {
  constructor(
    message: string,
    status: number = 429,
    data?: unknown,
    code: PeakErrorCode = PeakErrorCode.RATE_LIMITED,
  ) {
    super(message, status, data, code);
    this.name = "RateLimitError";
  }
}

/**
 * HTTP 503, or a message that the task type is disabled or has no solver capacity.
 * Official SDKs raise this class when AWS WAF is switched off.
 */
export class TaskDisabledError extends PeakError {
  constructor(
    message: string,
    status: number = 503,
    data?: unknown,
    code: PeakErrorCode = PeakErrorCode.TASK_DISABLED,
  ) {
    super(message, status, data, code);
    this.name = "TaskDisabledError";
  }
}

/** Alias of {@link TaskDisabledError} for HTTP 503 wording in the API docs. */
export class ServiceUnavailableError extends TaskDisabledError {
  constructor(message: string, status: number = 503, data?: unknown) {
    super(message, status, data, PeakErrorCode.TASK_DISABLED);
    this.name = "ServiceUnavailableError";
  }
}

/** HTTP 502. The upstream target or Peak edge could not complete the call. */
export class UpstreamError extends PeakError {
  constructor(
    message: string,
    status: number = 502,
    data?: unknown,
    code: PeakErrorCode = PeakErrorCode.UPSTREAM,
  ) {
    super(message, status, data, code);
    this.name = "UpstreamError";
  }
}

/**
 * A solve was attempted and failed.
 * Peak does not bill these responses (`200` with `success: false`, and most solve-time messages).
 */
export class SolveError extends PeakError {
  constructor(
    message: string,
    status: number = 200,
    data?: unknown,
    code: PeakErrorCode = PeakErrorCode.SOLVE_FAILED,
  ) {
    super(message, status, data, code);
    this.name = "SolveError";
  }
}

/** The retry budget elapsed before a retryable call succeeded. */
export class RetryTimeoutError extends PeakError {
  constructor(message: string = "Retry timeout exceeded", data?: unknown) {
    super(message, 0, data, PeakErrorCode.RETRY_TIMEOUT);
    this.name = "RetryTimeoutError";
  }
}

const AUTH_CODES: ReadonlySet<PeakErrorCode> = new Set([
  PeakErrorCode.MISSING_API_KEY,
  PeakErrorCode.UNAUTHORIZED,
]);

const BALANCE_CODES: ReadonlySet<PeakErrorCode> = new Set([
  PeakErrorCode.INSUFFICIENT_BALANCE,
  PeakErrorCode.PACKAGE_EXHAUSTED,
]);

function codeFromMessage(message: string): PeakErrorCode | undefined {
  const lower = message.toLowerCase();
  for (const [needle, code] of MESSAGE_CODES) {
    if (lower.includes(needle)) return code;
  }
  return undefined;
}

/**
 * Map an API message and HTTP status onto a {@link PeakError} subclass.
 * Status wins when it names a class, except authentication and balance phrases,
 * which stay specific even if the status is a generic 400 or 200.
 */
export function classifyPeakError(
  message: string,
  status: number,
  data?: unknown,
): PeakError {
  const fromMessage = codeFromMessage(message);

  if (status === 401 || (fromMessage && AUTH_CODES.has(fromMessage))) {
    return new AuthenticationError(
      message,
      status || 401,
      data,
      fromMessage && AUTH_CODES.has(fromMessage)
        ? fromMessage
        : PeakErrorCode.UNAUTHORIZED,
    );
  }

  if (status === 402 || (fromMessage && BALANCE_CODES.has(fromMessage))) {
    return new InsufficientBalanceError(
      message,
      status || 402,
      data,
      fromMessage && BALANCE_CODES.has(fromMessage)
        ? fromMessage
        : PeakErrorCode.INSUFFICIENT_BALANCE,
    );
  }

  if (status === 400) {
    return new BadRequestError(message, status, data, PeakErrorCode.BAD_REQUEST);
  }

  if (status === 429 || fromMessage === PeakErrorCode.RATE_LIMITED) {
    return new RateLimitError(message, status || 429, data, PeakErrorCode.RATE_LIMITED);
  }

  if (
    status === 503 ||
    fromMessage === PeakErrorCode.TASK_DISABLED
  ) {
    const error = new TaskDisabledError(
      message,
      status || 503,
      data,
      PeakErrorCode.TASK_DISABLED,
    );
    if (status === 503 && fromMessage !== PeakErrorCode.TASK_DISABLED) {
      return new ServiceUnavailableError(message, status, data);
    }
    return error;
  }

  if (status === 502) {
    return new UpstreamError(message, status, data, PeakErrorCode.UPSTREAM);
  }

  if (status === 200 || (fromMessage && fromMessage !== PeakErrorCode.REQUEST_TIMED_OUT)) {
    return new SolveError(
      message,
      status || 200,
      data,
      fromMessage ?? PeakErrorCode.SOLVE_FAILED,
    );
  }

  if (fromMessage === PeakErrorCode.REQUEST_TIMED_OUT || status === 0) {
    return new PeakError(
      message,
      status,
      data,
      fromMessage === PeakErrorCode.REQUEST_TIMED_OUT
        ? PeakErrorCode.REQUEST_TIMED_OUT
        : PeakErrorCode.NETWORK,
    );
  }

  return new PeakError(message, status, data, fromMessage ?? PeakErrorCode.PEAK_ERROR);
}

/** Failures that are safe to send again. Successful solves are never retried. */
export function isRetryablePeakError(err: unknown): boolean {
  if (!(err instanceof PeakError)) return false;
  if (err instanceof AuthenticationError) return false;
  if (err instanceof InsufficientBalanceError) return false;
  if (err instanceof BadRequestError) return false;
  if (err instanceof RetryTimeoutError) return false;
  return true;
}
