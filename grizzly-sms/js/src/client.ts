import axios, { type AxiosInstance } from "axios";

import { assertNotApiError, GrizzlySmsError } from "./errors.js";
import {
  flattenPrices,
  listParam,
  parseAccessNumber,
  parseActivations,
  parseBalance,
  parseCountries,
  parseNumberV2,
  parseServices,
  parseSetStatus,
  parseStatus,
} from "./parse.js";
import type {
  ActivationActionValue,
  ActivationStatus,
  ActivationStatusV2,
  ActiveActivation,
  CountryInfo,
  CryptoWallet,
  FindPricesParams,
  GetNumberParams,
  GrizzlySmsOptions,
  OrderedNumber,
  OrderedNumberV2,
  PriceQuote,
  PricesByCountry,
  PricesV2,
  PricesV3,
  ReceivedCode,
  ServiceInfo,
  SetStatusResult,
  WaitForCodeOptions,
  WalletParams,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.grizzlysms.com";
const USER_AGENT = "grizzly-sms/2.0.0";
const REF_ID = "tysik";

/**
 * Client for the Grizzly SMS activation API (`handler_api.php`).
 *
 * @example
 * ```ts
 * const sms = new GrizzlySms(process.env.GRIZZLY_API_KEY!);
 * const balance = await sms.getBalance();
 * ```
 */
export class GrizzlySms {
  private readonly apiKey: string;
  private readonly http: AxiosInstance;

  /**
   * @param options API key string, or settings from the Grizzly profile.
   *
   * @example
   * ```ts
   * const sms = new GrizzlySms({ apiKey: process.env.GRIZZLY_API_KEY! });
   * ```
   */
  constructor(options: GrizzlySmsOptions | string) {
    const config: GrizzlySmsOptions =
      typeof options === "string" ? { apiKey: options } : options;
    if (!config.apiKey?.trim()) {
      throw new GrizzlySmsError("BAD_KEY", "API key is required");
    }
    this.apiKey = config.apiKey.trim();
    this.http =
      config.axios ??
      axios.create({
        baseURL: (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, ""),
        timeout: config.timeoutMs ?? 30_000,
        headers: {
          Accept: "application/json, text/plain",
          "User-Agent": USER_AGENT,
        },
      });
  }

  /**
   * Low-level `handler_api.php` call. Use it for actions added after this
   * client was published. Known error strings are still thrown.
   *
   * @example
   * ```ts
   * const raw = await sms.call("getBalance");
   * ```
   */
  async call<T = unknown>(
    action: string,
    params: Record<string, string | number | undefined> = {},
  ): Promise<T> {
    const query: Record<string, string> = {
      api_key: this.apiKey,
      action,
      ref_id: REF_ID,
    };
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      const text = String(value);
      if (!text) continue;
      query[key] = text;
    }

    let response;
    try {
      response = await this.http.get<T>("/stubs/handler_api.php", {
        params: query,
      });
    } catch (error) {
      throw new GrizzlySmsError(
        "NETWORK",
        error instanceof Error ? error.message : "Request failed",
      );
    }

    if (response.status >= 400) {
      throw new GrizzlySmsError(`HTTP_${response.status}`, response.data);
    }
    assertNotApiError(response.data);
    return response.data;
  }

  /**
   * Account balance in USD.
   *
   * @example
   * ```ts
   * const balance = await sms.getBalance();
   * ```
   */
  async getBalance(): Promise<number> {
    const data = await this.call<string>("getBalance");
    return parseBalance(requireText(data));
  }

  /**
   * Order a number. `country` may be `"any"` or omitted.
   *
   * @example
   * ```ts
   * const ordered = await sms.getNumber({ service: "tg", country: "any" });
   * ```
   */
  async getNumber(params: GetNumberParams): Promise<OrderedNumber> {
    const data = await this.call<string>("getNumber", numberQuery(params));
    return parseAccessNumber(requireText(data));
  }

  /**
   * Order a number and return price, currency, and activation timestamps.
   *
   * @example
   * ```ts
   * const ordered = await sms.getNumberV2({ service: "tg", country: 12 });
   * ```
   */
  async getNumberV2(params: GetNumberParams): Promise<OrderedNumberV2> {
    const data = await this.call("getNumberV2", numberQuery(params));
    if (typeof data === "string") {
      throw new GrizzlySmsError("UNEXPECTED_RESPONSE", data);
    }
    return parseNumberV2(data);
  }

  /**
   * Change an activation status. Prefer {@link ready}, {@link complete}, and
   * {@link cancel} for the documented codes.
   *
   * @example
   * ```ts
   * await sms.setStatus(activationId, ActivationAction.Complete);
   * ```
   */
  async setStatus(
    activationId: string | number,
    status: ActivationActionValue | number,
  ): Promise<SetStatusResult> {
    const data = await this.call<string>("setStatus", {
      id: activationId,
      status,
    });
    return parseSetStatus(requireText(data));
  }

  /**
   * Tell the service that the SMS was sent to the number (`status=1`).
   *
   * @example
   * ```ts
   * await sms.ready(activationId);
   * ```
   */
  ready(activationId: string | number): Promise<SetStatusResult> {
    return this.setStatus(activationId, 1);
  }

  /**
   * Ask for another code on the same number (`status=3`).
   *
   * @example
   * ```ts
   * await sms.requestAnotherCode(activationId);
   * ```
   */
  requestAnotherCode(activationId: string | number): Promise<SetStatusResult> {
    return this.setStatus(activationId, 3);
  }

  /**
   * Finish the activation (`status=6`).
   *
   * @example
   * ```ts
   * await sms.complete(activationId);
   * ```
   */
  complete(activationId: string | number): Promise<SetStatusResult> {
    return this.setStatus(activationId, 6);
  }

  /**
   * Cancel the activation. Pass `-1` to use the alternate cancel code from
   * the docs; the default is `8`.
   *
   * @example
   * ```ts
   * await sms.cancel(activationId);
   * ```
   */
  cancel(
    activationId: string | number,
    status: 8 | -1 = 8,
  ): Promise<SetStatusResult> {
    return this.setStatus(activationId, status);
  }

  /**
   * Current activation status. `STATUS_OK` includes the SMS code.
   *
   * @example
   * ```ts
   * const status = await sms.getStatus(activationId);
   * ```
   */
  async getStatus(activationId: string | number): Promise<ActivationStatus> {
    const data = await this.call<string>("getStatus", { id: activationId });
    return parseStatus(requireText(data));
  }

  /**
   * Activation status as JSON, including SMS and call payloads.
   *
   * @example
   * ```ts
   * const status = await sms.getStatusV2(activationId);
   * ```
   */
  async getStatusV2(activationId: string | number): Promise<ActivationStatusV2> {
    const data = await this.call<ActivationStatusV2>("getStatusV2", {
      id: activationId,
    });
    if (typeof data === "string") {
      throw new GrizzlySmsError("UNEXPECTED_RESPONSE", data);
    }
    return data;
  }

  /**
   * Poll until a code arrives, the activation is cancelled, or the timeout
   * elapses. `STATUS_WAIT_RESEND` keeps waiting: call `complete()` when your
   * app has requested the SMS again.
   *
   * @example
   * ```ts
   * const received = await sms.waitForCode(activationId, { timeoutMs: 120_000 });
   * ```
   */
  async waitForCode(
    activationId: string | number,
    options: WaitForCodeOptions = {},
  ): Promise<ReceivedCode> {
    const intervalMs = options.intervalMs ?? 3_000;
    const timeoutMs = options.timeoutMs ?? 120_000;
    const started = Date.now();

    for (;;) {
      if (options.signal?.aborted) {
        throw new GrizzlySmsError("ABORTED", "waitForCode aborted");
      }
      const status = await this.getStatus(activationId);
      if (status.status === "STATUS_OK" && status.code) {
        return { code: status.code, status: "STATUS_OK" };
      }
      if (status.status === "STATUS_CANCEL") {
        throw new GrizzlySmsError("STATUS_CANCEL", "Activation cancelled");
      }
      if (Date.now() - started >= timeoutMs) {
        throw new GrizzlySmsError("TIMEOUT", "Timed out waiting for SMS code");
      }
      await delay(intervalMs, options.signal);
    }
  }

  /**
   * Prices grouped by country, then service.
   *
   * @example
   * ```ts
   * const prices = await sms.getPrices({ service: "tg" });
   * ```
   */
  async getPrices(params: {
    service?: string;
    country?: string | number;
  } = {}): Promise<PricesByCountry> {
    return this.jsonAction<PricesByCountry>("getPrices", {
      service: params.service,
      country: params.country,
    });
  }

  /**
   * Price buckets: country, service, then price string to available count.
   *
   * @example
   * ```ts
   * const prices = await sms.getPricesV2({ service: "tg", country: 0 });
   * ```
   */
  async getPricesV2(params: {
    service?: string;
    country?: string | number;
  } = {}): Promise<PricesV2> {
    return this.jsonAction<PricesV2>("getPricesV2", {
      service: params.service,
      country: params.country,
    });
  }

  /**
   * Prices with per-provider offers.
   *
   * @example
   * ```ts
   * const prices = await sms.getPricesV3({ service: "tg", country: 0 });
   * ```
   */
  async getPricesV3(params: {
    service?: string;
    country?: string | number;
  } = {}): Promise<PricesV3> {
    return this.jsonAction<PricesV3>("getPricesV3", {
      service: params.service,
      country: params.country,
    });
  }

  /**
   * `getPrices` flattened and sorted by cost. One request replaces scanning
   * every country code by hand.
   *
   * @example
   * ```ts
   * const quotes = await sms.findPrices({ service: "tg", minCount: 10, maxPrice: 1 });
   * ```
   */
  async findPrices(params: FindPricesParams = {}): Promise<PriceQuote[]> {
    const table = await this.getPrices({
      service: params.service,
      country: params.country,
    });
    return flattenPrices(table)
      .filter((quote) =>
        params.service === undefined ? true : quote.service === params.service,
      )
      .filter((quote) =>
        params.country === undefined
          ? true
          : quote.country === String(params.country),
      )
      .filter((quote) =>
        params.minCount === undefined ? true : quote.count >= params.minCount,
      )
      .filter((quote) =>
        params.maxPrice === undefined ? true : quote.cost <= params.maxPrice,
      )
      .sort((a, b) => a.cost - b.cost || b.count - a.count);
  }

  /**
   * Service catalog (`getServicesList`).
   *
   * @example
   * ```ts
   * const services = await sms.getServices();
   * ```
   */
  async getServices(): Promise<ServiceInfo[]> {
    const data = await this.call("getServicesList");
    if (typeof data === "string") {
      throw new GrizzlySmsError("UNEXPECTED_RESPONSE", data);
    }
    return parseServices(data);
  }

  /**
   * Country catalog.
   *
   * @example
   * ```ts
   * const countries = await sms.getCountries();
   * ```
   */
  async getCountries(): Promise<CountryInfo[]> {
    const data = await this.call("getCountries");
    if (typeof data === "string") {
      throw new GrizzlySmsError("UNEXPECTED_RESPONSE", data);
    }
    return parseCountries(data);
  }

  /**
   * Activations that are still open on the account.
   *
   * @example
   * ```ts
   * const active = await sms.getActiveActivations();
   * ```
   */
  async getActiveActivations(): Promise<ActiveActivation[]> {
    const data = await this.call("getActiveActivations");
    if (typeof data === "string") {
      throw new GrizzlySmsError("UNEXPECTED_RESPONSE", data);
    }
    return parseActivations(data);
  }

  /**
   * Static deposit address. The documented sample is `coin=usdt` and
   * `network=tron`. Amounts from 50 USD are credited automatically.
   *
   * @example
   * ```ts
   * const wallet = await sms.getWallet({ coin: "usdt", network: "tron" });
   * ```
   */
  async getWallet(params: WalletParams = {}): Promise<CryptoWallet> {
    let response;
    try {
      response = await this.http.get<{ wallet_address?: string }>(
        "/public/crypto/wallet",
        {
          params: {
            api_key: this.apiKey,
            coin: params.coin ?? "usdt",
            network: params.network ?? "tron",
          },
        },
      );
    } catch (error) {
      throw new GrizzlySmsError(
        "NETWORK",
        error instanceof Error ? error.message : "Request failed",
      );
    }
    if (response.status >= 400) {
      throw new GrizzlySmsError(`HTTP_${response.status}`, response.data);
    }
    assertNotApiError(response.data);
    const address = response.data?.wallet_address;
    if (!address) {
      throw new GrizzlySmsError("UNEXPECTED_RESPONSE", response.data);
    }
    return { walletAddress: address };
  }

  private async jsonAction<T>(
    action: string,
    params: Record<string, string | number | undefined>,
  ): Promise<T> {
    const data = await this.call<T>(action, params);
    if (typeof data === "string") {
      throw new GrizzlySmsError("UNEXPECTED_RESPONSE", data);
    }
    return data;
  }
}

function numberQuery(
  params: GetNumberParams,
): Record<string, string | number | undefined> {
  if (!params.service?.trim()) {
    throw new GrizzlySmsError("BAD_SERVICE", "service is required");
  }
  return {
    service: params.service.trim(),
    country: params.country,
    maxPrice: params.maxPrice,
    minPrice: params.minPrice,
    providerIds: listParam(params.providerIds),
    exceptProviderIds: listParam(params.exceptProviderIds),
    phoneException: listParam(params.phoneException),
  };
}

function requireText(data: unknown): string {
  if (typeof data !== "string") {
    throw new GrizzlySmsError("UNEXPECTED_RESPONSE", data);
  }
  return data;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new GrizzlySmsError("ABORTED", "waitForCode aborted"));
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
