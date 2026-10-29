/**
 * Anti-Captcha compatible JSON task.
 *
 *   CAPGURU_API_KEY=... CAPGURU_SITEKEY=... npx tsx examples/json-task.ts
 */
import { CapGuruClient, readSolutionToken } from '../src/index.js';

async function main(): Promise<void> {
  const apiKey = process.env.CAPGURU_API_KEY;
  const websiteKey = process.env.CAPGURU_SITEKEY;
  if (!apiKey || !websiteKey) {
    console.error('Set CAPGURU_API_KEY and CAPGURU_SITEKEY');
    process.exit(1);
  }
  const client = new CapGuruClient(apiKey);
  const result = await client.solveJsonTask(
    {
      type: 'NoCaptchaTaskProxyless',
      websiteURL: process.env.CAPGURU_PAGE_URL ?? 'https://example.com',
      websiteKey,
    },
    { languagePool: 'en' },
  );
  console.log(readSolutionToken(result.solution));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
