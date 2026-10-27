import type { AxiosInstance } from "axios";

/** Proxy protocols accepted by NextCaptcha task objects. */
export type ProxyType = "http" | "socks4" | "socks5";

/** Optional proxy fields. Required on the proxy task variants. */
export interface ProxyFields {
  proxyType?: ProxyType;
  proxyAddress?: string;
  proxyPort?: number;
  proxyLogin?: string;
  proxyPassword?: string;
}

/** Options for configuring the NextCaptcha client. */
export interface NextCaptchaOptions {
  /** Client key from the NextCaptcha dashboard. */
  clientKey: string;

  /** API base URL for createTask, getTaskResult, and getBalance. Defaults to `https://api.nextcaptcha.com`. */
  baseUrl?: string;

  /** Base URL for getToken. Defaults to `https://api-v2.nextcaptcha.com`. */
  tokenBaseUrl?: string;

  /** Request timeout in milliseconds. Defaults to 30000ms. */
  timeoutMs?: number;

  /**
   * Developer software id sent as the top-level `softId` string on every task request
   * (`createTask` and `getToken`). Defaults to {@link DEFAULT_SOFT_ID}.
   * Pass an empty string to omit the field.
   */
  softId?: string;

  /** Custom Axios instance, useful for testing or custom proxies. */
  axios?: AxiosInstance;
}

/** Account balance returned by `getBalance`. The API sends `balance` as a string. */
export interface NextCaptchaBalance {
  /** Available balance. */
  balance: number;
}

/** Options that apply to one `createTask` or `getToken` call. */
export interface CreateTaskOptions {
  /** Overrides the client `softId` for this request. An empty string omits the field. */
  softId?: string;
  /** URL that receives the solution when the task finishes. */
  callbackUrl?: string;
}

/** Polling options for `waitForResult` and `solve`. */
export interface WaitForOptions {
  /** Delay between getTaskResult calls. Defaults to 1000ms. */
  intervalMs?: number;
  /** Maximum wait. Defaults to 120000ms. */
  timeoutMs?: number;
  /** Aborts polling. */
  signal?: AbortSignal;
}

export type TaskStatus = "processing" | "pending" | "ready" | "failed";

/** Result returned by `getTaskResult` while the task is still running or ready. */
export interface TaskResult<T = Record<string, unknown>> {
  status: TaskStatus | string;
  solution?: T;
}

/** Envelope returned by NextCaptcha JSON endpoints. */
export interface RawApiResponse<T = Record<string, unknown>> {
  errorId?: number;
  errorCode?: string | null;
  errorDescription?: string | null;
  taskId?: number | string;
  status?: TaskStatus | string;
  solution?: T;
  /** Documented as a string, for example `"12.34"`. */
  balance?: number | string;
  createTime?: number;
  endTime?: number;
}

/** Open task object accepted by `createTask` and `getToken`. */
export interface TaskParams {
  type: string;
  [key: string]: unknown;
}

/** reCAPTCHA v2 without a customer proxy. Docs: RecaptchaV2TaskProxyless. */
export interface RecaptchaV2Task {
  type: "RecaptchaV2TaskProxyless";
  websiteURL: string;
  websiteKey: string;
  recaptchaDataSValue?: string;
  isInvisible?: boolean;
  apiDomain?: string;
  websiteInfo?: string;
}

/** reCAPTCHA v2 Enterprise with a customer proxy. Docs: RecaptchaV2EnterpriseTask. */
export interface RecaptchaV2EnterpriseTask extends ProxyFields {
  type: "RecaptchaV2EnterpriseTask";
  websiteURL: string;
  websiteKey: string;
  pageAction?: string;
  enterprisePayload?: Record<string, unknown>;
  isInvisible?: boolean;
  apiDomain?: string;
}

/** reCAPTCHA v2 Enterprise without a customer proxy. */
export interface RecaptchaV2EnterpriseProxylessTask {
  type: "RecaptchaV2EnterpriseTaskProxyless";
  websiteURL: string;
  websiteKey: string;
  pageAction?: string;
  enterprisePayload?: Record<string, unknown>;
  isInvisible?: boolean;
  apiDomain?: string;
  websiteInfo?: string;
}

/** High-score reCAPTCHA v2 Enterprise token, proxyless. */
export interface RecaptchaV2HsEnterpriseTask {
  type: "ReCaptchaV2HSEnterpriseTaskProxyLess";
  websiteURL: string;
  websiteKey: string;
  pageAction?: string;
  apiDomain?: string;
  enterprisePayload?: Record<string, unknown>;
  isInvisible?: boolean;
  websiteInfo?: string;
}

