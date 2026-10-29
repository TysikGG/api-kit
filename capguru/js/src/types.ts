import type { ClickType, ProxyType } from './constants.js';

/**
 * Configuration for {@link CapGuruClient}.
 * A string argument is accepted as a shorthand for `{ apiKey }`.
 */
export interface CapGuruOptions {
  /** API key from the Cap.guru dashboard. */
  apiKey: string;
  /**
   * API origin. Defaults to `https://api.cap.guru`.
   * Official docs also list `https://api2.cap.guru` and `https://ipv6.cap.guru`.
   */
  baseUrl?: string;
  /** HTTP timeout in milliseconds. Defaults to 30000. */
  timeout?: number;
  /** Polling budget for solve helpers, in milliseconds. Defaults to 120000. */
  defaultPollingTimeoutMs?: number;
  /** Delay between result polls, in milliseconds. Defaults to 5000. */
  defaultPollingIntervalMs?: number;
  /**
   * Extra attempts after a network failure, HTTP error, or `ERROR_NO_SLOT_AVAILABLE`.
   * Defaults to 0 so existing callers keep a single attempt.
   */
  maxRetries?: number;
  /** Delay before a retry, in milliseconds. Defaults to 0. */
  retryDelayMs?: number;
  /** Extra headers sent on every request. */
  headers?: Record<string, string>;
}

/** Shared polling controls accepted by solve helpers and {@link CapGuruClient.waitForResult}. */
export interface PollingOptions {
  /** Maximum wait in milliseconds. Falls back to the client default. */
  timeoutMs?: number;
  /** Delay between polls in milliseconds. Falls back to the client default. */
  intervalMs?: number;
  /** Called each time the task is still `CAPCHA_NOT_READY`. */
  onNotReady?: (info: { taskId: string; attempt: number; elapsedMs: number }) => void;
  /** Aborts the wait when the signal aborts. */
  signal?: AbortSignal;
}

/** Fields forwarded on token tasks that accept a worker proxy, cookies, or user agent. */
export interface TokenTransportOptions {
  /** Cookie header value forwarded to the worker. */
  cookies?: string;
  /** Browser user agent forwarded to the worker. */
  userAgent?: string;
  /**
   * Proxy string. IP auth: `host:port`. Login auth: `user:pass@host:port`.
   */
  proxy?: string;
  /** Proxy protocol. Required by the API when `proxy` is set. */
  proxyType?: ProxyType;
  /** Additional `in.php` fields merged under the explicit parameters. */
  extra?: Record<string, unknown>;
}

/** Normal image / text-from-image captcha. */
export interface ImageCaptchaOptions extends PollingOptions {
  /** Base64-encoded image, without a `data:` prefix. */
  body: string;
  /** 0 = one word, 1 = two or more words. */
  phrase?: 0 | 1;
  /** 0 = case insensitive, 1 = case sensitive. */
  regsense?: 0 | 1;
  /** 0 = not specified, 1 = numbers, 2 = letters, 3 = numbers or letters. */
  numeric?: 0 | 1 | 2 | 3;
  /** 1 when the captcha is a math expression. */
  calc?: 0 | 1;
  /** Minimum answer length. */
  minLen?: number;
  /** Maximum answer length. */
  maxLen?: number;
  /** 0 = all, 1 = Cyrillic, 2 = Latin. */
  language?: 0 | 1 | 2;
  /** Worker instructions. */
  textinstructions?: string;
  /**
   * Recognition preset. See {@link VERNET}.
   * Example: `5` for Microsoft Hotmail.
   */
  vernet?: number;
  extra?: Record<string, unknown>;
}

/** Options for a multipart image upload (`method=post`). */
export interface ImageFileOptions extends Omit<ImageCaptchaOptions, 'body'> {
  /** File name sent with the multipart body. Defaults to `captcha.png`. */
  filename?: string;
}

/** Text question captcha. */
export interface TextCaptchaOptions extends PollingOptions {
  /** 0 = all, 1 = Cyrillic, 2 = Latin. */
  language?: 0 | 1 | 2;
  extra?: Record<string, unknown>;
}

/** Google reCAPTCHA v2, including invisible and Enterprise. */
export interface RecaptchaV2Options extends PollingOptions, TokenTransportOptions {
  /** Site key (`data-sitekey` or the `k` query parameter). */
  googlekey: string;
  /** Full URL of the page that renders the widget. */
  pageurl: string;
  /** Set to 1 for invisible reCAPTCHA. */
  invisible?: 0 | 1;
  /** `data-s` value used by some Google properties. */
  dataS?: string;
  /** Set to 1 for reCAPTCHA Enterprise. */
  enterprise?: 0 | 1;
}

/** Google reCAPTCHA v3. */
export interface RecaptchaV3Options extends PollingOptions, TokenTransportOptions {
  googlekey: string;
  pageurl: string;
  /** Action configured on the widget. */
  action?: string;
  /** Minimum score from 0.1 to 0.9. The service default is 0.1. */
  minScore?: number;
  /** Set to 1 for reCAPTCHA v3 Enterprise. */
  enterprise?: 0 | 1;
}

