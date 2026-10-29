import { GiveSms } from "../src/index.js";

/**
 * Read-only account check. Does not order a number.
 *
 *   GIVE_SMS_API_KEY=... npx tsx examples/check.ts
 */
async function main(): Promise<void> {
  const apiKey = process.env.GIVE_SMS_API_KEY;
  if (!apiKey) {
    console.log("Set GIVE_SMS_API_KEY to call Give-SMS. Nothing was ordered.");
    return;
  }
  const client = new GiveSms({ apiKey });
  const balance = await client.getBalance();
  console.log(`Balance: ${balance}`);
  const counts = await client.getCount({ country: "kazakhstan" });
  console.log(`Operators in the Kazakhstan catalog: ${Object.keys(counts).length}`);
  const handlerBalance = await client.handlerGetBalance();
  console.log(`Handler balance: ${handlerBalance}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
