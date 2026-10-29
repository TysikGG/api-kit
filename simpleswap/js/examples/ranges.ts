import { SimpleSwap } from "../src/index.js";

async function main() {
  const apiKey = process.env.SIMPLESWAP_API_KEY;
  if (!apiKey) {
    console.error("Set SIMPLESWAP_API_KEY to run this example.");
    process.exit(1);
  }

  const client = new SimpleSwap({ apiKey });
  const pair = {
    tickerFrom: "btc",
    tickerTo: "eth",
    networkFrom: "btc",
    networkTo: "eth",
  };
  const floating = await client.getRanges({ ...pair, fixed: false, reverse: false });
  console.log(`Floating min ${floating.min}, max ${floating.max ?? "none"}`);

  const minimum = await client.getMin({ ...pair, fixed: false });
  console.log(`getMin (legacy helper): ${minimum}`);

  const reversed = await client.getRanges({ ...pair, fixed: false, reverse: true });
  console.log(`Reverse range min ${reversed.min}, max ${reversed.max ?? "none"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
