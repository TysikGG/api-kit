/**
 * Error codes returned by the Cap.guru API, plus client-side codes.
 * API spellings are kept exactly as documented (including CAPCHA_NOT_READY
 * and the GeeTest typos published by the service).
 */
export const ERROR_CODE_DESCRIPTIONS: Record<string, string> = {
  ERROR_WRONG_USER_KEY: 'Invalid API key.',
  ERROR_KEY_DOES_NOT_EXIST: 'Invalid API key.',
  ERROR_ZERO_BALANCE: 'Balance is zero or negative. Top up the account.',
  ERROR_TOO_BIG_CAPTCHA_FILESIZE: 'The captcha image exceeds the maximum upload size.',
  ERROR_UPLOAD: 'The service failed to load the image.',
  ERROR_IMAGE_TYPE_NOT_SUPPORTED: 'The image type is not supported.',
  ERROR_CAPTCHA_UNSOLVABLE: 'The service could not solve the captcha.',
  ERROR_NO_SLOT_AVAILABLE: 'No free slots. Too many tasks are queued or the service is busy.',
  ERROR_PAGEURL: 'The page URL is invalid.',
  ERROR_GOOGLEKEY: 'The reCAPTCHA site key is invalid.',
  ERROR_RECAPTCHA_INVALID_DOMAIN: 'The reCAPTCHA page URL is invalid.',
  ERROR_RECAPTCHA_INVALID_SITEKEY: 'The reCAPTCHA site key is invalid.',
  ERROR_HKEY: 'The hCaptcha site key is invalid.',
  CAPCHA_NOT_READY: 'The solution is not ready yet. Poll again in a few seconds.',
  ERROR_NO_SUCH_CAPCHA_ID: 'Task ID was not found.',
  ERROR_WRONG_CAPTCHA_ID: 'Task ID was not found.',
  notpic: 'The object in the image was not found.',
  ERROR_GEETTEST_GT: 'GeeTest gt value is empty.',
  ERROR_GEETTEST_challenge: 'GeeTest challenge value is empty.',
  ERROR_CAPTCHA_BAD_GT_OR_CNANNEL: 'GeeTest gt or challenge is invalid.',
  ERROR_PROXY_CONNECTION_FAILED: 'The supplied proxy could not be used.',
  MISSING_API_KEY: 'API key is required.',
  PARSE_ERROR: 'The response could not be parsed.',
  INVALID_RESPONSE: 'The API returned an unexpected payload.',
  NETWORK_ERROR: 'The HTTP request failed.',
  HTTP_ERROR: 'The API returned an HTTP error.',
  TIMEOUT: 'Polling exceeded the configured timeout.',
  ABORTED: 'Polling was aborted.',
};

const ERROR_CLASS_NAMES: Record<string, string> = {
  ERROR_WRONG_USER_KEY: 'WrongUserKeyError',
  ERROR_KEY_DOES_NOT_EXIST: 'KeyDoesNotExistError',
  ERROR_ZERO_BALANCE: 'ZeroBalanceError',
  ERROR_TOO_BIG_CAPTCHA_FILESIZE: 'TooBigCaptchaError',
  ERROR_UPLOAD: 'UploadError',
  ERROR_IMAGE_TYPE_NOT_SUPPORTED: 'ImageTypeNotSupportedError',
  ERROR_CAPTCHA_UNSOLVABLE: 'CaptchaUnsolvableError',
  ERROR_NO_SLOT_AVAILABLE: 'NoSlotAvailableError',
  ERROR_PAGEURL: 'PageUrlError',
  ERROR_GOOGLEKEY: 'GoogleKeyError',
  ERROR_RECAPTCHA_INVALID_DOMAIN: 'RecaptchaInvalidDomainError',
  ERROR_RECAPTCHA_INVALID_SITEKEY: 'RecaptchaInvalidSitekeyError',
  ERROR_HKEY: 'HCaptchaKeyError',
  ERROR_NO_SUCH_CAPCHA_ID: 'NoSuchCaptchaIdError',
  ERROR_WRONG_CAPTCHA_ID: 'WrongCaptchaIdError',
  notpic: 'NotPicError',
  ERROR_GEETTEST_GT: 'GeeTestGtError',
  ERROR_GEETTEST_challenge: 'GeeTestChallengeError',
  ERROR_CAPTCHA_BAD_GT_OR_CNANNEL: 'GeeTestBadGtError',
  ERROR_PROXY_CONNECTION_FAILED: 'ProxyConnectionError',
  MISSING_API_KEY: 'MissingApiKeyError',
  PARSE_ERROR: 'ParseError',
  INVALID_RESPONSE: 'InvalidResponseError',
  NETWORK_ERROR: 'NetworkError',
  HTTP_ERROR: 'HttpError',
  TIMEOUT: 'TimeoutError',
  ABORTED: 'AbortedError',
};

