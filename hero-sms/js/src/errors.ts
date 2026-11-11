import type { ApiErrorCode, BaseErrorResponse } from "./types.js";

/**
 * Base error class for HeroSMS API errors.
 */
export class HeroSMSError extends Error {
  readonly code: ApiErrorCode | string;
  readonly rawResponse: string;

  constructor(code: ApiErrorCode | string, message: string, rawResponse: string = "") {
    super(message);
    this.name = "HeroSMSError";
    this.code = code;
    this.rawResponse = rawResponse;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when no numbers are available.
 */
export class NoNumbersError extends HeroSMSError {
  constructor(rawResponse: string = "NO_NUMBERS") {
    super("NO_NUMBERS", "No numbers available for the requested service and country", rawResponse);
    this.name = "NoNumbersError";
    Object.setPrototypeOf(this, NoNumbersError.prototype);
  }
}

/**
 * Error thrown when API key is invalid or missing.
 */
export class AuthenticationError extends HeroSMSError {
  constructor(code: "BAD_KEY" | "NO_KEY", rawResponse: string = code) {
    super(code, code === "NO_KEY" ? "API key is missing" : "Invalid API key", rawResponse);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Error thrown when activation is not found.
 */
export class ActivationNotFoundError extends HeroSMSError {
  constructor(rawResponse: string = "NO_ACTIVATION") {
    super("NO_ACTIVATION", "Activation not found", rawResponse);
    this.name = "ActivationNotFoundError";
    Object.setPrototypeOf(this, ActivationNotFoundError.prototype);
  }
}

/**
 * Error thrown when trying to cancel too early.
 */
export class EarlyCancelError extends HeroSMSError {
  constructor(rawResponse: string = "EARLY_CANCEL_DENIED") {
    super("EARLY_CANCEL_DENIED", "Cannot cancel activation within the first 2 minutes", rawResponse);
    this.name = "EarlyCancelError";
    Object.setPrototypeOf(this, EarlyCancelError.prototype);
  }
}

/**
 * Error thrown when max price is too low.
 */
export class WrongMaxPriceError extends HeroSMSError {
  readonly minimumPrice: number;

  constructor(rawResponse: string, minimumPrice: number) {
    super("WRONG_MAX_PRICE", `Maximum price is too low. Minimum price: ${minimumPrice}`, rawResponse);
    this.name = "WrongMaxPriceError";
    this.minimumPrice = minimumPrice;
    Object.setPrototypeOf(this, WrongMaxPriceError.prototype);
  }
}

/**
 * Error thrown when account is banned.
 */
export class BannedError extends HeroSMSError {
  readonly bannedUntil: string;

  constructor(rawResponse: string, bannedUntil: string) {
    super("BANNED", `Account is banned until ${bannedUntil}`, rawResponse);
    this.name = "BannedError";
    this.bannedUntil = bannedUntil;
    Object.setPrototypeOf(this, BannedError.prototype);
  }
}

/**
 * Error thrown when account is inactive.
 */
export class AccountInactiveError extends HeroSMSError {
  constructor(rawResponse: string = "ACCOUNT_INACTIVE") {
    super("ACCOUNT_INACTIVE", "Account is inactive. Please activate your account.", rawResponse);
    this.name = "AccountInactiveError";
    Object.setPrototypeOf(this, AccountInactiveError.prototype);
  }
}

/**
 * Error thrown when channels limit is reached.
 */
export class ChannelsLimitError extends HeroSMSError {
  readonly currentThreads?: number;
  readonly maxAllowed?: number;

  constructor(rawResponse: string = "CHANNELS_LIMIT", info?: { current_threads?: number; max_allowed?: number }) {
    super("CHANNELS_LIMIT", "Account channels limit reached", rawResponse);
    this.name = "ChannelsLimitError";
    this.currentThreads = info?.current_threads;
    this.maxAllowed = info?.max_allowed;
    Object.setPrototypeOf(this, ChannelsLimitError.prototype);
  }
}

/**
 * Error thrown when account has insufficient balance.
 */
export class NoBalanceError extends HeroSMSError {
  constructor(rawResponse: string = "NO_BALANCE") {
    super("NO_BALANCE", "Insufficient account balance", rawResponse);
    this.name = "NoBalanceError";
    Object.setPrototypeOf(this, NoBalanceError.prototype);
  }
}

/**
 * Error thrown when a structured JSON error response is returned.
 */
export class ApiJsonError extends HeroSMSError {
  readonly details: string;
  readonly info?: Record<string, unknown>;

  constructor(errorResponse: BaseErrorResponse, rawResponse: string) {
    super(errorResponse.title, errorResponse.details, rawResponse);
    this.name = "ApiJsonError";
    this.details = errorResponse.details;
    this.info = errorResponse.info;
    Object.setPrototypeOf(this, ApiJsonError.prototype);
  }
}

/**
 * Check if a response is a structured JSON error.
 */
export function isJsonErrorResponse(data: unknown): data is BaseErrorResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "title" in data &&
    "details" in data &&
    typeof (data as Record<string, unknown>).title === "string" &&
    typeof (data as Record<string, unknown>).details === "string"
  );
}

/**
 * Map of error codes to their descriptions.
 */
export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  BAD_ACTION: "Incorrect action specified",
  BAD_KEY: "Incorrect API key",
  NO_KEY: "API key is missing",
  ERROR_SQL: "Server database error",
  BAD_SERVICE: "Incorrect service specified",
  BAD_STATUS: "Incorrect status specified",
  NO_NUMBERS: "No numbers available",
  NO_ACTIVATION: "Activation not found",
  WRONG_ACTIVATION_ID: "Invalid activation ID",
  WRONG_MAX_PRICE: "Maximum price is too low",
  EARLY_CANCEL_DENIED: "Cannot cancel within first 2 minutes",
  CHANNELS_LIMIT: "Account channels limit reached",
  OPERATORS_NOT_FOUND: "No operators found",
  ORDER_ALREADY_EXISTS: "Order already exists",
  NO_ACTIVATIONS: "No activations found",
  ACCOUNT_INACTIVE: "Account is inactive",
  SERVICE_NOT_AVAILABLE: "Service is not available",
  SIM_OFFLINE: "SIM card is offline",
  NO_BALANCE: "Insufficient balance",
  UNPROCESSABLE_ENTITY: "Validation failed",
  FREE_CANCELLATION_EXPIRED: "Free cancellation period expired",
  OTP_RECEIVED: "OTP already received",
  NEW_OTP_RECEIVED: "New OTP received",
  ACTIVATION_NOT_ACTIVE: "Activation is not active",
  FINISHED: "Activation already finished",
  REFUNDED: "Activation was refunded",
  CANCELED: "Activation was canceled",
  BAD_DURATION: "Invalid rental duration",
  WRONG_COUNTRY: "Invalid country specified",
  WRONG_SERVICE: "Invalid service specified",
  WRONG_CURRENCY: "Invalid currency specified",
  NOT_FOUND: "Resource not found",
  SERVER_ERROR: "Internal server error",
  BANNED: "Account is banned",
};
