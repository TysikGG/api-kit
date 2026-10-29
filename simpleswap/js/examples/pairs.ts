import { SimpleSwap } from "../src/index.js";

async function main() {
  const apiKey = process.env.SIMPLESWAP_API_KEY;
  if (!apiKey) {
    console.error("Set SIMPLESWAP_API_KEY to run this example.");
    process.exit(1);
  }

  const client = new SimpleSwap({ apiKey });
  const btcPairs = await client.getPairs("btc", "btc", { fixed: false });
  const key = Object.keys(btcPairs)[0];
  console.log(`Floating destinations for ${key}: ${(btcPairs[key] || []).slice(0, 8).join(", ")}`);

  const fixed = await client.getPairs("btc", "btc", { fixed: true });
  console.log(`Fixed-rate keys: ${Object.keys(fixed).length}`);

  // getAllPairs() is the same call with no ticker. It can be a large payload.
  if (process.env.SIMPLESWAP_EXAMPLE_ALL_PAIRS === "1") {
    const all = await client.getAllPairs({ fixed: false });
    console.log(`All floating pair keys: ${Object.keys(all).length}`);
  } else {
    console.log("Set SIMPLESWAP_EXAMPLE_ALL_PAIRS=1 to request GET /v3/pairs.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
