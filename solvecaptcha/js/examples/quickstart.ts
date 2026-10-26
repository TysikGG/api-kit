import { SolveCaptchaClient } from '../src/index.js';

async function main() {
  const apiKey = process.env.SOLVECAPTCHA_API_KEY;
  if (!apiKey) {
    console.error('Please set SOLVECAPTCHA_API_KEY environment variable');
    process.exit(1);
  }

  const client = new SolveCaptchaClient({ apiKey });

  const balance = await client.getBalance();
  console.log(`Current SolveCaptcha Balance: $${balance.toFixed(4)}`);
}

main().catch(console.error);
