import axios, { AxiosInstance, isAxiosError } from 'axios';

import { CAPGURU_API_URL, CLICK, DEFAULT_SOFTGURU, TEXT_INSTRUCTIONS } from './constants.js';
import { CapGuruError, RETRYABLE_ERROR_CODES, apiError, createCapGuruError } from './errors.js';
import {
  parseClickAnswer,
  parseGeeTest,
  type ClickSolution,
  type GeeTestResult,
  type JsonTaskResult,
} from './parse.js';
import type {
  AwsOptions,
  BinanceOptions,
  CapGuruOptions,
  ClickCaptchaOptions,
  FunCaptchaOptions,
  GeeTestOptions,
  GridClickOptions,
  HCaptchaOptions,
  ImageCaptchaOptions,
  ImageFileOptions,
  InstructionClickOptions,
  JsonTaskOptions,
  JsonTaskPayload,
  PollingOptions,
  RecaptchaV2Options,
  RecaptchaV3Options,
  SliderOptions,
  TemuOptions,
  TextCaptchaOptions,
  TikTokOptions,
  TokenTransportOptions,
  TurnstileOptions,
} from './types.js';

export { DEFAULT_SOFTGURU };

interface RucaptchaPayload {
  status?: number | string;
  request?: unknown;
}

/**
 * Client for the Cap.guru solving API (RuCaptcha-compatible `in.php` / `res.php`
 * and Anti-Captcha-compatible `createTask` / `getTaskResult`).
 */
