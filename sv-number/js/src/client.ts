import axios, { type AxiosInstance } from "axios";

import { assertNotApiError, SvNumberError } from "./errors.js";
import { parseAccessNumber, parseBalance, parseStatus } from "./parse.js";
import type {
  ActivationStatus,
  GetNumberParams,
  OrderedNumber,
  OrderedNumberV2,
  PricesByCountry,
  ReceivedCode,
  ServiceCostItem,
  SvNumberOptions,
  WaitForCodeOptions,
} from "./types.js";

const DEFAULT_BASE_URL = "https://sms-verification-number.com";
const DEFAULT_TIMEOUT_MS = 30_000;

/** @internal */
export const REF_KEY = "226";

/**
 * Client for the SV Number SMS verification API.
 *
 * @example
 * ```ts
 * const client = new SvNumber({ apiKey: "your_api_key" });
 * const balance = await client.getBalance();
 * ```
 */
export class SvNumber {
  private readonly apiKey: string;
  private readonly lang: string;
  private readonly http: AxiosInstance;

  constructor(options: SvNumberOptions | string) {
    const config: SvNumberOptions =
      typeof options === "string" ? { apiKey: options } : options;

    if (!config.apiKey?.trim()) {
      throw new SvNumberError("BAD_KEY", "API key is required");
    }

    this.apiKey = config.apiKey.trim();
    this.lang = config.lang ?? "en";

    const baseURL = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");

    this.http =
      config.axios ??
      axios.create({
        baseURL,
        timeout: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        headers: {
          Accept: "application/json, text/plain",
        },
      });
  }

  /**
   * Low-level call to `/stubs/handler_api`.
   * Automatically attaches `api_key`, `ref_key`, and `lang`.
   */
  async call<T = unknown>(
    action: string,
    params: Record<string, string | number | undefined> = {},
  ): Promise<T> {
    const query: Record<string, string> = {
      api_key: this.apiKey,
      ref_key: REF_KEY,
      lang: this.lang,
      action,
    };

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        query[key] = String(value);
      }
    }

    let response;
    try {
      response = await this.http.get<T>("/stubs/handler_api", {
        params: query,
      });
    } catch (err: unknown) {
      throw new SvNumberError(
        "NETWORK",
        err instanceof Error ? err.message : "Request failed",
      );
    }

    if (response.status >= 400) {
      throw new SvNumberError(`HTTP_${response.status}`, response.data);
    }

    assertNotApiError(response.data);
    return response.data;
  }

  /**
   * Get current account balance in USD.
   *
   * @example
   * ```ts
   * const balance = await client.getBalance();
   * console.log(`Balance: $${balance}`);
   * ```
   */
  async getBalance(): Promise<number> {
    const data = await this.call<string>("getBalance");
    return parseBalance(data);
  }

  /**
   * Order a temporary virtual number.
   *
   * @example
   * ```ts
   * const order = await client.getNumber({ service: "wa", country: 0 });
   * console.log(`Number: ${order.phoneNumber}, ID: ${order.activationId}`);
   * ```
   */
  async getNumber(params: GetNumberParams): Promise<OrderedNumber> {
    const data = await this.call<string>("getNumber", {
      service: params.service,
      country: params.country,
      operator: params.operator,
    });
    return parseAccessNumber(data);
  }

  /**
   * Order a virtual number returning JSON details.
   *
   * @example
   * ```ts
   * const order = await client.getNumberV2({ service: "tg", country: 0 });
   * ```
   */
  async getNumberV2(params: GetNumberParams): Promise<OrderedNumberV2> {
    const data = await this.call<any>("getNumberV2", {
      service: params.service,
      country: params.country,
      operator: params.operator,
    });

    if (typeof data === "string") {
      return parseAccessNumber(data);
    }

    return {
      activationId: String(data.activationId ?? data.id ?? ""),
      phoneNumber: String(data.phoneNumber ?? data.phone ?? ""),
      activationCost: Number(data.activationCost ?? data.cost ?? 0),
      countryCode: String(data.countryCode ?? data.country ?? ""),
      service: String(data.service ?? ""),
    };
  }

  /**
   * Query the status of an active activation.
   *
   * @example
   * ```ts
   * const status = await client.getStatus(activationId);
   * if (status.status === "STATUS_OK") {
   *   console.log("SMS code:", status.code);
   * }
   * ```
   */
  async getStatus(activationId: string | number): Promise<ActivationStatus> {
    const data = await this.call<string>("getStatus", { id: activationId });
    return parseStatus(data);
  }

  /**
   * Update activation status (1 = ready, 3 = request retry, 6 = complete, 8 = cancel).
   */
  async setStatus(
    activationId: string | number,
    status: number,
  ): Promise<string> {
    const data = await this.call<string>("setStatus", {
      id: activationId,
      status,
    });
    return String(data);
  }

  /**
   * Notify that the SMS has been sent to the number (`status=1`).
   */
  ready(activationId: string | number): Promise<string> {
    return this.setStatus(activationId, 1);
  }

  /**
   * Confirm successful activation and release the number (`status=6`).
   */
  complete(activationId: string | number): Promise<string> {
    return this.setStatus(activationId, 6);
  }

  /**
   * Cancel the activation to refund balance (`status=8`).
   */
  cancel(activationId: string | number): Promise<string> {
    return this.setStatus(activationId, 8);
  }

  /**
   * Poll for an incoming SMS verification code until it arrives or times out.
   *
   * @example
   * ```ts
   * const { code } = await client.waitForCode(order.activationId, { timeoutMs: 120_000 });
   * console.log("Received code:", code);
   * ```
   */
  async waitForCode(
    activationId: string | number,
    options: WaitForCodeOptions = {},
  ): Promise<ReceivedCode> {
    const intervalMs = options.intervalMs ?? 3_000;
    const timeoutMs = options.timeoutMs ?? 120_000;
    const startTime = Date.now();

    for (;;) {
      if (options.signal?.aborted) {
        throw new SvNumberError("ABORTED", "waitForCode aborted");
      }

      const status = await this.getStatus(activationId);
      if (status.status === "STATUS_OK" && status.code) {
        return { code: status.code, status: "STATUS_OK" };
      }

      if (status.status === "STATUS_CANCEL") {
        throw new SvNumberError("STATUS_CANCEL", "Activation cancelled");
      }

      if (Date.now() - startTime >= timeoutMs) {
        throw new SvNumberError("TIMEOUT", "Timed out waiting for SMS code");
      }

      await delay(intervalMs, options.signal);
    }
  }

  /**
   * Get price table grouped by country and service.
   *
   * @example
   * ```ts
   * const prices = await client.getPrices(0);
   * ```
   */
  async getPrices(country?: string | number): Promise<PricesByCountry> {
    return this.call<PricesByCountry>("getPrices", { country });
  }

  /**
   * Get list of services with prices and quantity for a country.
   *
   * @example
   * ```ts
   * const services = await client.getServicesAndCost({ country: 0 });
   * ```
   */
  async getServicesAndCost(params: {
    country?: string | number;
    operator?: string;
    service?: string;
  } = {}): Promise<ServiceCostItem[]> {
    const data = await this.call<ServiceCostItem[]>("getServicesAndCost", params);
    return Array.isArray(data) ? data : [];
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
      reject(new SvNumberError("ABORTED", "waitForCode aborted"));
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
