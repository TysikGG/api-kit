import type { AxiosInstance } from "axios";

/** Proxy protocols accepted by CapMonster Cloud task objects. */
export type ProxyType = "http" | "https" | "socks4" | "socks5";

/**
 * Optional proxy fields shared by task types that can use a customer proxy.
 * Built-in CapMonster proxies are used when these fields are omitted.
 */
export interface ProxyFields {
  proxyType?: ProxyType;
  proxyAddress?: string;
  proxyPort?: number;
  proxyLogin?: string;
  proxyPassword?: string;
}

/** Options for configuring the CapMonster Cloud client. */
export interface CapMonsterOptions {
  /** Client key from the CapMonster Cloud dashboard. */
  clientKey: string;

  /** API base URL. Defaults to `https://api.capmonster.cloud`. */
  baseUrl?: string;

  /** Request timeout in milliseconds. Defaults to 30000ms. */
  timeoutMs?: number;

  /**
   * Developer software id sent as `softId` on `createTask`.
   * Empty until the CapMonster developer program assigns one.
   */
  softId?: number | string;

  /** Custom Axios instance, useful for testing or custom proxies. */
  axios?: AxiosInstance;
}

/** Account balance returned by `getBalance`. */
export interface CapMonsterBalance {
  /** Available balance. */
  balance: number;
}

/**
 * Open task object accepted by `createTask`.
 * Prefer the named task interfaces below so `type` (and `class`, where required) stay correct.
 */
export interface TaskParams {
  /** Task type name, for example `RecaptchaV2Task` or `CustomTask`. */
  type: string;

  [key: string]: unknown;
}

/** reCAPTCHA v2. Docs: RecaptchaV2Task. */
export interface RecaptchaV2Task extends ProxyFields {
  type: "RecaptchaV2Task" | "RecaptchaV2TaskProxyless" | "NoCaptchaTask" | "NoCaptchaTaskProxyless";
  websiteURL: string;
  websiteKey: string;
  recaptchaDataSValue?: string;
  userAgent?: string;
  cookies?: string;
  isInvisible?: boolean;
}

/** reCAPTCHA v2 Enterprise. */
export interface RecaptchaV2EnterpriseTask extends ProxyFields {
  type: "RecaptchaV2EnterpriseTask";
  websiteURL: string;
  websiteKey: string;
  enterprisePayload?: Record<string, unknown>;
  recaptchaDataSValue?: string;
  userAgent?: string;
  pageAction?: string;
  apiDomain?: string;
  cookies?: string;
}

/** reCAPTCHA v3 (proxyless). Set `isEnterprise` to solve v3 Enterprise with this shape. */
export interface RecaptchaV3Task {
  type: "RecaptchaV3TaskProxyless";
  websiteURL: string;
  websiteKey: string;
  minScore?: number;
  pageAction?: string;
  isEnterprise?: boolean;
}

/** reCAPTCHA v3 Enterprise. */
export interface RecaptchaV3EnterpriseTask {
  type: "RecaptchaV3EnterpriseTask";
  websiteURL: string;
  websiteKey: string;
  minScore?: number;
  pageAction?: string;
  userAgent?: string;
}

/**
 * Cloudflare Turnstile, including Challenge and Waiting Room variants
 * selected with `cloudflareTaskType`.
 */
export interface TurnstileTask extends ProxyFields {
  type: "TurnstileTask";
  websiteURL: string;
  websiteKey: string;
  userAgent?: string;
  pageAction?: string;
  data?: string;
  pageData?: string;
  cloudflareTaskType?: "token" | "cf_clearance";
  htmlPageBase64?: string;
  apiJsUrl?: string;
}

/** GeeTest v3 (`version: "3"`, `challenge` required) and v4 (`version: "4"`). */
export interface GeeTestTask extends ProxyFields {
  type: "GeeTestTask";
  websiteURL: string;
  gt: string;
  version?: "3" | "4" | 3 | 4;
  challenge?: string;
  geetestApiServerSubdomain?: string;
  geetestGetLib?: string;
  initParameters?: Record<string, string>;
  userAgent?: string;
}

/** Image-to-text captcha. Proxy is not used. */
export interface ImageToTextTask {
  type: "ImageToTextTask";
  /** Base64 image, one line, no line breaks. */
  body: string;
  capMonsterModule?: string;
  recognizingThreshold?: number;
  /** When true, character case is significant. */
  case?: boolean;
  /** `1` when the captcha contains digits only. */
  numeric?: 0 | 1;
  /** When true, evaluate the math expression shown in the image. */
  math?: boolean;
}

