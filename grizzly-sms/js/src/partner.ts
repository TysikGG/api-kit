import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

import { errorFrom } from "./errors.js";
import { axiosProxy } from "./parse.js";

const DEFAULT_BASE_URL = "https://api.grizzlysms.com";
const USER_AGENT = "grizzly-sms/2.0.0";
const PUSH_PATH = "/agent/api/sms";

export interface GrizzlyPartnerOptions {
  /** Partner protocol key from the personal account. */
  key: string;
  baseUrl?: string;
  timeoutMs?: number;
  /**
   * HTTP proxy URL. Ignored when `axios` is set.
   * Example: `http://127.0.0.1:8080`.
   */
  proxy?: string;
  axios?: AxiosInstance;
}

export interface PushRetryOptions {
  /** Extra attempts after the first request. Default `0`. */
  retries?: number;
  /** Delay between attempts. The protocol asks for 10 seconds. */
  retryDelayMs?: number;
}

export interface PushSmsParams extends PushRetryOptions {
  smsId: number;
  phone: number;
  phoneFrom: string;
  text: string;
}

export interface PushCallParams extends PushRetryOptions {
  callId: number;
  phone: number;
  phoneFrom: string;
}

export interface PushCallRecordParams extends PushRetryOptions {
  callId: number;
  phone: number;
  phoneFrom: string;
  /** Required when `file` is omitted. */
  text?: string;
  /** wav, amr, mp3, or ogg. Required when `text` is omitted. */
  file?: Blob;
  filename?: string;
}

export interface PartnerStatus {
  status: string;
  error?: string;
}

/** Inbound `GET_SERVICES` body sent by Grizzly to the partner server. */
export interface PartnerGetServicesRequest {
  action: "GET_SERVICES";
  key: string;
}

export interface PartnerCountryStock {
  country: number;
  operatorMap: Record<string, Record<string, number>>;
}

export interface PartnerGetServicesResponse {
  status: "SUCCESS" | "ERROR";
  countryList?: PartnerCountryStock[];
  error?: string;
}

/** Inbound `GET_NUMBER` body sent by Grizzly to the partner server. */
export interface PartnerGetNumberRequest {
  action: "GET_NUMBER";
  key: string;
  country: number;
  operator: string;
  service: string;
  sum: number;
  exceptionPhoneSet?: string[];
  canGetAnotherSms?: boolean | number | string;
}

export interface PartnerGetNumberResponse {
  status: "SUCCESS" | "NO_NUMBERS" | "ERROR";
  number?: number;
  activationId?: number;
  flashcall?: boolean;
  voice?: boolean;
  canGetAnotherSms?: boolean | number | string;
  error?: string;
}

/**
 * Inbound `FINISH_ACTIVATION` body.
 * `1` forbidden, `3` sold, `4` cancelled, `5` returned to the customer.
 */
export interface PartnerFinishActivationRequest {
  action: "FINISH_ACTIVATION";
  key: string;
  activationId: number;
  status: 1 | 3 | 4 | 5;
}

export interface PartnerFinishActivationResponse {
  status: "SUCCESS" | "ERROR";
  error?: string;
}

/**
 * Client for the calls a partner sends to Grizzly: SMS, flash-call, and
 * call-record delivery. `GET_SERVICES`, `GET_NUMBER`, and `FINISH_ACTIVATION`
 * are incoming requests — the types above describe those payloads.
 *
 * PUSH_CALL and PUSH_CALL_RECORD are posted to `/agent/api/sms`, the address
 * written in the protocol articles. The `action` field selects the method.
 *
 * @example
 * ```ts
 * const partner = new GrizzlyPartner({ key: process.env.GRIZZLY_PARTNER_KEY! });
 * await partner.pushSms({
 *   smsId: 1,
 *   phone: 447472190082,
 *   phoneFrom: "Microsoft",
 *   text: "code 5015",
 * });
 * ```
 */
export class GrizzlyPartner {
  private readonly key: string;
  private readonly http: AxiosInstance;

  /**
   * @param options Partner key from the personal account.
   *
   * @example
   * ```ts
   * const partner = new GrizzlyPartner({ key: process.env.GRIZZLY_PARTNER_KEY! });
   * ```
   */
  constructor(options: GrizzlyPartnerOptions) {
    if (!options.key?.trim()) {
      throw errorFrom("NO_KEY", "Partner key is required");
    }
    this.key = options.key.trim();
    this.http =
      options.axios ??
      axios.create({
        baseURL: (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, ""),
        timeout: options.timeoutMs ?? 30_000,
        proxy: options.proxy ? axiosProxy(options.proxy) : undefined,
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
      });
  }

  /**
   * Deliver an inbound SMS (`PUSH_SMS`).
   *
   * @example
   * ```ts
   * await partner.pushSms({
   *   smsId: 1,
   *   phone: 447472190082,
   *   phoneFrom: "Microsoft",
   *   text: "code 5015",
   * });
   * ```
   */
  pushSms(params: PushSmsParams): Promise<PartnerStatus> {
    return this.postJson(
      {
        action: "PUSH_SMS",
        key: this.key,
        smsId: params.smsId,
        phone: params.phone,
        phoneFrom: params.phoneFrom,
        text: params.text,
      },
      params,
    );
  }

