import { BitcoinVn } from "../src/index.js";

async function main() {
  const client = new BitcoinVn({
    apiKey: process.env.BITCOINVN_API_KEY,
  });

  const ticker = await client.getTicker("BTC", "USDT");
  console.log("BTC/USDT Rate:", ticker.rate, "Volume 24h:", ticker.volume24h);
}

main().catch(console.error);
