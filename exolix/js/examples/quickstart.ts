import { Exolix } from "../src/index.js";

async function main() {
  const apiKey = process.env.EXOLIX_API_KEY;
  if (!apiKey) {
    console.error("Please set EXOLIX_API_KEY environment variable.");
    process.exit(1);
  }

  const client = new Exolix({ apiKey });

  const currencies = await client.getCurrencies({ page: 1, size: 5, withNetworks: true });
  console.log(`Currencies available: ${currencies.count}`);
  console.log(
    "Sample currencies:",
    currencies.data.slice(0, 5).map((currency) => `${currency.name} (${currency.code})`)
  );

  const networks = await client.getCurrencyNetworks("ETH");
  console.log(`\nETH networks: ${networks.map((network) => network.network).join(", ")}`);

  const quote = await client.getRate({
    coinFrom: "BTC",
    coinTo: "ETH",
    networkFrom: "BTC",
    networkTo: "ETH",
    amount: "0.1",
    rateType: "float",
  });
  console.log(`\nEstimated ETH for 0.1 BTC: ${quote.toAmount} (rate ${quote.rate})`);
}

main().catch((err) => {
  console.error("Error in quickstart:", err);
  process.exit(1);
});
