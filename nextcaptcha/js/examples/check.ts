import { NextCaptcha } from "../src/index.js";

async function main() {
  const clientKey = process.env.NEXTCAPTCHA_API_KEY;
  if (!clientKey) {
    console.error("Please set NEXTCAPTCHA_API_KEY environment variable");
    process.exit(1);
  }

  const client = new NextCaptcha({ clientKey });
  const balance = await client.getBalance();
  console.log("Account balance:", balance);
}

main().catch(console.error);
