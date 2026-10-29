/**
 * Poll an existing order. Read-only.
 * BITCOINVN_ORDER_ID is the 8-character short id.
 */
import { BitcoinVn, BitcoinVnTimeoutError } from "../src/index.js";

async function main(): Promise<void> {
  const id = process.env.BITCOINVN_ORDER_ID?.trim();
  if (!id) {
    console.error("Set BITCOINVN_ORDER_ID.");
    process.exitCode = 1;
    return;
  }
  const client = new BitcoinVn({ apiKey: process.env.BITCOINVN_API_KEY, retries: 2 });
  try {
    const order = await client.waitForOrder(id, { timeoutMs: 20_000, intervalMs: 3_000 });
    console.log(order.shortId, order.status, order.settleAmount ?? null);
  } catch (error) {
    if (error instanceof BitcoinVnTimeoutError) {
      console.log("still", error.order?.status);
      return;
    }
    throw error;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
