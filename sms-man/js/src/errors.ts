/**
 * Error thrown by the SMS-MAN client.
 */
export class SmsManError extends Error {
  /**
   * API error code string (e.g. wrong_token, no_numbers, BAD_KEY).
   */
  public readonly code?: string;

  /**
   * Raw response payload.
   */
  public readonly responseData?: unknown;

  public constructor(message: string, code?: string, responseData?: unknown) {
    super(message);
    this.name = 'SmsManError';
    this.code = code;
    this.responseData = responseData;
    Object.setPrototypeOf(this, SmsManError.prototype);
  }
}
