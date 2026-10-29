import { ChangeNowValidationError } from "./errors.js";
import type { ExchangeStatus } from "./types.js";

/**
 * Status strings the exchange APIs return. The set is open: an unlisted value
 * is still a string, and only the terminal list ends a wait.
 */
export const EXCHANGE_STATUSES = [
  "new",
  "waiting",
  "confirming",
  "exchanging",
  "sending",
  "finished",
  "failed",
  "refunded",
  "verifying",
  "expired",
  "refunding",
  "rejected",
] as const;

export type KnownExchangeStatus = (typeof EXCHANGE_STATUSES)[number];

/** Statuses after which polling stops. */
export const TERMINAL_EXCHANGE_STATUSES = [
  "finished",
  "failed",
  "refunded",
  "expired",
  "rejected",
] as const;

const TERMINAL = new Set<string>(TERMINAL_EXCHANGE_STATUSES);

export function isTerminalExchangeStatus(status: string | null | undefined): boolean {
  return status !== undefined && status !== null && TERMINAL.has(status);
}

/**
 * Split a catalogue id `ticker.network` into the two fields version 3 expects.
 * A value with no dot is treated as a native asset whose network equals the ticker.
 */
export function splitAssetId(asset: string): { currency: string; network: string } {
  const trimmed = asset.trim();
  const dot = trimmed.indexOf(".");
  if (dot <= 0 || dot === trimmed.length - 1) {
    return { currency: trimmed, network: trimmed };
  }
  return { currency: trimmed.slice(0, dot), network: trimmed.slice(dot + 1) };
}

export interface ExchangeLinkParams {
  /** Legacy ticker from the asset catalogue, such as `btc` or `usdtton`. */
  from: string;
  /** Legacy ticker of the asset to receive. */
  to: string;
  /** Amount of `from` to send. Mutually exclusive with `amountTo` on the site. */
  amount?: number | string;
  /** Amount of `to` to receive. Implies a fixed rate on the exchange page. */
  amountTo?: number | string;
  /** Lock the rate on the exchange page. */
  fixedRate?: boolean;
  /** Card or bank purchase and sale. Put a fiat code on one side. */
  fiatMode?: boolean;
  recipientAddress?: string;
  recipientExtraId?: string;
  /** Refund address. Must belong to the asset being sent. */
  backupAddress?: string;
  /**
   * Optional channel tag stored by the exchange page.
   * Omitted unless you set it. Partner API attribution stays the API key header.
   */
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  /**
   * Interface language. Supported: ar, de, es, fa, fr, id, it, ja, ko, pt, tr, vi, zh.
   * English uses the bare `/exchange` path.
   */
  lang?: string;
}

/**
 * Build a prefilled https://changenow.io/exchange link.
 * The link creates no order. Only the parameters the site documents are set;
 * anything else makes the page drop the query.
 */
export function buildExchangeLink(params: ExchangeLinkParams): string {
  if (!params.from || !params.to) {
    throw new ChangeNowValidationError("buildExchangeLink requires from and to tickers");
  }
  const lang = params.lang && params.lang !== "en" ? `/${params.lang}` : "";
  const query = new URLSearchParams();
  query.set("from", params.from);
  query.set("to", params.to);
  if (params.amount !== undefined && params.amount !== "") {
    query.set("amount", String(params.amount));
  }
  if (params.amountTo !== undefined && params.amountTo !== "") {
    query.set("amountTo", String(params.amountTo));
  }
  if (params.fixedRate) {
    query.set("fixedRate", "true");
  }
  if (params.fiatMode) {
    query.set("fiatMode", "true");
  }
  if (params.recipientAddress) {
    query.set("recipientAddress", params.recipientAddress);
  }
  if (params.recipientExtraId) {
    query.set("recipientExtraId", params.recipientExtraId);
  }
  if (params.backupAddress) {
    query.set("backupAddress", params.backupAddress);
  }
  const tracking: Array<[keyof ExchangeLinkParams, string]> = [
    ["utmSource", "utm_source"],
    ["utmMedium", "utm_medium"],
    ["utmCampaign", "utm_campaign"],
    ["utmContent", "utm_content"],
    ["utmTerm", "utm_term"],
  ];
  for (const [key, name] of tracking) {
    const value = params[key];
    if (typeof value === "string" && value) {
      query.set(name, value);
    }
  }
  return `https://changenow.io${lang}/exchange?${query.toString()}`;
}

/**
 * Normalize a partner webhook or callback body into an exchange status.
 * ChangeNOW signs nothing on the public payload; this checks the shape only.
 */
export function parseExchangeWebhook(body: unknown): ExchangeStatus {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ChangeNowValidationError("Exchange webhook body must be an object");
  }
  const record = body as Record<string, unknown>;
  const id = record.id ?? record.exchangeId ?? record.requestId;
  if (typeof id !== "string" || !id) {
    throw new ChangeNowValidationError("Exchange webhook body is missing an exchange id");
  }
  if (record.status !== undefined && typeof record.status !== "string") {
    throw new ChangeNowValidationError("Exchange webhook status must be a string");
  }
  return { ...(record as unknown as ExchangeStatus), id };
}