/** Complex image click / grid / recognition captcha. */
export interface ComplexImageTask {
  type: "ComplexImageTask";
  /** `recaptcha`, `hcaptcha`, `funcaptcha`, or `recognition`. */
  class: "recaptcha" | "hcaptcha" | "funcaptcha" | "recognition" | (string & {});
  imageUrls?: string[];
  imagesBase64?: string[];
  exampleImagesBase64?: string[];
  exampleImageUrls?: string[];
  metadata?: Record<string, unknown>;
  userAgent?: string;
  websiteURL?: string;
}

/** DataDome. Requires your own proxy. */
export interface DataDomeTask extends ProxyFields {
  type: "CustomTask";
  class: "DataDome";
  websiteURL: string;
  metadata: {
    captchaUrl?: string;
    htmlPageBase64?: string;
    datadomeCookie: string;
    datadomeVersion?: string;
    [key: string]: string | undefined;
  };
  userAgent?: string;
}

/**
 * TenDI (Tencent captcha).
 * CapMonster documents this as TenDI, not Tenable.
 */
export interface TenDITask extends ProxyFields {
  type: "CustomTask";
  class: "TenDI";
  websiteURL: string;
  websiteKey: string;
  userAgent?: string;
  metadata?: {
    captchaUrl?: string;
    aidEncrypted?: string;
    [key: string]: string | undefined;
  };
}

/** Amazon / AWS WAF. */
export interface AmazonTask extends ProxyFields {
  type: "AmazonTask";
  websiteURL: string;
  websiteKey: string;
  captchaScript?: string;
  challengeScript?: string;
  context?: string;
  iv?: string;
  cookieSolution?: boolean;
  userAgent?: string;
}

/** Binance captcha. */
export interface BinanceTask extends ProxyFields {
  type: "BinanceTask";
  websiteURL: string;
  websiteKey: string;
  validateId: string;
  userAgent?: string;
}

/** Arkose Labs FunCaptcha. Requires your own proxy. */
export interface FunCaptchaTask extends ProxyFields {
  type: "FunCaptchaTask";
  websiteURL: string;
  websitePublicKey: string;
  funcaptchaApiJSSubdomain?: string;
  data?: string;
  cookies?: string;
  userAgent?: string;
}

/** hCaptcha. */
export interface HCaptchaTask extends ProxyFields {
  type: "HCaptchaTask" | "HCaptchaTaskProxyless";
  websiteURL: string;
  websiteKey: string;
  isInvisible?: boolean;
  data?: string;
  userAgent?: string;
  cookies?: string;
  fallbackToActualUA?: boolean;
}

/** Basilisk captcha (`CustomTask` / `Basilisk`). */
export interface BasiliskTask extends ProxyFields {
  type: "CustomTask";
  class: "Basilisk";
  websiteURL: string;
  websiteKey: string;
  userAgent?: string;
}

/** Imperva / Incapsula (`CustomTask` / `Imperva`). */
export interface ImpervaTask extends ProxyFields {
  type: "CustomTask";
  class: "Imperva";
  websiteURL: string;
  userAgent?: string;
  metadata: {
    incapsulaScriptUrl: string;
    incapsulaCookies: string;
    reese84UrlEndpoint?: string;
  };
}

/** Prosopo captcha. */
export interface ProsopoTask extends ProxyFields {
  type: "ProsopoTask";
  websiteURL: string;
  websiteKey: string;
}

/** Yidun / NetEase captcha. */
export interface YidunTask extends ProxyFields {
  type: "YidunTask";
  websiteURL: string;
  websiteKey: string;
  userAgent?: string;
  yidunGetLib?: string;
  yidunApiServerSubdomain?: string;
  challenge?: string;
  hcg?: string;
  hct?: number;
}

/** MTCaptcha. */
export interface MTCaptchaTask extends ProxyFields {
  type: "MTCaptchaTask";
  websiteURL: string;
  websiteKey: string;
  userAgent?: string;
  pageAction?: string;
  isInvisible?: boolean;
}

/** Altcha (`CustomTask` / `altcha`). */
export interface AltchaTask extends ProxyFields {
  type: "CustomTask";
  class: "altcha";
  websiteURL: string;
  websiteKey: string;
  userAgent?: string;
  metadata: {
    challenge: string;
    iterations: string;
    salt: string;
    signature: string;
  };
}

/** Friendly Captcha (`CustomTask` / `friendly`). */
export interface FriendlyCaptchaTask extends ProxyFields {
  type: "CustomTask";
  class: "friendly";
  websiteURL: string;
  websiteKey: string;
  userAgent?: string;
  metadata: {
    apiGetLib: string;
  };
}

