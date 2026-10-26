/**
 * Options for configuring SmsMan client.
 */
export interface SmsManOptions {
  /**
   * SMS-MAN API token.
   */
  token: string;

  /**
   * Base URL for requests (defaults to https://api.sms-man.com).
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds (defaults to 30000).
   */
  timeout?: number;
}

/**
 * Result of ordering a virtual phone number.
 */
export interface PhoneNumberOrder {
  requestId: number;
  number: string;
}

/**
 * SMS verification code result.
 */
export interface SmsCodeResult {
  smsCode?: string;
  error?: string;
}

/**
 * Handler status response.
 */
export interface HandlerStatusResult {
  status: string;
  code?: string;
}
