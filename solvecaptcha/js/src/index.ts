import axios, { AxiosInstance } from 'axios';

/** @internal */
export const DEFAULT_SOFT_ID = '';

/**
 * Configuration options for the SolveCaptchaClient.
 */
export interface SolveCaptchaClientOptions {
  /**
   * API key obtained from SolveCaptcha dashboard.
   */
  apiKey: string;
  /**
   * Base URL for the SolveCaptcha API. Defaults to https://api.solvecaptcha.com.
   */
  baseURL?: string;
  /**
   * Request timeout in milliseconds. Defaults to 30000 ms.
   */
  timeout?: number;
  /**
   * Optional partner/software ID.
   */
  softId?: string | number;
  /**
   * Default polling timeout in milliseconds for captcha resolution. Defaults to 120000 ms.
   */
  defaultPollingTimeoutMs?: number;
  /**
   * Default polling interval in milliseconds. Defaults to 5000 ms.
   */
  defaultPollingIntervalMs?: number;
}

/**
 * Options for solving a normal image captcha.
 */
export interface ImageCaptchaOptions {
  /**
   * Base64 encoded image string.
   */
  body: string;
  /**
   * 0 = single word, 1 = two or more words.
   */
  phrase?: 0 | 1;
  /**
   * 0 = case insensitive, 1 = case sensitive.
   */
  regsense?: 0 | 1;
  /**
   * 0 = not specified, 1 = only numbers, 2 = only letters, 3 = only numbers OR only letters, 4 = both numbers and letters.
   */
  numeric?: 0 | 1 | 2 | 3 | 4;
  /**
   * 0 = no math, 1 = requires calculation.
   */
  calc?: 0 | 1;
  /**
   * Minimum number of characters.
   */
  minLen?: number;
  /**
   * Maximum number of characters.
   */
  maxLen?: number;
  /**
   * 0 = not specified, 1 = Cyrillic, 2 = Latin.
   */
  language?: 0 | 1 | 2;
  /**
   * Optional text instructions for the worker.
   */
  textinstructions?: string;
}

/**
 * Options for solving a text question captcha.
 */
export interface TextCaptchaOptions {
  /**
   * 0 = not specified, 1 = Cyrillic, 2 = Latin.
   */
  language?: 0 | 1 | 2;
}

/**
 * Options for solving Google reCAPTCHA V2.
 */
export interface RecaptchaV2Options {
  /**
   * Sitekey found in target page HTML.
   */
  googlekey: string;
  /**
   * Full URL of the page containing the reCAPTCHA.
   */
  pageurl: string;
  /**
   * Whether the reCAPTCHA is invisible.
   */
  invisible?: boolean;
  /**
   * Optional 'data-s' parameter value for protected endpoints.
   */
  dataS?: string;
}

/**
 * Options for solving Google reCAPTCHA V3.
 */
export interface RecaptchaV3Options {
  /**
   * Sitekey found in target page HTML.
   */
  googlekey: string;
  /**
   * Full URL of the page containing the reCAPTCHA.
   */
  pageurl: string;
  /**
   * Action parameter value.
   */
  action?: string;
  /**
   * Minimum required score (e.g. 0.3, 0.7, 0.9).
   */
  minScore?: number;
}

/**
 * Options for solving Cloudflare Turnstile.
 */
export interface TurnstileOptions {
  /**
   * Turnstile sitekey.
   */
  sitekey: string;
  /**
   * Full URL of the page with the Turnstile widget.
   */
  pageurl: string;
  /**
   * Optional action parameter.
   */
  action?: string;
  /**
   * Optional cData parameter.
   */
  data?: string;
  /**
   * Optional pagedata parameter.
   */
  pagedata?: string;
}

/**
 * Options for solving Arkose Labs FunCaptcha.
 */
export interface FunCaptchaOptions {
  /**
   * FunCaptcha public key.
   */
  publickey: string;
  /**
   * Full URL of the page containing FunCaptcha.
   */
  pageurl: string;
  /**
   * Custom service URL (surl).
   */
  surl?: string;
  /**
   * Custom data payload.
   */
  data?: Record<string, unknown> | string;
}

