/**
 * Error thrown by the Swapzone client when an API request fails.
 */
export class SwapzoneError extends Error {
  /** HTTP status code returned by the server, if available */
  public readonly statusCode?: number;
  /** Full response body from Swapzone, if available */
  public readonly responseBody?: unknown;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      responseBody?: unknown;
    }
  ) {
    super(message);
    this.name = "SwapzoneError";
    this.statusCode = options?.statusCode;
    this.responseBody = options?.responseBody;
    Object.setPrototypeOf(this, SwapzoneError.prototype);
  }
}