/** reCAPTCHA v3 with a customer proxy. Docs: RecaptchaV3Task. */
export interface RecaptchaV3Task extends ProxyFields {
  type: "RecaptchaV3Task";
  websiteURL: string;
  websiteKey: string;
  pageAction?: string;
  isSession?: boolean;
  apiDomain?: string;
}

/** reCAPTCHA v3 without a customer proxy. */
export interface RecaptchaV3ProxylessTask {
  type: "RecaptchaV3TaskProxyless";
  websiteURL: string;
  websiteKey: string;
  pageAction?: string;
  isSession?: boolean;
  apiDomain?: string;
  websiteInfo?: string;
}

/** High-score reCAPTCHA v3 token, proxyless. */
export interface RecaptchaV3HsTask {
  type: "ReCaptchaV3HSTaskProxyLess";
  websiteURL: string;
  websiteKey: string;
  pageAction?: string;
  isSession?: boolean;
  apiDomain?: string;
  websiteInfo?: string;
}

/** Mobile reCAPTCHA with a customer proxy. The request example uses `ReCaptchaMobileTask`. */
export interface RecaptchaMobileTask extends ProxyFields {
  type: "ReCaptchaMobileTask";
  appPackageName: string;
  appKey: string;
  appAction: string;
  appDevice?: "ios" | "Android";
}

/** Mobile reCAPTCHA without a customer proxy. */
export interface RecaptchaMobileProxylessTask {
  type: "RecaptchaMobileTaskProxyless";
  appPackageName: string;
  appKey: string;
  appAction: string;
  appDevice?: "ios" | "Android";
}

/** Cloudflare 403 / cf_clearance. Docs: TurnstileTask. */
export interface TurnstileTask extends ProxyFields {
  type: "TurnstileTask";
  websiteURL: string;
  htmlPageBase64?: string;
}

/** Cloudflare Turnstile token, proxyless. */
export interface TurnstileProxylessTask {
  type: "TurnstileTaskProxyless";
  websiteURL: string;
  websiteKey: string;
  pageAction?: string;
  data?: string;
  pagedata?: string;
}

/**
 * hCaptcha. The current apidocs sidebar lists reCAPTCHA and Turnstile only.
 * The official NextCaptcha clients still submit `HCaptchaTask` and `HCaptchaTaskProxyless`.
 */
export interface HCaptchaTask extends ProxyFields {
  type: "HCaptchaTask" | "HCaptchaTaskProxyless";
  websiteURL: string;
  websiteKey: string;
  isInvisible?: boolean;
  enterprisePayload?: Record<string, unknown>;
}

/** hCaptcha Enterprise, as submitted by the official NextCaptcha clients. */
export interface HCaptchaEnterpriseTask extends ProxyFields {
  type: "HCaptchaEnterpriseTask";
  websiteURL: string;
  websiteKey: string;
  isInvisible?: boolean;
  enterprisePayload?: Record<string, unknown>;
}

/**
 * Arkose Labs FunCaptcha, as submitted by the official NextCaptcha clients.
 * `data` is the optional blob payload.
 */
export interface FunCaptchaTask extends ProxyFields {
  type: "FunCaptchaTask" | "FunCaptchaTaskProxyless";
  websitePublicKey: string;
  websiteURL?: string;
  data?: string;
}

/**
 * Documented `type` strings.
 *
 * JSON examples on the task pages are the source for the value that is sent.
 * High-score and mobile proxy types keep the casing from those examples
 * (`ReCaptcha…ProxyLess`, `ReCaptchaMobileTask`).
 */
export const TASK_TYPES = {
  recaptchaV2: "RecaptchaV2TaskProxyless",
  recaptchaV2Enterprise: "RecaptchaV2EnterpriseTask",
  recaptchaV2EnterpriseProxyless: "RecaptchaV2EnterpriseTaskProxyless",
  recaptchaV2HsEnterprise: "ReCaptchaV2HSEnterpriseTaskProxyLess",
  recaptchaV3: "RecaptchaV3Task",
  recaptchaV3Proxyless: "RecaptchaV3TaskProxyless",
  recaptchaV3Hs: "ReCaptchaV3HSTaskProxyLess",
  recaptchaMobile: "ReCaptchaMobileTask",
  recaptchaMobileProxyless: "RecaptchaMobileTaskProxyless",
  turnstile: "TurnstileTask",
  turnstileProxyless: "TurnstileTaskProxyless",
  hcaptcha: "HCaptchaTask",
  hcaptchaProxyless: "HCaptchaTaskProxyless",
  hcaptchaEnterprise: "HCaptchaEnterpriseTask",
  funCaptcha: "FunCaptchaTask",
  funCaptchaProxyless: "FunCaptchaTaskProxyless",
} as const;
