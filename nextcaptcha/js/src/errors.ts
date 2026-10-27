/**
 * Documented NextCaptcha error codes.
 *
 * @see https://nextcaptcha.com/apidocs/error-codes
 */
export const NEXTCAPTCHA_ERRORS: Record<string, string> = {
  ERROR_KEY_DOES_NOT_EXIST:
    "Your API key is incorrect. Copy it from the client or developer area in the control panel",
  ERROR_ZERO_BALANCE: "Your account balance is zero",
  ERROR_IP_NOT_ALLOWED:
    "The request was made from an IP address that is not in your trusted IP list",
  ERROR_CAPTCHA_UNSOLVABLE:
    "The captcha could not be solved, often because of a proxy or network failure. You can try again",
  ERROR_NO_SUCH_METHOD: "A method that does not exist in the API was requested",
  ERROR_IMAGE_TYPE_NOT_SUPPORTED:
    "The image cannot be processed because the format or size is incorrect, or the image is corrupted",
  ERROR_NO_SUCH_CAPCHA_ID: "The captcha id you provided is incorrect",
  ERROR_IP_BLOCKED: "Your IP address has been banned due to inappropriate use of the API",
  ERROR_TASK_ABSENT: "The createTask request did not include a task object",
  ERROR_TASK_NOT_SUPPORTED:
    "The task type is not supported by the API, or the type field is incorrect",
  ERROR_RECAPTCHA_INVALID_SITEKEY: "The reCAPTCHA sitekey value you provided is invalid",
  ERROR_ACCOUNT_SUSPENDED: "Your account has been suspended due to improper use of the API",
  ERROR_BAD_PARAMETERS:
    "A required captcha parameter is missing, or the parameter format is incorrect for this task type",
  ERROR_BAD_PROXY: "The proxy parameters are incorrect or the proxy connection failed",
  ERROR_UNKNOWN: "Unknown error",
  TIMEOUT: "Polling timed out before the captcha was solved",
  MISSING_CLIENT_KEY: "Client key is required",
  ABORTED: "The operation was aborted",
};

/**
 * Error thrown by the NextCaptcha client.
 */
export class NextCaptchaError extends Error {
  /** Numeric error ID from the API (0 is success). */
  readonly errorId: number;

  /** Symbolic error code (e.g. `ERROR_KEY_DOES_NOT_EXIST`, `ERROR_ZERO_BALANCE`). */
  readonly errorCode?: string;

  /** HTTP status code or 0 for client/transport errors. */
  readonly httpStatus: number;

  /** Raw response body from the server. */
  readonly response?: unknown;

  constructor(
    message: string,
    errorId: number = 0,
    errorCode?: string,
    httpStatus: number = 0,
    response?: unknown,
  ) {
    super(message);
    this.name = "NextCaptchaError";
    this.errorId = errorId;
    this.errorCode = errorCode;
    this.httpStatus = httpStatus;
    this.response = response;
  }
}

/**
 * Prefer the API description, then the local catalog, then the raw code.
 */
export function describeNextCaptchaError(
  errorCode: string | undefined,
  errorDescription: string | undefined,
  errorId: number,
): string {
  if (errorDescription) return errorDescription;
  if (errorCode && NEXTCAPTCHA_ERRORS[errorCode]) return NEXTCAPTCHA_ERRORS[errorCode];
  if (errorCode) return errorCode;
  return `API error #${errorId}`;
}
