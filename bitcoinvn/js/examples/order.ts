/**
 * Creates a production order when BITCOINVN_ALLOW_WRITES=1.
 * Funding the order moves real funds. Default run prints the plan and exits.
 */
import { BitcoinVn } from "../src/index.js";

async function main(): Promise<void> {
  const apiKey = process.env.BITCOINVN_API_KEY?.trim();
  const address = process.env.BITCOINVN_SETTLE_ADDRESS?.trim();
  if (!apiKey || !address) {
    console.error("Set BITCOINVN_API_KEY and BITCOINVN_SETTLE_ADDRESS.");
    process.exitCode = 1;
    return;
  }
  if (process.env.BITCOINVN_ALLOW_WRITES !== "1") {
    console.log("Refusing to create an order. Set BITCOINVN_ALLOW_WRITES=1 to continue.");
    return;
  }

  const client = new BitcoinVn({ apiKey, retries: 2 });
  const quote = await client.quote({
    depositMethod: process.env.BITCOINVN_DEPOSIT_METHOD ?? "btc",
    settleMethod: process.env.BITCOINVN_SETTLE_METHOD ?? "usdt",
    depositAmount: Number(process.env.BITCOINVN_DEPOSIT_AMOUNT ?? "0.001"),
  });
  const order = await client.fixedSwap(quote.id ?? "", address, {
    webhookUrl: process.env.BITCOINVN_WEBHOOK_URL,
  });
  console.log(order.shortId, order.status, order.depositData);

  const followed = await client.waitForOrder(order.shortId, {
    timeoutMs: 30_000,
    intervalMs: 5_000,
    statuses: ["pending", "processing", "completed", "canceled", "settle_data_error"],
  });
  console.log(followed.status, followed.settleAmount);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
