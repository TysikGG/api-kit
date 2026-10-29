import { apiStatusError, handlerError } from "./errors.js";
import type {
  ActivationNumber,
  ApiResponse,
  CodeResult,
  HandlerStatusResult,
  RentOrder,
  RentProlongResult,
  RentSmsList,
  RentSmsMessage,
} from "./types.js";
import { GiveSmsError } from "./errors.js";

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

export function envelopeMessage(body: unknown): { message: string; reason?: string } {
  const record = asRecord(body);
  const data = asRecord(record?.data);
  const reason = typeof data?.reason === "string" ? data.reason : undefined;
  const message =
    (typeof data?.msg === "string" && data.msg) ||
    (typeof data?.error === "string" && data.error) ||
    (typeof data?.advice === "string" && data.advice) ||
    (typeof record?.msg === "string" && record.msg) ||
    "";
  return { message, reason };
}

export function assertEnvelope<T>(body: unknown, allowStatuses: number[]): ApiResponse<T> {
  const record = asRecord(body);
  if (!record) {
    throw new GiveSmsError("Invalid JSON response", undefined, body);
  }
  if (!("status" in record)) {
    return { status: 200, data: body as T };
  }
  const status = Number(record.status);
  const allowed = status === 200 || status === 1 || allowStatuses.includes(status);
  if (!allowed) {
    const { message, reason } = envelopeMessage(body);
    throw apiStatusError(
      status,
      message || `API returned status ${status}`,
      body,
      reason,
    );
  }
  const data = ("data" in record ? record.data : body) as T;
  return { status, data };
}

export function parseBalance(data: unknown): number {
  let value: unknown = data;
  const record = asRecord(data);
  if (record) {
    if (record.balance !== undefined && record.balance !== null) {
      value = record.balance;
    } else if (record.user_balance !== undefined && record.user_balance !== null) {
      value = record.user_balance;
    } else {
      throw new GiveSmsError("Missing balance in API response", undefined, data);
    }
  }
  const balance = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (Number.isNaN(balance)) {
    throw new GiveSmsError("Invalid balance received from API", undefined, data);
  }
  return balance;
}

export function parseActivation(data: unknown): ActivationNumber {
  const record = asRecord(data);
  const id = record?.order_id ?? record?.id;
  const number = record?.phone ?? record?.number;
  if (id === undefined || id === null || id === "" || number === undefined || number === null || number === "") {
    throw new GiveSmsError("Incomplete number data returned by API", undefined, data);
  }
  return {
    id: id as string | number,
    number: String(number),
    phone: String(number),
    orderId: (record?.order_id ?? id) as string | number,
    startTime: typeof record?.start_time === "string" ? record.start_time : undefined,
  };
}

export function parseCode(envelope: ApiResponse<unknown>): CodeResult {
  const data = asRecord(envelope.data) ?? {};
  if (envelope.status === 400) {
    return {
      status: "WAIT",
      message: typeof data.msg === "string" ? data.msg : undefined,
      advice: typeof data.advice === "string" ? data.advice : undefined,
      extra: envelope.data,
    };
  }
  const code = data.code === undefined || data.code === null ? undefined : String(data.code);
  return {
    status: data.status === undefined || data.status === null ? "OK" : String(data.status),
    code,
    fullSms: typeof data.fullSms === "string" ? data.fullSms : undefined,
    phone: typeof data.phone === "string" ? data.phone : undefined,
    receivedDate: typeof data.receivedDate === "string" ? data.receivedDate : undefined,
    sender: typeof data.sender === "string" ? data.sender : undefined,
    smsId: data.id as string | number | undefined,
    phonePass: typeof data.phonePass === "string" ? data.phonePass : undefined,
    extra: envelope.data,
  };
}

