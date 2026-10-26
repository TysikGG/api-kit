import { OnlineSim } from '../src/index.js';

async function main() {
  const apiKey = process.env.ONLINESIM_API_KEY || 'demo_key';
  const client = new OnlineSim({ apiKey });

  console.log('Checking OnlineSIM account balance...');
  try {
    const balance = await client.getBalance();
    console.log(`Balance: ${balance}`);

    const countries = await client.getCountries();
    console.log('Countries response received:', Boolean(countries));
  } catch (error) {
    console.error('Error connecting to OnlineSIM:', error);
  }
}

main();
