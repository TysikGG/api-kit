/**
 * Error thrown by the ChangeNOW client when an API operation fails.
 */
export class ChangeNowError extends Error {
  /** HTTP status code returned by ChangeNOW */
  public readonly statusCode?: number;
  /** API error code (`error` or `code` field) when present */
  public readonly code?: string;
  /** Full response body from ChangeNOW */
  public readonly responseBody?: unknown;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      code?: string;
      responseBody?: unknown;
    }
  ) {
    super(message);
    this.name = "ChangeNowError";
    this.statusCode = options?.statusCode;
    this.code = options?.code;
    this.responseBody = options?.responseBody;
    Object.setPrototypeOf(this, ChangeNowError.prototype);
  }
}
