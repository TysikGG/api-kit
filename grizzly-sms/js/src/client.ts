import axios, { type AxiosInstance } from "axios";

import {
  assertNotApiError,
  errorFrom,
  GrizzlySmsError,
  httpStatusError,
  isRetryableApiBody,
  MUTATING_ACTIONS,
  RETRYABLE_HTTP_STATUSES,
} from "./errors.js";
import {
  axiosProxy,
  flattenPrices,
  listParam,
  parseAccessNumber,
  parseActivations,
  parseBalance,
  parseCountries,
  parseNumbersStatus,
  parseNumberV2,
  parseRentHistory,
  parseRentPhone,
  parseRentPrices,
  parseRentStatus,
  parseServices,
  parseSetStatus,
  parseStatus,
} from "./parse.js";
import type {
  ActivateOptions,
  ActivationActionValue,
  ActivationResult,
  ActivationStatus,
  ActivationStatusV2,
  ActiveActivation,
  CountryInfo,
  CryptoWallet,
  FindPricesParams,
  GetBalanceOptions,
  GetNumberParams,
  GrizzlySmsOptions,
  NumberStock,
  NumbersStatusParams,
  OrderedNumber,
  OrderedNumberV2,
  PriceQuote,
  PricesByCountry,
  PricesV2,
  PricesV3,
  ReceivedCode,
  ReceivedMessage,
  RentHistory,
  RentNumberParams,
  RentPhone,
  RentPrice,
  RentPricesParams,
  RentStatus,
  ServiceInfo,
  SetStatusResult,
  VerificationMessage,
  WaitForCodeOptions,
  WaitForMessageOptions,
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
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly retryMutations: boolean;

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
      throw errorFrom("BAD_KEY", "API key is required");
    }
    this.apiKey = config.apiKey.trim();
    this.retries = Math.max(0, config.retries ?? 0);
    this.retryDelayMs = config.retryDelayMs ?? 1_000;
    this.retryMutations = config.retryMutations ?? false;
    this.http =
      config.axios ??
      axios.create({
        baseURL: (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, ""),
        timeout: config.timeoutMs ?? 30_000,
        proxy: config.proxy ? axiosProxy(config.proxy) : undefined,
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

    const data = await this.request<T>("/stubs/handler_api.php", query, action);
    assertNotApiError(data);
    return data;
  }

  /**
   * Account balance in USD.
   *
   * @example
   * ```ts
   * const balance = await sms.getBalance();
   * ```
   */
  async getBalance(options: GetBalanceOptions = {}): Promise<number> {
    const data = await this.call<string>("getBalance", {
      version: options.version,
    });
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
      throw errorFrom("UNEXPECTED_RESPONSE", data);
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
    forward?: string | number | boolean,
  ): Promise<SetStatusResult> {
    const data = await this.call<string>("setStatus", {
      id: activationId,
      status,
      forward: forward === undefined ? undefined : forward === true ? 1 : forward === false ? 0 : forward,
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
      throw errorFrom("UNEXPECTED_RESPONSE", data);
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
        throw errorFrom("ABORTED", "waitForCode aborted");
      }
      const status = await this.getStatus(activationId);
      options.onStatus?.(status);
      if (status.status === "STATUS_OK" && status.code) {
        return { code: status.code, status: "STATUS_OK" };
      }
      if (status.status === "STATUS_CANCEL") {
        throw errorFrom("STATUS_CANCEL", "Activation cancelled");
      }
      if (Date.now() - started >= timeoutMs) {
        throw errorFrom("TIMEOUT", "Timed out waiting for SMS code");
      }
      await delay(intervalMs, options.signal);
    }
  }

  /**
   * Poll `getStatusV2` until an SMS or call payload contains a code.
   *
   * @example
   * ```ts
   * const message = await sms.waitForMessage(activationId, { timeoutMs: 120_000 });
   * ```
   */
  async waitForMessage(
    activationId: string | number,
    options: WaitForMessageOptions = {},
  ): Promise<ReceivedMessage> {
    const intervalMs = options.intervalMs ?? 3_000;
    const timeoutMs = options.timeoutMs ?? 120_000;
    const started = Date.now();

    for (;;) {
      if (options.signal?.aborted) {
        throw errorFrom("ABORTED", "waitForCode aborted");
      }
      const status = await this.getStatusV2(activationId);
      options.onStatus?.(status);
      const message = messageFromStatus(status);
      if (message) return message;
      if (Date.now() - started >= timeoutMs) {
        throw errorFrom("TIMEOUT", "Timed out waiting for SMS code");
      }
      await delay(intervalMs, options.signal);
    }
  }

  /**
   * Order with `getNumberV2`, optionally mark the number ready, and wait for a code.
   * Ordering spends balance. Set `cancelOnTimeout` to release the number on timeout.
   *
   * @example
   * ```ts
   * const result = await sms.activate(
   *   { service: "tg", country: 12, maxPrice: 1 },
   *   { timeoutMs: 120_000, cancelOnTimeout: true },
   * );
   * ```
   */
  async activate(
    params: GetNumberParams,
    options: ActivateOptions = {},
  ): Promise<ActivationResult> {
    const order = await this.getNumberV2(params);
    if (options.ready !== false) {
      await this.ready(order.activationId);
    }
    try {
      const received = await this.waitForCode(order.activationId, options);
      return { order, code: received.code, status: received.status };
    } catch (error) {
      await this.cancelFailedWait(order.activationId, error, options);
      throw error;
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
      throw errorFrom("UNEXPECTED_RESPONSE", data);
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
      throw errorFrom("UNEXPECTED_RESPONSE", data);
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
      throw errorFrom("UNEXPECTED_RESPONSE", data);
    }
    return parseActivations(data);
  }

  /**
   * Available count per service from `getNumbersStatus`.
   * Keys look like `tg_0` (service, then redirect or operator suffix).
   *
   * @example
   * ```ts
   * const stock = await sms.getNumbersStatus({ country: 0 });
   * ```
   */
  async getNumbersStatus(params: NumbersStatusParams = {}): Promise<NumberStock[]> {
    const data = await this.call("getNumbersStatus", {
      country: params.country,
      operator: params.operator,
    });
    if (typeof data === "string") {
      throw errorFrom("UNEXPECTED_RESPONSE", data);
    }
    return parseNumbersStatus(data);
  }

  /**
   * Rent a number for several hours (`getRentNumber`). The documented minimum is 4 hours.
   *
   * @example
   * ```ts
   * const rented = await sms.getRentNumber({ service: "tg", country: 0, rentTime: 4 });
   * ```
   */
  async getRentNumber(params: RentNumberParams): Promise<RentPhone> {
    if (!params.service?.trim()) {
      throw errorFrom("BAD_SERVICE", "service is required");
    }
    const data = await this.call("getRentNumber", {
      service: params.service.trim(),
      country: params.country,
      rent_time: params.rentTime,
    });
    if (typeof data === "string") {
      throw errorFrom("UNEXPECTED_RESPONSE", data);
    }
    return parseRentPhone(data);
  }

  /**
   * Extend a rental (`continueRentNumber`).
   *
   * @example
   * ```ts
   * const rented = await sms.continueRent(rentId, 4);
   * ```
   */
  async continueRent(
    id: string | number,
    rentTime: number,
  ): Promise<RentPhone> {
    const data = await this.call("continueRentNumber", {
      id,
      rent_time: rentTime,
    });
    if (typeof data === "string") {
      throw errorFrom("UNEXPECTED_RESPONSE", data);
    }
    return parseRentPhone(data);
  }

  /**
   * SMS received during a rental (`getRentStatus`).
   *
   * @example
   * ```ts
   * const status = await sms.getRentStatus(rentId);
   * ```
   */
  async getRentStatus(id: string | number): Promise<RentStatus> {
    const data = await this.call("getRentStatus", { id });
    if (typeof data === "string") {
      throw errorFrom("UNEXPECTED_RESPONSE", data);
    }
    return parseRentStatus(data);
  }

  /**
   * Finish (`1`) or cancel (`2`) a rental (`setRentStatus`).
   *
   * @example
   * ```ts
   * await sms.setRentStatus(rentId, RentAction.Finish);
   * ```
   */
  async setRentStatus(id: string | number, status: number): Promise<"success"> {
    const data = await this.call("setRentStatus", { id, status });
    return expectRentSuccess(data);
  }

  /**
   * Finish a rental (`setRentStatus` status `1`).
   *
   * @example
   * ```ts
   * await sms.finishRent(rentId);
   * ```
   */
  finishRent(id: string | number): Promise<"success"> {
    return this.setRentStatus(id, 1);
  }

  /**
   * Cancel a rental (`setRentStatus` status `2`).
   *
   * @example
   * ```ts
   * await sms.cancelRent(rentId);
   * ```
   */
  cancelRent(id: string | number): Promise<"success"> {
    return this.setRentStatus(id, 2);
  }

  /**
   * Past extensions of a rental (`getRentHistory`).
   *
   * @example
   * ```ts
   * const history = await sms.getRentHistory(rentId);
   * ```
   */
  async getRentHistory(id: string | number): Promise<RentHistory> {
    const data = await this.call("getRentHistory", { id });
    if (typeof data === "string") {
      throw errorFrom("UNEXPECTED_RESPONSE", data);
    }
    return parseRentHistory(data);
  }

  /**
   * Rental prices (`getRentPrices`).
   *
   * @example
   * ```ts
   * const prices = await sms.getRentPrices({ service: "tg", country: 0, rentTime: 4 });
   * ```
   */
  async getRentPrices(params: RentPricesParams = {}): Promise<RentPrice[]> {
    const data = await this.call("getRentPrices", {
      service: params.service,
      country: params.country,
      rent_time: params.rentTime,
    });
    if (typeof data === "string") {
      throw errorFrom("UNEXPECTED_RESPONSE", data);
    }
    return parseRentPrices(data);
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
    const data = await this.request<{ wallet_address?: string }>(
      "/public/crypto/wallet",
      {
        api_key: this.apiKey,
        coin: params.coin ?? "usdt",
        network: params.network ?? "tron",
      },
      "getWallet",
    );
    assertNotApiError(data);
    const address = data?.wallet_address;
    if (!address) {
      throw errorFrom("UNEXPECTED_RESPONSE", data);
    }
    return { walletAddress: address };
  }

  private async request<T>(
    url: string,
    params: Record<string, string>,
    action: string,
  ): Promise<T> {
    const attempts = this.attemptsFor(action);
    let lastNetwork: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await this.http.get<T>(url, {
          params,
          validateStatus: () => true,
        });
        if (response.status >= 400) {
          if (
            attempt < attempts &&
            RETRYABLE_HTTP_STATUSES.has(response.status)
          ) {
            await delay(this.retryDelayMs);
            continue;
          }
          throw httpStatusError(response.status, response.data);
        }
        if (attempt < attempts && isRetryableApiBody(response.data)) {
          await delay(this.retryDelayMs);
          continue;
        }
        return response.data;
      } catch (error) {
        if (error instanceof GrizzlySmsError) throw error;
        lastNetwork = error;
        if (attempt < attempts) {
          await delay(this.retryDelayMs);
          continue;
        }
      }
    }
    throw errorFrom(
      "NETWORK",
      lastNetwork instanceof Error ? lastNetwork.message : "Request failed",
    );
  }

  private attemptsFor(action: string): number {
    if (MUTATING_ACTIONS.has(action) && !this.retryMutations) return 1;
    return this.retries + 1;
  }

  private async cancelFailedWait(
    activationId: string,
    error: unknown,
    options: ActivateOptions,
  ): Promise<void> {
    const code = error instanceof GrizzlySmsError ? error.code : "";
    const cancel =
      (code === "TIMEOUT" && options.cancelOnTimeout) ||
      (code !== "TIMEOUT" && code !== "STATUS_CANCEL" && options.cancelOnError);
    if (!cancel) return;
    try {
      await this.cancel(activationId);
    } catch {
      // Keep the original wait error.
    }
  }

  private async jsonAction<T>(
    action: string,
    params: Record<string, string | number | undefined>,
  ): Promise<T> {
    const data = await this.call<T>(action, params);
    if (typeof data === "string") {
      throw errorFrom("UNEXPECTED_RESPONSE", data);
    }
    return data;
  }
}