/**
 * Options for solving GeeTest captcha.
 */
export interface GeeTestOptions {
  /**
   * GeeTest 'gt' key.
   */
  gt: string;
  /**
   * GeeTest 'challenge' token.
   */
  challenge: string;
  /**
   * Full URL of the page containing GeeTest.
   */
  pageurl: string;
  /**
   * Optional custom api_server domain.
   */
  apiServer?: string;
}

/**
 * Result returned for GeeTest captcha solutions.
 */
export interface GeeTestResult {
  challenge: string;
  validate: string;
  seccode: string;
}

/**
 * Known error descriptions for SolveCaptcha.
 */
export const SOLVE_CAPTCHA_ERRORS: Record<string, string> = {
  ERROR_WRONG_USER_KEY: 'API key is invalid or formatted incorrectly',
  ERROR_KEY_DOES_NOT_EXIST: 'API key not found in SolveCaptcha system',
  ERROR_ZERO_BALANCE: 'Account balance is zero or depleted',
  ERROR_NO_SLOT_AVAILABLE: 'No idle workers available at the moment',
  ERROR_ZERO_CAPTCHA_FILESIZE: 'Uploaded image file size is 0 bytes',
  ERROR_TOO_BIG_CAPTCHA_FILESIZE: 'Uploaded image exceeds maximum size limit (100 KB)',
  ERROR_WRONG_FILE_EXTENSION: 'File extension is not supported',
  ERROR_IMAGE_TYPE_NOT_SUPPORTED: 'Image format cannot be loaded or is corrupted',
  ERROR_IP_NOT_ALLOWED: 'Your IP address is not whitelisted or is blocked',
  IP_BANNED: 'Your IP address has been temporarily banned due to excessive failed attempts',
  ERROR_CAPTCHA_UNSOLVABLE: 'Worker could not solve the submitted captcha',
  ERROR_BAD_DUPLICATES: 'Maximum duplicate requests limit reached',
  REPORT_NOT_RECORDED: 'Feedback report could not be recorded',
};

/**
 * Error thrown by the SolveCaptcha client when API requests or solving tasks fail.
 */
export class SolveCaptchaError extends Error {
  /**
   * Error code returned by SolveCaptcha.
   */
  readonly code?: string;
  /**
   * Raw server response payload.
   */
  readonly responseBody?: unknown;

  constructor(message: string, code?: string, responseBody?: unknown) {
    super(message);
    this.name = 'SolveCaptchaError';
    this.code = code;
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, SolveCaptchaError.prototype);
  }
}

/**
 * Client for the SolveCaptcha human and AI captcha solving service.
 */
export class SolveCaptchaClient {
  private readonly apiKey: string;
  private readonly softId: string | number;
  private readonly pollingTimeoutMs: number;
  private readonly pollingIntervalMs: number;
  private readonly http: AxiosInstance;

  /**
   * Creates a new SolveCaptchaClient.
   *
   * @param options - API key string or configuration object.
   *
   * @example
   * ```typescript
   * import { SolveCaptchaClient } from 'solvecaptcha-client';
   *
   * const client = new SolveCaptchaClient({ apiKey: 'YOUR_API_KEY' });
   * const balance = await client.getBalance();
   * console.log(`Balance: $${balance}`);
   * ```
   */
  constructor(options: SolveCaptchaClientOptions | string) {
    if (typeof options === 'string') {
      this.apiKey = options.trim();
      this.softId = DEFAULT_SOFT_ID;
      this.pollingTimeoutMs = 120000;
      this.pollingIntervalMs = 5000;
      this.http = axios.create({
        baseURL: 'https://api.solvecaptcha.com',
        timeout: 30000,
      });
    } else {
      if (!options || !options.apiKey || !options.apiKey.trim()) {
        throw new SolveCaptchaError(
          'API key is required to initialize SolveCaptchaClient',
          'ERROR_KEY_DOES_NOT_EXIST',
        );
      }
      this.apiKey = options.apiKey.trim();
      this.softId = options.softId ?? DEFAULT_SOFT_ID;
      this.pollingTimeoutMs = options.defaultPollingTimeoutMs ?? 120000;
      this.pollingIntervalMs = options.defaultPollingIntervalMs ?? 5000;
      this.http = axios.create({
        baseURL: options.baseURL || 'https://api.solvecaptcha.com',
        timeout: options.timeout || 30000,
      });
    }
  }

