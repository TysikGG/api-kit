/**
 * Read-only check: currencies, one quote, and the public XML rate for BTC→ETH.
 *
 *   FIXEDFLOAT_API_KEY=... FIXEDFLOAT_API_SECRET=... npx tsx examples/check.ts
 */
import { FixedFloat } from "../src/index.js";

async function main(): Promise<void> {
  const apiKey = process.env.FIXEDFLOAT_API_KEY;
  const apiSecret = process.env.FIXEDFLOAT_API_SECRET;
  if (!apiKey || !apiSecret) {
    console.error("Set FIXEDFLOAT_API_KEY and FIXEDFLOAT_API_SECRET.");
    process.exitCode = 1;
    return;
  }

  const client = new FixedFloat({ apiKey, apiSecret });
  const currencies = await client.getCurrencies();
  console.log(`Currencies: ${currencies.length}`);
  const btc = currencies.find((item) => item.code === "BTC");
  if (btc) {
    console.log(`${btc.code} ${btc.name} recv=${String(btc.recv)} send=${String(btc.send)}`);
  }

  const price = await client.getPrice({
    fromCcy: "BTC",
    toCcy: "ETH",
    amount: 0.01,
    direction: "from",
    type: "float",
  });
  console.log(`0.01 BTC -> ${price.to.amount} ETH (errors: ${(price.errors ?? []).join(",") || "none"})`);

  const rates = await client.getRates({ type: "float", from: "BTC", to: "ETH" });
  console.log(`XML rate in=${rates[0]?.in} out=${rates[0]?.out} min=${rates[0]?.minAmount}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
