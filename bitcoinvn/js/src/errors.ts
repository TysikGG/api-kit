import type { Order } from "./types.js";

/**
 * Error for an HTTP error envelope from BitcoinVN, or a transport failure.
 *
 * API responses with status 4xx or 5xx use `{ error: { message, code, details? } }`.
 * `code` equals the HTTP status. `retryAfter`, `limit`, and `remaining` come from
 * the `X-RateLimit-*` headers when those headers are present. A transport failure
 * uses `status` 0 and `code` 0.
 *
 * Subclasses identify the common status codes. `instanceof BitcoinVnError` still
 * matches every subclass.
 */
export class BitcoinVnError extends Error {
  readonly status: number;
  readonly code: number;
  readonly details?: unknown;
  readonly raw: unknown;
  readonly retryAfter?: number;
  readonly limit?: number;
  readonly remaining?: number;

  /**
   * @param message Human-readable error text from `error.message`, or a transport message.
   * @param options HTTP status, API code, raw body, optional validation details, and rate-limit fields.
   */
  constructor(
    message: string,
    options: {
      status: number;
      code: number;
      raw?: unknown;
      details?: unknown;
      retryAfter?: number;
      limit?: number;
      remaining?: number;
    },
  ) {
    super(message);
    this.name = new.target.name;
    this.status = options.status;
    this.code = options.code;
    this.raw = options.raw === undefined ? message : options.raw;
    if (options.details !== undefined) this.details = options.details;
    if (options.retryAfter !== undefined) this.retryAfter = options.retryAfter;
    if (options.limit !== undefined) this.limit = options.limit;
    if (options.remaining !== undefined) this.remaining = options.remaining;
  }
}

/** The request did not receive an HTTP response. `status` and `code` are 0. */
export class BitcoinVnTransportError extends BitcoinVnError {}

/** `waitForOrder` reached its deadline before the order entered a requested status. */
export class BitcoinVnTimeoutError extends BitcoinVnError {
  readonly order?: Order;

  constructor(message: string, order?: Order) {
    super(message, { status: 0, code: 0, raw: order ?? message });
    if (order !== undefined) this.order = order;
  }
}

/** HTTP 400. The body, query, or payout details were rejected. */
export class BitcoinVnBadRequestError extends BitcoinVnError {}

/** HTTP 401. The key is missing, disabled, suspended, or outside its IP allowlist. */
export class BitcoinVnUnauthorizedError extends BitcoinVnError {}

/** HTTP 403. The key is read-only, or it does not own the order. */
export class BitcoinVnForbiddenError extends BitcoinVnError {}

/** HTTP 404. The order, asset, pair, or certificate was not found. */
export class BitcoinVnNotFoundError extends BitcoinVnError {}

/** HTTP 409. The order state does not allow this action. */
export class BitcoinVnConflictError extends BitcoinVnError {}

/** HTTP 422. The address or ENS name could not be resolved. */
export class BitcoinVnUnprocessableEntityError extends BitcoinVnError {}

/** HTTP 429. The client IP exceeded the endpoint budget. */
export class BitcoinVnRateLimitError extends BitcoinVnError {}

/** HTTP 503. The API is in maintenance, or order guarantee issuance failed. */
export class BitcoinVnMaintenanceError extends BitcoinVnError {}

/** Any other HTTP 5xx response. */
export class BitcoinVnServerError extends BitcoinVnError {}

const ERROR_TYPES: Record<number, new (...args: ConstructorParameters<typeof BitcoinVnError>) => BitcoinVnError> =
  {
    400: BitcoinVnBadRequestError,
    401: BitcoinVnUnauthorizedError,
    403: BitcoinVnForbiddenError,
    404: BitcoinVnNotFoundError,
    409: BitcoinVnConflictError,
    422: BitcoinVnUnprocessableEntityError,
    429: BitcoinVnRateLimitError,
    503: BitcoinVnMaintenanceError,
  };

export function errorClassForStatus(
  status: number,
): new (...args: ConstructorParameters<typeof BitcoinVnError>) => BitcoinVnError {
  const mapped = ERROR_TYPES[status];
  if (mapped) return mapped;
  if (status >= 500) return BitcoinVnServerError;
  if (status === 0) return BitcoinVnTransportError;
  return BitcoinVnError;
}

export function parseRetryAfter(headers: unknown): number | undefined {
  return headerNumber(headers, "x-ratelimit-retry-after");
}

export function headerNumber(headers: unknown, name: string): number | undefined {
  const raw = headerValue(headers, name);
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) return undefined;
  return Math.trunc(value);
}

export function headerValue(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const bag = headers as { get?: (header: string) => unknown } & Record<string, unknown>;
  if (typeof bag.get === "function") {
    const fromGetter = scalarHeader(bag.get(name));
    if (fromGetter) return fromGetter;
  }
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(bag)) {
    if (key.toLowerCase() !== target) continue;
    const fromEntry = scalarHeader(value);
    if (fromEntry) return fromEntry;
  }
  return undefined;
}

function scalarHeader(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = scalarHeader(item);
      if (parsed) return parsed;
    }
  }
  return undefined;
}

export function errorFromBody(
  status: number,
  data: unknown,
  retryAfterOrHeaders?: number | object | null,
): BitcoinVnError {
  let retryAfter: number | undefined;
  let limit: number | undefined;
  let remaining: number | undefined;
  if (typeof retryAfterOrHeaders === "number" && Number.isFinite(retryAfterOrHeaders)) {
    retryAfter = Math.trunc(retryAfterOrHeaders);
  } else if (retryAfterOrHeaders && typeof retryAfterOrHeaders === "object") {
    retryAfter = parseRetryAfter(retryAfterOrHeaders);
    limit = headerNumber(retryAfterOrHeaders, "x-ratelimit-limit");
    remaining = headerNumber(retryAfterOrHeaders, "x-ratelimit-remaining");
  }
  const payload = unwrapPayload(data);
  const error =
    payload && typeof payload === "object"
      ? (payload as { error?: unknown }).error
      : undefined;
  const Ctor = errorClassForStatus(status);
  if (error && typeof error === "object") {
    const body = error as { message?: unknown; code?: unknown; details?: unknown };
    const message =
      typeof body.message === "string" && body.message.trim()
        ? body.message
        : `HTTP ${status}`;
    const code = typeof body.code === "number" ? body.code : status;
    return new Ctor(message, {
      status,
      code,
      raw: payload,
      details: body.details,
      retryAfter,
      limit,
      remaining,
    });
  }
  const message = typeof data === "string" && data.trim() ? data.trim() : `HTTP ${status}`;
  return new Ctor(message, { status, code: status, raw: data, retryAfter, limit, remaining });
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
