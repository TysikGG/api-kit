import { SvNumber } from "../src/index.js";

async function main() {
  const apiKey = process.env.SV_NUMBER_API_KEY;
  if (!apiKey) {
    console.error("Please set SV_NUMBER_API_KEY environment variable");
    process.exit(1);
  }

  const client = new SvNumber({ apiKey });
  const balance = await client.getBalance();
  const services = await client.getServicesAndCost({ country: 0 });

  console.log(`Balance: $${balance}`);
  console.log(`Available services in country 0: ${services.length}`);
}

main().catch(console.error);
