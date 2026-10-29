/**
 * Token solvers. Each command spends credit.
 *
 *   CAPGURU_API_KEY=... npx tsx examples/tokens.ts recaptcha-v2
 *   commands: recaptcha-v2, recaptcha-v3, turnstile, hcaptcha, funcaptcha, geetest
 */
import { CapGuruClient } from '../src/index.js';

const apiKey = process.env.CAPGURU_API_KEY;
const command = process.argv[2];

function requireKey(): string {
  if (!apiKey) {
    console.error('Set CAPGURU_API_KEY');
    process.exit(1);
  }
  return apiKey;
}

async function main(): Promise<void> {
  const client = new CapGuruClient(requireKey());
  const pageurl = process.env.CAPGURU_PAGE_URL ?? 'https://example.com';

  switch (command) {
    case 'recaptcha-v2': {
      const token = await client.solveRecaptchaV2({
        googlekey: process.env.CAPGURU_SITEKEY ?? '',
        pageurl,
        invisible: process.env.CAPGURU_INVISIBLE === '1' ? 1 : 0,
      });
      console.log(token);
      return;
    }
    case 'recaptcha-v3': {
      const token = await client.solveRecaptchaV3({
        googlekey: process.env.CAPGURU_SITEKEY ?? '',
        pageurl,
        action: process.env.CAPGURU_ACTION,
        minScore: 0.3,
      });
      console.log(token);
      return;
    }
    case 'turnstile': {
      const token = await client.solveTurnstile({
        sitekey: process.env.CAPGURU_SITEKEY ?? '',
        pageurl,
        action: process.env.CAPGURU_ACTION,
      });
      console.log(token);
      return;
    }
    case 'hcaptcha': {
      const token = await client.solveHCaptcha({
        sitekey: process.env.CAPGURU_SITEKEY ?? '',
        pageurl,
      });
      console.log(token);
      return;
    }
    case 'funcaptcha': {
      const token = await client.solveFunCaptcha({
        publickey: process.env.CAPGURU_SITEKEY ?? '',
        pageurl,
        surl: process.env.CAPGURU_SURL,
      });
      console.log(token);
      return;
    }
    case 'geetest': {
      const result = await client.solveGeeTest({
        gt: process.env.CAPGURU_GT ?? '',
        challenge: process.env.CAPGURU_CHALLENGE ?? '',
        pageurl,
      });
      console.log(result);
      return;
    }
    default:
      console.error('Usage: tokens.ts <recaptcha-v2|recaptcha-v3|turnstile|hcaptcha|funcaptcha|geetest>');
      process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
