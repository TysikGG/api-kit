/**
 * Confirms a provider deposit with PUT /v3/exchanges.
 * Runs the call only when SIMPLESWAP_EXAMPLE_CONFIRM=1.
 */
import { SimpleSwap } from "../src/index.js";

async function main() {
  const apiKey = process.env.SIMPLESWAP_API_KEY;
  const publicId = process.env.SIMPLESWAP_EXCHANGE_ID;
  if (!apiKey || !publicId) {
    console.error("Set SIMPLESWAP_API_KEY and SIMPLESWAP_EXCHANGE_ID.");
    process.exit(1);
  }

  const params = {
    publicId,
    txFrom: process.env.SIMPLESWAP_TX_FROM,
    providerUserDepositAddress: process.env.SIMPLESWAP_DEPOSIT_ADDRESS,
    targetAddress: process.env.SIMPLESWAP_ADDRESS_TO,
  };
  console.log("confirmExchange params:", params);
  if (process.env.SIMPLESWAP_EXAMPLE_CONFIRM !== "1") {
    console.log("Set SIMPLESWAP_EXAMPLE_CONFIRM=1 to send PUT /v3/exchanges.");
    return;
  }

  const client = new SimpleSwap({ apiKey });
  const order = await client.confirmExchange(params);
  console.log(`Status after confirm: ${order.status}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
