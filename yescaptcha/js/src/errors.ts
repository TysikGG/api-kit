/**
 * Error thrown by the YesCaptcha client.
 */
export class YesCaptchaError extends Error {
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
    this.name = "YesCaptchaError";
    this.errorId = errorId;
    this.errorCode = errorCode;
    this.httpStatus = httpStatus;
    this.response = response;
  }
}