function numberQuery(
  params: GetNumberParams,
): Record<string, string | number | undefined> {
  if (!params.service?.trim()) {
    throw errorFrom("BAD_SERVICE", "service is required");
  }
  return {
    service: params.service.trim(),
    country: params.country,
    maxPrice: params.maxPrice,
    minPrice: params.minPrice,
    providerIds: listParam(params.providerIds),
    exceptProviderIds: listParam(params.exceptProviderIds),
    phoneException: listParam(params.phoneException),
    operator: params.operator,
    forward:
      params.forward === undefined
        ? undefined
        : params.forward === true
          ? 1
          : params.forward === false
            ? 0
            : params.forward,
    activationType: params.activationType,
  };
}

function requireText(data: unknown): string {
  if (typeof data !== "string") {
    throw errorFrom("UNEXPECTED_RESPONSE", data);
  }
  return data;
}

function expectRentSuccess(data: unknown): "success" {
  if (!data || typeof data !== "object" || (data as { status?: unknown }).status !== "success") {
    throw errorFrom("UNEXPECTED_RESPONSE", data);
  }
  return "success";
}

function codeOf(message: VerificationMessage | null | undefined): string | undefined {
  const code = message?.code;
  return typeof code === "string" && code.trim() ? code : undefined;
}

function messageFromStatus(status: ActivationStatusV2): ReceivedMessage | undefined {
  const smsCode = codeOf(status.sms);
  if (smsCode) {
    return {
      code: smsCode,
      text: status.sms?.text,
      source: "sms",
      verificationType: status.verificationType,
    };
  }
  const callCode = codeOf(status.call);
  if (callCode) {
    return {
      code: callCode,
      text: status.call?.text,
      source: "call",
      verificationType: status.verificationType,
    };
  }
  return undefined;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(errorFrom("ABORTED", "waitForCode aborted"));
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
