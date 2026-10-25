/**
 * Error thrown by the SMSBulk client when an API request fails.
 */
export class SMSBulkError extends Error {
  /** HTTP status code returned by the server, if available */
  public readonly statusCode?: number;
  /** Error code / type returned by SMSBulk, if available */
  public readonly code?: string;
  /** Full response body from SMSBulk, if available */
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
    this.name = "SMSBulkError";
    this.statusCode = options?.statusCode;
    this.code = options?.code;
    this.responseBody = options?.responseBody;
    Object.setPrototypeOf(this, SMSBulkError.prototype);
  }
}
