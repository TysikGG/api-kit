/**
 * Offline webhook check. Does not call the network.
 * Run: npx tsx examples/webhook.ts
 */
import { webhookSignature, readWebhook } from "../src/index.js";

const apiKey = process.env.BITCOINVN_API_KEY ?? "example-key";
const body = JSON.stringify({
  id: "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
  shortId: "BV2MTZAF",
  status: "completed",
});
const signature = webhookSignature(body, apiKey);
const result = readWebhook(body, signature, apiKey, { requireSignature: true });
console.log(result.verified, result.order.shortId, result.order.status);
