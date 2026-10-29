import { SimpleSwap } from "../src/index.js";

async function main() {
  const apiKey = process.env.SIMPLESWAP_API_KEY;
  if (!apiKey) {
    console.error("Set SIMPLESWAP_API_KEY to run this example.");
    process.exit(1);
  }

  const client = new SimpleSwap({ apiKey });
  const currencies = await client.getCurrencies();
  console.log(`Currencies available: ${currencies.length}`);
  console.log(
    "Sample:",
    currencies.slice(0, 5).map((currency) => `${currency.name} (${currency.ticker}:${currency.network})`)
  );

  const estimate = await client.getEstimate({
    tickerFrom: "btc",
    tickerTo: "eth",
    networkFrom: "btc",
    networkTo: "eth",
    amount: "0.1",
    fixed: false,
  });
  console.log(`0.1 BTC -> ${estimate.estimatedAmount} ETH`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
