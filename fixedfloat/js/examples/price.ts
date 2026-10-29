/**
 * Quotes: parameter object, shorthand strings, availability list, and quote errors.
 *
 *   FIXEDFLOAT_API_KEY=... FIXEDFLOAT_API_SECRET=... npx tsx examples/price.ts
 */
import { FixedFloat, FixedFloatError, assertQuoteOk } from "../src/index.js";

async function main(): Promise<void> {
  const client = new FixedFloat({
    apiKey: process.env.FIXEDFLOAT_API_KEY,
    apiSecret: process.env.FIXEDFLOAT_API_SECRET,
  });

  const fixed = await client.getPrice({
    fromCcy: "ETH",
    toCcy: "BTC",
    amount: 0.1,
    direction: "from",
    type: "fixed",
    ccies: true,
    usd: true,
  });
  console.log("Fixed from amount", fixed.from.amount, "to", fixed.to.amount);
  console.log("Currencies in quote", fixed.ccies?.length ?? 0);

  const receive = await client.getPrice("ETH", "0.001 BTC", "float");
  console.log("Receive 0.001 BTC, send", receive.from.amount, receive.from.code);

  try {
    const risky = await client.getPrice({
      fromCcy: "BTC",
      toCcy: "ETH",
      amount: 0.00000001,
      direction: "from",
      type: "float",
    });
    assertQuoteOk(risky);
    console.log("Tiny quote accepted", risky.to.amount);
  } catch (error) {
    if (error instanceof FixedFloatError) {
      console.log("Quote blocked:", error.message);
    } else {
      throw error;
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
