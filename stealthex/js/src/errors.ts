/**
 * Error thrown by the StealthEX client when an API operation fails.
 */
export class StealthEXError extends Error {
  /** HTTP status code returned by StealthEX, if available */
  public readonly statusCode?: number;
  /** Full response body from StealthEX, if available */
  public readonly responseBody?: unknown;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      responseBody?: unknown;
    }
  ) {
    super(message);
    this.name = "StealthEXError";
    this.statusCode = options?.statusCode;
    this.responseBody = options?.responseBody;
    Object.setPrototypeOf(this, StealthEXError.prototype);
  }
}
