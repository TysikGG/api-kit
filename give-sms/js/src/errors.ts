/**
 * Custom error thrown by the Give-SMS API client.
 */
export class GiveSmsError extends Error {
  /**
   * HTTP status code or API error code.
   */
  public readonly code?: string | number;

  /**
   * Raw response data if available.
   */
  public readonly responseData?: unknown;

  public constructor(message: string, code?: string | number, responseData?: unknown) {
    super(message);
    this.name = 'GiveSmsError';
    this.code = code;
    this.responseData = responseData;
    Object.setPrototypeOf(this, GiveSmsError.prototype);
  }
}
