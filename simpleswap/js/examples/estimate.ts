import { SimpleSwap } from "../src/index.js";

async function main() {
  const apiKey = process.env.SIMPLESWAP_API_KEY;
  if (!apiKey) {
    console.error("Set SIMPLESWAP_API_KEY to run this example.");
    process.exit(1);
  }

  const client = new SimpleSwap({ apiKey });
  const floating = await client.getEstimate({
    tickerFrom: "btc",
    networkFrom: "btc",
    tickerTo: "eth",
    networkTo: "eth",
    amount: "0.1",
    fixed: false,
    reverse: false,
  });
  console.log(`Floating: ${floating.estimatedAmount} ETH`);

  const reversed = await client.getEstimated({
    tickerFrom: "btc",
    networkFrom: "btc",
    tickerTo: "eth",
    networkTo: "eth",
    amount: "1",
    fixed: false,
    reverse: true,
  });
  console.log(`BTC required to receive about 1 ETH: ${reversed.estimatedAmount}`);

  const fixed = await client.getEstimate({
    tickerFrom: "btc",
    networkFrom: "btc",
    tickerTo: "eth",
    networkTo: "eth",
    amount: "0.1",
    fixed: true,
    customFee: "0.4",
  });
  console.log(`Fixed quote: ${fixed.estimatedAmount} ETH, rateId=${fixed.rateId}, until=${fixed.validUntil}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
