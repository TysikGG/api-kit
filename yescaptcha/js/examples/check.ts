import { YesCaptcha } from "../src/index.js";

async function main() {
  const clientKey = process.env.YESCAPTCHA_CLIENT_KEY;
  if (!clientKey) {
    console.error("Please set YESCAPTCHA_CLIENT_KEY environment variable");
    process.exit(1);
  }

  const client = new YesCaptcha({ clientKey });
  const balance = await client.getBalance();
  console.log("Account balance:", balance);
}

main().catch(console.error);
