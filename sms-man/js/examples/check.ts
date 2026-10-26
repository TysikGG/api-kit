import { SmsMan } from '../src/index.js';

async function main() {
  const token = process.env.SMSMAN_API_KEY || 'demo_token';
  const client = new SmsMan({ token });

  console.log('Checking SMS-MAN account balance...');
  try {
    const balance = await client.getBalance();
    console.log(`Balance: ${balance}`);

    const countries = await client.getCountries();
    console.log('Countries response received:', Boolean(countries));
  } catch (error) {
    console.error('Error connecting to SMS-MAN:', error);
  }
}

main();
