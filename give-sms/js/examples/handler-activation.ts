import { GiveSms, HandlerSetStatus } from "../src/index.js";

/**
 * SMS-Activate compatible handler flow.
 *
 *   GIVE_SMS_API_KEY=... npx tsx examples/handler-activation.ts
 *   GIVE_SMS_ALLOW_PAID=1 also orders a number.
 */
async function main(): Promise<void> {
  const apiKey = process.env.GIVE_SMS_API_KEY;
  if (!apiKey) {
    console.log("Set GIVE_SMS_API_KEY to call the handler API.");
    return;
  }
  const client = new GiveSms({ apiKey });
  console.log("Balance", await client.handlerGetBalance());
  console.log("Prices", await client.handlerGetPrices({ country: 2, service: "tg", tiers: 1 }));
  const counts = await client.handlerGetNumbersStatus({ country: 2 });
  console.log("tg_0 count", counts.tg_0);

  if (process.env.GIVE_SMS_ALLOW_PAID !== "1") {
    console.log("Set GIVE_SMS_ALLOW_PAID=1 to order. Status codes:", HandlerSetStatus);
    return;
  }

  const ordered = await client.handlerGetNumber({ service: "tg", country: 2 });
  console.log(ordered.id, ordered.number);
  console.log(await client.handlerReady(ordered.id));
  try {
    const status = await client.handlerWaitForCode(ordered.id, { timeoutMs: 60_000, intervalMs: 5_000 });
    console.log(status.status, status.code);
    console.log(await client.handlerComplete(ordered.id));
  } catch (error) {
    console.error(error);
    console.log(await client.handlerCancel(ordered.id));
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