  /**
   * Retrieves the current account balance.
   *
   * @returns Current balance in USD.
   *
   * @example
   * ```typescript
   * const balance = await client.getBalance();
   * console.log(`Current balance: $${balance}`);
   * ```
   */
  async getBalance(): Promise<number> {
    const data = await this.queryResult({
      action: 'getbalance',
    });
    const balance = parseFloat(data);
    if (Number.isNaN(balance)) {
      throw new SolveCaptchaError(`Failed to parse balance: ${data}`, 'PARSE_ERROR', data);
    }
    return balance;
  }

  /**
   * Solves an image-based captcha from base64 data.
   *
   * @param options - Image parameters or base64 string.
   * @returns Solved captcha text solution.
   *
   * @example
   * ```typescript
   * const text = await client.solveImage({
   *   body: 'iVBORw0KGgoAAAANSUhEUgAA...',
   * });
   * console.log(`Solved text: ${text}`);
   * ```
   */
  async solveImage(options: ImageCaptchaOptions | string): Promise<string> {
    const opt: ImageCaptchaOptions = typeof options === 'string' ? { body: options } : options;
    const params: Record<string, unknown> = {
      method: 'base64',
      body: opt.body,
    };

    if (opt.phrase !== undefined) params.phrase = opt.phrase;
    if (opt.regsense !== undefined) params.regsense = opt.regsense;
    if (opt.numeric !== undefined) params.numeric = opt.numeric;
    if (opt.calc !== undefined) params.calc = opt.calc;
    if (opt.minLen !== undefined) params.min_len = opt.minLen;
    if (opt.maxLen !== undefined) params.max_len = opt.maxLen;
    if (opt.language !== undefined) params.language = opt.language;
    if (opt.textinstructions !== undefined) params.textinstructions = opt.textinstructions;

    const taskId = await this.createTask(params);
    return this.waitForResult(taskId);
  }

  /**
   * Solves a text question captcha.
   *
   * @param text - The question text to answer.
   * @param options - Additional options.
   * @returns Answer to the question.
   *
   * @example
   * ```typescript
   * const answer = await client.solveText('If tomorrow is Saturday, what day is today?');
   * console.log(`Answer: ${answer}`);
   * ```
   */
  async solveText(text: string, options?: TextCaptchaOptions): Promise<string> {
    const params: Record<string, unknown> = {
      textcaptcha: text,
    };
    if (options?.language !== undefined) params.language = options.language;

    const taskId = await this.createTask(params);
    return this.waitForResult(taskId);
  }

  /**
   * Solves Google reCAPTCHA V2.
   *
   * @param options - reCAPTCHA V2 options.
   * @returns Solution token.
   *
   * @example
   * ```typescript
   * const token = await client.solveRecaptchaV2({
   *   googlekey: '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-',
   *   pageurl: 'https://example.com/login',
   * });
   * console.log('Token:', token);
   * ```
   */
  async solveRecaptchaV2(options: RecaptchaV2Options): Promise<string> {
    const params: Record<string, unknown> = {
      method: 'userrecaptcha',
      googlekey: options.googlekey,
      pageurl: options.pageurl,
    };
    if (options.invisible) params.invisible = 1;
    if (options.dataS) params['data-s'] = options.dataS;

    const taskId = await this.createTask(params);
    return this.waitForResult(taskId);
  }

