/**
 * Creates one production quote. A quote does not move funds.
 * Run: npx tsx examples/quote.ts
 */
import { BitcoinVn } from "../src/index.js";

async function main(): Promise<void> {
  const client = new BitcoinVn({ apiKey: process.env.BITCOINVN_API_KEY });
  const quote = await client.createQuote({
    depositMethod: "btc",
    settleMethod: "usdt",
    depositAmount: 0.01,
  });
  console.log(quote.id, quote.depositAmount, quote.settleAmount, quote.rate, quote.expiresAt);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
