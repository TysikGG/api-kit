import { GiveSms } from '../src/index.js';

async function main() {
  const apiKey = process.env.GIVE_SMS_API_KEY || 'demo_key';
  const client = new GiveSms({ apiKey });

  console.log('Checking Give-SMS account balance...');
  try {
    const balance = await client.getBalance();
    console.log(`Balance: ${balance}`);

    const counts = await client.getCount({ country: 'kazakhstan' });
    console.log('Available services count:', Object.keys(counts).length);
  } catch (error) {
    console.error('Error connecting to Give-SMS:', error);
  }
}

main();
