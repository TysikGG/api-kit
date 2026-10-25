import { Swapzone } from "../src/index.js";

async function main() {
  const apiKey = process.env.SWAPZONE_API_KEY;
  if (!apiKey) {
    console.error("Please set SWAPZONE_API_KEY environment variable.");
    process.exit(1);
  }

  const client = new Swapzone({ apiKey });

  // List supported currencies
  const currencies = await client.getCurrencies();
  console.log(`Supported currencies count: ${currencies.length}`);
  console.log(
    "Sample currencies:",
    currencies.slice(0, 5).map((c) => `${c.name} (${c.ticker.toUpperCase()})`)
  );

  // Get current exchange rate for 0.1 BTC to ETH
  const rate = await client.getRate({
    from: "btc",
    to: "eth",
    amount: "0.1",
  });
  console.log(`\nExchange Rate: 0.1 BTC -> ${rate.amountTo} ETH via ${rate.adapter}`);
}

main().catch((err) => {
  console.error("Error in quickstart:", err);
  process.exit(1);
});
