import { TASK_TYPES } from "./types.js";
import type {
  FunCaptchaTask,
  HCaptchaEnterpriseTask,
  HCaptchaTask,
  RecaptchaMobileProxylessTask,
  RecaptchaMobileTask,
  RecaptchaV2EnterpriseProxylessTask,
  RecaptchaV2EnterpriseTask,
  RecaptchaV2HsEnterpriseTask,
  RecaptchaV2Task,
  RecaptchaV3HsTask,
  RecaptchaV3ProxylessTask,
  RecaptchaV3Task,
  TurnstileProxylessTask,
  TurnstileTask,
} from "./types.js";

type WithoutType<T extends { type: string }> = Omit<T, "type">;

/** Build a reCAPTCHA v2 proxyless task (`RecaptchaV2TaskProxyless`). */
export function recaptchaV2Task(task: WithoutType<RecaptchaV2Task>): RecaptchaV2Task {
  return { type: TASK_TYPES.recaptchaV2, ...task };
}

/** Build a reCAPTCHA v2 Enterprise task that uses a customer proxy. */
export function recaptchaV2EnterpriseTask(
  task: WithoutType<RecaptchaV2EnterpriseTask>,
): RecaptchaV2EnterpriseTask {
  return { type: TASK_TYPES.recaptchaV2Enterprise, ...task };
}

/** Build a reCAPTCHA v2 Enterprise proxyless task. */
export function recaptchaV2EnterpriseProxylessTask(
  task: WithoutType<RecaptchaV2EnterpriseProxylessTask>,
): RecaptchaV2EnterpriseProxylessTask {
  return { type: TASK_TYPES.recaptchaV2EnterpriseProxyless, ...task };
}

/** Build a high-score reCAPTCHA v2 Enterprise proxyless task. */
export function recaptchaV2HsEnterpriseTask(
  task: WithoutType<RecaptchaV2HsEnterpriseTask>,
): RecaptchaV2HsEnterpriseTask {
  return { type: TASK_TYPES.recaptchaV2HsEnterprise, ...task };
}

/** Build a reCAPTCHA v3 task that uses a customer proxy. */
export function recaptchaV3Task(task: WithoutType<RecaptchaV3Task>): RecaptchaV3Task {
  return { type: TASK_TYPES.recaptchaV3, ...task };
}

/** Build a reCAPTCHA v3 proxyless task. */
export function recaptchaV3ProxylessTask(
  task: WithoutType<RecaptchaV3ProxylessTask>,
): RecaptchaV3ProxylessTask {
  return { type: TASK_TYPES.recaptchaV3Proxyless, ...task };
}

/** Build a high-score reCAPTCHA v3 proxyless task. */
export function recaptchaV3HsTask(task: WithoutType<RecaptchaV3HsTask>): RecaptchaV3HsTask {
  return { type: TASK_TYPES.recaptchaV3Hs, ...task };
}

/** Build a mobile reCAPTCHA task that uses a customer proxy. */
export function recaptchaMobileTask(
  task: WithoutType<RecaptchaMobileTask>,
): RecaptchaMobileTask {
  return { type: TASK_TYPES.recaptchaMobile, ...task };
}

/** Build a mobile reCAPTCHA proxyless task. */
export function recaptchaMobileProxylessTask(
  task: WithoutType<RecaptchaMobileProxylessTask>,
): RecaptchaMobileProxylessTask {
  return { type: TASK_TYPES.recaptchaMobileProxyless, ...task };
}

/** Build a Cloudflare Turnstile cf_clearance task (`TurnstileTask`). */
export function turnstileTask(task: WithoutType<TurnstileTask>): TurnstileTask {
  return { type: TASK_TYPES.turnstile, ...task };
}

/** Build a Cloudflare Turnstile token task (`TurnstileTaskProxyless`). */
export function turnstileProxylessTask(
  task: WithoutType<TurnstileProxylessTask>,
): TurnstileProxylessTask {
  return { type: TASK_TYPES.turnstileProxyless, ...task };
}

/** Build an hCaptcha task. Pass `proxyAddress` to select the proxy variant. */
export function hCaptchaTask(
  task: Omit<HCaptchaTask, "type"> & { proxyless?: boolean },
): HCaptchaTask {
  const { proxyless, ...fields } = task;
  const type =
    proxyless || !fields.proxyAddress ? TASK_TYPES.hcaptchaProxyless : TASK_TYPES.hcaptcha;
  return { type, ...fields };
}

/** Build an hCaptcha Enterprise task. */
export function hCaptchaEnterpriseTask(
  task: WithoutType<HCaptchaEnterpriseTask>,
): HCaptchaEnterpriseTask {
  return { type: TASK_TYPES.hcaptchaEnterprise, ...task };
}

/** Build a FunCaptcha task. Pass `proxyAddress` to select the proxy variant. */
export function funCaptchaTask(
  task: Omit<FunCaptchaTask, "type"> & { proxyless?: boolean },
): FunCaptchaTask {
  const { proxyless, ...fields } = task;
  const type =
    proxyless || !fields.proxyAddress
      ? TASK_TYPES.funCaptchaProxyless
      : TASK_TYPES.funCaptcha;
  return { type, ...fields };
}
