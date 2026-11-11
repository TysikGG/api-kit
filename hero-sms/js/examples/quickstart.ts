import { HeroSMS } from "../src/index.js";

async function main(): Promise<void> {
  const apiKey = process.env.HERO_SMS_API_KEY || "YOUR_API_KEY";
  const client = new HeroSMS({ apiKey });

  console.log("Checking HeroSMS account balance...");
  const balance = await client.getBalance();
  console.log(`Current balance: $${balance}`);

  console.log("Fetching available countries...");
  const countries = await client.getCountries();
  const countryList = Object.values(countries);
  console.log(`Total countries available: ${countryList.length}`);
  console.log("Sample countries:", countryList.slice(0, 3).map((c) => `${c.eng} (ID: ${c.id})`));
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
