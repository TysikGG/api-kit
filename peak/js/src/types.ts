import type { AxiosInstance } from "axios";

import type { PeakErrorCode } from "./errors.js";

/** Options for configuring the Peak client. */
export interface PeakOptions {
  /** API key from the Peak dashboard (`pk_...`). */
  apiKey: string;

  /** Base URL for the Peak API. Defaults to `https://api.peak.fo`. */
  baseUrl?: string;

  /** Request timeout in milliseconds. Defaults to 60000. */
  timeoutMs?: number;

  /**
   * HTTP or HTTPS proxy used only to reach the Peak API.
   * This is not the proxy Peak uses to open the target site.
   * Pass that proxy on the solve method instead. SOCKS URLs are rejected here.
   */
  httpProxy?: string;

  /**
   * Extra attempts after a retryable failure. Defaults to `0` (a single try).
   * Authentication, balance, and bad-request errors are never retried.
   * Successful solves are not retried, so a retry cannot double-bill.
   */
  retries?: number;

  /** Delay between retries in milliseconds. Defaults to 1000. Ignored when `retries` is 0. */
  retryDelayMs?: number;

  /**
   * Wall-clock budget for the whole retry loop in milliseconds.
   * When omitted, the loop is bounded only by `retries` and the per-request timeout.
   */
  retryTimeoutMs?: number;

  /** Called after every successful solve, in addition to a per-call callback. */
  onResult?: (event: SolveEvent) => void;

  /** Custom Axios instance, useful for tests or a fully custom transport. */
  axios?: AxiosInstance;
}

/** Per-call overrides for retries and the local result callback. */
export interface CallOptions {
  retries?: number;
  retryDelayMs?: number;
  retryTimeoutMs?: number;
  /** Local callback. Peak's API has no server-side webhook field. */
  onResult?: (event: SolveEvent) => void;
}

/** Emitted after a solve returns `success: true`. */
export interface SolveEvent<T = unknown> {
  taskType: string;
  data: T;
}

/** Balance details for a pay-per-solve account. */
export interface PayPerSolveBalance {
  type: "pay_per_solve";
  balance: number;
}

/**
 * Balance details for a package / subscription account.
 * Older responses use `package`. Current responses use `package_name`,
 * `remaining_solves`, `total_solves`, and `allowed_tasks`.
 */
export interface PackageBalance {
  type: "package";
  /** Legacy package label. */
  package?: string;
  package_name?: string;
  remaining_solves?: number;
  total_solves?: number;
  allowed_tasks?: string[];
  expires_at?: string;
  days_remaining?: number;
}

/** Account balance information. */
export type BalanceData = PayPerSolveBalance | PackageBalance;

/** Response returned by `GET /balance`. */
export interface BalanceResponse {
  success: boolean;
  data?: BalanceData;
  error?: string;
}

/** Structured proxy. Serialized to `scheme://user:pass@host:port` for Peak. */
export interface ProxyConfig {
  /** Defaults to `http`. `socks5` and `socks5h` are valid on solve proxies. */
  protocol?: "http" | "https" | "socks4" | "socks5" | "socks5h";
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export type ProxyInput = string | ProxyConfig;

/** Parameters for solving a Cloudflare Turnstile challenge. */
export interface SolveTurnstileParams extends CallOptions {
  /** Target page URL. A missing trailing slash is added for you. */
  url: string;

  /** Cloudflare Turnstile sitekey. */
  sitekey: string;

  /** Turnstile action value, if configured on the target site. */
  action?: string;

  /** Turnstile cdata value, if configured on the target site. */
  cdata?: string;

  /**
   * Proxy in `http://user:pass@ip:port` form, or a {@link ProxyConfig}.
   * When omitted, the proxyless task `TurnstileTaskProxyLess` is used.
   */
  proxy?: ProxyInput;

