const KNOWN_ERROR_CODES = new Set([
  "BAD_KEY",
  "BAD_ACTION",
  "BAD_SERVICE",
  "BAD_STATUS",
  "BAD_COUNTRY",
  "NO_BALANCE",
  "NO_NUMBERS",
  "NO_ACTIVATION",
  "NO_KEY",
  "ERROR_SQL",
  "SERVICE_UNAVAILABLE_REGION",
  "WRONG_MAX_PRICE",
]);

/**
 * Error thrown for API status strings, HTTP failures, and client-side checks.
 *
 * @example
 * ```ts
 * try {
 *   await sms.getNumber({ service: "tg" });
 * } catch (error) {
 *   if (error instanceof GrizzlySmsError && error.code === "NO_NUMBERS") {
 *     // choose another country
 *   }
 * }
 * ```
 */
export class GrizzlySmsError extends Error {
  readonly code: string;
  readonly raw: unknown;

  /**
   * @param code Stable error code, for example `NO_NUMBERS` or `BAD_KEY`.
   * @param raw Original response body. The message is `raw` when it is a non-empty string.
   *
   * @example
   * ```ts
   * throw new GrizzlySmsError("NO_NUMBERS", "NO_NUMBERS");
   * ```
   */
  constructor(code: string, raw: unknown = code) {
    super(typeof raw === "string" && raw.trim() ? raw.trim() : code);
    this.name = "GrizzlySmsError";
    this.code = code;
    this.raw = raw;
  }
}

export function assertNotApiError(data: unknown): void {
  if (typeof data !== "string") return;

  const text = data.trim();
  if (!text) {
    throw new GrizzlySmsError("EMPTY_RESPONSE", data);
  }

  if (/prohibited for sale/i.test(text)) {
    throw new GrizzlySmsError("SERVICE_PROHIBITED", text);
  }

  const code = text.split(":")[0]?.trim() ?? text;
  if (text.startsWith("ACCESS_") || text.startsWith("STATUS_")) return;
  if (KNOWN_ERROR_CODES.has(text) || KNOWN_ERROR_CODES.has(code)) {
    throw new GrizzlySmsError(KNOWN_ERROR_CODES.has(text) ? text : code, text);
  }
}
