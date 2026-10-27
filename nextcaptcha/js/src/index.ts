export { NextCaptcha, DEFAULT_SOFT_ID } from "./client.js";
export { NEXTCAPTCHA_ERRORS, NextCaptchaError } from "./errors.js";
export {
  funCaptchaTask,
  hCaptchaEnterpriseTask,
  hCaptchaTask,
  recaptchaMobileProxylessTask,
  recaptchaMobileTask,
  recaptchaV2EnterpriseProxylessTask,
  recaptchaV2EnterpriseTask,
  recaptchaV2HsEnterpriseTask,
  recaptchaV2Task,
  recaptchaV3HsTask,
  recaptchaV3ProxylessTask,
  recaptchaV3Task,
  turnstileProxylessTask,
  turnstileTask,
} from "./tasks.js";

export type {
  CreateTaskOptions,
  FunCaptchaTask,
  HCaptchaEnterpriseTask,
  HCaptchaTask,
  NextCaptchaBalance,
  NextCaptchaOptions,
  ProxyFields,
  ProxyType,
  RawApiResponse,
  RecaptchaMobileProxylessTask,
  RecaptchaMobileTask,
  RecaptchaV2EnterpriseProxylessTask,
  RecaptchaV2EnterpriseTask,
  RecaptchaV2HsEnterpriseTask,
  RecaptchaV2Task,
  RecaptchaV3HsTask,
  RecaptchaV3ProxylessTask,
  RecaptchaV3Task,
  TaskParams,
  TaskResult,
  TaskStatus,
  TurnstileProxylessTask,
  TurnstileTask,
  WaitForOptions,
} from "./types.js";

export { TASK_TYPES } from "./types.js";
