/**
 * Base error class for all errors originating from the Steel Proxy API.
 */
export class SteelProxyError extends Error {
  /** HTTP status code returned by the server */
  public readonly statusCode?: number;
  /** Response status code in envelope */
  public readonly apiStatus?: number;
  /** Full response body from the server */
  public readonly responseBody?: unknown;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      apiStatus?: number;
      responseBody?: unknown;
    }
  ) {
    super(message);
    this.name = "SteelProxyError";
    this.statusCode = options?.statusCode;
    this.apiStatus = options?.apiStatus;
    this.responseBody = options?.responseBody;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 401 Unauthorized: API key missing or invalid */
export class SteelProxyUnauthorizedError extends SteelProxyError {
  constructor(message = "API key missing or invalid", options?: { statusCode?: number; responseBody?: unknown }) {
    super(message, { statusCode: 401, apiStatus: 401, ...options });
    this.name = "SteelProxyUnauthorizedError";
  }
}

/** 402 Payment Required: Insufficient funds on reseller balance */
export class SteelProxyPaymentRequiredError extends SteelProxyError {
  constructor(message = "Insufficient funds on balance", options?: { statusCode?: number; responseBody?: unknown }) {
    super(message, { statusCode: 402, apiStatus: 402, ...options });
    this.name = "SteelProxyPaymentRequiredError";
  }
}

/** 403 Forbidden: Account blocked by administrator */
export class SteelProxyForbiddenError extends SteelProxyError {
  constructor(message = "Account blocked by administrator", options?: { statusCode?: number; responseBody?: unknown }) {
    super(message, { statusCode: 403, apiStatus: 403, ...options });
    this.name = "SteelProxyForbiddenError";
  }
}

/** 404 Not Found: Order, tariff, or location not found */
export class SteelProxyNotFoundError extends SteelProxyError {
  constructor(message = "Resource not found", options?: { statusCode?: number; responseBody?: unknown }) {
    super(message, { statusCode: 404, apiStatus: 404, ...options });
    this.name = "SteelProxyNotFoundError";
  }
}

/** 409 Conflict: Out of stock / no available proxies at the selected location */
export class SteelProxyConflictError extends SteelProxyError {
  constructor(message = "No available proxies at selected location", options?: { statusCode?: number; responseBody?: unknown }) {
    super(message, { statusCode: 409, apiStatus: 409, ...options });
    this.name = "SteelProxyConflictError";
  }
}

/** 422 Validation Error: Invalid request parameters */
export class SteelProxyValidationError extends SteelProxyError {
  constructor(message = "Validation error", options?: { statusCode?: number; responseBody?: unknown }) {
    super(message, { statusCode: 422, apiStatus: 422, ...options });
    this.name = "SteelProxyValidationError";
  }
}

/** 502 Bad Gateway: Failure provisioning proxy on node */
export class SteelProxyBadGatewayError extends SteelProxyError {
  constructor(message = "Failure provisioning proxy on node", options?: { statusCode?: number; responseBody?: unknown }) {
    super(message, { statusCode: 502, apiStatus: 502, ...options });
    this.name = "SteelProxyBadGatewayError";
  }
}

/**
 * Creates the appropriate SteelProxyError instance from an HTTP status and payload.
 */
export function createSteelProxyError(
  status?: number,
  data?: unknown,
  fallbackMessage = "Steel Proxy API error"
): SteelProxyError {
  let message = fallbackMessage;
  let apiStatus: number | undefined;

  if (typeof data === "string" && data.trim()) {
    message = data.trim();
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.message === "string" && obj.message.trim()) {
      message = obj.message.trim();
    } else if (typeof obj.detail === "string" && obj.detail.trim()) {
      message = obj.detail.trim();
    } else if (Array.isArray(obj.detail)) {
      message = obj.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join("; ");
    }
    if (typeof obj.status === "number") {
      apiStatus = obj.status;
    }
  }

  const effectiveStatus = status || apiStatus;
  const options = { statusCode: status, apiStatus, responseBody: data };

  switch (effectiveStatus) {
    case 401:
      return new SteelProxyUnauthorizedError(message, options);
    case 402:
      return new SteelProxyPaymentRequiredError(message, options);
    case 403:
      return new SteelProxyForbiddenError(message, options);
    case 404:
      return new SteelProxyNotFoundError(message, options);
    case 409:
      return new SteelProxyConflictError(message, options);
    case 422:
      return new SteelProxyValidationError(message, options);
    case 502:
      return new SteelProxyBadGatewayError(message, options);
    default:
      return new SteelProxyError(message, options);
  }
}
