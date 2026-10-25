/**
 * Error thrown by the Chaojiying client when an API operation fails.
 */
export class ChaojiyingError extends Error {
  /** Numerical error code returned by Chaojiying (err_no), if available */
  public readonly errNo?: number;
  /** Chinese or descriptive error string returned by Chaojiying (err_str) */
  public readonly errStr?: string;
  /** Full response body from Chaojiying */
  public readonly responseBody?: unknown;

  constructor(
    message: string,
    options?: {
      errNo?: number;
      errStr?: string;
      responseBody?: unknown;
    }
  ) {
    super(message);
    this.name = "ChaojiyingError";
    this.errNo = options?.errNo;
    this.errStr = options?.errStr;
    this.responseBody = options?.responseBody;
    Object.setPrototypeOf(this, ChaojiyingError.prototype);
  }
}
