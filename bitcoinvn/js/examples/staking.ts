/**
 * Lists staking offers. Setting auto-stake requires BITCOINVN_ALLOW_WRITES=1.
 */
import { BitcoinVn } from "../src/index.js";

async function main(): Promise<void> {
  const client = new BitcoinVn({ apiKey: process.env.BITCOINVN_API_KEY });
  const offers = await client.listStakingOffers();
  for (const offer of offers) {
    console.log(offer.id, offer.asset, offer.latestApr, offer.staked);
  }
  const offerId = process.env.BITCOINVN_OFFER_ID?.trim();
  if (!offerId || process.env.BITCOINVN_ALLOW_WRITES !== "1") {
    console.log("Set BITCOINVN_OFFER_ID and BITCOINVN_ALLOW_WRITES=1 to change preferences.");
    return;
  }
  console.log(await client.setAutoStake(offerId, true));
  console.log(await client.setStakingNotifications(offerId, false));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
