/**
 * Configuration options for the Chaojiying client.
 */
export interface ChaojiyingOptions {
  /**
   * Chaojiying username (defaults to process.env.CHAOJIYING_USER).
   */
  username?: string;
  /**
   * Chaojiying user password (defaults to process.env.CHAOJIYING_PASS).
   * Can be either plaintext or a 32-character lowercase hex MD5 hash.
   */
  password?: string;
  /**
   * Base URL for the Chaojiying API. Defaults to https://upload.chaojiying.net.
   */
  baseURL?: string;
  /**
   * HTTP request timeout in milliseconds. Defaults to 60000 (60 seconds).
   */
  timeoutMs?: number;
  /**
   * Custom User-Agent header string.
   */
  userAgent?: string;
}

/**
 * Result returned by the score/balance inquiry endpoint.
 */
export interface ScoreResult {
  /** Error code (0 indicates success) */
  err_no: number;
  /** Status description string (e.g. 'OK') */
  err_str: string;
  /** Remaining points / balance */
  tifen: number;
  /** Locked points */
  tifen_lock: number;
}

/**
 * Options for CAPTCHA recognition.
 */
export interface RecognizeOptions {
  /**
   * Optional custom debug string / instruction parameter (str_debug).
   */
  strDebug?: string;
}

/**
 * Result returned by the image recognition endpoint.
 */
export interface RecognizeResult {
  /** Error code (0 indicates success) */
  err_no: number;
  /** Status description string */
  err_str: string;
  /** Unique ID assigned to the processed image */
  pic_id: string;
  /** Recognized text or coordinate result */
  pic_str: string;
  /** Server MD5 verification string */
  md5?: string;
}

/**
 * Result returned by the error reporting endpoint.
 */
export interface ReportErrorResult {
  /** Error code (0 indicates success) */
  err_no: number;
  /** Status description string */
  err_str: string;
}
