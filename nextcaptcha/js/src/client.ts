import axios, { type AxiosInstance } from "axios";

import { describeNextCaptchaError, NextCaptchaError } from "./errors.js";
import type {
  CreateTaskOptions,
  NextCaptchaBalance,
  NextCaptchaOptions,
  RawApiResponse,
  TaskResult,
  WaitForOptions,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.nextcaptcha.com";
const DEFAULT_TOKEN_BASE_URL = "https://api-v2.nextcaptcha.com";
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Developer software id sent as the top-level `softId` string on every task
 * request (`createTask` and `getToken`).
 *
 * NextCaptcha attributes developer revenue through this field. It sits next
 * to `clientKey` and `task`, not inside the task object. The createTask and
 * getToken docs type it as a string.
 *
 * @see https://nextcaptcha.com/apidocs/create-task
 * @see https://nextcaptcha.com/apidocs/get-token
 */
export const DEFAULT_SOFT_ID = "next_softId_b3bdc0a2f7035cc72e1d62d575469f449d";

/**
 * Client for the NextCaptcha recognition API.
 *
 * @example
 * ```ts
 * const client = new NextCaptcha({ clientKey: "your_client_key" });
 * const balance = await client.getBalance();
 * ```
 */
export class NextCaptcha {
  private readonly clientKey: string;
  private readonly softId: string;
  private readonly tokenBaseUrl: string;
  private readonly http: AxiosInstance;

  /**
   * @param options Client options or client key string.
   */
  constructor(options: NextCaptchaOptions | string) {
    const config: NextCaptchaOptions =
      typeof options === "string" ? { clientKey: options } : options;

    if (!config.clientKey?.trim()) {
      throw new NextCaptchaError("Client key is required", 1, "MISSING_CLIENT_KEY");
    }

    this.clientKey = config.clientKey.trim();
    this.softId = config.softId ?? DEFAULT_SOFT_ID;
    this.tokenBaseUrl = (config.tokenBaseUrl ?? DEFAULT_TOKEN_BASE_URL).replace(/\/$/, "");
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
   * Check account balance. Does not spend credit and does not send `softId`.
   *
   * The API returns `balance` as a decimal string. This method parses it to a number.
   */
  async getBalance(): Promise<NextCaptchaBalance> {
    const response = await this.post<RawApiResponse>("/getBalance", {
      clientKey: this.clientKey,
    });

    return { balance: parseBalance(response.balance) };
  }

  /**
   * Submit a recognition task.
   *
   * `softId` is included on every task request unless this call or the client
   * option sets it to an empty string.
   *
   * @param task Captcha task object (`type` required).
   * @returns The numeric `taskId`.
   */
  async createTask<T extends { type: string }>(
    task: T,
    options: CreateTaskOptions = {},
  ): Promise<number> {
    const response = await this.post<RawApiResponse>("/createTask", this.taskPayload(task, options));
    const taskId = normalizeTaskId(response.taskId);
    if (taskId === undefined) {
      throw new NextCaptchaError(
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
   * `processing` and `pending` are returned so callers can keep polling.
   * `failed` and every API error are thrown.
   */
  async getTaskResult<T extends Record<string, unknown> = Record<string, unknown>>(
    taskId: number | string,
  ): Promise<TaskResult<T>> {
    const id = normalizeTaskId(taskId);
    if (id === undefined) {
      throw new NextCaptchaError(`Invalid taskId: ${taskId}`, 16, "ERROR_NO_SUCH_CAPCHA_ID");
    }

    const response = await this.post<RawApiResponse<T>>("/getTaskResult", {
      clientKey: this.clientKey,
      taskId: id,
    });

    if (response.status === "failed") {
      throw new NextCaptchaError(
        describeNextCaptchaError(
          response.errorCode ?? undefined,
          response.errorDescription ?? undefined,
          response.errorId ?? 12,
        ),
        response.errorId ?? 12,
        response.errorCode ?? "ERROR_CAPTCHA_UNSOLVABLE",
        200,
        response,
      );
    }

    return {
      status: response.status ?? "processing",
      solution: response.solution,
    };
  }

  /**
   * Create a task and return the token in one call.
   *
   * `getToken` is served from `https://api-v2.nextcaptcha.com/getToken`.
   * A success body is `0|TOKEN`. A failure body is `1|ERROR_MSG`.
   * `softId` is sent the same way as on `createTask`.
   */
  async getToken<T extends { type: string }>(
    task: T,
    options: CreateTaskOptions = {},
  ): Promise<string> {
    const response = await this.postRaw(
      `${this.tokenBaseUrl}/getToken`,
      this.taskPayload(task, options),
    );
    return parseTokenBody(response);
  }

  /**
   * Poll `getTaskResult` until the solution is ready or the timeout is reached.
   */
  async waitForResult<T extends Record<string, unknown> = Record<string, unknown>>(
    taskId: number | string,
    options: WaitForOptions = {},
  ): Promise<T> {
    const intervalMs = options.intervalMs ?? 1_000;
    const timeoutMs = options.timeoutMs ?? 120_000;
    const startTime = Date.now();

    for (;;) {
      if (options.signal?.aborted) {
        throw new NextCaptchaError("waitForResult aborted", 0, "ABORTED");
      }

      const res = await this.getTaskResult<T>(taskId);

      if (res.status === "ready" && res.solution) {
        return res.solution;
      }

      if (Date.now() - startTime >= timeoutMs) {
        throw new NextCaptchaError(
          "Timed out waiting for captcha solution",
          0,
          "TIMEOUT",
        );
      }

      await delay(intervalMs, options.signal);
    }
  }

  /**
   * Submit a task and wait for its solution.
   *
   * @example
   * ```ts
   * const solution = await client.solve<{ gRecaptchaResponse: string }>({
   *   type: "RecaptchaV2TaskProxyless",
   *   websiteURL: "https://example.com",
   *   websiteKey: "site-key",
   * });
   * ```
   */
  async solve<
    TSolution extends Record<string, unknown> = Record<string, unknown>,
    TTask extends { type: string } = { type: string },
  >(
    task: TTask,
    options: WaitForOptions & CreateTaskOptions = {},
  ): Promise<TSolution> {
    const taskId = await this.createTask(task, {
      softId: options.softId,
      callbackUrl: options.callbackUrl,
    });
    return this.waitForResult<TSolution>(taskId, options);
  }

  private taskPayload(task: { type: string }, options: CreateTaskOptions): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      clientKey: this.clientKey,
      task,
    };

    const softId = options.softId ?? this.softId;
    if (hasSoftId(softId)) {
      payload.softId = softId.trim();
    }
    if (options.callbackUrl) {
      payload.callbackUrl = options.callbackUrl;
    }
    return payload;
  }

  private async post<T extends RawApiResponse>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const data = await this.postRaw(path, body);
    if (typeof data === "string") {
      throw new NextCaptchaError(
        "Unexpected non-JSON response from NextCaptcha API",
        0,
        undefined,
        200,
        data,
      );
    }
    return data as T;
  }

  private async postRaw(path: string, body: Record<string, unknown>): Promise<unknown> {
    try {
      const res = await this.http.post(path, body);
      const data = res.data;
      if (data && typeof data === "object") {
        assertNoApiError(data as RawApiResponse, res.status);
      }
      return data;
    } catch (err: unknown) {
      if (err instanceof NextCaptchaError) throw err;

      if (axios.isAxiosError(err)) {
        const status = err.response?.status ?? 0;
        const data = isApiResponse(err.response?.data) ? err.response?.data : undefined;
        const errorCode = data?.errorCode ?? undefined;
        const message = data
          ? describeNextCaptchaError(
              errorCode,
              data.errorDescription ?? undefined,
              data.errorId ?? 0,
            )
          : (err.message ?? `HTTP request failed with status ${status}`);

        throw new NextCaptchaError(
          message,
          data?.errorId ?? 0,
          errorCode,
          status,
          data ?? err.response?.data,
        );
      }

      throw new NextCaptchaError(
        err instanceof Error ? err.message : "Unknown error",
        0,
      );
    }
  }
}

/** True when a softId should be sent. Empty and whitespace-only strings are omitted. */
export function hasSoftId(value: string | undefined | null): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function parseBalance(value: number | string | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new NextCaptchaError("Response missing balance", 0, "ERROR_UNKNOWN", 200, { balance: value });
}

function parseTokenBody(data: unknown): string {
  if (typeof data === "string") {
    const text = data.trim();
    const separator = text.indexOf("|");
    if (separator > 0) {
      const status = text.slice(0, separator);
      const rest = text.slice(separator + 1);
      if (status === "0" && rest) return rest;
      if (status === "1") {
        throw new NextCaptchaError(rest || "getToken failed", 1, rest || "ERROR_UNKNOWN", 200, text);
      }
    }
    throw new NextCaptchaError(
      "Unexpected getToken response",
      0,
      "ERROR_UNKNOWN",
      200,
      text,
    );
  }

  throw new NextCaptchaError(
    "Unexpected getToken response",
    0,
    "ERROR_UNKNOWN",
    200,
    data,
  );
}

function isApiResponse(value: unknown): value is RawApiResponse {
  return Boolean(value) && typeof value === "object";
}

function assertNoApiError(data: RawApiResponse | undefined, httpStatus: number): void {
  if (!data || typeof data !== "object") {
    throw new NextCaptchaError(
      "Unexpected non-JSON response from NextCaptcha API",
      0,
      undefined,
      httpStatus,
      data,
    );
  }

  if (data.errorId && data.errorId !== 0) {
    const errorCode = data.errorCode ?? undefined;
    throw new NextCaptchaError(
      describeNextCaptchaError(errorCode, data.errorDescription ?? undefined, data.errorId),
      data.errorId,
      errorCode,
      httpStatus,
      data,
    );
  }
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
      reject(new NextCaptchaError("Operation aborted", 0, "ABORTED"));
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