  /**
   * Override the task type Peak receives.
   * By default a proxy selects `turnstiletask` and no proxy selects `TurnstileTaskProxyLess`.
   */
  taskType?: string;
}

/** Result of solving a Turnstile challenge. */
export interface TurnstileResult {
  /** The generated `cf-turnstile-response` token. */
  token: string;
}

/** Parameters for solving a Cloudflare 5-second challenge (WAF / Under Attack mode). */
export interface SolveCloudflare5sParams extends CallOptions {
  /** Target page URL. A missing trailing slash is added for you. */
  url: string;

  /** Sticky proxy in `http://user:pass@ip:port` form, or a {@link ProxyConfig}. */
  proxy: ProxyInput;

  /** Windows Chrome user-agent string. Other user-agents are rejected by Peak. */
  userAgent?: string;

  /** Optional pre-fetched HTML so Peak can skip the first fetch. */
  html?: string;

  /** Override the task type. Defaults to `cloudflare5stask`. */
  taskType?: string;
}

/** Form attributes to POST to the target URL. */
export interface Cloudflare5sAttributes {
  md: string;
  r: string;
  [key: string]: string;
}

/** Result of solving a Cloudflare 5-second challenge. */
export interface Cloudflare5sResult {
  /** Clearance cookies to apply to your HTTP session. */
  cookies: Record<string, string>;

  /** Required headers, including the exact user-agent to keep using. */
  headers: {
    "user-agent"?: string;
    [key: string]: string | undefined;
  };

  /** Form attributes to POST to the target URL. */
  attributes: Cloudflare5sAttributes;

  /** Challenge token for the Referer header (`{url}?__cf_chl_tk={cf_rt}`). */
  cf_rt: string;
}

/** Mobile operating system for the AWS WAF task. */
export type AwsWafOs = "ios" | "android";

/**
 * Parameters for the AWS WAF mobile-SDK task (`awswaftask`).
 * Peak has shipped this task as disabled; the call still matches the official SDK
 * and surfaces {@link import("./errors.js").TaskDisabledError} when the platform rejects it.
 */
export interface SolveAwsWafParams extends CallOptions {
  /** App or site URL. A missing trailing slash is added for you. */
  url: string;

  /** AWS WAF SDK endpoint, typically `https://....edge.sdk.awswaf.com/...`. */
  sdkUrl: string;

  /** Proxy in `http://user:pass@ip:port` form, or a {@link ProxyConfig}. */
  proxy: ProxyInput;

  /** Mobile application user-agent. */
  userAgent: string;

  /** `ios` (default) or `android`. */
  os?: AwsWafOs;

  /** Override the task type. Defaults to `awswaftask`. */
  taskType?: string;
}

/** Result of an AWS WAF solve. */
export interface AwsWafResult {
  token: string;
}

/** Raw API envelope returned by Peak endpoints. */
export interface RawApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Request pieces for finishing a Cloudflare 5-second challenge. */
export interface ClearanceRequest {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: string;
  cookies: Record<string, string>;
  cookieHeader: string;
  referer: string;
  userAgent: string;
}

/** Documented task type strings. */
export const TaskType = {
  Turnstile: "turnstiletask",
  TurnstileProxyLess: "TurnstileTaskProxyLess",
  Cloudflare5s: "cloudflare5stask",
  AwsWaf: "awswaftask",
} as const;

export type TaskTypeName = (typeof TaskType)[keyof typeof TaskType];

/**
 * Windows Chrome user-agent. Peak only accepts Windows Chrome for the 5-second challenge.
 * Sent only when you pass it; Peak chooses one when `userAgent` is omitted.
 */
export const WINDOWS_CHROME_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const DEFAULT_BASE_URL = "https://api.peak.fo";
export const DEFAULT_TIMEOUT_MS = 60_000;
export const DEFAULT_RETRY_DELAY_MS = 1_000;

/** Re-export so callers can import codes from the types module or the errors module. */
export type { PeakErrorCode };
