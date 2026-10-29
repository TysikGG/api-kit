/**
 * Error thrown by the Exolix client when an API operation fails.
 */
export class ExolixError extends Error {
  /** HTTP status code returned by Exolix */
  public readonly statusCode?: number;
  /** API error name (`error` field) when present */
  public readonly code?: string;
  /** Full response body from Exolix */
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
    this.name = "ExolixError";
    this.statusCode = options?.statusCode;
    this.code = options?.code;
    this.responseBody = options?.responseBody;
    Object.setPrototypeOf(this, ExolixError.prototype);
  }
}
