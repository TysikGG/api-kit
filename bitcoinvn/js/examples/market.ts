import { BitcoinVn } from "../src/index.js";

async function main(): Promise<void> {
  const client = new BitcoinVn();
  const health = await client.getHealth();
  const info = await client.getInfo();
  const active = Object.values(info.transferMethods).filter(
    (method) => method.depositEnabled || method.settleEnabled,
  );
  const ticker = await client.getTicker("BTC", "USDT");
  const pair = await client.getPair("btc", "usdt");
  const offers = await client.listStakingOffers();

  console.log(health.status);
  console.log("assets", Object.keys(info.assets).length);
  console.log("active methods", active.length);
  console.log("BTC/USDT", ticker.rate, ticker.volume24h);
  console.log("btc->usdt", pair.rate, pair.min, pair.max ?? null);
  console.log("offers", offers.length);
  console.log(client.swapUrl("btc", "usdt"));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
