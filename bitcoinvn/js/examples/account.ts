/**
 * Read-only account calls. Requires BITCOINVN_API_KEY.
 * Does not create orders or change staking settings.
 */
import { BitcoinVn } from "../src/index.js";

async function main(): Promise<void> {
  const apiKey = process.env.BITCOINVN_API_KEY?.trim();
  if (!apiKey) {
    console.error("Set BITCOINVN_API_KEY.");
    process.exitCode = 1;
    return;
  }
  const client = new BitcoinVn({ apiKey });
  console.log("balances", await client.getBalances());
  console.log("orders", (await client.listOrders({ page: 1 })).map((order) => order.shortId));
  const history = await client.listBalanceHistory({ page: 1 });
  console.log("ledger rows", history.length);
  const certificates = await client.getGuaranteePublicKey();
  console.log(certificates.slice(0, 40));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
