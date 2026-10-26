import { VakSmsClient } from '../src/index.js';

async function main() {
  const apiKey = process.env.VAK_SMS_API_KEY;
  if (!apiKey) {
    console.error('Please set VAK_SMS_API_KEY environment variable');
    process.exit(1);
  }

  const client = new VakSmsClient({ apiKey });

  const balance = await client.getBalance();
  console.log(`Current Balance: ${balance} RUB`);

  const countries = await client.getCountryList();
  console.log(`Available countries: ${countries.length}`);
  if (countries.length > 0) {
    console.log('Sample country:', countries[0]);
  }
}

main().catch(console.error);
