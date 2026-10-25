import axios, { type AxiosInstance } from "axios";

import { PeakError } from "./errors.js";
import type {
  BalanceData,
  BalanceResponse,
  Cloudflare5sResult,
  PeakOptions,
  RawApiResponse,
  SolveCloudflare5sParams,
  SolveTurnstileParams,
  TurnstileResult,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.peak.fo";
const DEFAULT_TIMEOUT_MS = 60_000;

export const APP_ID = "app_05c1f418153804ec393a7211";

/**
 * Client for the Peak CAPTCHA solving API (Cloudflare Turnstile and 5-second challenge).
 *
 * @example
 * ```ts
 * const client = new Peak({ apiKey: "pk_..." });
 * const balance = await client.getBalance();
 * ```
 */
export class Peak {
  private readonly http: AxiosInstance;

  /**
   * @param options Client configuration or API key string.
   */
  constructor(options: PeakOptions | string) {
    const config: PeakOptions =
      typeof options === "string" ? { apiKey: options } : options;

    if (!config.apiKey?.trim()) {
      throw new PeakError("API key is required", 0);
    }

    const baseURL = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");

    this.http =
      config.axios ??
      axios.create({
        baseURL,
        timeout: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        headers: {
          "X-API-Key": config.apiKey.trim(),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
  }

  /**
   * Retrieve current account balance or package subscription status.
   *
   * @example
   * ```ts
   * const balance = await client.getBalance();
   * if (balance.type === "pay_per_solve") {
   *   console.log(`Balance: $${balance.balance}`);
   * }
   * ```
   */
  async getBalance(): Promise<BalanceData> {
    const response = await this.request<BalanceResponse>("GET", "/balance");
    if (!response.success || !response.data) {
      throw new PeakError("Failed to retrieve balance", 200, response);
    }
    return response.data;
  }

  /**
   * Solve Cloudflare Turnstile challenge.
   *
   * Automatically uses `TurnstileTaskProxyLess` when `proxy` is omitted,
   * or `turnstiletask` when a proxy is provided.
   *
   * @example
   * ```ts
   * const { token } = await client.solveTurnstile({
   *   url: "https://example.com/",
   *   sitekey: "0x4AAAAAAA...",
   * });
   * ```
   */
  async solveTurnstile(params: SolveTurnstileParams): Promise<TurnstileResult> {
    const taskType = params.proxy ? "turnstiletask" : "TurnstileTaskProxyLess";

    const payload: Record<string, unknown> = {
      task_type: taskType,
      url: params.url,
      sitekey: params.sitekey,
    };

    if (params.proxy) payload.proxy = params.proxy;
    if (params.action) payload.action = params.action;
    if (params.cdata) payload.cdata = params.cdata;

    return this.solve<TurnstileResult>(payload);
  }

  /**
   * Solve Cloudflare 5-second challenge (WAF / Under Attack Mode).
   *
   * @example
   * ```ts
   * const result = await client.solveCloudflare5s({
   *   url: "https://example.com/",
   *   proxy: "http://user:pass@1.2.3.4:8080",
   * });
   * ```
   */
  async solveCloudflare5s(
    params: SolveCloudflare5sParams,
  ): Promise<Cloudflare5sResult> {
    const payload: Record<string, unknown> = {
      task_type: "cloudflare5stask",
      url: params.url,
      proxy: params.proxy,
    };

    if (params.userAgent) payload.user_agent = params.userAgent;
    if (params.html) payload.html = params.html;

    return this.solve<Cloudflare5sResult>(payload);
  }

  /**
   * Send a raw solve request with any task payload.
   * Automatically embeds the application identifier.
   */
  async solve<T = unknown>(task: Record<string, unknown>): Promise<T> {
    const payload = {
      ...task,
      appId: APP_ID,
    };

    const response = await this.request<RawApiResponse<T>>(
      "POST",
      "/solve",
      payload,
    );

    if (!response.success || response.error) {
      throw new PeakError(
        response.error ?? "Solve task failed",
        200,
        response,
      );
    }

    if (!response.data) {
      throw new PeakError("Missing response data from Peak API", 200, response);
    }

    return response.data;
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

      return res.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status ?? 0;
        const responseData = err.response?.data as
          | RawApiResponse<unknown>
          | undefined;
        const message =
          responseData?.error ??
          err.message ??
          `Peak HTTP request failed with status ${status}`;

        throw new PeakError(message, status, responseData);
      }

      if (err instanceof PeakError) throw err;
      throw new PeakError(
        err instanceof Error ? err.message : "Unknown request error",
        0,
      );
    }
  }
}