  /**
   * Solves Google reCAPTCHA V3.
   *
   * @param options - reCAPTCHA V3 options.
   * @returns Solution token.
   *
   * @example
   * ```typescript
   * const token = await client.solveRecaptchaV3({
   *   googlekey: '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-',
   *   pageurl: 'https://example.com/login',
   *   action: 'verify',
   *   minScore: 0.7,
   * });
   * ```
   */
  async solveRecaptchaV3(options: RecaptchaV3Options): Promise<string> {
    const params: Record<string, unknown> = {
      method: 'userrecaptcha',
      version: 'v3',
      googlekey: options.googlekey,
      pageurl: options.pageurl,
    };
    if (options.action) params.action = options.action;
    if (options.minScore !== undefined) params.min_score = options.minScore;

    const taskId = await this.createTask(params);
    return this.waitForResult(taskId);
  }

  /**
   * Solves Cloudflare Turnstile.
   *
   * @param options - Turnstile options.
   * @returns Turnstile token.
   *
   * @example
   * ```typescript
   * const token = await client.solveTurnstile({
   *   sitekey: '0x4AAAAAAABnEBq1w7gYv_m-',
   *   pageurl: 'https://example.com/page',
   * });
   * ```
   */
  async solveTurnstile(options: TurnstileOptions): Promise<string> {
    const params: Record<string, unknown> = {
      method: 'turnstile',
      sitekey: options.sitekey,
      pageurl: options.pageurl,
    };
    if (options.action) params.action = options.action;
    if (options.data) params.data = options.data;
    if (options.pagedata) params.pagedata = options.pagedata;

    const taskId = await this.createTask(params);
    return this.waitForResult(taskId);
  }

  /**
   * Solves Arkose Labs FunCaptcha.
   *
   * @param options - FunCaptcha options.
   * @returns Solution token.
   *
   * @example
   * ```typescript
   * const token = await client.solveFunCaptcha({
   *   publickey: '69A21A01-CC43-44CC-A7DC-3E088835E78D',
   *   pageurl: 'https://example.com/signup',
   * });
   * ```
   */
  async solveFunCaptcha(options: FunCaptchaOptions): Promise<string> {
    const params: Record<string, unknown> = {
      method: 'funcaptcha',
      publickey: options.publickey,
      pageurl: options.pageurl,
    };
    if (options.surl) params.surl = options.surl;
    if (options.data) {
      params.data = typeof options.data === 'string' ? options.data : JSON.stringify(options.data);
    }

    const taskId = await this.createTask(params);
    return this.waitForResult(taskId);
  }

  /**
   * Solves GeeTest captcha.
   *
   * @param options - GeeTest options.
   * @returns GeeTestResult object with challenge, validate, and seccode.
   *
   * @example
   * ```typescript
   * const res = await client.solveGeeTest({
   *   gt: '022397c99c9d64352069eab73bc373d7',
   *   challenge: '3049170ffb08bb6b907572ca35489f07',
   *   pageurl: 'https://example.com/geetest',
   * });
   * console.log(res.validate);
   * ```
   */
  async solveGeeTest(options: GeeTestOptions): Promise<GeeTestResult> {
    const params: Record<string, unknown> = {
      method: 'geetest',
      gt: options.gt,
      challenge: options.challenge,
      pageurl: options.pageurl,
    };
    if (options.apiServer) params.api_server = options.apiServer;

    const taskId = await this.createTask(params);
    const rawResult = await this.waitForResult(taskId);

    try {
      return JSON.parse(rawResult) as GeeTestResult;
    } catch {
      throw new SolveCaptchaError(
        `Failed to parse GeeTest solution: ${rawResult}`,
        'PARSE_ERROR',
        rawResult,
      );
    }
  }

