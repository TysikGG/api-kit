import { SimpleSwap } from "../src/index.js";

async function main() {
  const apiKey = process.env.SIMPLESWAP_API_KEY;
  if (!apiKey) {
    console.error("Please set SIMPLESWAP_API_KEY environment variable.");
    process.exit(1);
  }

  const client = new SimpleSwap({ apiKey });

  // List supported currencies
  const currencies = await client.getCurrencies();
  console.log(`Currencies available: ${currencies.length}`);
  console.log(
    "Sample currencies:",
    currencies.slice(0, 5).map((c) => `${c.name} (${c.ticker.toUpperCase()})`)
  );

  // Estimate exchange rate for 0.1 BTC to ETH
  const estimate = await client.getEstimate({
    tickerFrom: "btc",
    tickerTo: "eth",
    networkFrom: "btc",
    networkTo: "eth",
    amount: "0.1",
  });
  console.log(`\nEstimated ETH for 0.1 BTC: ${estimate.estimatedAmount}`);
}

main().catch((err) => {
  console.error("Error in quickstart:", err);
  process.exit(1);
});
