import axios, { type AxiosInstance } from "axios";

import {
  BadRequestError,
  classifyPeakError,
  isRetryablePeakError,
  PeakError,
  PeakErrorCode,
  RetryTimeoutError,
} from "./errors.js";
import type {
  AwsWafResult,
  BalanceData,
  CallOptions,
  Cloudflare5sResult,
  PeakOptions,
  ProxyInput,
  RawApiResponse,
  SolveAwsWafParams,
  SolveCloudflare5sParams,
  SolveEvent,
  SolveTurnstileParams,
  TurnstileResult,
} from "./types.js";
import {
  DEFAULT_BASE_URL,
  DEFAULT_RETRY_DELAY_MS,
  DEFAULT_TIMEOUT_MS,
  TaskType,
} from "./types.js";
import {
  assertHttpUrl,
  assertNonEmpty,
  assertPageUrl,
  axiosProxyConfig,
  clampRetries,
  formatProxy,
  sleep,
} from "./util.js";

/** @internal Developer app id attached to every solve. Do not remove. */
export const APP_ID = "app_05c1f418153804ec393a7211";

interface ResolvedCall {
  retries: number;
  retryDelayMs: number;
  retryTimeoutMs?: number;
  onResult?: (event: SolveEvent) => void;
}

/**
 * Client for the Peak CAPTCHA solving API
 * (Cloudflare Turnstile, Cloudflare 5-second challenge, and AWS WAF).
 *
 * Solves return in the same HTTP call. There is no task id to poll.
 * Use `timeoutMs` for the request and `retries` for transient failures.
 *
 * @example
 * ```ts
 * const client = new Peak({ apiKey: "pk_..." });
 * const balance = await client.getBalance();
 * ```
 */
export class Peak {
  private readonly http: AxiosInstance;
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly retryTimeoutMs?: number;
  private readonly onResult?: (event: SolveEvent) => void;

