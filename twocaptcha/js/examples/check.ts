import { TwoCaptchaClient } from '../src/index.js';

async function main() {
  const apiKey = process.env.TWOCAPTCHA_API_KEY || 'demo_key';
  const client = new TwoCaptchaClient({ apiKey });

  console.log('Checking 2Captcha account balance...');
  try {
    const balance = await client.getBalance();
    console.log(`Balance: $${balance}`);
  } catch (error) {
    console.error('Error connecting to 2Captcha:', error);
  }
}

main();
