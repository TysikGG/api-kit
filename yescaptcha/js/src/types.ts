import type { AxiosInstance } from "axios";

/** Options for configuring the YesCaptcha client. */
export interface YesCaptchaOptions {
  /** Client key from the YesCaptcha dashboard. */
  clientKey: string;

  /** API Base URL. Defaults to `https://api.yescaptcha.com`. */
  baseUrl?: string;

  /** Request timeout in milliseconds. Defaults to 30000ms. */
  timeoutMs?: number;

  /** Custom Axios instance, useful for testing or custom proxies. */
  axios?: AxiosInstance;
}

/** Account balance information. */
export interface YesCaptchaBalance {
  /** Current account balance. */
  balance: number;

  /** Developer balance from software rewards. */
  softBalance?: number;

  /** Referral invite balance. */
  inviteBalance?: number;

  /** Inviter ID, if registered under an inviter. */
  inviteBy?: number;
}

/** Generic parameters for captcha tasks. */
export interface TaskParams {
  /** Task type name, e.g. `NoCaptchaTaskProxyless`, `TurnstileTaskProxyless`, etc. */
  type: string;

  [key: string]: unknown;
}

/** Status of a submitted captcha task. */
export type TaskStatus = "processing" | "ready";

/** Result returned by `getTaskResult`. */
export interface TaskResult<T = Record<string, unknown>> {
  /** Status of the task: `processing` or `ready`. */
  status: TaskStatus;

  /** Solution payload when status is `ready`. */
  solution?: T;
}

/** Options for polling task completion. */
export interface WaitForOptions {
  /** Polling interval in milliseconds. Defaults to 3000ms. */
  intervalMs?: number;

  /** Maximum wait time in milliseconds before timing out. Defaults to 120000ms. */
  timeoutMs?: number;

  /** Optional AbortSignal to cancel polling. */
  signal?: AbortSignal;
}

/** Raw API response envelope. */
export interface RawApiResponse<T = unknown> {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  taskId?: string;
  status?: TaskStatus;
  solution?: T;
  balance?: number;
  softBalance?: number;
  inviteBalance?: number;
  inviteBy?: number;
}
