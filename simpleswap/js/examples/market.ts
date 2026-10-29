import { SimpleSwap } from "../src/index.js";

async function main() {
  const apiKey = process.env.SIMPLESWAP_API_KEY;
  if (!apiKey) {
    console.error("Set SIMPLESWAP_API_KEY to run this example.");
    process.exit(1);
  }

  const client = new SimpleSwap({ apiKey });
  const market = await client.getMarketInfo();
  console.log(`Fixed-rate market rows: ${market.length}`);
  for (const row of market.slice(0, 5)) {
    console.log(
      `${row.tickerFrom}:${row.networkFrom} -> ${row.tickerTo}:${row.networkTo} rate=${row.rate} min=${row.min} max=${row.max}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
