/**
 * Error thrown by the OnlineSIM API client.
 */
export class OnlineSimError extends Error {
  /**
   * API error response string or code (e.g. ERROR_WRONG_KEY, NO_NUMBER).
   */
  public readonly code?: string;

  /**
   * Raw response payload.
   */
  public readonly responseData?: unknown;

  public constructor(message: string, code?: string, responseData?: unknown) {
    super(message);
    this.name = 'OnlineSimError';
    this.code = code;
    this.responseData = responseData;
    Object.setPrototypeOf(this, OnlineSimError.prototype);
  }
}
