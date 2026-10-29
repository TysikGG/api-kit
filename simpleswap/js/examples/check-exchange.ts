import { SimpleSwap } from "../src/index.js";

async function main() {
  const apiKey = process.env.SIMPLESWAP_API_KEY;
  if (!apiKey) {
    console.error("Set SIMPLESWAP_API_KEY to run this example.");
    process.exit(1);
  }

  const client = new SimpleSwap({ apiKey });
  const check = await client.checkExchange({
    tickerFrom: "btc",
    tickerTo: "eth",
    networkFrom: "btc",
    networkTo: "eth",
    amount: "0.1",
    fixed: false,
    reverse: false,
  });
  console.log(`Can create a floating 0.1 BTC -> ETH exchange: ${check.canCreate}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
