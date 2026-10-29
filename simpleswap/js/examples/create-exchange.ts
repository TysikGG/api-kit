/**
 * Creates a real exchange when SIMPLESWAP_EXAMPLE_CREATE=1.
 * Without that flag the script only prints the request it would send.
 */
import { SimpleSwap } from "../src/index.js";

async function main() {
  const apiKey = process.env.SIMPLESWAP_API_KEY;
  const address = process.env.SIMPLESWAP_ADDRESS_TO || "0x0000000000000000000000000000000000000000";
  if (!apiKey) {
    console.error("Set SIMPLESWAP_API_KEY to run this example.");
    process.exit(1);
  }

  const floating = {
    tickerFrom: "btc",
    tickerTo: "eth",
    networkFrom: "btc",
    networkTo: "eth",
    amount: "0.1",
    addressTo: address,
    fixed: false,
    reverse: false,
    userRefundAddress: process.env.SIMPLESWAP_REFUND_ADDRESS,
    userRefundExtraId: process.env.SIMPLESWAP_REFUND_EXTRA_ID,
  };
  const fixed = {
    ...floating,
    fixed: true,
    rateId: process.env.SIMPLESWAP_RATE_ID,
    customFee: process.env.SIMPLESWAP_CUSTOM_FEE,
  };

  console.log("Floating createExchange params:", floating);
  console.log("Fixed createExchange params:", fixed);

  if (process.env.SIMPLESWAP_EXAMPLE_CREATE !== "1") {
    console.log("Set SIMPLESWAP_EXAMPLE_CREATE=1 to POST /v3/exchanges. This spends no API credit but opens an order.");
    return;
  }

  const client = new SimpleSwap({ apiKey });
  const order = await client.createExchange(floating);
  console.log(`Deposit ${order.amountFrom} ${order.tickerFrom} to ${order.addressFrom}`);
  console.log(`Public id: ${order.publicId || order.id}, status: ${order.status}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
