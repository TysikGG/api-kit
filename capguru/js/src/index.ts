import axios, { AxiosInstance } from 'axios';

/** @internal */
export const DEFAULT_SOFTGURU = 164125;

/**
 * Configuration options for the CapGuru client.
 */
export interface CapGuruOptions {
  /**
   * API key obtained from CapGuru dashboard.
   */
  apiKey: string;

  /**
   * Base URL for the CapGuru API. Defaults to https://api.cap.guru.
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds. Defaults to 30000 ms.
   */
  timeout?: number;

  /**
   * Polling timeout in milliseconds for captcha resolution. Defaults to 120000 ms.
   */
  defaultPollingTimeoutMs?: number;

  /**
   * Polling interval in milliseconds. Defaults to 5000 ms.
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
   * 0 = not specified, 1 = numbers only, 2 = letters only, 3 = numbers or letters.
   */
  numeric?: 0 | 1 | 2 | 3;

  /**
   * 0 = not specified, 1 = math operation required.
   */
  calc?: 0 | 1;

  /**
   * Minimum required text length.
   */
  minLen?: number;

  /**
   * Maximum required text length.
   */
  maxLen?: number;

  /**
   * Language code (0 = all, 1 = cyrillic, 2 = latin).
   */
  language?: 0 | 1 | 2;

  /**
   * Text instructions for workers.
   */
  textinstructions?: string;
}

/**
 * Options for solving a text question captcha.
 */
export interface TextCaptchaOptions {
  /**
   * Language code (0 = all, 1 = cyrillic, 2 = latin).
   */
  language?: 0 | 1 | 2;
}

/**
 * Options for solving reCAPTCHA v2.
 */
export interface RecaptchaV2Options {
  /**
   * The google sitekey found in page source.
   */
  googlekey: string;

  /**
   * The full URL of the page where captcha is displayed.
   */
  pageurl: string;

  /**
   * Set to 1 for invisible reCAPTCHA.
   */
  invisible?: 0 | 1;

  /**
   * Additional data-s parameter value.
   */
  dataS?: string;

  /**
   * Enterprise payload parameter.
   */
  enterprise?: 0 | 1;
}

/**
 * Options for solving reCAPTCHA v3.
 */
export interface RecaptchaV3Options {
  /**
   * The google sitekey found in page source.
   */
  googlekey: string;

  /**
   * The full URL of the page where captcha is displayed.
   */
  pageurl: string;

  /**
   * Action parameter specified on the target site.
   */
  action?: string;

  /**
   * Desired minimum score threshold between 0.1 and 0.9.
   */
  minScore?: number;
}

/**
 * Options for solving Cloudflare Turnstile.
 */
export interface TurnstileOptions {
  /**
   * The Turnstile sitekey found in page source.
   */
  sitekey: string;

  /**
   * The full URL of the page where captcha is displayed.
   */
  pageurl: string;

  /**
   * Optional Turnstile action parameter.
   */
  action?: string;

  /**
   * Optional Turnstile cData parameter.
   */
  data?: string;
}

/**
 * Options for solving hCaptcha.
 */
export interface HCaptchaOptions {
  /**
   * The hCaptcha sitekey.
   */
  sitekey: string;

  /**
   * The full URL of the page where captcha is displayed.
   */
  pageurl: string;

  /**
   * Set to 1 for invisible hCaptcha.
   */
  invisible?: 0 | 1;

  /**
   * Optional custom data parameter (rqdata).
   */
  data?: string;
}

/**
 * Options for solving Arkose Labs FunCaptcha.
 */
export interface FunCaptchaOptions {
  /**
   * The public key of the FunCaptcha.
   */
  publickey: string;

  /**
   * The full URL of the page where captcha is displayed.
   */
  pageurl: string;

  /**
   * The surl parameter (service URL).
   */
  surl?: string;

  /**
   * Additional data parameter as string.
   */
  data?: string;
}

/**
 * Options for solving GeeTest v3.
 */
export interface GeeTestOptions {
  /**
   * The gt key from the target site.
   */
  gt: string;

