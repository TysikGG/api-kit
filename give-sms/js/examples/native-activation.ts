import { GiveSms, GiveSmsError } from "../src/index.js";

/**
 * Native /api/v1/ activation. Ordering spends balance, so it stays behind a flag.
 *
 *   GIVE_SMS_API_KEY=... GIVE_SMS_ALLOW_PAID=1 npx tsx examples/native-activation.ts
 */
async function main(): Promise<void> {
  const apiKey = process.env.GIVE_SMS_API_KEY;
  if (!apiKey) {
    console.log("Set GIVE_SMS_API_KEY. This example orders a number only when GIVE_SMS_ALLOW_PAID=1.");
    return;
  }
  const client = new GiveSms({ apiKey, retries: 2, retryDelayMs: 500 });
  const catalog = await client.getAllCount({ service: "tg" });
  console.log("Telegram availability sample:", catalog);

  if (process.env.GIVE_SMS_ALLOW_PAID !== "1") {
    console.log("Refusing to order. Set GIVE_SMS_ALLOW_PAID=1 to continue.");
    return;
  }

  const activation = await client.purchase({ service: "tg", country: "kazakhstan" });
  console.log(`Number +${activation.number} order ${activation.id}`);
  try {
    const sms = await activation.waitForCode({ timeoutMs: 60_000, intervalMs: 5_000 });
    console.log("Code:", sms.code, "SMS:", sms.fullSms);
    const next = await activation.wrongCode(sms.smsId);
    console.log("Next status:", next.status, next.code ?? "");
  } catch (error) {
    if (error instanceof GiveSmsError) {
      console.error(error.code, error.message, error.reason ?? "");
    }
    await activation.cancel();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
