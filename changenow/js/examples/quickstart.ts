import { ChangeNow } from "../src/index.js";

async function main() {
  const apiKey = process.env.CHANGENOW_API_KEY;
  if (!apiKey) {
    console.error("Please set CHANGENOW_API_KEY environment variable.");
    process.exit(1);
  }

  const client = new ChangeNow({ apiKey });

  const currencies = await client.getCurrencies({ active: true, flow: "standard" });
  console.log(`Currencies available: ${currencies.length}`);
  console.log(
    "Sample currencies:",
    currencies.slice(0, 5).map((c) => `${c.name} (${c.ticker}/${c.network})`)
  );

  const min = await client.getMinAmount({
    fromCurrency: "btc",
    toCurrency: "eth",
    fromNetwork: "btc",
    toNetwork: "eth",
    flow: "standard",
  });
  console.log(`\nMinimum BTC -> ETH: ${min.minAmount}`);

  const estimate = await client.getEstimatedAmount({
    fromCurrency: "btc",
    toCurrency: "eth",
    fromNetwork: "btc",
    toNetwork: "eth",
    fromAmount: "0.1",
    flow: "standard",
  });
  console.log(`Estimated ETH for 0.1 BTC: ${estimate.toAmount}`);

  const address = await client.validateAddress({
    currency: "eth",
    address: "0x57f31ad4b64095347F87eDB1675566DAfF5EC886",
  });
  console.log(`Sample address valid: ${address.result}`);
}

main().catch((err) => {
  console.error("Error in quickstart:", err);
  process.exit(1);
});
