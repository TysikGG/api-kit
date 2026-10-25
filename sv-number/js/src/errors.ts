const KNOWN_ERROR_CODES = new Set([
  "BAD_KEY",
  "BAD_ACTION",
  "BAD_SERVICE",
  "BAD_STATUS",
  "NO_NUMBERS",
  "NO_BALANCE",
  "WRONG_ACTIVATION_ID",
  "STATUS_CANCEL",
  "ERROR_SQL",
]);

/**
 * Error thrown by the SV Number client.
 */
export class SvNumberError extends Error {
  readonly code: string;
  readonly raw: unknown;

  constructor(code: string, raw: unknown = code) {
    super(typeof raw === "string" && raw.trim() ? raw.trim() : code);
    this.name = "SvNumberError";
    this.code = code;
    this.raw = raw;
  }
}

export function assertNotApiError(data: unknown): void {
  if (typeof data !== "string") return;

  const text = data.trim();
  if (!text) {
    throw new SvNumberError("EMPTY_RESPONSE", data);
  }

  const code = text.split(":")[0]?.trim() ?? text;
  if (text.startsWith("ACCESS_") || text.startsWith("STATUS_")) return;
  if (KNOWN_ERROR_CODES.has(text) || KNOWN_ERROR_CODES.has(code)) {
    throw new SvNumberError(KNOWN_ERROR_CODES.has(text) ? text : code, text);
  }
}
