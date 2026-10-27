import axios, { type AxiosInstance } from "axios";

import { CapMonsterError, describeCapMonsterError } from "./errors.js";
import type {
  CapMonsterBalance,
  CapMonsterOptions,
  CreateTaskOptions,
  RawApiResponse,
  TaskResult,
  WaitForOptions,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.capmonster.cloud";
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
  private readonly http: AxiosInstance;

  /**
   * @param options Client options or client key string.
   */
  constructor(options: CapMonsterOptions | string) {
    const config: CapMonsterOptions =
      typeof options === "string" ? { clientKey: options } : options;

    if (!config.clientKey?.trim()) {
      throw new CapMonsterError("Client key is required", 1, "MISSING_CLIENT_KEY");
    }

    this.clientKey = config.clientKey.trim();
    this.softId = config.softId ?? DEFAULT_SOFT_ID;
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
   * Check account balance.
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

    const response = await this.post<RawApiResponse>("/createTask", payload);
    const taskId = normalizeTaskId(response.taskId);
    if (taskId === undefined) {
      throw new CapMonsterError(
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
    const id = normalizeTaskId(taskId);
    if (id === undefined) {
      throw new CapMonsterError(`Invalid taskId: ${taskId}`, 1, "WRONG_CAPTCHA_ID");
    }

    try {
      const response = await this.post<RawApiResponse<T>>("/getTaskResult", {
        clientKey: this.clientKey,
        taskId: id,
      });

      return {
        status: response.status ?? "processing",
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
    const intervalMs = options.intervalMs ?? 3_000;
    const timeoutMs = options.timeoutMs ?? 120_000;
    const startTime = Date.now();

    for (;;) {
      if (options.signal?.aborted) {
        throw new CapMonsterError("waitForResult aborted", 0, "ABORTED");
      }

      const res = await this.getTaskResult<T>(taskId);

      if (res.status === "ready" && res.solution) {
        return res.solution;
      }

      if (Date.now() - startTime >= timeoutMs) {
        throw new CapMonsterError(
          "Timed out waiting for captcha solution",
          0,
          "TIMEOUT",
        );
      }

      await delay(intervalMs, options.signal);
    }
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
    const taskId = await this.createTask(task, {
      softId: options.softId,
      callbackUrl: options.callbackUrl,
    });
    return this.waitForResult<TSolution>(taskId, options);
  }

  private async post<T extends RawApiResponse>(
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

        throw new CapMonsterError(message, data?.errorId ?? 0, errorCode, status, data ?? err.response?.data);
      }

      throw new CapMonsterError(
        err instanceof Error ? err.message : "Unknown error",
        0,
      );
    }
  }
}

function isApiResponse(value: unknown): value is RawApiResponse {
  return Boolean(value) && typeof value === "object";
}

function assertNoApiError(data: RawApiResponse | undefined, httpStatus: number): void {
  if (!data || typeof data !== "object") {
    throw new CapMonsterError(
      "Unexpected non-JSON response from CapMonster Cloud API",
      0,
      undefined,
      httpStatus,
      data,
    );
  }

  if (data.errorId && data.errorId !== 0) {
    const errorCode = data.errorCode ?? undefined;
    throw new CapMonsterError(
      describeCapMonsterError(errorCode, data.errorDescription ?? undefined, data.errorId),
      data.errorId,
      errorCode,
      httpStatus,
      data,
    );
  }
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

function normalizeTaskId(taskId: number | string | undefined | null): number | undefined {
  if (taskId === undefined || taskId === null || taskId === "") return undefined;
  const value = typeof taskId === "number" ? taskId : Number(taskId);
  if (!Number.isInteger(value) || value <= 0) return undefined;
  return value;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new CapMonsterError("Operation aborted", 0, "ABORTED"));
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
