/**
 * Base error class for all errors originating from the NotLetters API.
 */
export class NotLettersError extends Error {
  /** HTTP status code returned by NotLetters */
  public readonly statusCode?: number;
  /** Error code or name when present */
  public readonly code?: string;
  /** Full response body from NotLetters */
  public readonly responseBody?: unknown;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      code?: string;
      responseBody?: unknown;
    }
  ) {
    super(message);
    this.name = "NotLettersError";
    this.statusCode = options?.statusCode;
    this.code = options?.code;
    this.responseBody = options?.responseBody;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 400 Bad Request error */
export class NotLettersBadRequestError extends NotLettersError {
  constructor(message: string, options?: { code?: string; responseBody?: unknown }) {
    super(message, { statusCode: 400, ...options });
    this.name = "NotLettersBadRequestError";
  }
}

/** 401 Unauthorized error */
export class NotLettersUnauthorizedError extends NotLettersError {
  constructor(message: string, options?: { code?: string; responseBody?: unknown }) {
    super(message, { statusCode: 401, ...options });
    this.name = "NotLettersUnauthorizedError";
  }
}

/** 402 Payment Required error */
export class NotLettersPaymentRequiredError extends NotLettersError {
  constructor(message: string, options?: { code?: string; responseBody?: unknown }) {
    super(message, { statusCode: 402, ...options });
    this.name = "NotLettersPaymentRequiredError";
  }
}

/** 403 Forbidden error */
export class NotLettersForbiddenError extends NotLettersError {
  constructor(message: string, options?: { code?: string; responseBody?: unknown }) {
    super(message, { statusCode: 403, ...options });
    this.name = "NotLettersForbiddenError";
  }
}

/** 404 Not Found error */
export class NotLettersNotFoundError extends NotLettersError {
  constructor(message: string, options?: { code?: string; responseBody?: unknown }) {
    super(message, { statusCode: 404, ...options });
    this.name = "NotLettersNotFoundError";
  }
}

/** 500 Internal Server Error */
export class NotLettersInternalServerError extends NotLettersError {
  constructor(message: string, options?: { code?: string; responseBody?: unknown }) {
    super(message, { statusCode: 500, ...options });
    this.name = "NotLettersInternalServerError";
  }
}

/**
 * Creates the appropriate NotLettersError instance from an HTTP status and payload.
 */
export function createNotLettersError(
  status?: number,
  data?: unknown,
  fallbackMessage = "NotLetters API error"
): NotLettersError {
  let message = fallbackMessage;
  let code: string | undefined;

  if (typeof data === "string" && data.trim()) {
    message = data.trim();
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const rawMsg = obj.error || obj.message || obj.detail;
    if (typeof rawMsg === "string" && rawMsg.trim()) {
      message = rawMsg.trim();
    } else if (rawMsg !== undefined && rawMsg !== null) {
      message = String(rawMsg);
    }
    if (obj.code !== undefined && obj.code !== null) {
      code = String(obj.code);
    } else if (typeof obj.error === "string") {
      code = obj.error;
    }
  }

  const options = { statusCode: status, code, responseBody: data };

  switch (status) {
    case 400:
      return new NotLettersBadRequestError(message, options);
    case 401:
      return new NotLettersUnauthorizedError(message, options);
    case 402:
      return new NotLettersPaymentRequiredError(message, options);
    case 403:
      return new NotLettersForbiddenError(message, options);
    case 404:
      return new NotLettersNotFoundError(message, options);
    case 500:
      return new NotLettersInternalServerError(message, options);
    default:
      return new NotLettersError(message, options);
  }
}
