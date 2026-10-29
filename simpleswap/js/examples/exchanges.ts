import { exchangeId, SimpleSwap } from "../src/index.js";

async function main() {
  const apiKey = process.env.SIMPLESWAP_API_KEY;
  if (!apiKey) {
    console.error("Set SIMPLESWAP_API_KEY to run this example.");
    process.exit(1);
  }

  const client = new SimpleSwap({ apiKey });
  const orders = await client.getExchanges({ limit: 5, offset: 0 });
  console.log(`Recent exchanges: ${orders.length}`);
  for (const order of orders) {
    console.log(`${exchangeId(order)} ${order.status} ${order.tickerFrom} -> ${order.tickerTo}`);
  }

  const id = process.env.SIMPLESWAP_EXCHANGE_ID || (orders[0] ? exchangeId(orders[0]) : undefined);
  if (!id) {
    console.log("No exchange id available. Create one or set SIMPLESWAP_EXCHANGE_ID.");
    return;
  }
  const one = await client.getExchange(id);
  console.log(`getExchange ${id}: ${one.status}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
