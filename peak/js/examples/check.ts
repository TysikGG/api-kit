import { Peak } from "../src/index.js";

async function main() {
  const apiKey = process.env.PEAK_API_KEY;
  if (!apiKey) {
    console.error("Please set PEAK_API_KEY environment variable");
    process.exit(1);
  }

  const client = new Peak({ apiKey });
  const balance = await client.getBalance();
  console.log("Account balance:", balance);
}

main().catch(console.error);
