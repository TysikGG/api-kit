/**
 * Error for an HTTP error envelope from BitcoinVN, or a transport failure.
 *
 * API responses with status 4xx or 5xx use `{ error: { message, code, details? } }`.
 * `code` equals the HTTP status. `retryAfter` is set from `X-RateLimit-Retry-After`
 * when that header is present. A transport failure uses `status` 0 and `code` 0.
 *
 * @example
 * ```ts
 * try {
 *   await client.getTicker("BTC", "USDT");
 * } catch (error) {
 *   if (error instanceof BitcoinVnError && error.code === 404) {
 *     // asset id is unknown or private
 *   }
 * }
 * ```
 */
export class BitcoinVnError extends Error {
  readonly status: number;
  readonly code: number;
  readonly details?: unknown;
  readonly raw: unknown;
  readonly retryAfter?: number;

  /**
   * @param message Human-readable error text from `error.message`, or a transport message.
   * @param options HTTP status, API code, raw body, optional validation details, and retry delay.
   *
   * @example
   * ```ts
   * throw new BitcoinVnError("Pair does not exist.", { status: 404, code: 404 });
   * ```
   */
  constructor(
    message: string,
    options: {
      status: number;
      code: number;
      raw?: unknown;
      details?: unknown;
      retryAfter?: number;
    },
  ) {
    super(message);
    this.name = "BitcoinVnError";
    this.status = options.status;
    this.code = options.code;
    this.raw = options.raw === undefined ? message : options.raw;
    if (options.details !== undefined) this.details = options.details;
    if (options.retryAfter !== undefined) this.retryAfter = options.retryAfter;
  }
}

export function parseRetryAfter(headers: unknown): number | undefined {
  const raw = headerValue(headers, "x-ratelimit-retry-after");
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) return undefined;
  return value;
}

export function headerValue(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const bag = headers as { get?: (header: string) => unknown } & Record<string, unknown>;
  if (typeof bag.get === "function") {
    const value = bag.get(name);
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(bag)) {
    if (key.toLowerCase() !== target) continue;
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

export function errorFromBody(
  status: number,
  data: unknown,
  retryAfter?: number,
): BitcoinVnError {
  const payload = unwrapPayload(data);
  const error =
    payload && typeof payload === "object"
      ? (payload as { error?: unknown }).error
      : undefined;
  if (error && typeof error === "object") {
    const body = error as { message?: unknown; code?: unknown; details?: unknown };
    const message =
      typeof body.message === "string" && body.message.trim()
        ? body.message
        : `HTTP ${status}`;
    const code = typeof body.code === "number" ? body.code : status;
    return new BitcoinVnError(message, {
      status,
      code,
      raw: payload,
      details: body.details,
      retryAfter,
    });
  }
  const message = typeof data === "string" && data.trim() ? data.trim() : `HTTP ${status}`;
  return new BitcoinVnError(message, { status, code: status, raw: data, retryAfter });
}

function unwrapPayload(data: unknown): unknown {
  if (typeof data !== "string") return data;
  const text = data.trim();
  if (!text) return data;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return data;
  }
}