/**
 * Error thrown by the CapGuru client.
 * API failures set `code` to the service error code.
 */
export class CapGuruError extends Error {
  public readonly code?: string;
  public readonly responseData?: unknown;
  public readonly description?: string;

  public constructor(message: string, code?: string, responseData?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.responseData = responseData;
    this.description = code ? ERROR_CODE_DESCRIPTIONS[code] : undefined;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function defineError(name: string): typeof CapGuruError {
  const Ctor = class extends CapGuruError {
    public constructor(message: string, code?: string, responseData?: unknown) {
      super(message, code, responseData);
      this.name = name;
    }
  };
  return Ctor;
}

export const WrongUserKeyError = defineError('WrongUserKeyError');
export const KeyDoesNotExistError = defineError('KeyDoesNotExistError');
export const ZeroBalanceError = defineError('ZeroBalanceError');
export const TooBigCaptchaError = defineError('TooBigCaptchaError');
export const UploadError = defineError('UploadError');
export const ImageTypeNotSupportedError = defineError('ImageTypeNotSupportedError');
export const CaptchaUnsolvableError = defineError('CaptchaUnsolvableError');
export const NoSlotAvailableError = defineError('NoSlotAvailableError');
export const PageUrlError = defineError('PageUrlError');
export const GoogleKeyError = defineError('GoogleKeyError');
export const RecaptchaInvalidDomainError = defineError('RecaptchaInvalidDomainError');
export const RecaptchaInvalidSitekeyError = defineError('RecaptchaInvalidSitekeyError');
export const HCaptchaKeyError = defineError('HCaptchaKeyError');
export const NoSuchCaptchaIdError = defineError('NoSuchCaptchaIdError');
export const WrongCaptchaIdError = defineError('WrongCaptchaIdError');
export const NotPicError = defineError('NotPicError');
export const GeeTestGtError = defineError('GeeTestGtError');
export const GeeTestChallengeError = defineError('GeeTestChallengeError');
export const GeeTestBadGtError = defineError('GeeTestBadGtError');
export const ProxyConnectionError = defineError('ProxyConnectionError');
export const MissingApiKeyError = defineError('MissingApiKeyError');
export const ParseError = defineError('ParseError');
export const InvalidResponseError = defineError('InvalidResponseError');
export const NetworkError = defineError('NetworkError');
export const HttpError = defineError('HttpError');
export const TimeoutError = defineError('TimeoutError');
export const AbortedError = defineError('AbortedError');

const CLASS_BY_NAME: Record<string, typeof CapGuruError> = {
  WrongUserKeyError,
  KeyDoesNotExistError,
  ZeroBalanceError,
  TooBigCaptchaError,
  UploadError,
  ImageTypeNotSupportedError,
  CaptchaUnsolvableError,
  NoSlotAvailableError,
  PageUrlError,
  GoogleKeyError,
  RecaptchaInvalidDomainError,
  RecaptchaInvalidSitekeyError,
  HCaptchaKeyError,
  NoSuchCaptchaIdError,
  WrongCaptchaIdError,
  NotPicError,
  GeeTestGtError,
  GeeTestChallengeError,
  GeeTestBadGtError,
  ProxyConnectionError,
  MissingApiKeyError,
  ParseError,
  InvalidResponseError,
  NetworkError,
  HttpError,
  TimeoutError,
  AbortedError,
};

/** Codes that are safe to retry (capacity and transport failures). */
export const RETRYABLE_ERROR_CODES = new Set(['NETWORK_ERROR', 'HTTP_ERROR', 'ERROR_NO_SLOT_AVAILABLE']);

export function createCapGuruError(
  message: string,
  code?: string,
  responseData?: unknown,
): CapGuruError {
  const className = code ? ERROR_CLASS_NAMES[code] : undefined;
  const Ctor = (className && CLASS_BY_NAME[className]) || CapGuruError;
  return new Ctor(message, code, responseData);
}

export function apiError(code: string, responseData?: unknown): CapGuruError {
  return createCapGuruError(`CapGuru error: ${code}`, code, responseData);
}