  /**
   * The challenge key from the target site.
   */
  challenge: string;

  /**
   * The full URL of the page where captcha is displayed.
   */
  pageurl: string;

  /**
   * API server subdomain.
   */
  apiServer?: string;
}

/**
 * GeeTest resolution result.
 */
export interface GeeTestResult {
  challenge: string;
  validate: string;
  seccode: string;
}

/**
 * Options for waiting for captcha resolution.
 */
export interface PollingOptions {
  /**
   * Maximum total time in milliseconds to wait before timing out.
   */
  timeoutMs?: number;

  /**
   * Interval in milliseconds between status checks.
   */
  intervalMs?: number;
}

/**
 * Custom error thrown by the CapGuru client.
 */
export class CapGuruError extends Error {
  public readonly code?: string;
  public readonly responseData?: unknown;

  public constructor(message: string, code?: string, responseData?: unknown) {
    super(message);
    this.name = 'CapGuruError';
    this.code = code;
    this.responseData = responseData;
    Object.setPrototypeOf(this, CapGuruError.prototype);
  }
}

/**
 * Client for interacting with the CapGuru solving API.
 */
export class CapGuruClient {
  private readonly http: AxiosInstance;
  private readonly apiKey: string;
  private readonly defaultPollingTimeoutMs: number;
  private readonly defaultPollingIntervalMs: number;

  /**
   * Creates an instance of CapGuruClient.
   *
   * @param options - Configuration options or API key string.
   *
   * @example
   * ```typescript
   * import { CapGuruClient } from 'capguru-client';
   *
   * const client = new CapGuruClient({ apiKey: 'YOUR_API_KEY' });
   * ```
   */
  public constructor(options: string | CapGuruOptions) {
    const config = typeof options === 'string' ? { apiKey: options } : options;
    if (!config.apiKey) {
      throw new CapGuruError('API key is required', 'MISSING_API_KEY');
    }
    this.apiKey = config.apiKey;
    this.defaultPollingTimeoutMs = config.defaultPollingTimeoutMs ?? 120000;
    this.defaultPollingIntervalMs = config.defaultPollingIntervalMs ?? 5000;

    this.http = axios.create({
      baseURL: config.baseUrl ?? 'https://api.cap.guru',
      timeout: config.timeout ?? 30000,
    });
  }

