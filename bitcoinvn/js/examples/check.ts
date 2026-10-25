import { BitcoinVn } from "bitcoinvn";

const client = new BitcoinVn({
  apiKey: process.env.BITCOINVN_API_KEY,
});

const ticker = await client.getTicker("BTC", "USDT");
console.log(ticker.rate, ticker.volume24h);