  /**
   * @param options Client configuration or a raw API key string.
   */
  constructor(options: PeakOptions | string) {
    const config: PeakOptions =
      typeof options === "string" ? { apiKey: options } : options;

    if (!config.apiKey?.trim()) {
      throw new PeakError("API key is required", 0, undefined, PeakErrorCode.MISSING_API_KEY);
    }

    const baseURL = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");

    this.retries = clampRetries(config.retries, 0);
    this.retryDelayMs = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.retryTimeoutMs = config.retryTimeoutMs;
    this.onResult = config.onResult;

    this.http =
      config.axios ??
      axios.create({
        baseURL,
        timeout: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        ...(config.httpProxy ? { proxy: axiosProxyConfig(config.httpProxy) } : {}),
        headers: {
          "X-API-Key": config.apiKey.trim(),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
  }

  /**
   * Retrieve the current account balance or package subscription.
   * Does not spend credits.
   */
  async getBalance(options?: CallOptions): Promise<BalanceData> {
    return this.withRetry(async () => {
      const response = await this.request<RawApiResponse<BalanceData>>("GET", "/balance");
      return readBalance(response);
    }, options);
  }

  /**
   * Solve Cloudflare Turnstile.
   *
   * Uses `TurnstileTaskProxyLess` when `proxy` is omitted, or `turnstiletask`
   * when a proxy is provided. Pass `taskType` to override that choice.
   * Submit `token` as `cf-turnstile-response`.
   */
  async solveTurnstile(params: SolveTurnstileParams): Promise<TurnstileResult> {
    const url = assertPageUrl(params.url);
    const sitekey = assertNonEmpty(params.sitekey, "sitekey");
    const taskType =
      params.taskType?.trim() ||
      (params.proxy ? TaskType.Turnstile : TaskType.TurnstileProxyLess);

    const payload: Record<string, unknown> = {
      task_type: taskType,
      url,
      sitekey,
    };
    if (params.proxy) payload.proxy = formatProxy(params.proxy);
    if (params.action) payload.action = params.action;
    if (params.cdata) payload.cdata = params.cdata;

    return this.solve<TurnstileResult>(payload, callOptions(params));
  }

  /**
   * Solve a Cloudflare 5-second challenge (WAF / Under Attack Mode).
   * `proxy` must be a sticky session proxy. Only Windows Chrome user-agents are accepted.
   */
  async solveCloudflare5s(
    params: SolveCloudflare5sParams,
  ): Promise<Cloudflare5sResult> {
    const payload = cloudflare5sPayload(params);
    return this.solve<Cloudflare5sResult>(payload, callOptions(params));
  }

  /** Alias of {@link Peak.solveCloudflare5s}. Matches the `solve_cloudflare_waf` name used by the official Python SDK. */
  async solveCloudflareWaf(
    params: SolveCloudflare5sParams,
  ): Promise<Cloudflare5sResult> {
    return this.solveCloudflare5s(params);
  }

  /** Alias of {@link Peak.solveCloudflare5s} using the official JavaScript SDK spelling. */
  async solveCloudFlareWAF(
    params: SolveCloudflare5sParams,
  ): Promise<Cloudflare5sResult> {
    return this.solveCloudflare5s(params);
  }

  /**
   * Solve an AWS WAF challenge for an iOS or Android SDK (`awswaftask`).
   * This task is not part of the browser Turnstile flow. When Peak has it disabled,
   * the call raises {@link TaskDisabledError}.
   */
  async solveAwsWaf(params: SolveAwsWafParams): Promise<AwsWafResult> {
    const payload = awsWafPayload(params);
    return this.solve<AwsWafResult>(payload, callOptions(params));
  }

  /** Alias of {@link Peak.solveAwsWaf} using the official JavaScript SDK spelling. */
  async solveAWSWAF(params: SolveAwsWafParams): Promise<AwsWafResult> {
    return this.solveAwsWaf(params);
  }

  /**
   * Send a raw solve body.
   * The library app id is always written to `appId` and replaces any value in `task`.
   */
  async solve<T = unknown>(
    task: Record<string, unknown>,
    options?: CallOptions,
  ): Promise<T> {
    const payload: Record<string, unknown> = {
      ...task,
      appId: APP_ID,
    };
    const taskType = typeof payload.task_type === "string" ? payload.task_type : "";

    const data = await this.withRetry(async () => {
      const response = await this.request<RawApiResponse<T>>("POST", "/solve", payload);
      return readSolve<T>(response);
    }, options);

    this.emit({ taskType, data }, options?.onResult);
    return data;
  }

  private emit(event: SolveEvent, callHook?: (event: SolveEvent) => void): void {
    if (callHook) callHook(event);
    if (this.onResult && this.onResult !== callHook) this.onResult(event);
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    options?: CallOptions,
  ): Promise<T> {
    const resolved = this.resolveCall(options);
    const started = Date.now();
    let attempt = 0;

    for (;;) {
      try {
        return await fn();
      } catch (err) {
        const canRetry = isRetryablePeakError(err) && attempt < resolved.retries;
        if (!canRetry) throw err;
        attempt += 1;
        this.assertBudget(resolved, started, err);
        await sleep(resolved.retryDelayMs);
        this.assertBudget(resolved, started, err);
      }
    }
  }

  private resolveCall(options?: CallOptions): ResolvedCall {
    return {
      retries: clampRetries(options?.retries, this.retries),
      retryDelayMs: options?.retryDelayMs ?? this.retryDelayMs,
      retryTimeoutMs: options?.retryTimeoutMs ?? this.retryTimeoutMs,
      onResult: options?.onResult,
    };
  }

  private assertBudget(resolved: ResolvedCall, started: number, cause: unknown): void {
    if (resolved.retryTimeoutMs == null) return;
    if (Date.now() - started >= resolved.retryTimeoutMs) {
      throw new RetryTimeoutError("Retry timeout exceeded", cause);
    }
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    data?: unknown,
  ): Promise<T> {
    try {
      const res = await this.http.request<T>({
        method,
        url: path,
        data,
      });
      if (res.data == null || typeof res.data !== "object") {
        throw new PeakError(
          "Unexpected non-JSON response from Peak API",
          res.status,
          res.data,
        );
      }
      return res.data;
    } catch (err: unknown) {
      if (err instanceof PeakError) throw err;
      if (axios.isAxiosError(err)) {
        const status = err.response?.status ?? 0;
        const responseData = err.response?.data;
        const message = messageFromAxios(err.message, status, responseData);
        const timedOut =
          !err.response &&
          (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT");
        if (!err.response) {
          throw new PeakError(
            message,
            0,
            undefined,
            timedOut ? PeakErrorCode.REQUEST_TIMED_OUT : PeakErrorCode.NETWORK,
          );
        }
        throw classifyPeakError(message, status, responseData);
      }
      throw new PeakError(
        err instanceof Error ? err.message : "Unknown request error",
        0,
        undefined,
        PeakErrorCode.NETWORK,
      );
    }
  }
}

/** Alias matching the official SDK class name. */
export class PeakClient extends Peak {}

function callOptions(params: CallOptions): CallOptions {
  return {
    retries: params.retries,
    retryDelayMs: params.retryDelayMs,
    retryTimeoutMs: params.retryTimeoutMs,
    onResult: params.onResult,
  };
}

function cloudflare5sPayload(params: SolveCloudflare5sParams): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    task_type: params.taskType?.trim() || TaskType.Cloudflare5s,
    url: assertPageUrl(params.url),
    proxy: formatProxy(params.proxy as ProxyInput),
  };
  if (params.userAgent) payload.user_agent = params.userAgent;
  if (params.html) payload.html = params.html;
  return payload;
}

function awsWafPayload(params: SolveAwsWafParams): Record<string, unknown> {
  const os = params.os ?? "ios";
  if (os !== "ios" && os !== "android") {
    throw new BadRequestError("os must be 'ios' or 'android'", 0);
  }
  return {
    task_type: params.taskType?.trim() || TaskType.AwsWaf,
    url: assertPageUrl(params.url),
    sdk_url: assertHttpUrl(params.sdkUrl, "sdkUrl"),
    proxy: formatProxy(params.proxy),
    user_agent: assertNonEmpty(params.userAgent, "userAgent"),
    os,
  };
}

function readBalance(body: RawApiResponse<BalanceData>): BalanceData {
  assertObjectEnvelope(body);
  if (body.success !== true || body.error) {
    throw classifyPeakError(body.error || "Failed to retrieve balance", 200, body);
  }
  if (body.data == null) {
    throw new PeakError("Failed to retrieve balance", 200, body);
  }
  return body.data;
}

function readSolve<T>(body: RawApiResponse<T>): T {
  assertObjectEnvelope(body);
  if (body.success !== true || body.error) {
    throw classifyPeakError(body.error || "Solve task failed", 200, body);
  }
  if (body.data == null) {
    throw new PeakError("Missing response data from Peak API", 200, body);
  }
  return body.data;
}

function assertObjectEnvelope(body: unknown): asserts body is RawApiResponse<unknown> {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    throw new PeakError("Unexpected non-JSON response from Peak API", 200, body);
  }
}

function messageFromAxios(fallback: string, status: number, responseData: unknown): string {
  if (responseData && typeof responseData === "object" && "error" in responseData) {
    const error = (responseData as { error?: unknown }).error;
    if (typeof error === "string" && error) return error;
  }
  if (typeof responseData === "string" && responseData.trim()) return responseData;
  return fallback || `Peak HTTP request failed with status ${status}`;
}
