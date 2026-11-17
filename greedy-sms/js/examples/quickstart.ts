import { GreedySMS } from "../src/index.js";

async function main(): Promise<void> {
  const apiKey = process.env.GREEDY_SMS_API_KEY || "YOUR_API_KEY";
  const client = new GreedySMS({ apiKey });

  console.log("Checking API health...");
  const health = await client.checkHealth();
  console.log(`API Health: ${health.status}`);

  console.log("Fetching account profile and balance...");
  const me = await client.getMe();
  console.log(`Account ID: ${me.id}`);
  console.log(`Current Balance: ${me.balance} RUB`);
  console.log(`Referral Balance: ${me.referralBalance} RUB`);
  console.log(`Total Activations: ${me.purchases.activations}, Total Rents: ${me.purchases.rents}`);

  console.log("Fetching available countries...");
  const countriesRes = await client.getCountries({ page: 1, pageSize: 5 });
  console.log(`Total Countries: ${countriesRes.total}`);
  for (const country of countriesRes.countries) {
    console.log(`  - [${country.id}] ${country.title.eng} (${country.title.rus})`);
  }
}

main().catch((err) => {
  console.error("Error running Greedy SMS quickstart:", err);
  process.exit(1);
});
