/**
 * Error thrown when a SideShift API request fails.
 */
export class SideShiftError extends Error {
  /**
   * SideShift error code (e.g. BAD_USER_INPUT, NOT_FOUND).
   */
  public readonly code?: string;

  /**
   * HTTP status code.
   */
  public readonly status?: number;

  /**
   * Raw response payload.
   */
  public readonly responseData?: unknown;

  public constructor(message: string, code?: string, status?: number, responseData?: unknown) {
    super(message);
    this.name = 'SideShiftError';
    this.code = code;
    this.status = status;
    this.responseData = responseData;
    Object.setPrototypeOf(this, SideShiftError.prototype);
  }
}
