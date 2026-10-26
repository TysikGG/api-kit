import { CapGuruClient } from '../src/index.js';

async function main() {
  const apiKey = process.env.CAPGURU_API_KEY || 'demo_key';
  const client = new CapGuruClient({ apiKey });

  console.log('Checking CapGuru account balance...');
  try {
    const balance = await client.getBalance();
    console.log(`Balance: ${balance}`);
  } catch (error) {
    console.error('Error connecting to CapGuru:', error);
  }
}

main();
