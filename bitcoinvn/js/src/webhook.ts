import { createHmac, timingSafeEqual } from "node:crypto";

import { BitcoinVnError, BitcoinVnUnauthorizedError } from "./errors.js";
import type { Order } from "./types.js";

/** Parsed order webhook body and whether `X-Signature` matched the API key. */
export interface WebhookRead {
  order: Order;
  verified: boolean;
}

/**
 * Lowercase hex HMAC-SHA256 of the exact webhook body, using the API key as the secret.
 * BitcoinVN signs account-order deliveries this way. Guest orders are unsigned.
 */
export function webhookSignature(rawBody: string | Buffer, apiKey: string): string {
  return createHmac("sha256", apiKey).update(rawBody).digest("hex");
}

/**
 * Compare `X-Signature` with the HMAC of the raw body.
 * Returns false when the signature or key is missing, the length differs, or the digest differs.
 * The comparison is case-insensitive and does not throw.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string | null | undefined,
  apiKey: string,
): boolean {
  if (!signature || !apiKey) return false;
  const expected = webhookSignature(rawBody, apiKey);
  const candidate = signature.trim().toLowerCase();
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(candidate));
}

/**
 * Parse a webhook body into an order.
 * Set `requireSignature` when the order was created with an API key.
 * Guest deliveries have no signature; confirm them with `getOrder` before crediting a payment.
 */
export function readWebhook(
  rawBody: string | Buffer,
  signature?: string | null,
  apiKey?: string,
  options?: { requireSignature?: boolean },
): WebhookRead {
  const text = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
  const verified = apiKey ? verifyWebhookSignature(text, signature, apiKey) : false;
  if (options?.requireSignature && !verified) {
    throw new BitcoinVnUnauthorizedError("Webhook signature did not match", {
      status: 401,
      code: 401,
      raw: text,
    });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch (error) {
    throw new BitcoinVnError("Webhook body was not JSON", {
      status: 0,
      code: 0,
      raw: text,
      details: error instanceof Error ? error.message : error,
    });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new BitcoinVnError("Webhook body was not an order object", {
      status: 0,
      code: 0,
      raw: payload,
    });
  }
  return { order: payload as Order, verified };
}
