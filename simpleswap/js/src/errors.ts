/**
 * Error thrown by the SimpleSwap client when an API operation fails.
 */
export class SimpleSwapError extends Error {
  /** HTTP status code returned by SimpleSwap */
  public readonly statusCode?: number;
  /** Request trace ID returned by SimpleSwap */
  public readonly traceId?: string;
  /** Full response body from SimpleSwap */
  public readonly responseBody?: unknown;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      traceId?: string;
      responseBody?: unknown;
    }
  ) {
    super(message);
    this.name = "SimpleSwapError";
    this.statusCode = options?.statusCode;
    this.traceId = options?.traceId;
    this.responseBody = options?.responseBody;
    Object.setPrototypeOf(this, SimpleSwapError.prototype);
  }
}