/** Temu captcha (`CustomTask` / `Temu`). */
export interface TemuTask extends ProxyFields {
  type: "CustomTask";
  class: "Temu";
  websiteURL: string;
  userAgent?: string;
  metadata: {
    cookie: string;
  };
}

/** Castle (`CustomTask` / `Castle`). */
export interface CastleTask extends ProxyFields {
  type: "CustomTask";
  class: "Castle";
  websiteURL: string;
  websiteKey: string;
  userAgent?: string;
  metadata: {
    wUrl: string;
    swUrl: string;
    count?: number;
  };
}

/** TSPD (`CustomTask` / `tspd`). */
export interface TspdTask extends ProxyFields {
  type: "CustomTask";
  class: "tspd";
  websiteURL: string;
  userAgent: string;
  metadata: {
    tspdCookie: string;
    htmlPageBase64: string;
  };
}

/** Hunt CAPTCHA (`CustomTask` / `HUNT`). */
export interface HuntTask extends ProxyFields {
  type: "CustomTask";
  class: "HUNT";
  websiteURL: string;
  userAgent?: string;
  metadata: {
    apiGetLib: string;
    data?: string;
  };
}

/** Alibaba captcha (`CustomTask` / `alibaba`). */
export interface AlibabaTask extends ProxyFields {
  type: "CustomTask";
  class: "alibaba";
  websiteURL: string;
  userAgent?: string;
  metadata: {
    sceneId: string;
    prefix: string;
    userId?: string;
    userUserId?: string;
    verifyType?: string;
    region?: string;
    UserCertifyId?: string;
    apiGetLib?: string;
  };
}

/** Documented `type` values. */
export const TASK_TYPES = {
  recaptchaV2: "RecaptchaV2Task",
  recaptchaV2Proxyless: "RecaptchaV2TaskProxyless",
  noCaptcha: "NoCaptchaTask",
  noCaptchaProxyless: "NoCaptchaTaskProxyless",
  recaptchaV2Enterprise: "RecaptchaV2EnterpriseTask",
  recaptchaV3: "RecaptchaV3TaskProxyless",
  recaptchaV3Enterprise: "RecaptchaV3EnterpriseTask",
  turnstile: "TurnstileTask",
  geeTest: "GeeTestTask",
  imageToText: "ImageToTextTask",
  complexImage: "ComplexImageTask",
  custom: "CustomTask",
  funCaptcha: "FunCaptchaTask",
  hCaptcha: "HCaptchaTask",
  hCaptchaProxyless: "HCaptchaTaskProxyless",
  amazon: "AmazonTask",
  binance: "BinanceTask",
  prosopo: "ProsopoTask",
  yidun: "YidunTask",
  mtCaptcha: "MTCaptchaTask",
} as const;

/** Documented `class` values used with `CustomTask` and `ComplexImageTask`. */
export const TASK_CLASSES = {
  dataDome: "DataDome",
  tenDI: "TenDI",
  basilisk: "Basilisk",
  imperva: "Imperva",
  altcha: "altcha",
  friendly: "friendly",
  temu: "Temu",
  castle: "Castle",
  tspd: "tspd",
  hunt: "HUNT",
  alibaba: "alibaba",
  complexRecaptcha: "recaptcha",
  complexHCaptcha: "hcaptcha",
  complexFunCaptcha: "funcaptcha",
  complexRecognition: "recognition",
} as const;

/** Status of a submitted captcha task. */
export type TaskStatus = "processing" | "ready";

/** Result returned by `getTaskResult`. */
export interface TaskResult<T = Record<string, unknown>> {
  /** `processing` while the task is still being solved, otherwise `ready`. */
  status: TaskStatus;

  /** Solution payload when status is `ready`. */
  solution?: T;
}

/** Options for polling task completion. */
export interface WaitForOptions {
  /** Polling interval in milliseconds. Defaults to 3000ms (API minimum is 2s). */
  intervalMs?: number;

  /** Maximum wait time in milliseconds before timing out. Defaults to 120000ms. */
  timeoutMs?: number;

  /** Optional AbortSignal to cancel polling. */
  signal?: AbortSignal;
}

/** Extra fields for a single `createTask` call. */
export interface CreateTaskOptions {
  /**
   * Override the client `softId` for this request.
   * Omitted from the body when empty.
   */
  softId?: number | string;

  /** Optional URL that receives the getTaskResult payload by POST. */
  callbackUrl?: string;
}

/** Raw API response envelope. */
export interface RawApiResponse<T = unknown> {
  errorId: number;
  errorCode?: string | null;
  errorDescription?: string | null;
  taskId?: number | string;
  status?: TaskStatus;
  solution?: T;
  balance?: number;
}
