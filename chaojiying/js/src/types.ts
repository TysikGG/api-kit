/**
 * Configuration options for the Chaojiying client.
 */
export interface ProxyOptions {
  host: string;
  port: number;
  protocol?: string;
  auth?: {
    username: string;
    password: string;
  };
}

export interface ChaojiyingOptions {
  /**
   * Chaojiying username (defaults to process.env.CHAOJIYING_USER).
   */
  username?: string;
  /**
   * Chaojiying user password (defaults to process.env.CHAOJIYING_PASS).
   * Plain text is hashed to MD5. A 32-character hex string is sent as `pass2` unchanged.
   */
  password?: string;
  /**
   * Base URL for the paid Chaojiying API. Defaults to https://upload.chaojiying.net.
   */
  baseURL?: string;
  /**
   * HTTP request timeout in milliseconds. Defaults to 60000 (60 seconds).
   * The official endpoint can take the full minute when a human solves the image.
   */
  timeoutMs?: number;
  /**
   * Custom User-Agent header string.
   */
  userAgent?: string;
  /**
   * HTTP proxy. A URL such as `http://user:pass@host:port` or a host/port object.
   */
  proxy?: string | ProxyOptions;
  /**
   * Extra attempts after a retryable failure. Defaults to 2.
   * Paid recognize retries connection failures and err_no -429 only, so a lost
   * response is not submitted again after the server may already have billed it.
   */
  retries?: number;
  /**
   * Base delay between retries in milliseconds. Attempt n waits `n * retryDelayMs`.
   * Defaults to 200.
   */
  retryDelayMs?: number;
  /**
   * Software id sent as `softid`. Defaults to the built-in partner id.
   * Do not clear this if you want partner attribution to stay intact.
   */
  softId?: string;
  /**
   * Software KEY used only to verify the response `md5`.
   * Defaults to the partner key when `softId` is left at the default.
   */
  softKey?: string;
  /**
   * Optional access token sent as `access_token` (err_no -10012 when it is wrong).
   * Defaults to process.env.CHAOJIYING_ACCESS_TOKEN.
   */
  accessToken?: string;
  /**
   * API key for the free OCR v2 host (`?ak=`). Defaults to process.env.CHAOJIYING_API_KEY.
   */
  apiKey?: string;
  /**
   * Base URL for free OCR. Defaults to https://api.chaojiying.com.
   */
  freeBaseURL?: string;
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
   * Optional custom debug string (`str_debug`).
   * Use {@link clickInstruction} for codetype 9801 and {@link colorInstruction} for 6900.
   */
  strDebug?: string;
  /**
   * Minimum answer length (`len_min`). `0` disables the constraint.
   * Official language samples send this for variable-length types.
   */
  lenMin?: number;
  /**
   * Extra seconds the worker may spend (`time_add`). Sent only when set.
   */
  timeAdd?: number;
  /**
   * `base64` sends `file_base64` (default). `multipart` sends the `userfile` stream.
   */
  upload?: "base64" | "multipart";
  /** Filename used for the multipart `userfile` part. Defaults to `captcha.jpg`. */
  filename?: string;
  /**
   * When true, reject the response if `md5` does not match softid+softkey+pic_id+pic_str.
   * The recognize call is already billed when this check fails.
   */
  verifyMd5?: boolean;
  /**
   * Encoding for base64 uploads. `form` is application/x-www-form-urlencoded (default).
   * `json` is application/json. Ignored for multipart uploads.
   */
  bodyFormat?: "form" | "json";
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TextLocation {
  text: string;
  x: number;
  y: number;
}

export interface Plate {
  number: string;
  confidence: number;
  color: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
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
  /** Present for click, puzzle, and block-center codetypes when `pic_str` parses. */
  points?: Point[];
  /** Present for 9900 and free OCR blocks when `pic_str` parses. */
  rectangles?: Rect[];
  /** Present for 9800 when `pic_str` parses. */
  text_locations?: TextLocation[];
  /** Present for 8601 when `pic_str` parses. */
  plates?: Plate[];
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

export interface FreeRecognizeOptions {
  upload?: "base64" | "multipart";
  filename?: string;
  /** Overrides the client `apiKey` for this call. */
  apiKey?: string;
}
