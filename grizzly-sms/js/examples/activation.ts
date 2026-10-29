/**
 * Orders a Telegram number, waits for a code, and completes the activation.
 * This spends balance. Set GRIZZLY_API_KEY and, if you want a country, GRIZZLY_COUNTRY.
 */
import { GrizzlySms, GrizzlySmsError } from "../src/index.js";

async function main() {
  const apiKey = process.env.GRIZZLY_API_KEY;
  if (!apiKey) {
    console.error("Set GRIZZLY_API_KEY");
    process.exit(1);
  }
  const country = process.env.GRIZZLY_COUNTRY ?? "any";
  const sms = new GrizzlySms({ apiKey, retries: 2 });
  try {
    const result = await sms.activate(
      { service: "tg", country, maxPrice: Number(process.env.GRIZZLY_MAX_PRICE ?? 1) },
      {
        timeoutMs: 120_000,
        cancelOnTimeout: true,
        onStatus(status) {
          console.log(status.status);
        },
      },
    );
    console.log(result.order.phoneNumber, result.code, result.order.activationCost);
    const detailed = await sms.getStatusV2(result.order.activationId);
    console.log(detailed.sms?.text ?? detailed.call?.text ?? "");
    console.log(await sms.complete(result.order.activationId));
  } catch (error) {
    if (error instanceof GrizzlySmsError) {
      console.error(error.code, error.raw);
      process.exit(1);
    }
    throw error;
  }
}

main();
