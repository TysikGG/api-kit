/**
 * Creates a float order. This spends nothing until you deposit, but it does open an order.
 * Set FIXEDFLOAT_CREATE=1 to run it.
 *
 *   FIXEDFLOAT_CREATE=1 FIXEDFLOAT_API_KEY=... FIXEDFLOAT_API_SECRET=... \
 *     FIXEDFLOAT_TO_ADDRESS=0x... npx tsx examples/create-order.ts
 */
import { FixedFloat } from "../src/index.js";

async function main(): Promise<void> {
  if (process.env.FIXEDFLOAT_CREATE !== "1") {
    console.log("Refusing to create an order. Set FIXEDFLOAT_CREATE=1 to continue.");
    return;
  }
  const toAddress = process.env.FIXEDFLOAT_TO_ADDRESS;
  if (!toAddress) {
    console.error("Set FIXEDFLOAT_TO_ADDRESS to the wallet that should receive funds.");
    process.exitCode = 1;
    return;
  }

  const client = new FixedFloat({
    apiKey: process.env.FIXEDFLOAT_API_KEY,
    apiSecret: process.env.FIXEDFLOAT_API_SECRET,
  });

  const order = await client.createOrder({
    fromCcy: "BTC",
    toCcy: "ETH",
    amount: 0.01,
    direction: "from",
    type: "float",
    toAddress,
    tag: process.env.FIXEDFLOAT_TAG,
    refundAddress: process.env.FIXEDFLOAT_REFUND_ADDRESS,
  });

  console.log(`Order ${order.id} status ${order.status}`);
  console.log(`Token: ${order.token}`);
  console.log(`Deposit ${order.from.amount} ${order.from.code} to ${order.from.address}`);
  console.log(`Expect about ${order.to.amount} ${order.to.code}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
