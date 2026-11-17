import type { PublicApiErrorPayload } from "./types.js";

/**
 * Base error class for all Greedy SMS API errors.
 */
export class GreedySMSError extends Error {
  readonly code: number | string;
  readonly errorCode?: string;
  readonly reasonCode?: string;
  readonly retryAfterSeconds?: number;
  readonly fields?: Array<{ field: string; message: string }>;
  readonly details?: Record<string, unknown>;
  readonly rawResponse?: unknown;

  constructor(
    message: string,
    options?: {
      code?: number | string;
      errorCode?: string;
      reasonCode?: string;
      retryAfterSeconds?: number;
      fields?: Array<{ field: string; message: string }>;
      details?: Record<string, unknown>;
      rawResponse?: unknown;
    }
  ) {
    super(message);
    this.name = "GreedySMSError";
    this.code = options?.code ?? 500;
    this.errorCode = options?.errorCode;
    this.reasonCode = options?.reasonCode;
    this.retryAfterSeconds = options?.retryAfterSeconds;
    this.fields = options?.fields;
    this.details = options?.details;
    this.rawResponse = options?.rawResponse;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when API key is missing or invalid (HTTP 401).
 */
export class AuthenticationError extends GreedySMSError {
  constructor(message: string = "Unauthorized: missing or invalid API key", payload?: PublicApiErrorPayload) {
    super(message, {
      code: payload?.code ?? 401,
      errorCode: payload?.errorCode,
      reasonCode: payload?.reasonCode,
      rawResponse: payload,
    });
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Error thrown when access is forbidden for the API key (HTTP 403).
 */
export class ForbiddenError extends GreedySMSError {
  constructor(message: string = "Forbidden", payload?: PublicApiErrorPayload) {
    super(message, {
      code: payload?.code ?? 403,
      errorCode: payload?.errorCode,
      reasonCode: payload?.reasonCode,
      rawResponse: payload,
    });
    this.name = "ForbiddenError";
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Error thrown when a resource (e.g. order, activation) is not found (HTTP 404).
 */
export class NotFoundError extends GreedySMSError {
  constructor(message: string = "Resource not found", payload?: PublicApiErrorPayload) {
    super(message, {
      code: payload?.code ?? 404,
      errorCode: payload?.errorCode,
      reasonCode: payload?.reasonCode,
      rawResponse: payload,
    });
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Error thrown when an operation conflicts with current state (HTTP 409).
 */
export class ConflictError extends GreedySMSError {
  constructor(message: string = "Operation conflicts with current state", payload?: PublicApiErrorPayload) {
    super(message, {
      code: payload?.code ?? 409,
      errorCode: payload?.errorCode,
      reasonCode: payload?.reasonCode,
      rawResponse: payload,
    });
    this.name = "ConflictError";
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Error thrown when request validation fails (HTTP 422).
 */
export class ValidationError extends GreedySMSError {
  constructor(message: string = "Request validation failed", payload?: PublicApiErrorPayload) {
    super(message, {
      code: payload?.code ?? 422,
      errorCode: payload?.errorCode,
      reasonCode: payload?.reasonCode,
      fields: payload?.fields,
      details: payload?.details,
      rawResponse: payload,
    });
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error thrown when request rate limit is exceeded (HTTP 429).
 */
export class RateLimitError extends GreedySMSError {
  constructor(message: string = "Request rate limit exceeded", payload?: PublicApiErrorPayload) {
    super(message, {
      code: payload?.code ?? 429,
      errorCode: payload?.errorCode ?? "RATE_LIMIT_EXCEEDED",
      reasonCode: payload?.reasonCode,
      retryAfterSeconds: payload?.retryAfterSeconds,
      details: payload?.details,
      rawResponse: payload,
    });
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Error thrown on internal server or upstream service error (HTTP 500/503).
 */
export class ServerError extends GreedySMSError {
  constructor(message: string = "Server error", payload?: PublicApiErrorPayload) {
    super(message, {
      code: payload?.code ?? 500,
      errorCode: payload?.errorCode,
      reasonCode: payload?.reasonCode,
      rawResponse: payload,
    });
    this.name = "ServerError";
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

/**
 * Check if payload matches PublicApiError structure.
 */
export function isPublicApiError(data: unknown): data is PublicApiErrorPayload {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as PublicApiErrorPayload).status === "error" &&
    "message" in (data as PublicApiErrorPayload)
  );
}

/**
 * Creates a strongly typed GreedySMSError from HTTP status and response payload.
 */
export function createGreedySMSError(status: number, data: unknown): GreedySMSError {
  if (isPublicApiError(data)) {
    const msg = data.message || `API error [${data.code}]`;
    switch (status) {
      case 401:
        return new AuthenticationError(msg, data);
      case 403:
        return new ForbiddenError(msg, data);
      case 404:
        return new NotFoundError(msg, data);
      case 409:
        return new ConflictError(msg, data);
      case 422:
        return new ValidationError(msg, data);
      case 429:
        return new RateLimitError(msg, data);
      case 500:
      case 503:
        return new ServerError(msg, data);
      default:
        return new GreedySMSError(msg, {
          code: data.code ?? status,
          errorCode: data.errorCode,
          reasonCode: data.reasonCode,
          retryAfterSeconds: data.retryAfterSeconds,
          fields: data.fields,
          details: data.details,
          rawResponse: data,
        });
    }
  }

  // Fallback for non-JSON or other error bodies
  const fallbackMsg = typeof data === "string" ? data : `HTTP ${status}`;
  if (status === 401 || fallbackMsg === "BAD_KEY" || fallbackMsg === "NO_KEY") {
    return new AuthenticationError(fallbackMsg);
  }
  return new GreedySMSError(fallbackMsg, { code: status, rawResponse: data });
}
