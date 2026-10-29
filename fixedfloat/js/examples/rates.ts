/**
 * Public XML rate file. No API key is required.
 *
 *   npx tsx examples/rates.ts
 */
import { FixedFloat } from "../src/index.js";

async function main(): Promise<void> {
  const client = new FixedFloat();
  const xml = await client.getRatesXml("float");
  console.log(`Float XML bytes: ${xml.length}`);

  const pair = await client.getRates({ type: "float", from: "BTC", to: "ETH" });
  for (const row of pair) {
    console.log(`${row.in} ${row.from} -> ${row.out} ${row.to}`);
    console.log(`fee ${row.toFee} min ${row.minAmount} max ${row.maxAmount} reserve ${row.amount}`);
  }

  const fixed = await client.getRates({ type: "fixed", from: "ETH", to: "USDTTRC" });
  console.log(`Fixed ETH->USDTTRC rows: ${fixed.length}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
