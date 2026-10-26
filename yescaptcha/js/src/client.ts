import axios, { type AxiosInstance } from "axios";

import { YesCaptchaError } from "./errors.js";
import type {
  RawApiResponse,
  TaskParams,
  TaskResult,
  WaitForOptions,
  YesCaptchaBalance,
  YesCaptchaOptions,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.yescaptcha.com";
const DEFAULT_TIMEOUT_MS = 30_000;

/** @internal */
export const SOFT_ID = 144987;

/**
 * Client for the YesCaptcha recognition API.
 *
 * @example
 * ```ts
 * const client = new YesCaptcha({ clientKey: "your_client_key" });
 * const balance = await client.getBalance();
 * ```
 */
export class YesCaptcha {
  private readonly clientKey: string;
  private readonly http: AxiosInstance;

  /**
   * @param options Client options or client key string.
   */
  constructor(options: YesCaptchaOptions | string) {
    const config: YesCaptchaOptions =
      typeof options === "string" ? { clientKey: options } : options;

    if (!config.clientKey?.trim()) {
      throw new YesCaptchaError("Client key is required", 1, "MISSING_CLIENT_KEY");
    }

    this.clientKey = config.clientKey.trim();
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
  async getBalance(): Promise<YesCaptchaBalance> {
    const response = await this.post<RawApiResponse>("/getBalance", {
      clientKey: this.clientKey,
    });

    return {
      balance: response.balance ?? 0,
      softBalance: response.softBalance,
      inviteBalance: response.inviteBalance,
      inviteBy: response.inviteBy,
    };
  }

  /**
   * Submit a new recognition task.
   * Automatically embeds the application software identifier (`softID`).
   *
   * @param task Captcha task parameters (e.g. `NoCaptchaTaskProxyless`, `TurnstileTaskProxyless`).
   * @returns The generated `taskId`.
   *
   * @example
   * ```ts
   * const taskId = await client.createTask({
   *   type: "TurnstileTaskProxyless",
   *   websiteURL: "https://example.com",
   *   websiteKey: "0x4AAAAAAA...",
   * });
   * ```
   */
  async createTask(task: TaskParams): Promise<string> {
    const payload = {
      clientKey: this.clientKey,
      softID: SOFT_ID,
      task,
    };

    const response = await this.post<RawApiResponse>("/createTask", payload);

    if (!response.taskId) {
      throw new YesCaptchaError(
        "Response missing taskId",
        response.errorId ?? 0,
        response.errorCode,
        200,
        response,
      );
    }

    return response.taskId;
  }

  /**
   * Query the result of a submitted task.
   *
   * @param taskId Task identifier returned by `createTask`.
   *
   * @example
   * ```ts
   * const result = await client.getTaskResult(taskId);
   * if (result.status === "ready") {
   *   console.log("Solution:", result.solution);
   * }
   * ```
   */
  async getTaskResult<T = Record<string, unknown>>(
    taskId: string,
  ): Promise<TaskResult<T>> {
    const response = await this.post<RawApiResponse<T>>("/getTaskResult", {
      clientKey: this.clientKey,
      taskId,
    });

    return {
      status: response.status ?? "processing",
      solution: response.solution,
    };
  }

  /**
   * Poll `getTaskResult` until the solution is ready or the timeout is reached.
   *
   * @param taskId Task identifier.
   * @param options Polling configuration (intervalMs, timeoutMs, AbortSignal).
   *
   * @example
   * ```ts
   * const solution = await client.waitForResult(taskId, { timeoutMs: 60_000 });
   * ```
   */
  async waitForResult<T = Record<string, unknown>>(
    taskId: string,
    options: WaitForOptions = {},
  ): Promise<T> {
    const intervalMs = options.intervalMs ?? 3_000;
    const timeoutMs = options.timeoutMs ?? 120_000;
    const startTime = Date.now();

    for (;;) {
      if (options.signal?.aborted) {
        throw new YesCaptchaError("waitForResult aborted", 0, "ABORTED");
      }

      const res = await this.getTaskResult<T>(taskId);

      if (res.status === "ready" && res.solution) {
        return res.solution;
      }

      if (Date.now() - startTime >= timeoutMs) {
        throw new YesCaptchaError(
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
   * const solution = await client.solve({
   *   type: "TurnstileTaskProxyless",
   *   websiteURL: "https://example.com",
   *   websiteKey: "0x4AAAAAAA...",
   * });
   * ```
   */
  async solve<T = Record<string, unknown>>(
    task: TaskParams,
    options: WaitForOptions = {},
  ): Promise<T> {
    const taskId = await this.createTask(task);
    return this.waitForResult<T>(taskId, options);
  }

  private async post<T extends RawApiResponse>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    try {
      const res = await this.http.post<T>(path, body);
      const data = res.data;

      if (data && typeof data === "object" && data.errorId && data.errorId !== 0) {
        const message =
          data.errorDescription || data.errorCode || `API error #${data.errorId}`;
        throw new YesCaptchaError(
          message,
          data.errorId,
          data.errorCode,
          res.status,
          data,
        );
      }

      return data;
    } catch (err: unknown) {
      if (err instanceof YesCaptchaError) throw err;

      if (axios.isAxiosError(err)) {
        const status = err.response?.status ?? 0;
        const data = err.response?.data as RawApiResponse | undefined;
        const message =
          data?.errorDescription ??
          data?.errorCode ??
          err.message ??
          `HTTP request failed with status ${status}`;

        throw new YesCaptchaError(
          message,
          data?.errorId ?? 0,
          data?.errorCode,
          status,
          data,
        );
      }

      throw new YesCaptchaError(
        err instanceof Error ? err.message : "Unknown error",
        0,
      );
    }
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new YesCaptchaError("Operation aborted", 0, "ABORTED"));
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
