import { SMSBulk } from "../src/index.js";

async function main() {
  const apiKey = process.env.SMSBULK_API_KEY;
  if (!apiKey) {
    console.error("Please set SMSBULK_API_KEY environment variable.");
    process.exit(1);
  }

  const client = new SMSBulk({ apiKey });

  // Check balance
  const balance = await client.getBalance();
  console.log(`Wallet Balance: ${balance.balance} ${balance.currency}`);

  // List first 5 services
  const services = await client.getServices();
  console.log(`\nAvailable Services (${services.count} total):`);
  for (const s of services.data.slice(0, 5)) {
    console.log(`- ${s.name} (${s.code}): min price $${s.minPrice}, stock ${s.totalStock}`);
  }

  // List first 5 countries
  const countries = await client.getCountries();
  console.log(`\nAvailable Countries (${countries.count} total):`);
  for (const c of countries.data.slice(0, 5)) {
    console.log(`- ${c.name} (${c.isoCode}) ${c.flagEmoji || ""}`);
  }
}

main().catch((err) => {
  console.error("Error running quickstart:", err);
  process.exit(1);
});