export function parseAccessNumber(text: string): ActivationNumber {
  if (!text.startsWith("ACCESS_NUMBER:")) {
    throw new GiveSmsError(`Failed to order number: ${text}`, text, text);
  }
  const rest = text.slice("ACCESS_NUMBER:".length);
  const splitAt = rest.indexOf(":");
  if (splitAt <= 0 || splitAt === rest.length - 1) {
    throw new GiveSmsError(`Malformed ACCESS_NUMBER response: ${text}`, text, text);
  }
  return {
    id: rest.slice(0, splitAt),
    number: rest.slice(splitAt + 1),
    phone: rest.slice(splitAt + 1),
    orderId: rest.slice(0, splitAt),
  };
}

export function parseHandlerBalance(text: string): number {
  const prefix = "ACCESS_BALANCE:";
  if (!text.startsWith(prefix)) {
    throw new GiveSmsError(`Unexpected balance response: ${text}`, text, text);
  }
  const value = Number.parseFloat(text.slice(prefix.length));
  if (Number.isNaN(value)) {
    throw new GiveSmsError(`Invalid balance format: ${text}`, text, text);
  }
  return value;
}

export function parseHandlerStatus(text: string): HandlerStatusResult {
  if (text.startsWith("STATUS_OK:")) {
    return { status: "STATUS_OK", code: text.slice("STATUS_OK:".length), raw: text };
  }
  if (text.startsWith("STATUS_WAIT_RETRY:")) {
    return {
      status: "STATUS_WAIT_RETRY",
      code: text.slice("STATUS_WAIT_RETRY:".length),
      raw: text,
    };
  }
  return { status: text, raw: text };
}

export function parseJsonText(text: string, what: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new GiveSmsError(`Invalid JSON from handler ${what}: ${text}`, text, text);
  }
}

export function throwIfHandlerError(text: string): void {
  const error = handlerError(text);
  if (error) {
    throw error;
  }
}

export function parseRentOrder(data: unknown): RentOrder {
  const record = asRecord(data);
  const orderId = record?.order_id;
  const phone = record?.phone;
  if (
    !record ||
    orderId === undefined ||
    orderId === null ||
    phone === undefined ||
    phone === null ||
    phone === ""
  ) {
    throw new GiveSmsError("Incomplete rent order returned by API", undefined, data);
  }
  const orderIds = Array.isArray(record?.order_ids)
    ? (record.order_ids as Array<string | number>)
    : undefined;
  return {
    orderId: orderId as string | number,
    phone: String(phone),
    countryCode: typeof record?.country_code === "string" ? record.country_code : undefined,
    endTime: typeof record?.end_time === "string" ? record.end_time : undefined,
    endTimeTimestamp:
      typeof record?.end_time_timestamp === "number" ? record.end_time_timestamp : undefined,
    startTimestamp: typeof record?.start_timestamp === "number" ? record.start_timestamp : undefined,
    ordersCount: typeof record?.orders_count === "number" ? record.orders_count : undefined,
    orderIds,
    raw: record,
  };
}

export function parseRentSms(data: unknown): RentSmsList {
  const record = asRecord(data) ?? {};
  const list = Array.isArray(record.sms_list) ? record.sms_list : [];
  const messages: RentSmsMessage[] = list.map((item) => {
    const row = asRecord(item) ?? {};
    return {
      date: typeof row.date === "string" ? row.date : undefined,
      text: typeof row.text === "string" ? row.text : undefined,
      timestamp: typeof row.timestamp === "number" ? row.timestamp : undefined,
      raw: row,
    };
  });
  return {
    message: typeof record.msg === "string" ? record.msg : undefined,
    messages,
    raw: record,
  };
}

export function parseRentProlong(data: unknown): RentProlongResult {
  const record = asRecord(data) ?? {};
  return {
    message: typeof record.msg === "string" ? record.msg : undefined,
    orderId: record.order_id as string | number | undefined,
    days: typeof record.days === "number" ? record.days : undefined,
    price: typeof record.price === "number" ? record.price : undefined,
    rentAt: typeof record.rent_at === "number" ? record.rent_at : undefined,
    rentAtFormatted: typeof record.rent_at_formatted === "string" ? record.rent_at_formatted : undefined,
    raw: record,
  };
}

export function cleanParams(params: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned;
}

export function joinServices(services: string | Array<string | number>): string {
  return Array.isArray(services) ? services.map(String).join(",") : services;
}
