/** Parses a profile webhook body. No network. */
import { parseActivationWebhook } from "../src/index.js";

const event = parseActivationWebhook({
  activationId: 15,
  service: "tg",
  text: "code 5015",
  code: "5015",
  country: "16",
  receivedAt: "2026-01-01 00:00:00",
});
console.log(event.activationId, event.code, event.service);
