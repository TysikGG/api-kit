import { ExchangeStatus, SimpleSwap, SimpleSwapTimeoutError } from "../src/index.js";

async function main() {
  const apiKey = process.env.SIMPLESWAP_API_KEY;
  const id = process.env.SIMPLESWAP_EXCHANGE_ID;
  if (!apiKey || !id) {
    console.error("Set SIMPLESWAP_API_KEY and SIMPLESWAP_EXCHANGE_ID.");
    process.exit(1);
  }

  const client = new SimpleSwap({ apiKey, pollingIntervalMs: 5000, pollingTimeoutMs: 120000 });
  try {
    const order = await client.waitForExchange(id, {
      statuses: [ExchangeStatus.Finished, ExchangeStatus.Failed, ExchangeStatus.Refunded, ExchangeStatus.Expired],
      onUpdate: (update) => console.log(`status=${update.status}`),
    });
    console.log(`Stopped at ${order.status}`);
  } catch (error) {
    if (error instanceof SimpleSwapTimeoutError) {
      console.error(error.message);
      process.exit(2);
    }
    throw error;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
