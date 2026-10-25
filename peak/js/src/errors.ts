/**
 * Error thrown by the Peak client when an API or HTTP error occurs.
 *
 * @example
 * ```ts
 * try {
 *   await client.solveTurnstile({ ... });
 * } catch (err) {
 *   if (err instanceof PeakError) {
 *     console.error(`Peak error [${err.status}]: ${err.message}`);
 *   }
 * }
 * ```
 */
export class PeakError extends Error {
  /** HTTP status code or 0 for network/client error. */
  readonly status: number;

  /** Raw response data returned by the server, if available. */
  readonly data?: unknown;

  constructor(message: string, status: number = 0, data?: unknown) {
    super(message);
    this.name = "PeakError";
    this.status = status;
    this.data = data;
  }
}
