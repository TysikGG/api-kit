import { SmsBowerClient } from '../src/index.js';

async function main() {
  const apiKey = process.env.SMSBOWER_API_KEY;
  if (!apiKey) {
    console.error('Please set SMSBOWER_API_KEY environment variable');
    process.exit(1);
  }

  const client = new SmsBowerClient({ apiKey });

  const balance = await client.getBalance();
  console.log('SMSBower Balance:', balance);

  const services = await client.getServicesList();
  console.log(`Available services count: ${services.length}`);
  console.log('Sample services:', services.slice(0, 3));

  const countries = await client.getCountries();
  console.log(`Available countries count: ${Object.keys(countries).length}`);
}

main().catch(console.error);
