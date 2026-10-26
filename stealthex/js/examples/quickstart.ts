import { StealthEX } from "../src/index.js";

async function main() {
  const apiKey = process.env.STEALTHEX_API_KEY;
  if (!apiKey) {
    console.error("Please set STEALTHEX_API_KEY environment variable.");
    process.exit(1);
  }

  const client = new StealthEX({ apiKey });

  // List supported currencies
  const currencies = await client.getCurrencies();
  console.log(`Currencies count: ${currencies.length}`);
  console.log(
    "Sample currencies:",
    currencies.slice(0, 5).map((c) => `${c.name} (${c.symbol.toUpperCase()})`)
  );

  // Estimate exchange amount for 0.1 BTC to ETH
  const est = await client.getEstimate("btc", "eth", "0.1");
  console.log(`\n0.1 BTC -> ${est.estimated_amount} ETH`);
}

main().catch((err) => {
  console.error("Error in quickstart:", err);
  process.exit(1);
});
