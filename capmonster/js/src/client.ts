import axios, { type AxiosInstance } from "axios";

import {
  CapMonsterError,
  createCapMonsterError,
  describeCapMonsterError,
  isRetryableCapMonsterError,
} from "./errors.js";
import type {
  CapMonsterBalance,
  CapMonsterOptions,
  CreateTaskOptions,
  PollUpdate,
  RawApiResponse,
  ReportResult,
  SolveResult,
  TaskResult,
  WaitForOptions,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.capmonster.cloud";
const DEFAULT_USER_AGENT_URL = "https://capmonster.cloud/api/useragent/actual";
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Developer software id sent as `softId` on createTask.
 *
 * TODO: CapMonster Cloud's developer program is pending approval, so no
 * softId has been issued yet. Leave this empty. When a numeric id is
 * assigned, set it here. Requests omit `softId` until this constant or the
 * client `softId` option is a non-empty value.
 *
 * The createTask field name is `softId` (same name as the official client).
 * @see https://docs.capmonster.cloud/docs/api/methods/create-task/
 */
export const DEFAULT_SOFT_ID = "";

/**
 * Client for the CapMonster Cloud recognition API.
 *
 * @example
 * ```ts
 * const client = new CapMonster({ clientKey: "your_client_key" });
 * const balance = await client.getBalance();
 * ```
 */
export class CapMonster {
  private readonly clientKey: string;
  private readonly softId: number | string;
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly userAgentUrl: string;
  private readonly http: AxiosInstance;

  /**
   * @param options Client options or client key string.
   */
  constructor(options: CapMonsterOptions | string) {
    const config: CapMonsterOptions =
      typeof options === "string" ? { clientKey: options } : options;

    if (!config.clientKey?.trim()) {
      throw createCapMonsterError("Client key is required", 1, "MISSING_CLIENT_KEY");
    }

    this.clientKey = effectiveClientKey(config.clientKey.trim(), config);
    this.softId = config.softId ?? DEFAULT_SOFT_ID;
    this.retries = config.retries ?? 0;
    this.retryDelayMs = config.retryDelayMs ?? 1_000;
    this.userAgentUrl = config.userAgentUrl ?? DEFAULT_USER_AGENT_URL;
    const baseURL = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");

    this.http =
      config.axios ??
      axios.create({
        baseURL,
        timeout: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
  }

  /**
   * Check account balance. This call does not spend credit.
   *
   * @example
   * ```ts
   * const { balance } = await client.getBalance();
   * console.log(`Balance: ${balance}`);
   * ```
   */
  async getBalance(): Promise<CapMonsterBalance> {
    const response = await this.post<RawApiResponse>("/getBalance", {
      clientKey: this.clientKey,
    });

    return { balance: response.balance ?? 0 };
  }

  /**
   * Current Windows User-Agent supported by CapMonster Cloud.
   * Send the same value on the task and on the target site.
   *
   * @see https://docs.capmonster.cloud/docs/api/methods/get-user-agent/
   */
  async getUserAgent(): Promise<string> {
    try {
      const res = await this.http.get<string>(this.userAgentUrl, {
        responseType: "text",
        transformResponse: [(data: unknown) => data],
      });
      const text = String(res.data ?? "").trim();
      if (!text) {
        throw createCapMonsterError(
          "Empty user agent response",
          0,
          "EMPTY_USER_AGENT",
          res.status,
          res.data,
        );
      }
      return text;
    } catch (err: unknown) {
      if (err instanceof CapMonsterError) throw err;
      throw this.wrapTransportError(err);
    }
  }

  /**
   * Submit a recognition task.
   *
   * `softId` is included only when {@link DEFAULT_SOFT_ID} or the client
   * option is set. Pass `options.softId` to override it for one call.
   *
   * @param task Captcha task object (`type` required; `class` for CustomTask).
   * @returns The numeric `taskId`.
   *
   * @example
   * ```ts
   * const taskId = await client.createTask({
   *   type: "TurnstileTask",
   *   websiteURL: "https://example.com",
   *   websiteKey: "0x4AAAAAAA...",
   * });
   * ```
   */
  async createTask<T extends { type: string }>(
    task: T,
    options: CreateTaskOptions = {},
  ): Promise<number> {
    const response = await this.post<RawApiResponse>(
      "/createTask",
      this.createTaskBody(task, options),
    );
    const taskId = normalizeTaskId(response.taskId);
    if (taskId === undefined) {
      throw createCapMonsterError(
        "Response missing taskId",
        response.errorId ?? 0,
        response.errorCode ?? undefined,
        200,
        response,
      );
    }
    return taskId;
  }

  /**
   * Query the result of a submitted task.
   *
   * `CAPTCHA_NOT_READY` is returned as `{ status: "processing" }` so callers
   * can keep polling. Every other API error is thrown.
   *
   * @param taskId Task identifier returned by `createTask`.
   */
  async getTaskResult<T = Record<string, unknown>>(
    taskId: number | string,
  ): Promise<TaskResult<T>> {
    const id = requireTaskId(taskId);

    try {
      const response = await this.post<RawApiResponse<T>>("/getTaskResult", {
        clientKey: this.clientKey,
        taskId: id,
      });

      return {
        status: response.status === "ready" ? "ready" : "processing",
        solution: response.solution,
      };
    } catch (err: unknown) {
      if (err instanceof CapMonsterError && err.errorCode === "CAPTCHA_NOT_READY") {
        return { status: "processing" };
      }
      throw err;
    }
  }

  /**
   * Poll `getTaskResult` until the solution is ready or the timeout is reached.
   *
   * @param taskId Task identifier.
   * @param options Polling configuration (intervalMs, timeoutMs, AbortSignal).
   */
  async waitForResult<T = Record<string, unknown>>(
    taskId: number | string,
    options: WaitForOptions = {},
  ): Promise<T> {
    const solved = await this.poll<T>(taskId, options);
    return solved.solution;
  }

  /**
   * Submit a task and wait for its completion in a single call.
   *
   * @example
   * ```ts
   * const solution = await client.solve<{ token: string }>({
   *   type: "TurnstileTask",
   *   websiteURL: "https://example.com",
   *   websiteKey: "0x4AAAAAAA...",
   * });
   * ```
   */
  async solve<TSolution = Record<string, unknown>, TTask extends { type: string } = { type: string }>(
    task: TTask,
    options: WaitForOptions & CreateTaskOptions = {},
  ): Promise<TSolution> {
    const solved = await this.solveDetailed<TSolution, TTask>(task, options);
    return solved.solution;
  }

  /**
   * Same as `solve`, and also returns the `taskId` so a rejected token can be reported.
   */
  async solveDetailed<
    TSolution = Record<string, unknown>,
    TTask extends { type: string } = { type: string },
  >(
    task: TTask,
    options: WaitForOptions & CreateTaskOptions = {},
  ): Promise<SolveResult<TSolution>> {
    const taskId = await this.createTask(task, {
      softId: options.softId,
      callbackUrl: options.callbackUrl,
    });
    return this.poll<TSolution>(taskId, options);
  }

  /**
   * Report an image captcha answer that was wrong.
   *
   * @see https://docs.capmonster.cloud/docs/api/bad-tokens/
   */
  async reportIncorrectImageCaptcha(taskId: number | string): Promise<ReportResult> {
    return this.report("/reportIncorrectImageCaptcha", taskId);
  }

  /**
   * Report a token captcha (reCAPTCHA, GeeTest, Turnstile, and similar) that the site rejected.
   *
   * @see https://docs.capmonster.cloud/docs/api/bad-tokens/
   */
  async reportIncorrectTokenCaptcha(taskId: number | string): Promise<ReportResult> {
    return this.report("/reportIncorrectTokenCaptcha", taskId);
  }

  /**
   * Alias of the token report. CapMonster documents `/reportIncorrectRecaptcha`
   * as the same operation as `/reportIncorrectTokenCaptcha`.
   */
  async reportIncorrectRecaptcha(taskId: number | string): Promise<ReportResult> {
    return this.report("/reportIncorrectRecaptcha", taskId);
  }

  /** Short alias of {@link reportIncorrectImageCaptcha}. */
  async reportIncorrectImage(taskId: number | string): Promise<ReportResult> {
    return this.reportIncorrectImageCaptcha(taskId);
  }

  /** Short alias of {@link reportIncorrectTokenCaptcha}. */
  async reportIncorrectToken(taskId: number | string): Promise<ReportResult> {
    return this.reportIncorrectTokenCaptcha(taskId);
  }

  private createTaskBody(
    task: { type: string },
    options: CreateTaskOptions,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      clientKey: this.clientKey,
      task,
    };

    const softId = options.softId ?? this.softId;
    if (hasSoftId(softId)) {
      payload.softId = formatSoftId(softId);
    }
    if (options.callbackUrl) {
      payload.callbackUrl = options.callbackUrl;
    }
    return payload;
  }

  private async report(path: string, taskId: number | string): Promise<ReportResult> {
    const id = requireTaskId(taskId);
    const response = await this.post<RawApiResponse>(path, {
      clientKey: this.clientKey,
      taskId: id,
    });
    if (response.status && response.status !== "success") {
      throw createCapMonsterError(
        `Report was not accepted (status: ${response.status})`,
        response.errorId ?? 0,
        response.errorCode ?? undefined,
        200,
        response,
      );
    }
    return { status: "success" };
  }

  private async poll<T>(
    taskId: number | string,
    options: WaitForOptions,
  ): Promise<SolveResult<T>> {
    const id = requireTaskId(taskId);
    const intervalMs = options.intervalMs ?? 3_000;
    const timeoutMs = options.timeoutMs ?? 120_000;
    const startTime = Date.now();
    let attempt = 0;

    if (options.initialDelayMs && options.initialDelayMs > 0) {
      await delay(options.initialDelayMs, options.signal);
    }

    for (;;) {
      throwIfAborted(options.signal);
      attempt += 1;
      const res = await this.getTaskResult<T>(id);
      const update: PollUpdate<T> = {
        taskId: id,
        attempt,
        status: res.status,
        solution: res.solution,
      };
      options.onPoll?.(update);

      if (res.status === "ready" && res.solution) {
        return { taskId: id, solution: res.solution };
      }

      if (options.maxAttempts !== undefined && attempt >= options.maxAttempts) {
        throw createCapMonsterError(
          "Timed out waiting for captcha solution",
          0,
          "TIMEOUT",
        );
      }

      if (Date.now() - startTime >= timeoutMs) {
        throw createCapMonsterError(
          "Timed out waiting for captcha solution",
          0,
          "TIMEOUT",
        );
      }

      await delay(intervalMs, options.signal);
    }
  }

  private async post<T extends RawApiResponse>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const attempts = Math.max(0, this.retries) + 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await this.postOnce<T>(path, body);
      } catch (err: unknown) {
        lastError = err;
        if (attempt >= attempts || !isRetryableCapMonsterError(err)) {
          throw err;
        }
        await delay(this.retryDelayMs * attempt);
      }
    }

    // The loop always returns or throws. This guards the type checker.
    // istanbul ignore next
    throw new CapMonsterError("Request failed", 0);
  }

  private async postOnce<T extends RawApiResponse>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    try {
      const res = await this.http.post<T>(path, body);
      const data = res.data;
      assertNoApiError(data, res.status);
      return data;
    } catch (err: unknown) {
      if (err instanceof CapMonsterError) throw err;
      throw this.wrapTransportError(err);
    }
  }

  private wrapTransportError(err: unknown): CapMonsterError {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 0;
      const data = isApiResponse(err.response?.data) ? err.response?.data : undefined;
      const errorCode = data?.errorCode ?? undefined;
      const message = data
        ? describeCapMonsterError(
            errorCode,
            data.errorDescription ?? undefined,
            data.errorId ?? 0,
          )
        : (err.message ?? `HTTP request failed with status ${status}`);

      return createCapMonsterError(
        message,
        data?.errorId ?? 0,
        errorCode,
        status,
        data ?? err.response?.data,
      );
    }

    return createCapMonsterError(err instanceof Error ? err.message : "Unknown error", 0);
  }
}

