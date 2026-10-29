import { CapMonster } from "../src/index.js";

async function main() {
  const clientKey = process.env.CAPMONSTER_API_KEY;
  if (!clientKey) {
    console.error("Please set CAPMONSTER_API_KEY environment variable");
    process.exit(1);
  }

  const client = new CapMonster({ clientKey });
  const balance = await client.getBalance();
  const userAgent = await client.getUserAgent();
  console.log("Account balance:", balance);
  console.log("Current user agent:", userAgent);
}

main().catch(console.error);
