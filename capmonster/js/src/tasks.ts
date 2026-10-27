import type {
  AlibabaTask,
  AltchaTask,
  AmazonTask,
  BasiliskTask,
  BinanceTask,
  CastleTask,
  ComplexImageTask,
  DataDomeTask,
  FriendlyCaptchaTask,
  FunCaptchaTask,
  GeeTestTask,
  HCaptchaTask,
  HuntTask,
  ImageToTextTask,
  ImpervaTask,
  MTCaptchaTask,
  ProsopoTask,
  RecaptchaV2EnterpriseTask,
  RecaptchaV2Task,
  RecaptchaV3EnterpriseTask,
  RecaptchaV3Task,
  TenDITask,
  TemuTask,
  TspdTask,
  TurnstileTask,
  YidunTask,
} from "./types.js";

type WithoutType<T extends { type: string }> = Omit<T, "type">;
type WithoutTypeAndClass<T extends { type: string; class: string }> = Omit<T, "type" | "class">;

/** Build a reCAPTCHA v2 task (`RecaptchaV2Task`). */
export function recaptchaV2Task(task: WithoutType<RecaptchaV2Task>): RecaptchaV2Task {
  return { type: "RecaptchaV2Task", ...task };
}

/** Build a reCAPTCHA v2 Enterprise task. */
export function recaptchaV2EnterpriseTask(
  task: WithoutType<RecaptchaV2EnterpriseTask>,
): RecaptchaV2EnterpriseTask {
  return { type: "RecaptchaV2EnterpriseTask", ...task };
}

/** Build a reCAPTCHA v3 task (`RecaptchaV3TaskProxyless`). */
export function recaptchaV3Task(task: WithoutType<RecaptchaV3Task>): RecaptchaV3Task {
  return { type: "RecaptchaV3TaskProxyless", ...task };
}

/** Build a reCAPTCHA v3 Enterprise task. */
export function recaptchaV3EnterpriseTask(
  task: WithoutType<RecaptchaV3EnterpriseTask>,
): RecaptchaV3EnterpriseTask {
  return { type: "RecaptchaV3EnterpriseTask", ...task };
}

/** Build a Cloudflare Turnstile task. Also used for Challenge and Waiting Room. */
export function turnstileTask(task: WithoutType<TurnstileTask>): TurnstileTask {
  return { type: "TurnstileTask", ...task };
}

/** Build a GeeTest v3 or v4 task. */
export function geeTestTask(task: WithoutType<GeeTestTask>): GeeTestTask {
  return { type: "GeeTestTask", ...task };
}

/** Build an ImageToText task. */
export function imageToTextTask(task: WithoutType<ImageToTextTask>): ImageToTextTask {
  return { type: "ImageToTextTask", ...task };
}

/** Build a ComplexImageTask. `class` is required (`recaptcha`, `hcaptcha`, `funcaptcha`, `recognition`). */
export function complexImageTask(task: WithoutType<ComplexImageTask>): ComplexImageTask {
  return { type: "ComplexImageTask", ...task };
}

/** Build a DataDome custom task. */
export function dataDomeTask(task: WithoutTypeAndClass<DataDomeTask>): DataDomeTask {
  return { type: "CustomTask", class: "DataDome", ...task };
}

/**
 * Build a TenDI (Tencent) custom task.
 * CapMonster documents the class as `TenDI`.
 */
export function tenDITask(task: WithoutTypeAndClass<TenDITask>): TenDITask {
  return { type: "CustomTask", class: "TenDI", ...task };
}

/** Build an Amazon / AWS WAF task. */
export function amazonTask(task: WithoutType<AmazonTask>): AmazonTask {
  return { type: "AmazonTask", ...task };
}

/** Build a Binance task. */
export function binanceTask(task: WithoutType<BinanceTask>): BinanceTask {
  return { type: "BinanceTask", ...task };
}

/** Build a FunCaptcha task. */
export function funCaptchaTask(task: WithoutType<FunCaptchaTask>): FunCaptchaTask {
  return { type: "FunCaptchaTask", ...task };
}

/** Build an hCaptcha task. */
export function hCaptchaTask(task: WithoutType<HCaptchaTask>): HCaptchaTask {
  return { type: "HCaptchaTask", ...task };
}

/** Build a Basilisk custom task. */
export function basiliskTask(task: WithoutTypeAndClass<BasiliskTask>): BasiliskTask {
  return { type: "CustomTask", class: "Basilisk", ...task };
}

/** Build an Imperva / Incapsula custom task. */
export function impervaTask(task: WithoutTypeAndClass<ImpervaTask>): ImpervaTask {
  return { type: "CustomTask", class: "Imperva", ...task };
}

/** Build a Prosopo task. */
export function prosopoTask(task: WithoutType<ProsopoTask>): ProsopoTask {
  return { type: "ProsopoTask", ...task };
}

/** Build a Yidun task. */
export function yidunTask(task: WithoutType<YidunTask>): YidunTask {
  return { type: "YidunTask", ...task };
}

/** Build an MTCaptcha task. */
export function mtCaptchaTask(task: WithoutType<MTCaptchaTask>): MTCaptchaTask {
  return { type: "MTCaptchaTask", ...task };
}

/** Build an Altcha custom task. */
export function altchaTask(task: WithoutTypeAndClass<AltchaTask>): AltchaTask {
  return { type: "CustomTask", class: "altcha", ...task };
}

/** Build a Friendly Captcha custom task. */
export function friendlyCaptchaTask(
  task: WithoutTypeAndClass<FriendlyCaptchaTask>,
): FriendlyCaptchaTask {
  return { type: "CustomTask", class: "friendly", ...task };
}

/** Build a Temu custom task. */
export function temuTask(task: WithoutTypeAndClass<TemuTask>): TemuTask {
  return { type: "CustomTask", class: "Temu", ...task };
}

/** Build a Castle custom task. */
export function castleTask(task: WithoutTypeAndClass<CastleTask>): CastleTask {
  return { type: "CustomTask", class: "Castle", ...task };
}

/** Build a TSPD custom task. */
export function tspdTask(task: WithoutTypeAndClass<TspdTask>): TspdTask {
  return { type: "CustomTask", class: "tspd", ...task };
}

/** Build a Hunt CAPTCHA custom task. */
export function huntTask(task: WithoutTypeAndClass<HuntTask>): HuntTask {
  return { type: "CustomTask", class: "HUNT", ...task };
}

/** Build an Alibaba custom task. */
export function alibabaTask(task: WithoutTypeAndClass<AlibabaTask>): AlibabaTask {
  return { type: "CustomTask", class: "alibaba", ...task };
}