  /**
   * Submits a captcha task to /in.php and returns the assigned task ID.
   *
   * @param params - Task parameters.
   * @returns Assigned numeric task ID string.
   */
  async createTask(params: Record<string, unknown>): Promise<string> {
    const payload: Record<string, unknown> = {
      key: this.apiKey,
      json: 1,
      ...params,
    };

    if (this.softId && payload.soft_id === undefined) {
      payload.soft_id = this.softId;
    }

    try {
      const response = await this.http.post('/in.php', null, {
        params: payload,
      });

      const data = response.data as { status?: number; request?: string };
      if (data && typeof data === 'object') {
        if (data.status === 1 && data.request) {
          return String(data.request);
        }
        if (data.status === 0 && data.request) {
          const code = String(data.request);
          const desc = SOLVE_CAPTCHA_ERRORS[code] || `SolveCaptcha error: ${code}`;
          throw new SolveCaptchaError(desc, code, data);
        }
      }

      throw new SolveCaptchaError(
        `Unexpected /in.php response: ${JSON.stringify(data)}`,
        'INVALID_RESPONSE',
        data,
      );
    } catch (err: unknown) {
      if (err instanceof SolveCaptchaError) {
        throw err;
      }
      throw new SolveCaptchaError(
        `createTask request failed: ${err instanceof Error ? err.message : String(err)}`,
        'NETWORK_ERROR',
      );
    }
  }

  /**
   * Checks the status and gets the result of a submitted task.
   *
   * @param taskId - Task ID returned by createTask.
   * @returns Solution string, or null if captcha is still being solved.
   */
  async getTaskResult(taskId: string): Promise<string | null> {
    try {
      return await this.queryResult({
        action: 'get',
        id: taskId,
      });
    } catch (err: unknown) {
      if (err instanceof SolveCaptchaError && err.code === 'CAPCHA_NOT_READY') {
        return null;
      }
      throw err;
    }
  }

  /**
   * Polls until a captcha task is solved or timeout occurs.
   *
   * @param taskId - Task ID.
   * @param timeoutMs - Maximum milliseconds to wait.
   * @param intervalMs - Polling interval in milliseconds.
   * @returns Solved captcha string.
   */
  async waitForResult(
    taskId: string,
    timeoutMs?: number,
    intervalMs?: number,
  ): Promise<string> {
    const timeout = timeoutMs ?? this.pollingTimeoutMs;
    const interval = intervalMs ?? this.pollingIntervalMs;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      await new Promise((resolve) => setTimeout(resolve, interval));
      const res = await this.getTaskResult(taskId);
      if (res !== null) {
        return res;
      }
    }

    throw new SolveCaptchaError(
      `Captcha solving timed out after ${timeout}ms`,
      'TIMEOUT',
    );
  }

  /**
   * Reports that a captcha was solved correctly.
   *
   * @param taskId - Task ID.
   * @returns True if report recorded.
   */
  async reportGood(taskId: string): Promise<boolean> {
    try {
      const res = await this.queryResult({
        action: 'reportgood',
        id: taskId,
      });
      return res === 'OK_REPORT_RECORDED';
    } catch {
      return false;
    }
  }

  /**
   * Reports that a captcha was solved incorrectly to request a refund.
   *
   * @param taskId - Task ID.
   * @returns True if report recorded.
   */
  async reportBad(taskId: string): Promise<boolean> {
    try {
      const res = await this.queryResult({
        action: 'reportbad',
        id: taskId,
      });
      return res === 'OK_REPORT_RECORDED';
    } catch {
      return false;
    }
  }

  private async queryResult(params: Record<string, unknown>): Promise<string> {
    try {
      const response = await this.http.get('/res.php', {
        params: {
          key: this.apiKey,
          json: 1,
          ...params,
        },
      });

      const data = response.data as { status?: number; request?: string };
      if (data && typeof data === 'object') {
        if (data.status === 1 && data.request !== undefined) {
          return String(data.request);
        }
        if (data.status === 0 && data.request) {
          const code = String(data.request);
          const desc = SOLVE_CAPTCHA_ERRORS[code] || `SolveCaptcha error: ${code}`;
          throw new SolveCaptchaError(desc, code, data);
        }
      }

      throw new SolveCaptchaError(
        `Unexpected /res.php response: ${JSON.stringify(data)}`,
        'INVALID_RESPONSE',
        data,
      );
    } catch (err: unknown) {
      if (err instanceof SolveCaptchaError) {
        throw err;
      }
      throw new SolveCaptchaError(
        `queryResult failed: ${err instanceof Error ? err.message : String(err)}`,
        'NETWORK_ERROR',
      );
    }
  }
}
