/**
 * Error thrown when an API request to FixedFloat fails.
 */
export class FixedFloatError extends Error {
  /**
   * Numeric response code from FixedFloat API (0 indicates success).
   */
  readonly code: number;

  /**
   * Additional data or details returned by the API if present.
   */
  readonly data?: unknown;

  constructor(message: string, code: number = -1, data?: unknown) {
    super(message);
    this.name = "FixedFloatError";
    this.code = code;
    this.data = data;
    Object.setPrototypeOf(this, FixedFloatError.prototype);
  }
}
