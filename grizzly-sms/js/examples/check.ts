import { GrizzlySms } from "../src/index.js";

async function main() {
  const apiKey = process.env.GRIZZLY_API_KEY;
  if (!apiKey) {
    console.error("Please set GRIZZLY_API_KEY environment variable");
    process.exit(1);
  }

  const sms = new GrizzlySms({ apiKey });
  const balance = await sms.getBalance();
  const countries = await sms.getCountries();
  console.log(`Balance: ${balance}, Countries: ${countries.length}`);
}

main().catch(console.error);
