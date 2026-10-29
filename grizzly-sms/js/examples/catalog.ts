/**
 * Read-only catalog: prices, stock, services, open activations, and the deposit address.
 */
import { GrizzlySms } from "../src/index.js";

async function main() {
  const apiKey = process.env.GRIZZLY_API_KEY;
  if (!apiKey) {
    console.error("Set GRIZZLY_API_KEY");
    process.exit(1);
  }
  const sms = new GrizzlySms({ apiKey });
  const balance = await sms.getBalance({ version: 2 });
  const quotes = await sms.findPrices({ service: "tg", maxPrice: 1, minCount: 1 });
  const stock = await sms.getNumbersStatus({ country: 0 });
  const services = await sms.getServices();
  const active = await sms.getActiveActivations();
  const wallet = await sms.getWallet({ coin: "usdt", network: "tron" });
  console.log({
    balance,
    cheapest: quotes[0],
    stock: stock.find((row) => row.service === "tg"),
    services: services.length,
    active: active.length,
    wallet: wallet.walletAddress,
  });
}

main();