  /**
   * Deliver a flash-call (`PUSH_CALL`).
   *
   * @example
   * ```ts
   * await partner.pushCall({
   *   callId: 10,
   *   phone: 447472190082,
   *   phoneFrom: "100",
   * });
   * ```
   */
  pushCall(params: PushCallParams): Promise<PartnerStatus> {
    return this.postJson(
      {
        action: "PUSH_CALL",
        key: this.key,
        callId: params.callId,
        phone: params.phone,
        phoneFrom: params.phoneFrom,
      },
      params,
    );
  }

  /**
   * Deliver a call recording (`PUSH_CALL_RECORD`). Pass `text`, `file`, or both.
   *
   * @example
   * ```ts
   * await partner.pushCallRecord({
   *   callId: 10,
   *   phone: 447472190082,
   *   phoneFrom: "100",
   *   text: "your code is 5015",
   * });
   * ```
   */
  async pushCallRecord(params: PushCallRecordParams): Promise<PartnerStatus> {
    if (!params.text && !params.file) {
      throw errorFrom("BAD_ACTION", "pushCallRecord requires text or file");
    }
    const form = new FormData();
    form.append("action", "PUSH_CALL_RECORD");
    form.append("key", this.key);
    form.append("callId", String(params.callId));
    form.append("phone", String(params.phone));
    form.append("phoneFrom", params.phoneFrom);
    if (params.text) form.append("text", params.text);
    if (params.file) {
      form.append("file", params.file, params.filename ?? "record");
    }
    return this.send(
      () => this.http.post(PUSH_PATH, form, { validateStatus: () => true }),
      params,
    );
  }

  private postJson(
    body: Record<string, unknown>,
    retry: PushRetryOptions,
  ): Promise<PartnerStatus> {
    return this.send(
      () =>
        this.http.post(PUSH_PATH, body, {
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        } satisfies AxiosRequestConfig),
      retry,
    );
  }

  private async send(
    request: () => Promise<{ status: number; data: unknown }>,
    retry: PushRetryOptions,
  ): Promise<PartnerStatus> {
    const attempts = (retry.retries ?? 0) + 1;
    const delayMs = retry.retryDelayMs ?? 10_000;
    let last: PartnerStatus | undefined;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      let response;
      try {
        response = await request();
      } catch (error) {
        throw errorFrom(
          "NETWORK",
          error instanceof Error ? error.message : "Request failed",
        );
      }
      if (response.status >= 400) {
        throw errorFrom(`HTTP_${response.status}`, response.data);
      }
      const status = readStatus(response.data);
      if (status.status === "SUCCESS") return status;
      last = status;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw errorFrom(last?.status || "ERROR", last?.error ?? last?.status);
  }
}

export type PartnerInboundRequest =
  | PartnerGetServicesRequest
  | PartnerGetNumberRequest
  | PartnerFinishActivationRequest;

/**
 * Classify a body Grizzly posted to the partner server.
 *
 * @example
 * ```ts
 * const inbound = parsePartnerRequest(JSON.parse(rawBody));
 * if (inbound.action === "GET_NUMBER") {
 *   inbound.service;
 * }
 * ```
 */
export function parsePartnerRequest(data: unknown): PartnerInboundRequest {
  if (!data || typeof data !== "object") {
    throw errorFrom("UNEXPECTED_RESPONSE", data);
  }
  const row = data as Record<string, unknown>;
  const action = row.action;
  const key = row.key;
  if (typeof key !== "string" || !key.trim()) {
    throw errorFrom("NO_KEY", data);
  }
  if (action === "GET_SERVICES") {
    return { action, key };
  }
  if (action === "GET_NUMBER") {
    return {
      action,
      key,
      country: Number(row.country),
      operator: String(row.operator ?? ""),
      service: String(row.service ?? ""),
      sum: Number(row.sum),
      exceptionPhoneSet: Array.isArray(row.exceptionPhoneSet)
        ? row.exceptionPhoneSet.map((item) => String(item))
        : undefined,
      canGetAnotherSms: row.canGetAnotherSms as boolean | number | string | undefined,
    };
  }
  if (action === "FINISH_ACTIVATION") {
    const status = Number(row.status);
    if (status !== 1 && status !== 3 && status !== 4 && status !== 5) {
      throw errorFrom("BAD_STATUS", data);
    }
    return {
      action,
      key,
      activationId: Number(row.activationId),
      status,
    };
  }
  throw errorFrom("BAD_ACTION", data);
}

/** Reply to inbound `GET_SERVICES`. */
export function partnerServicesResponse(
  countryList: PartnerCountryStock[],
): PartnerGetServicesResponse {
  return { status: "SUCCESS", countryList };
}

/** Reply to inbound `GET_NUMBER`. */
export function partnerNumberResponse(
  response: Omit<PartnerGetNumberResponse, "status"> & { status?: PartnerGetNumberResponse["status"] },
): PartnerGetNumberResponse {
  return { ...response, status: response.status ?? "SUCCESS" };
}

/** Reply to inbound `FINISH_ACTIVATION`. */
export function partnerFinishResponse(
  error?: string,
): PartnerFinishActivationResponse {
  if (error) return { status: "ERROR", error };
  return { status: "SUCCESS" };
}

function readStatus(data: unknown): PartnerStatus {
  if (!data || typeof data !== "object" || !("status" in data)) {
    throw errorFrom("UNEXPECTED_RESPONSE", data);
  }
  const row = data as { status?: unknown; error?: unknown };
  return {
    status: String(row.status ?? ""),
    error: row.error === undefined ? undefined : String(row.error),
  };
}
