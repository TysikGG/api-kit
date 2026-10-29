import { Peak, formatBalance } from "../src/index.js";

/**
 * Safe check: reads the account balance and does not spend credits.
 *
 *   PEAK_API_KEY=pk_... npx tsx examples/check.ts
 */
async function main() {
  const apiKey = process.env.PEAK_API_KEY;
  if (!apiKey) {
    console.error("Set PEAK_API_KEY to your Peak API key.");
    process.exit(1);
  }

  const client = new Peak({ apiKey });
  const balance = await client.getBalance();
  console.log(formatBalance(balance));
  console.log(balance);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