export class CapGuruClient {
  private readonly http: AxiosInstance;
  private readonly apiKey: string;
  private readonly defaultPollingTimeoutMs: number;
  private readonly defaultPollingIntervalMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  /**
   * @param options API key string, or a full options object.
   */
  public constructor(options: string | CapGuruOptions) {
    const config = typeof options === 'string' ? { apiKey: options } : options;
    if (!config.apiKey) {
      throw createCapGuruError('API key is required', 'MISSING_API_KEY');
    }
    this.apiKey = config.apiKey;
    this.defaultPollingTimeoutMs = config.defaultPollingTimeoutMs ?? 120_000;
    this.defaultPollingIntervalMs = config.defaultPollingIntervalMs ?? 5_000;
    this.maxRetries = Math.max(0, config.maxRetries ?? 0);
    this.retryDelayMs = Math.max(0, config.retryDelayMs ?? 0);

    const baseUrl = (config.baseUrl ?? CAPGURU_API_URL).replace(/\/+$/, '');
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: config.timeout ?? 30_000,
      headers: config.headers,
    });
  }

  /** Account balance in USD. */
  public async getBalance(): Promise<number> {
    const data = await this.queryResult({ action: 'getbalance' });
    const balance = parseFloat(data);
    if (Number.isNaN(balance)) {
      throw createCapGuruError(`Failed to parse balance: ${data}`, 'PARSE_ERROR', data);
    }
    return balance;
  }

  /** Alias of {@link getBalance}. */
  public balance(): Promise<number> {
    return this.getBalance();
  }

  /**
   * Solve a normal image captcha.
   * Pass a base64 string or an options object (`vernet`, length limits, instructions).
   */
  public async solveImage(
    options: ImageCaptchaOptions | string,
    polling?: PollingOptions,
  ): Promise<string> {
    const opt: ImageCaptchaOptions = typeof options === 'string' ? { body: options } : options;
    const params: Record<string, unknown> = { method: 'base64', body: opt.body };
    this.assignDefined(params, {
      phrase: opt.phrase,
      regsense: opt.regsense,
      numeric: opt.numeric,
      calc: opt.calc,
      min_len: opt.minLen,
      max_len: opt.maxLen,
      language: opt.language,
      textinstructions: opt.textinstructions,
      vernet: opt.vernet,
    });
    this.assignExtra(params, opt.extra);
    const taskId = await this.createTask(params);
    return this.waitForResult(taskId, this.resolvePolling(opt, polling));
  }

  /**
   * Solve an image sent as a multipart file (`method=post`).
   * `file` is a Node `Buffer` or a `Blob`.
   */
  public async solveImageFile(
    file: Blob | Buffer,
    options?: ImageFileOptions,
    polling?: PollingOptions,
  ): Promise<string> {
    const opt = options ?? {};
    const params: Record<string, unknown> = { method: 'post' };
    this.assignDefined(params, {
      phrase: opt.phrase,
      regsense: opt.regsense,
      numeric: opt.numeric,
      calc: opt.calc,
      min_len: opt.minLen,
      max_len: opt.maxLen,
      language: opt.language,
      textinstructions: opt.textinstructions,
      vernet: opt.vernet,
    });
    this.assignExtra(params, opt.extra);
    const taskId = await this.createTaskMultipart(params, file, opt.filename ?? 'captcha.png');
    return this.waitForResult(taskId, this.resolvePolling(opt, polling));
  }

  /** Answer a text question. */
  public async solveText(
    text: string,
    options?: TextCaptchaOptions,
    polling?: PollingOptions,
  ): Promise<string> {
    const params: Record<string, unknown> = { textcaptcha: text };
    this.assignDefined(params, { language: options?.language });
    this.assignExtra(params, options?.extra);
    const taskId = await this.createTask(params);
    return this.waitForResult(taskId, this.resolvePolling(options, polling));
  }

  /** Solve reCAPTCHA v2 (checkbox, invisible, or Enterprise) and return `g-recaptcha-response`. */
  public async solveRecaptchaV2(
    options: RecaptchaV2Options,
    polling?: PollingOptions,
  ): Promise<string> {
    const params: Record<string, unknown> = {
      method: 'userrecaptcha',
      googlekey: options.googlekey,
      pageurl: options.pageurl,
    };
    if (options.invisible) params.invisible = 1;
    if (options.dataS) params['data-s'] = options.dataS;
    if (options.enterprise) params.enterprise = 1;
    this.applyTransport(params, options);
    const taskId = await this.createTask(params);
    return this.waitForResult(taskId, this.resolvePolling(options, polling));
  }

  /** Alias of {@link solveRecaptchaV2}. */
  public solveReCaptchaV2(options: RecaptchaV2Options, polling?: PollingOptions): Promise<string> {
    return this.solveRecaptchaV2(options, polling);
  }

  /** Solve reCAPTCHA v3 and return a token. */
  public async solveRecaptchaV3(
    options: RecaptchaV3Options,
    polling?: PollingOptions,
  ): Promise<string> {
    const params: Record<string, unknown> = {
      method: 'userrecaptcha',
      version: 'v3',
      googlekey: options.googlekey,
      pageurl: options.pageurl,
    };
    this.assignDefined(params, { action: options.action, min_score: options.minScore });
    if (options.enterprise) params.enterprise = 1;
    this.applyTransport(params, options);
    const taskId = await this.createTask(params);
    return this.waitForResult(taskId, this.resolvePolling(options, polling));
  }

  /** Alias of {@link solveRecaptchaV3}. */
  public solveReCaptchaV3(options: RecaptchaV3Options, polling?: PollingOptions): Promise<string> {
    return this.solveRecaptchaV3(options, polling);
  }

  /** Solve Cloudflare Turnstile and return the token. */
  public async solveTurnstile(options: TurnstileOptions, polling?: PollingOptions): Promise<string> {
    const params: Record<string, unknown> = {
      method: 'turnstile',
      sitekey: options.sitekey,
      pageurl: options.pageurl,
    };
    this.assignDefined(params, { action: options.action, data: options.data });
    this.applyTransport(params, options);
    const taskId = await this.createTask(params);
    return this.waitForResult(taskId, this.resolvePolling(options, polling));
  }

  /** Solve an hCaptcha token task. Prefer {@link solveHCaptchaClick} while tokens are unavailable. */
  public async solveHCaptcha(options: HCaptchaOptions, polling?: PollingOptions): Promise<string> {
    const params: Record<string, unknown> = {
      method: 'hcaptcha',
      sitekey: options.sitekey,
      pageurl: options.pageurl,
    };
    if (options.invisible) params.invisible = 1;
    this.assignDefined(params, { data: options.data });
    this.applyTransport(params, options);
    const taskId = await this.createTask(params);
    return this.waitForResult(taskId, this.resolvePolling(options, polling));
  }

  /** Solve Arkose Labs FunCaptcha and return a token. */
  public async solveFunCaptcha(options: FunCaptchaOptions, polling?: PollingOptions): Promise<string> {
    const params: Record<string, unknown> = {
      method: 'funcaptcha',
      publickey: options.publickey,
      pageurl: options.pageurl,
    };
    this.assignDefined(params, { surl: options.surl, data: options.data });
    this.applyTransport(params, options);
    const taskId = await this.createTask(params);
    return this.waitForResult(taskId, this.resolvePolling(options, polling));
  }

  /** Solve GeeTest v3 and return challenge, validate, and seccode. */
  public async solveGeeTest(options: GeeTestOptions, polling?: PollingOptions): Promise<GeeTestResult> {
    const params: Record<string, unknown> = {
      method: 'geetest',
      gt: options.gt,
      challenge: options.challenge,
      pageurl: options.pageurl,
    };
    this.assignDefined(params, { api_server: options.apiServer });
    this.applyTransport(params, options);
    const taskId = await this.createTask(params);
    const raw = await this.waitForResult(taskId, this.resolvePolling(options, polling));
    return parseGeeTest(raw);
  }

  /**
   * Generic image-click or slider task.
   * Returns coordinates and/or grid cell indexes parsed from the answer.
   */
  public async solveClick(options: ClickCaptchaOptions, polling?: PollingOptions): Promise<ClickSolution> {
    const raw = await this.submitClick(options, polling);
    return parseClickAnswer(raw);
  }

  /** Alias of {@link solveClick}. */
  public solveCoordinates(options: ClickCaptchaOptions, polling?: PollingOptions): Promise<ClickSolution> {
    return this.solveClick(options, polling);
  }

  /** reCAPTCHA v2 image click. `grid: true` requests cell numbers (`click=recap2`). */
  public solveRecaptchaClick(options: GridClickOptions, polling?: PollingOptions): Promise<ClickSolution> {
    return this.solveClick(
      { ...options, click: options.grid ? CLICK.RECAPTCHA_GRID : CLICK.RECAPTCHA },
      polling,
    );
  }

  /** hCaptcha image click. `grid: true` requests cell numbers (`click=hcap2`). */
  public solveHCaptchaClick(options: GridClickOptions, polling?: PollingOptions): Promise<ClickSolution> {
    return this.solveClick(
      { ...options, click: options.grid ? CLICK.HCAPTCHA_GRID : CLICK.HCAPTCHA },
      polling,
    );
  }

  /** FunCaptcha image click. `grid: true` requests cell numbers (`click=funcap2`). */
  public solveFunCaptchaClick(options: GridClickOptions, polling?: PollingOptions): Promise<ClickSolution> {
    return this.solveClick(
      { ...options, click: options.grid ? CLICK.FUNCAPTCHA_GRID : CLICK.FUNCAPTCHA },
      polling,
    );
  }

  /**
   * GeeTest image click or slider.
   * `textinstructions` is one of `slider`, `geetestv2`, `geetesticonv4`, `five`, `three`, `geetesticonhand`.
   * `grid: true` uses `click=geetest2`.
   */
  public solveGeeTestClick(options: GridClickOptions, polling?: PollingOptions): Promise<ClickSolution> {
    return this.solveClick(
      { ...options, click: options.grid ? CLICK.GEETEST_GRID : CLICK.GEETEST },
      polling,
    );
  }

  /** Binance object click or slider. `object: "dog"` is sent as `binance,dog`. */
  public solveBinance(options: BinanceOptions, polling?: PollingOptions): Promise<ClickSolution> {
    const textinstructions =
      options.textinstructions ?? `binance,${options.object ?? ''}`.replace(/,$/, '');
    return this.solveClick(
      {
        textinstructions,
        click: options.grid ? CLICK.GEETEST_GRID : CLICK.GEETEST,
        body: options.body,
        body0: options.body0,
        body1: options.body1,
        extra: options.extra,
        timeoutMs: options.timeoutMs,
        intervalMs: options.intervalMs,
        onNotReady: options.onNotReady,
        signal: options.signal,
      },
      polling,
    );
  }

  /**
   * TikTok captcha.
   * `kolesso` (also spelled `koleso` in some examples) sends two images as `body0` and `body1`.
   */
  public solveTikTok(options: TikTokOptions, polling?: PollingOptions): Promise<ClickSolution> {
    const variant = options.variant ?? 'slider';
    let textinstructions = options.textinstructions;
    if (!textinstructions) {
      if (variant === 'question') {
        textinstructions = `abc,${options.question ?? ''}`.replace(/,$/, '');
      } else if (variant === 'koleso') {
        textinstructions = TEXT_INSTRUCTIONS.TIKTOK_KOLESO;
      } else if (variant === 'kolesso') {
        textinstructions = TEXT_INSTRUCTIONS.TIKTOK_KOLESSO;
      } else if (variant === 'abc') {
        textinstructions = TEXT_INSTRUCTIONS.TIKTOK_ABC;
      } else {
        textinstructions = TEXT_INSTRUCTIONS.SLIDER;
      }
    }
    return this.solveClick(
      {
        textinstructions,
        click: CLICK.GEETEST,
        body: options.body,
        body0: options.body0,
        body1: options.body1,
        extra: options.extra,
        timeoutMs: options.timeoutMs,
        intervalMs: options.intervalMs,
        onNotReady: options.onNotReady,
        signal: options.signal,
      },
      polling,
    );
  }

  /** AWS WAF / Amazon image or slider. `click=oth`, instruction prefixed with `Amazon,`. */
  public solveAws(options: AwsOptions, polling?: PollingOptions): Promise<ClickSolution> {
    const raw = options.textinstructions ?? options.instruction ?? '';
    const textinstructions = /^amazon,/i.test(raw) ? raw : `Amazon,${raw}`.replace(/,$/, '');
    return this.solveClick(
      {
        textinstructions,
        click: CLICK.OTHER,
        body: options.body,
        body0: options.body0,
        body1: options.body1,
        extra: options.extra,
        timeoutMs: options.timeoutMs,
        intervalMs: options.intervalMs,
        onNotReady: options.onNotReady,
        signal: options.signal,
      },
      polling,
    );
  }

  /** Temu image click (`click=temu`). */
  public solveTemu(options: TemuOptions, polling?: PollingOptions): Promise<ClickSolution> {
    return this.solveClick({ ...options, click: CLICK.TEMU }, polling);
  }

  /**
   * Slider / puzzle. A `piece` is sent with the background as `body0` + `body1`.
   * Default instruction is `slider` and default click mode is `geetest`.
   */
  public solveSlider(options: SliderOptions, polling?: PollingOptions): Promise<ClickSolution> {
    const body0 = options.body0 ?? (options.piece ? options.body : undefined);
    const body1 = options.body1 ?? options.piece;
    const body = body0 || body1 ? undefined : options.body;
    return this.solveClick(
      {
        textinstructions: options.textinstructions ?? TEXT_INSTRUCTIONS.SLIDER,
        click: options.click ?? CLICK.GEETEST,
        body,
        body0,
        body1,
        extra: options.extra,
        timeoutMs: options.timeoutMs,
        intervalMs: options.intervalMs,
        onNotReady: options.onNotReady,
        signal: options.signal,
      },
      polling,
    );
  }

  /** Bitget icon captcha (`textinstructions=geetesticonhand`, `click=geetest`). */
  public solveBitget(
    options: Omit<ClickCaptchaOptions, 'textinstructions' | 'click'> & { textinstructions?: string },
    polling?: PollingOptions,
  ): Promise<ClickSolution> {
    return this.solveClick(
      {
        ...options,
        textinstructions: options.textinstructions ?? TEXT_INSTRUCTIONS.BITGET,
        click: CLICK.GEETEST,
      },
      polling,
    );
  }

  /** Linkvertise click (`custom1221,<instruction>`, `click=oth`). */
  public solveLinkvertise(options: InstructionClickOptions, polling?: PollingOptions): Promise<ClickSolution> {
    return this.solvePrefixed(TEXT_INSTRUCTIONS.LINKVERTISE_PREFIX, options, polling);
  }

  /** SeoFast / Profitcentr / Seotime (`custom1222,<instruction>`, `click=oth`). */
  public solveSeoFast(options: InstructionClickOptions, polling?: PollingOptions): Promise<ClickSolution> {
    return this.solvePrefixed(TEXT_INSTRUCTIONS.SEOFAST_PREFIX, options, polling);
  }

  /** World.cash (`textinstructions=custom1224`, `click=oth`). */
  public solveWorldCash(
    options: Omit<ClickCaptchaOptions, 'textinstructions' | 'click'> & { textinstructions?: string },
    polling?: PollingOptions,
  ): Promise<ClickSolution> {
    return this.solveClick(
      {
        ...options,
        textinstructions: options.textinstructions ?? TEXT_INSTRUCTIONS.WORLDCASH,
        click: CLICK.OTHER,
      },
      polling,
    );
  }

  /**
   * Submit a raw `in.php` task.
   * `key`, `json=1`, and `softguru` are added automatically and cannot be overwritten.
   */
  public async createTask(params: Record<string, unknown>): Promise<string> {
    const payload = this.envelope(params);
    return this.withRetries(async () => {
      try {
        const response = await this.http.post('/in.php', null, { params: payload });
        return this.readTaskId(this.ensureHttpOk(response.status, response.data));
      } catch (err: unknown) {
        throw this.wrapTransport(err, 'createTask');
      }
    });
  }

  /**
   * Submit `method=post` as multipart. `fileField` defaults to `file`.
   */
  public async createTaskMultipart(
    params: Record<string, unknown>,
    file: Blob | Buffer,
    filename = 'captcha.png',
    fileField = 'file',
  ): Promise<string> {
    const payload = this.envelope(params);
    const form = new FormData();
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === null) continue;
      form.append(key, typeof value === 'string' ? value : String(value));
    }
    const blob = file instanceof Blob ? file : new Blob([Uint8Array.from(file)]);
    form.append(fileField, blob, filename);

    return this.withRetries(async () => {
      try {
        const response = await this.http.post('/in.php', form);
        return this.readTaskId(this.ensureHttpOk(response.status, response.data));
      } catch (err: unknown) {
        throw this.wrapTransport(err, 'createTaskMultipart');
      }
    });
  }

  /**
   * One `res.php?action=get` poll.
   * Returns the solution string, or `null` while the code is `CAPCHA_NOT_READY`.
   */
  public async getTaskResult(taskId: string): Promise<string | null> {
    try {
      return await this.queryResult({ action: 'get', id: taskId });
    } catch (err: unknown) {
      if (this.isNotReady(err)) return null;
      throw err;
    }
  }

  /** Poll `res.php` until the captcha is solved or the timeout elapses. */
  public async waitForResult(taskId: string, options?: PollingOptions): Promise<string> {
    const timeoutMs = options?.timeoutMs ?? this.defaultPollingTimeoutMs;
    const intervalMs = options?.intervalMs ?? this.defaultPollingIntervalMs;
    const started = Date.now();
    const deadline = started + timeoutMs;
    let attempt = 0;

    while (true) {
      this.throwIfAborted(options?.signal);
      attempt += 1;
      const result = await this.getTaskResult(taskId);
      if (result !== null) return result;
      options?.onNotReady?.({ taskId, attempt, elapsedMs: Date.now() - started });
      if (Date.now() >= deadline) {
        throw createCapGuruError(
          `Timeout of ${timeoutMs}ms exceeded while waiting for task ${taskId}`,
          'TIMEOUT',
        );
      }
      const wait = Math.min(intervalMs, Math.max(0, deadline - Date.now()));
      await sleep(wait, options?.signal);
    }
  }

  /** Report a correct solution (`action=reportgood`). */
  public async reportGood(taskId: string): Promise<boolean> {
    await this.queryResult({ action: 'reportgood', id: taskId });
    return true;
  }

  /** Alias of {@link reportGood}. */
  public reportCorrect(taskId: string): Promise<boolean> {
    return this.reportGood(taskId);
  }

  /** Report a wrong solution (`action=reportbad`). */
  public async reportBad(taskId: string): Promise<boolean> {
    await this.queryResult({ action: 'reportbad', id: taskId });
    return true;
  }

  /** Alias of {@link reportBad}. */
  public reportIncorrect(taskId: string): Promise<boolean> {
    return this.reportBad(taskId);
  }

  /**
   * Anti-Captcha compatible `POST /createTask`.
   * `clientKey`, `softId`, and `softguru` are set to this client's key and developer id.
   */
  public async createJsonTask(task: JsonTaskPayload, options?: JsonTaskOptions): Promise<string> {
    const body: Record<string, unknown> = {
      ...(options?.extra ?? {}),
      clientKey: this.apiKey,
      task,
      softId: DEFAULT_SOFTGURU,
      softguru: DEFAULT_SOFTGURU,
    };
    if (options?.languagePool) body.languagePool = options.languagePool;

    return this.withRetries(async () => {
      try {
        const response = await this.http.post('/createTask', body);
        return this.readJsonTaskId(this.ensureHttpOk(response.status, response.data));
      } catch (err: unknown) {
        throw this.wrapTransport(err, 'createJsonTask');
      }
    });
  }

  /**
   * Anti-Captcha compatible `POST /getTaskResult`.
   * Returns `null` while the task is processing or `CAPCHA_NOT_READY`.
   */
  public async getJsonTaskResult(taskId: string): Promise<JsonTaskResult | null> {
    return this.withRetries(async () => {
      try {
        const response = await this.http.post('/getTaskResult', {
          clientKey: this.apiKey,
          taskId,
        });
        return this.readJsonTaskResult(taskId, this.ensureHttpOk(response.status, response.data));
      } catch (err: unknown) {
        throw this.wrapTransport(err, 'getJsonTaskResult');
      }
    });
  }

  /** Poll `/getTaskResult` until the JSON task is ready. */
  public async waitForJsonResult(taskId: string, options?: PollingOptions): Promise<JsonTaskResult> {
    const timeoutMs = options?.timeoutMs ?? this.defaultPollingTimeoutMs;
    const intervalMs = options?.intervalMs ?? this.defaultPollingIntervalMs;
    const started = Date.now();
    const deadline = started + timeoutMs;
    let attempt = 0;

    while (true) {
      this.throwIfAborted(options?.signal);
      attempt += 1;
      const result = await this.getJsonTaskResult(taskId);
      if (result) return result;
      options?.onNotReady?.({ taskId, attempt, elapsedMs: Date.now() - started });
      if (Date.now() >= deadline) {
        throw createCapGuruError(
          `Timeout of ${timeoutMs}ms exceeded while waiting for task ${taskId}`,
          'TIMEOUT',
        );
      }
      const wait = Math.min(intervalMs, Math.max(0, deadline - Date.now()));
      await sleep(wait, options?.signal);
    }
  }

  /** Create a JSON task and wait for its solution object. */
  public async solveJsonTask(
    task: JsonTaskPayload,
    options?: JsonTaskOptions & PollingOptions,
  ): Promise<JsonTaskResult> {
    const taskId = await this.createJsonTask(task, options);
    return this.waitForJsonResult(taskId, options);
  }

  private async submitClick(options: ClickCaptchaOptions, polling?: PollingOptions): Promise<string> {
    const params: Record<string, unknown> = {
      method: 'base64',
      textinstructions: options.textinstructions,
      click: options.click,
    };
    this.assignDefined(params, {
      body: options.body,
      body0: options.body0,
      body1: options.body1,
    });
    this.assignExtra(params, options.extra);
    const taskId = await this.createTask(params);
    return this.waitForResult(taskId, this.resolvePolling(options, polling));
  }

  private solvePrefixed(
    prefix: string,
    options: InstructionClickOptions,
    polling?: PollingOptions,
  ): Promise<ClickSolution> {
    return this.solveClick(
      {
        textinstructions: `${prefix},${options.instruction}`,
        click: CLICK.OTHER,
        body: options.body,
        body0: options.body0,
        body1: options.body1,
        extra: options.extra,
        timeoutMs: options.timeoutMs,
        intervalMs: options.intervalMs,
        onNotReady: options.onNotReady,
        signal: options.signal,
      },
      polling,
    );
  }

  private async queryResult(params: Record<string, unknown>): Promise<string> {
    const payload = {
      ...params,
      key: this.apiKey,
      json: 1,
    };
    return this.withRetries(async () => {
      try {
        const response = await this.http.get('/res.php', { params: payload });
        return this.readSolution(this.ensureHttpOk(response.status, response.data));
      } catch (err: unknown) {
        throw this.wrapTransport(err, 'queryResult');
      }
    });
  }

  private envelope(params: Record<string, unknown>): Record<string, unknown> {
    return {
      ...params,
      key: this.apiKey,
      json: 1,
      softguru: DEFAULT_SOFTGURU,
    };
  }

  private applyTransport(params: Record<string, unknown>, options: TokenTransportOptions): void {
    this.assignDefined(params, {
      cookies: options.cookies,
      userAgent: options.userAgent,
      proxy: options.proxy,
      proxytype: options.proxyType,
    });
    this.assignExtra(params, options.extra);
  }

  private assignDefined(target: Record<string, unknown>, source: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined) target[key] = value;
    }
  }

  private assignExtra(target: Record<string, unknown>, extra?: Record<string, unknown>): void {
    if (!extra) return;
    for (const [key, value] of Object.entries(extra)) {
      if (target[key] === undefined) target[key] = value;
    }
  }

  private resolvePolling(source?: PollingOptions, extra?: PollingOptions): PollingOptions {
    return {
      timeoutMs: extra?.timeoutMs ?? source?.timeoutMs,
      intervalMs: extra?.intervalMs ?? source?.intervalMs,
      onNotReady: extra?.onNotReady ?? source?.onNotReady,
      signal: extra?.signal ?? source?.signal,
    };
  }

  private readTaskId(data: unknown): string {
    const payload = coerceRucaptcha(data);
    if (payload) {
      if (isSuccessStatus(payload.status) && payload.request !== undefined && payload.request !== null && `${payload.request}` !== '') {
        return String(payload.request);
      }
      if (isFailureStatus(payload.status) && payload.request) {
        throw apiError(String(payload.request), data);
      }
    }
    const jsonId = this.readJsonTaskIdOrNull(data);
    if (jsonId) return jsonId;
    throw createCapGuruError(
      `Unexpected /in.php response: ${JSON.stringify(data)}`,
      'INVALID_RESPONSE',
      data,
    );
  }

  private readSolution(data: unknown): string {
    const payload = coerceRucaptcha(data);
    if (payload) {
      if (isSuccessStatus(payload.status) && payload.request !== undefined && payload.request !== null) {
        return requestToString(payload.request);
      }
      if (isFailureStatus(payload.status) && payload.request) {
        throw apiError(String(payload.request), data);
      }
    }
    throw createCapGuruError(
      `Unexpected /res.php response: ${JSON.stringify(data)}`,
      'INVALID_RESPONSE',
      data,
    );
  }

  private readJsonTaskId(data: unknown): string {
    const id = this.readJsonTaskIdOrNull(data);
    if (id) return id;
    const payload = coerceRucaptcha(data);
    if (payload && isFailureStatus(payload.status) && payload.request) {
      throw apiError(String(payload.request), data);
    }
    throw createCapGuruError(
      `Unexpected /createTask response: ${JSON.stringify(data)}`,
      'INVALID_RESPONSE',
      data,
    );
  }

  private readJsonTaskIdOrNull(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null;
    const record = data as Record<string, unknown>;
    const errorId = record.errorId;
    if (typeof errorId === 'number' && errorId !== 0) {
      const code = String(record.errorCode ?? record.errorDescription ?? 'ERROR');
      throw apiError(code, data);
    }
    if (record.taskId !== undefined && record.taskId !== null && record.status === undefined) {
      return String(record.taskId);
    }
    return null;
  }

  private readJsonTaskResult(taskId: string, data: unknown): JsonTaskResult | null {
    if (!data || typeof data !== 'object') {
      const payload = coerceRucaptcha(data);
      if (payload && isFailureStatus(payload.status) && payload.request) {
        if (String(payload.request) === 'CAPCHA_NOT_READY') return null;
        throw apiError(String(payload.request), data);
      }
      throw createCapGuruError(
        `Unexpected /getTaskResult response: ${JSON.stringify(data)}`,
        'INVALID_RESPONSE',
        data,
      );
    }
    const record = data as Record<string, unknown>;
    if (typeof record.errorId === 'number' && record.errorId !== 0) {
      const code = String(record.errorCode ?? record.errorDescription ?? 'ERROR');
      if (code === 'CAPCHA_NOT_READY') return null;
      throw apiError(code, data);
    }
    const status = typeof record.status === 'string' ? record.status : '';
    if (status === 'processing' || status === 'pending') return null;
    if (status === 'ready') {
      return { taskId: String(record.taskId ?? taskId), status, solution: record.solution ?? null, raw: data };
    }
    const payload = coerceRucaptcha(data);
    if (payload && isSuccessStatus(payload.status) && payload.request !== undefined) {
      return {
        taskId,
        status: 'ready',
        solution: payload.request,
        raw: data,
      };
    }
    if (payload && isFailureStatus(payload.status) && payload.request) {
      if (String(payload.request) === 'CAPCHA_NOT_READY') return null;
      throw apiError(String(payload.request), data);
    }
    throw createCapGuruError(
      `Unexpected /getTaskResult response: ${JSON.stringify(data)}`,
      'INVALID_RESPONSE',
      data,
    );
  }

  private ensureHttpOk(status: number, data: unknown): unknown {
    if (status < 400) return data;
    const payload = coerceRucaptcha(data);
    if (payload && isFailureStatus(payload.status) && payload.request) {
      throw apiError(String(payload.request), data);
    }
    throw createCapGuruError(`HTTP ${status}: ${JSON.stringify(data)}`, 'HTTP_ERROR', data);
  }

  private wrapTransport(err: unknown, operation: string): Error {
    if (err instanceof CapGuruError) return err;
    if (isAxiosError(err) && err.response) {
      try {
        this.ensureHttpOk(err.response.status, err.response.data);
      } catch (parsed: unknown) {
        if (parsed instanceof CapGuruError) return parsed;
      }
    }
    const message = err instanceof Error ? err.message : String(err);
    return createCapGuruError(`${operation} request failed: ${message}`, 'NETWORK_ERROR');
  }

  private async withRetries<T>(fn: () => Promise<T>): Promise<T> {
    const attempts = this.maxRetries + 1;
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (err: unknown) {
        attempt += 1;
        const code = err instanceof CapGuruError ? err.code : undefined;
        const retryable = !!code && RETRYABLE_ERROR_CODES.has(code);
        if (!retryable || attempt >= attempts) throw err;
        if (this.retryDelayMs > 0) await sleep(this.retryDelayMs);
      }
    }
  }

  private isNotReady(err: unknown): boolean {
    return err instanceof CapGuruError && err.code === 'CAPCHA_NOT_READY';
  }

  private throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw createCapGuruError('Polling aborted', 'ABORTED');
    }
  }
}

export const CapGuru = CapGuruClient;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createCapGuruError('Polling aborted', 'ABORTED'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(createCapGuruError('Polling aborted', 'ABORTED'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function isSuccessStatus(status: number | string | undefined): boolean {
  return status === 1 || status === '1';
}

function isFailureStatus(status: number | string | undefined): boolean {
  return status === 0 || status === '0';
}

function requestToString(request: unknown): string {
  if (typeof request === 'string') return request;
  if (typeof request === 'number' || typeof request === 'boolean') return String(request);
  return JSON.stringify(request);
}

function coerceRucaptcha(data: unknown): RucaptchaPayload | null {
  if (typeof data === 'number' || typeof data === 'boolean') {
    return { status: 1, request: data };
  }
  if (typeof data === 'string') {
    const text = data.trim();
    if (!text) return null;
    if (text.startsWith('OK|')) return { status: 1, request: text.slice(3) };
    if (text === 'OK') return { status: 1, request: 'OK' };
    if (
      text.startsWith('ERROR') ||
      text === 'CAPCHA_NOT_READY' ||
      text === 'notpic'
    ) {
      return { status: 0, request: text };
    }
    return { status: 1, request: text };
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as RucaptchaPayload;
  }
  return null;
}