/** Cloudflare Turnstile token task. */
export interface TurnstileOptions extends PollingOptions, TokenTransportOptions {
  sitekey: string;
  pageurl: string;
  /** Optional action. Passed through when the widget defines one. */
  action?: string;
  /** Optional cData / `data` value. */
  data?: string;
}

/**
 * hCaptcha token task.
 * Cap.guru currently documents token solving as unavailable and recommends
 * {@link CapGuruClient.solveHCaptchaClick} instead. The method remains because
 * the parameters are still published and older integrations call it.
 */
export interface HCaptchaOptions extends PollingOptions, TokenTransportOptions {
  sitekey: string;
  pageurl: string;
  /** Set to 1 for invisible hCaptcha. */
  invisible?: 0 | 1;
  /** Custom `rqdata` payload. */
  data?: string;
}

/** Arkose Labs FunCaptcha token task. */
export interface FunCaptchaOptions extends PollingOptions, TokenTransportOptions {
  publickey: string;
  pageurl: string;
  /** Arkose service URL (`surl`). */
  surl?: string;
  /** Extra blob / data payload. */
  data?: string;
}

/** GeeTest v3 token task. */
export interface GeeTestOptions extends PollingOptions, TokenTransportOptions {
  gt: string;
  challenge: string;
  pageurl: string;
  /** API server subdomain, sent as `api_server`. */
  apiServer?: string;
}

/** Image click or slider task (`method=base64` plus `click`). */
export interface ClickCaptchaOptions extends PollingOptions {
  /** Instruction text. English, except where a preset such as `custom1222` is required. */
  textinstructions: string;
  /** Recognition mode. See {@link CLICK}. */
  click: ClickType;
  /** Single base64 image. */
  body?: string;
  /** First image when the task needs a pair (slider background). */
  body0?: string;
  /** Second image (slider piece). */
  body1?: string;
  extra?: Record<string, unknown>;
}

export interface GridClickOptions extends Omit<ClickCaptchaOptions, 'click' | 'textinstructions'> {
  textinstructions: string;
  /** When true, request cell indexes (`*2` click modes) instead of coordinates. */
  grid?: boolean;
}

export interface BinanceOptions extends PollingOptions {
  body?: string;
  body0?: string;
  body1?: string;
  /**
   * Object name such as `dog`, sent as `binance,dog`.
   * Ignored when `textinstructions` is set.
   */
  object?: string;
  /** Full instruction override, for example `binance,dog`. */
  textinstructions?: string;
  /** `true` uses `click=geetest2` (cell numbers). Default is coordinates. */
  grid?: boolean;
  extra?: Record<string, unknown>;
}

export type TikTokVariant = 'kolesso' | 'koleso' | 'abc' | 'slider' | 'question';

export interface TikTokOptions extends PollingOptions {
  /**
   * `kolesso` / `koleso` (two images), `abc`, `slider`, or `question`
   * (`abc,<english question>`).
   */
  variant?: TikTokVariant;
  /** Required when `variant` is `question`. */
  question?: string;
  body?: string;
  body0?: string;
  body1?: string;
  /** Overrides the instruction derived from `variant`. */
  textinstructions?: string;
  extra?: Record<string, unknown>;
}

export interface AwsOptions extends PollingOptions {
  body?: string;
  body0?: string;
  body1?: string;
  /**
   * English instruction. Prefixed with `Amazon,` when that prefix is missing.
   * Example: `Place a dot at the end of the car's path`.
   */
  instruction?: string;
  textinstructions?: string;
  extra?: Record<string, unknown>;
}

export interface TemuOptions extends PollingOptions {
  textinstructions: string;
  body?: string;
  body0?: string;
  body1?: string;
  extra?: Record<string, unknown>;
}

export interface SliderOptions extends PollingOptions {
  /** Full captcha image, or the background when `piece` / `body1` is set. */
  body?: string;
  /** Puzzle piece. Sent as `body1` with the background in `body0`. */
  piece?: string;
  body0?: string;
  body1?: string;
  /** Defaults to `slider`. Use `kolesso` for the two-image TikTok slider. */
  textinstructions?: string;
  /** Defaults to `geetest`. */
  click?: ClickType;
  extra?: Record<string, unknown>;
}

export interface InstructionClickOptions extends PollingOptions {
  /** English (or, for SeoFast, the documented language) instruction text. */
  instruction: string;
  body?: string;
  body0?: string;
  body1?: string;
  extra?: Record<string, unknown>;
}

/** Anti-Captcha compatible task object passed to `/createTask`. */
export interface JsonTaskPayload {
  type: string;
  [key: string]: unknown;
}

export interface JsonTaskOptions {
  /** `en` or `rn`, forwarded as `languagePool` when set. */
  languagePool?: string;
  extra?: Record<string, unknown>;
}
