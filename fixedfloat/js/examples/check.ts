import { FixedFloat } from "../src/index.js";

async function main(): Promise<void> {
  const apiKey = process.env.FIXEDFLOAT_API_KEY;
  const apiSecret = process.env.FIXEDFLOAT_API_SECRET;

  const client = new FixedFloat({ apiKey, apiSecret });

  try {
    console.log("Fetching available currencies from FixedFloat...");
    const currencies = await client.getCurrencies();
    console.log(`Success! Found ${currencies.length} currencies.`);

    const btc = currencies.find((c) => c.code === "BTC");
    const eth = currencies.find((c) => c.code === "ETH");
    if (btc && eth) {
      console.log(`BTC: ${btc.name} (network: ${btc.network})`);
      console.log(`ETH: ${eth.name} (network: ${eth.network})`);
    }

    console.log("\nChecking exchange rate for BTC to ETH...");
    const price = await client.getPrice({
      fromCcy: "BTC",
      toCcy: "ETH",
      amount: 0.1,
      direction: "from",
      type: "float",
    });
    console.log(`0.1 BTC -> ${price.to.amount} ETH (Rate: ${price.to.rate})`);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
