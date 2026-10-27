/**
 * Error thrown by the XMLStock client when an API or HTTP error occurs.
 */
export class XmlStockError extends Error {
  /**
   * API error code or identifier, if available.
   */
  public readonly code?: string | number;

  /**
   * HTTP status code, if applicable.
   */
  public readonly status?: number;

  /**
   * Raw response data from the API.
   */
  public readonly responseData?: unknown;

  constructor(message: string, code?: string | number, status?: number, responseData?: unknown) {
    super(message);
    this.name = 'XmlStockError';
    this.code = code;
    this.status = status;
    this.responseData = responseData;
    Object.setPrototypeOf(this, XmlStockError.prototype);
  }
}
