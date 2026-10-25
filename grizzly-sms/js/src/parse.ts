import { GrizzlySmsError } from "./errors.js";
import type {
  ActivationStatus,
  ActiveActivation,
  CountryInfo,
  OrderedNumber,
  OrderedNumberV2,
  PriceQuote,
  PricesByCountry,
  ServiceInfo,
  SetStatusResult,
} from "./types.js";

export function listParam(
  value: ReadonlyArray<string | number> | string | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  const items = Array.isArray(value) ? value : [value];
  const joined = items
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0)
    .join(",");
  return joined || undefined;
}

export function parseAccessNumber(raw: string): OrderedNumber {
  const [prefix, activationId, ...phoneParts] = raw.trim().split(":");
  const phoneNumber = phoneParts.join(":");
  if (prefix !== "ACCESS_NUMBER" || !activationId || !phoneNumber) {
    throw new GrizzlySmsError("UNEXPECTED_RESPONSE", raw);
  }
  return { activationId, phoneNumber };
}

export function parseBalance(raw: string): number {
  const [prefix, amount] = raw.trim().split(":");
  const balance = Number(amount);
  if (prefix !== "ACCESS_BALANCE" || !Number.isFinite(balance)) {
    throw new GrizzlySmsError("UNEXPECTED_RESPONSE", raw);
  }
  return balance;
}

export function parseStatus(raw: string): ActivationStatus {
  const [status, ...rest] = raw.trim().split(":");
  if (!status?.startsWith("STATUS_")) {
    throw new GrizzlySmsError("UNEXPECTED_RESPONSE", raw);
  }
  const code = rest.join(":");
  return code ? { status, code } : { status };
}

const SET_STATUS_RESULTS = new Set<SetStatusResult>([
  "ACCESS_READY",
  "ACCESS_RETRY_GET",
  "ACCESS_ACTIVATION",
  "ACCESS_CANCEL",
]);

export function parseSetStatus(raw: string): SetStatusResult {
  const value = raw.trim() as SetStatusResult;
  if (!SET_STATUS_RESULTS.has(value)) {
    throw new GrizzlySmsError("UNEXPECTED_RESPONSE", raw);
  }
  return value;
}

function asBooleanFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

export function parseNumberV2(data: unknown): OrderedNumberV2 {
  if (!data || typeof data !== "object") {
    throw new GrizzlySmsError("UNEXPECTED_RESPONSE", data);
  }
  const row = data as Record<string, unknown>;
  const activationId = row.activationId;
  const phoneNumber = row.phoneNumber;
  if (
    (typeof activationId !== "number" && typeof activationId !== "string") ||
    (typeof phoneNumber !== "number" && typeof phoneNumber !== "string")
  ) {
    throw new GrizzlySmsError("UNEXPECTED_RESPONSE", data);
  }
  return {
    activationId: String(activationId),
    phoneNumber: String(phoneNumber),
    activationCost: Number(row.activationCost),
    currency: Number(row.currency),
    countryCode: String(row.countryCode ?? ""),
    canGetAnotherSms: asBooleanFlag(row.canGetAnotherSms),
    activationTime: String(row.activationTime ?? ""),
    activationCancel:
      row.activationCancel === undefined
        ? undefined
        : String(row.activationCancel),
    activationEnd:
      row.activationEnd === undefined ? undefined : String(row.activationEnd),
  };
}

/**
 * Flatten a `getPrices` table into rows. Non-numeric cost or count is skipped.
 *
 * @example
 * ```ts
 * const quotes = flattenPrices({ "16": { tg: { cost: 0.4, count: 20 } } });
 * ```
 */
export function flattenPrices(data: PricesByCountry): PriceQuote[] {
  const quotes: PriceQuote[] = [];
  for (const [country, services] of Object.entries(data ?? {})) {
    if (!services || typeof services !== "object") continue;
    for (const [service, quote] of Object.entries(services)) {
      if (!quote || typeof quote !== "object") continue;
      const cost = Number(quote.cost);
      const count = Number(quote.count);
      if (!Number.isFinite(cost) || !Number.isFinite(count)) continue;
      quotes.push({ country, service, cost, count });
    }
  }
  return quotes;
}

export function parseServices(data: unknown): ServiceInfo[] {
  const source = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { services?: unknown }).services)
      ? (data as { services: unknown[] }).services
      : null;
  if (!source) {
    throw new GrizzlySmsError("UNEXPECTED_RESPONSE", data);
  }
  return source.map((item) => {
    const row = item as { code?: unknown; name?: unknown };
    return { code: String(row.code ?? ""), name: String(row.name ?? "") };
  });
}

export function parseCountries(data: unknown): CountryInfo[] {
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? Object.values(data as Record<string, unknown>)
      : null;
  if (!rows) {
    throw new GrizzlySmsError("UNEXPECTED_RESPONSE", data);
  }
  return rows
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row) => ({
      id: Number(row.id),
      rus: row.rus === undefined ? undefined : String(row.rus),
      eng: row.eng === undefined ? undefined : String(row.eng),
      chn: row.chn === undefined ? undefined : String(row.chn),
      tur: row.tur === undefined ? undefined : String(row.tur),
      spa: row.spa === undefined ? undefined : String(row.spa),
      hin: row.hin === undefined ? undefined : String(row.hin),
      ara: row.ara === undefined ? undefined : String(row.ara),
      fra: row.fra === undefined ? undefined : String(row.fra),
    }))
    .filter((country) => Number.isFinite(country.id));
}

export function parseActivations(data: unknown): ActiveActivation[] {
  if (data == null) return [];
  if (!Array.isArray(data)) {
    throw new GrizzlySmsError("UNEXPECTED_RESPONSE", data);
  }
  return data.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      activationId: String(row.activationId ?? ""),
      phoneNumber: String(row.phoneNumber ?? ""),
      serviceCode: String(row.serviceCode ?? ""),
      countryCode: String(row.countryCode ?? ""),
      countryName:
        row.countryName === undefined ? undefined : String(row.countryName),
      activationCost: Number(row.activationCost),
      currency: row.currency === undefined ? undefined : Number(row.currency),
      activationStatus: row.activationStatus as number | string | undefined,
      activationTime:
        row.activationTime === undefined ? undefined : String(row.activationTime),
      canGetAnotherSms:
        row.canGetAnotherSms === undefined
          ? undefined
          : asBooleanFlag(row.canGetAnotherSms),
      discount: row.discount === undefined ? undefined : String(row.discount),
      repeated: row.repeated === undefined ? undefined : String(row.repeated),
      smsCode: row.smsCode === undefined ? undefined : String(row.smsCode),
      smsText: row.smsText === undefined ? undefined : String(row.smsText),
    };
  });
}