  /**
   * Retrieves current account balance.
   *
   * @returns Current account balance.
   *
   * @example
   * ```typescript
   * const balance = await client.getBalance();
   * console.log(`Balance: ${balance}`);
   * ```
   */
  public async getBalance(): Promise<number> {
    const data = await this.queryResult({ action: 'getbalance' });
    const balance = parseFloat(data);
    if (isNaN(balance)) {
      throw new CapGuruError(`Failed to parse balance: ${data}`, 'PARSE_ERROR', data);
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
   * const text = await client.solveImage({ body: 'iVBORw0KGgoAAA...' });
   * console.log(`Solved text: ${text}`);
   * ```
   */
  public async solveImage(options: ImageCaptchaOptions | string): Promise<string> {
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
  public async solveText(text: string, options?: TextCaptchaOptions): Promise<string> {
    const params: Record<string, unknown> = {
      textcaptcha: text,
    };
    if (options?.language !== undefined) params.language = options.language;

    const taskId = await this.createTask(params);
    return this.waitForResult(taskId);
  }

  /**
   * Solves Google reCAPTCHA v2.
   *
   * @param options - reCAPTCHA v2 parameters.
   * @returns Solved token string (g-recaptcha-response).
   *
   * @example
   * ```typescript
   * const token = await client.solveRecaptchaV2({
   *   googlekey: '6Le-wvkSAAAAAPBMRTvw0Q4CeHg-tUnSQVwyYcxQ',
   *   pageurl: 'https://example.com/login',
   * });
   * ```
   */
  public async solveRecaptchaV2(options: RecaptchaV2Options): Promise<string> {
    const params: Record<string, unknown> = {
      method: 'userrecaptcha',
      googlekey: options.googlekey,
      pageurl: options.pageurl,
    };
    if (options.invisible) params.invisible = 1;
    if (options.dataS) params['data-s'] = options.dataS;
    if (options.enterprise) params.enterprise = 1;

    const taskId = await this.createTask(params);
    return this.waitForResult(taskId);
  }

  /**
   * Solves Google reCAPTCHA v3.
   *
   * @param options - reCAPTCHA v3 parameters.
   * @returns Solved token string.
   *
   * @example
   * ```typescript
   * const token = await client.solveRecaptchaV3({
   *   googlekey: '6LdyC2cUAAAAACGuDKpXeDorzYbe8tDno10xTUXn',
   *   pageurl: 'https://example.com',
   *   action: 'verify',
   *   minScore: 0.5,
   * });
   * ```
   */
  public async solveRecaptchaV3(options: RecaptchaV3Options): Promise<string> {
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
   * Solves Cloudflare Turnstile captcha.
   *
   * @param options - Turnstile parameters.
   * @returns Token string for Turnstile verification.
   *
   * @example
   * ```typescript
   * const token = await client.solveTurnstile({
   *   sitekey: '0x4AAAAAAABnOYoqxxxxxx',
   *   pageurl: 'https://example.com',
   * });
   * ```
   */
  public async solveTurnstile(options: TurnstileOptions): Promise<string> {
    const params: Record<string, unknown> = {
      method: 'turnstile',
      sitekey: options.sitekey,
      pageurl: options.pageurl,
    };
    if (options.action) params.action = options.action;
    if (options.data) params.data = options.data;

    const taskId = await this.createTask(params);
    return this.waitForResult(taskId);
  }

  /**
   * Solves hCaptcha challenge.
   *
   * @param options - hCaptcha parameters.
   * @returns Token string for hCaptcha verification.
   *
   * @example
   * ```typescript
   * const token = await client.solveHCaptcha({
   *   sitekey: '4c672d35-0701-42b2-88c3-78380b0db560',
   *   pageurl: 'https://example.com',
   * });
   * ```
   */
  public async solveHCaptcha(options: HCaptchaOptions): Promise<string> {
    const params: Record<string, unknown> = {
      method: 'hcaptcha',
      sitekey: options.sitekey,
      pageurl: options.pageurl,
    };
    if (options.invisible) params.invisible = 1;
    if (options.data) params.data = options.data;

    const taskId = await this.createTask(params);
    return this.waitForResult(taskId);
  }

  /**
   * Solves Arkose Labs FunCaptcha.
   *
   * @param options - FunCaptcha parameters.
   * @returns FunCaptcha token string.
   *
   * @example
   * ```typescript
   * const token = await client.solveFunCaptcha({
   *   publickey: '69A21A01-CC43-44CC-A7DC-3DAE72037121',
   *   pageurl: 'https://example.com',
   * });
   * ```
   */
  public async solveFunCaptcha(options: FunCaptchaOptions): Promise<string> {
    const params: Record<string, unknown> = {
      method: 'funcaptcha',
      publickey: options.publickey,
      pageurl: options.pageurl,
    };
    if (options.surl) params.surl = options.surl;
    if (options.data) params.data = options.data;

    const taskId = await this.createTask(params);
    return this.waitForResult(taskId);
  }

  /**
   * Solves GeeTest v3.
   *
   * @param options - GeeTest parameters.
   * @returns Structured GeeTest result with challenge, validate, and seccode.
   *
   * @example
   * ```typescript
   * const result = await client.solveGeeTest({
   *   gt: 'f2ae6113d0774a87640498b049303a2c',
   *   challenge: '839b6748430a7d97e889396e95c1a704',
   *   pageurl: 'https://example.com',
   * });
   * ```
   */
  public async solveGeeTest(options: GeeTestOptions): Promise<GeeTestResult> {
    const params: Record<string, unknown> = {
      method: 'geetest',
      gt: options.gt,
      challenge: options.challenge,
      pageurl: options.pageurl,
    };
    if (options.apiServer) params.api_server = options.apiServer;

    const taskId = await this.createTask(params);
    const raw = await this.waitForResult(taskId);
    try {
      return JSON.parse(raw);
    } catch {
      return { challenge: '', validate: raw, seccode: `${raw}|jordan` };
    }
  }

  /**
   * Submits a low-level task directly to /in.php.
   *
   * @param params - Task parameters.
   * @returns Assigned numeric task ID string.
   *
   * @example
   * ```typescript
   * const taskId = await client.createTask({
   *   method: 'userrecaptcha',
   *   googlekey: '6Le-wvkSAAAAAPBMRTvw0Q4CeHg-tUnSQVwyYcxQ',
   *   pageurl: 'https://example.com',
   * });
   * ```
   */
  public async createTask(params: Record<string, unknown>): Promise<string> {
    const payload: Record<string, unknown> = {
      key: this.apiKey,
      softguru: DEFAULT_SOFTGURU,
      json: 1,
      ...params,
    };

    try {
      const response = await this.http.post('/in.php', null, { params: payload });
      const data = response.data as { status?: number; request?: string };
      if (data && typeof data === 'object') {
        if (data.status === 1 && data.request) {
          return String(data.request);
        }
        if (data.status === 0 && data.request) {
          const code = String(data.request);
          throw new CapGuruError(`CapGuru error: ${code}`, code, data);
        }
      }
      throw new CapGuruError(
        `Unexpected /in.php response: ${JSON.stringify(data)}`,
        'INVALID_RESPONSE',
        data,
      );
    } catch (err: unknown) {
      if (err instanceof CapGuruError) {
        throw err;
      }
      throw new CapGuruError(
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
   *
   * @example
   * ```typescript
   * const solution = await client.getTaskResult('123456');
   * ```
   */
  public async getTaskResult(taskId: string): Promise<string | null> {
    try {
      return await this.queryResult({
        action: 'get',
        id: taskId,
      });
    } catch (err: unknown) {
      if (err instanceof CapGuruError && err.code === 'CAPCHA_NOT_READY') {
        return null;
      }
      throw err;
    }
  }

  /**
   * Polls /res.php until the captcha is solved or the timeout is exceeded.
   *
   * @param taskId - Task ID returned by createTask.
   * @param options - Polling options (timeout and interval).
   * @returns Solved captcha response string.
   */
  public async waitForResult(taskId: string, options?: PollingOptions): Promise<string> {
    const timeoutMs = options?.timeoutMs ?? this.defaultPollingTimeoutMs;
    const intervalMs = options?.intervalMs ?? this.defaultPollingIntervalMs;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      const result = await this.getTaskResult(taskId);
      if (result !== null) {
        return result;
      }
    }

    throw new CapGuruError(
      `Timeout of ${timeoutMs}ms exceeded while waiting for task ${taskId}`,
      'TIMEOUT',
    );
  }

  /**
   * Reports a correctly solved captcha.
   *
   * @param taskId - Task ID of the correctly solved captcha.
   * @returns True if report accepted.
   *
   * @example
   * ```typescript
   * await client.reportGood('123456');
   * ```
   */
  public async reportGood(taskId: string): Promise<boolean> {
    await this.queryResult({ action: 'reportgood', id: taskId });
    return true;
  }

  /**
   * Reports an incorrectly solved captcha for refund / feedback.
   *
   * @param taskId - Task ID of the wrongly solved captcha.
   * @returns True if report accepted.
   *
   * @example
   * ```typescript
   * await client.reportBad('123456');
   * ```
   */
  public async reportBad(taskId: string): Promise<boolean> {
    await this.queryResult({ action: 'reportbad', id: taskId });
    return true;
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
          throw new CapGuruError(`CapGuru error: ${code}`, code, data);
        }
      }

      throw new CapGuruError(
        `Unexpected /res.php response: ${JSON.stringify(data)}`,
        'INVALID_RESPONSE',
        data,
      );
    } catch (err: unknown) {
      if (err instanceof CapGuruError) {
        throw err;
      }
      throw new CapGuruError(
        `queryResult request failed: ${err instanceof Error ? err.message : String(err)}`,
        'NETWORK_ERROR',
      );
    }
  }
}

export const CapGuru = CapGuruClient;
