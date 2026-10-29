import { FixedFloatError } from "./errors.js";
import { GetPriceParams, OrderType, PriceResult, RateItem } from "./types.js";

const AMOUNT_CODE = /^\s*([0-9]*\.?[0-9]+)\s+([A-Za-z0-9]+)\s*$/;
const CODE_ONLY = /^\s*([A-Za-z0-9]+)\s*$/;

/**
 * Human-readable labels for order statuses. Unknown statuses are returned unchanged.
 */
export const ORDER_STATUS_TEXT: Record<string, string> = {
  NEW: "New order",
  PENDING: "Transaction received, pending confirmation",
  EXCHANGE: "Transaction confirmed, exchange in progress",
  WITHDRAW: "Sending funds",
  DONE: "Order completed",
  EXPIRED: "Order expired",
  EMERGENCY: "Emergency, customer choice required",
};

/** Statuses that normally end a wait. EMERGENCY still needs a customer choice. */
export const TERMINAL_ORDER_STATUSES = ["DONE", "EXPIRED", "EMERGENCY"] as const;

/** Quote error codes returned in `PriceResult.errors` (the HTTP call still succeeds). */
export const PRICE_ERROR_TEXT: Record<string, string> = {
  MAINTENANCE_FROM: "Currency being sent is under maintenance",
  MAINTENANCE_TO: "Currency being received is under maintenance",
  OFFLINE_FROM: "Currency being sent is offline",
  OFFLINE_TO: "Currency being received is offline",
  RESERVE_FROM: "Not enough reserves of the currency being sent",
  RESERVE_TO: "Not enough reserves of the currency being received",
  LIMIT_MIN: "Amount is below the minimum",
  LIMIT_MAX: "Amount is above the maximum",
};

/** Label for an order status. */
export function orderStatusText(status: string): string {
  return ORDER_STATUS_TEXT[status] ?? status;
}

/**
 * Throws when a quote lists problems that would block order creation.
 * The price endpoint returns HTTP success together with these codes.
 */
export function assertQuoteOk(price: PriceResult): void {
  const errors = price.errors ?? [];
  if (errors.length === 0) {
    return;
  }
  const details = errors.map((code) => PRICE_ERROR_TEXT[code] ?? code).join("; ");
  throw new FixedFloatError(`Quote is not exchangeable: ${details}`, 0, errors);
}

/**
 * Parses the fixedfloat-api style pair strings.
 *
 * - `"0.1 ETH", "BTC"` means send 0.1 ETH (direction `from`)
 * - `"ETH", "0.1 BTC"` means receive 0.1 BTC (direction `to`)
 */
export function parsePriceShorthand(
  from: string,
  to: string,
  type: OrderType = "float",
): GetPriceParams {
  const fromAmount = AMOUNT_CODE.exec(from);
  const toAmount = AMOUNT_CODE.exec(to);
  const fromCode = CODE_ONLY.exec(from);
  const toCode = CODE_ONLY.exec(to);

  if (fromAmount && toCode && !toAmount) {
    return {
      fromCcy: fromAmount[2].toUpperCase(),
      toCcy: toCode[1].toUpperCase(),
      amount: Number(fromAmount[1]),
      direction: "from",
      type,
    };
  }

  if (fromCode && toAmount && !fromAmount) {
    return {
      fromCcy: fromCode[1].toUpperCase(),
      toCcy: toAmount[2].toUpperCase(),
      amount: Number(toAmount[1]),
      direction: "to",
      type,
    };
  }

  throw new FixedFloatError(
    "Price shorthand must look like '0.1 ETH', 'BTC' or 'ETH', '0.1 BTC'",
  );
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function pickTag(block: string, tag: string): string {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i").exec(block);
  return match ? decodeXml(match[1].trim()) : "";
}

/**
 * Parses a FixedFloat rates export (`https://ff.io/rates/float.xml` or `fixed.xml`).
 * An empty `<rates>` document returns an empty list. Any other document throws.
 */
export function parseRatesXml(xml: string): RateItem[] {
  const items: RateItem[] = [];
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[1];
    items.push({
      from: pickTag(block, "from"),
      to: pickTag(block, "to"),
      in: pickTag(block, "in"),
      out: pickTag(block, "out"),
      amount: pickTag(block, "amount"),
      toFee: pickTag(block, "tofee"),
      minAmount: pickTag(block, "minamount"),
      maxAmount: pickTag(block, "maxamount"),
    });
  }

  if (items.length === 0 && !/<rates\b/i.test(xml)) {
    throw new FixedFloatError("Failed to parse rates XML");
  }

  return items;
}

/** Case-insensitive pair filter used by `getRates`. */
export function filterRates(items: RateItem[], from?: string, to?: string): RateItem[] {
  const fromCode = from?.toUpperCase();
  const toCode = to?.toUpperCase();
  return items.filter((item) => {
    if (fromCode && item.from.toUpperCase() !== fromCode) {
      return false;
    }
    if (toCode && item.to.toUpperCase() !== toCode) {
      return false;
    }
    return true;
  });
}