function isApiResponse(value: unknown): value is RawApiResponse {
  return Boolean(value) && typeof value === "object";
}

function assertNoApiError(data: RawApiResponse | undefined, httpStatus: number): void {
  if (!data || typeof data !== "object") {
    throw createCapMonsterError(
      "Unexpected non-JSON response from CapMonster Cloud API",
      0,
      undefined,
      httpStatus,
      data,
    );
  }

  if (data.errorId && data.errorId !== 0) {
    const errorCode = data.errorCode ?? undefined;
    throw createCapMonsterError(
      describeCapMonsterError(errorCode, data.errorDescription ?? undefined, data.errorId),
      data.errorId,
      errorCode,
      httpStatus,
      data,
    );
  }
}

/**
 * Apply optional client-key suffixes documented by CapMonster.
 * Order matches the docs: module, then recognizing threshold, then nocache.
 */
export function effectiveClientKey(
  clientKey: string,
  options: Pick<CapMonsterOptions, "moduleName" | "recognizingThreshold" | "nocache">,
): string {
  let key = clientKey;
  if (options.moduleName && options.moduleName.trim()) {
    key = `${key}__${options.moduleName.trim()}`;
  }
  if (options.recognizingThreshold !== undefined && options.recognizingThreshold !== null) {
    key = `${key}__recognizingthreshold_${options.recognizingThreshold}`;
  }
  if (options.nocache) {
    key = `${key}__nocache`;
  }
  return key;
}

/** True when a softId should be sent. Empty string and 0 are treated as unset. */
export function hasSoftId(value: number | string | undefined | null): value is number | string {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  return value !== 0;
}

/** CapMonster expects a numeric `softId`. Numeric strings are sent as numbers. */
export function formatSoftId(value: number | string): number | string {
  if (typeof value === "number") return value;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function requireTaskId(taskId: number | string): number {
  const id = normalizeTaskId(taskId);
  if (id === undefined) {
    throw createCapMonsterError(`Invalid taskId: ${taskId}`, 1, "WRONG_CAPTCHA_ID");
  }
  return id;
}

function normalizeTaskId(taskId: number | string | undefined | null): number | undefined {
  if (taskId === undefined || taskId === null || taskId === "") return undefined;
  const value = typeof taskId === "number" ? taskId : Number(taskId);
  if (!Number.isInteger(value) || value <= 0) return undefined;
  return value;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createCapMonsterError("waitForResult aborted", 0, "ABORTED");
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ms <= 0) {
      throwIfAborted(signal);
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(createCapMonsterError("Operation aborted", 0, "ABORTED"));
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}
