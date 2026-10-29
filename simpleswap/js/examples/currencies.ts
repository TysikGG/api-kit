import { SimpleSwap } from "../src/index.js";

async function main() {
  const apiKey = process.env.SIMPLESWAP_API_KEY;
  if (!apiKey) {
    console.error("Set SIMPLESWAP_API_KEY to run this example.");
    process.exit(1);
  }

  const client = new SimpleSwap({ apiKey });
  const all = await client.getAllCurrencies();
  console.log(`getCurrencies / getAllCurrencies: ${all.length}`);

  const btc = await client.getCurrency("btc", "btc");
  console.log(`${btc.name} extra id: ${btc.hasExtraId ? btc.extraId : "none"}`);
  console.log(`Address pattern: ${btc.validationAddress}`);
  console.log(`Float available: ${btc.isAvailableFloat}; fixed available: ${btc.isAvailableFixed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
