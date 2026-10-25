import { SvNumberError } from "./errors.js";
import type { ActivationStatus, OrderedNumber } from "./types.js";

export function parseBalance(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("ACCESS_BALANCE:")) {
      const amount = Number(trimmed.split(":")[1]);
      if (Number.isFinite(amount)) return amount;
    }
    const directNum = Number(trimmed);
    if (Number.isFinite(directNum)) return directNum;
  }

  throw new SvNumberError("UNEXPECTED_RESPONSE", raw);
}

export function parseAccessNumber(raw: string): OrderedNumber {
  const [prefix, activationId, ...phoneParts] = String(raw).trim().split(":");
  const phoneNumber = phoneParts.join(":");
  if (prefix !== "ACCESS_NUMBER" || !activationId || !phoneNumber) {
    throw new SvNumberError("UNEXPECTED_RESPONSE", raw);
  }
  return { activationId, phoneNumber };
}

export function parseStatus(raw: string): ActivationStatus {
  const [status, ...rest] = String(raw).trim().split(":");
  if (!status?.startsWith("STATUS_")) {
    throw new SvNumberError("UNEXPECTED_RESPONSE", raw);
  }
  const code = rest.join(":");
  return code ? { status, code } : { status };
}
