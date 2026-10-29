/**
 * Proxy, retries, and abort on a reCAPTCHA v2 task.
 *
 *   CAPGURU_API_KEY=... CAPGURU_SITEKEY=... npx tsx examples/advanced.ts
 *
 * Optional: CAPGURU_PROXY=user:pass@host:port CAPGURU_PROXY_TYPE=HTTP
 */
import { CapGuruClient } from '../src/index.js';

async function main(): Promise<void> {
  const apiKey = process.env.CAPGURU_API_KEY;
  const googlekey = process.env.CAPGURU_SITEKEY;
  if (!apiKey || !googlekey) {
    console.error('Set CAPGURU_API_KEY and CAPGURU_SITEKEY');
    process.exit(1);
  }

  const client = new CapGuruClient({
    apiKey,
    maxRetries: 2,
    retryDelayMs: 1000,
    baseUrl: process.env.CAPGURU_BASE_URL,
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);

  try {
    const token = await client.solveRecaptchaV2(
      {
        googlekey,
        pageurl: process.env.CAPGURU_PAGE_URL ?? 'https://example.com',
        proxy: process.env.CAPGURU_PROXY,
        proxyType: (process.env.CAPGURU_PROXY_TYPE as 'HTTP' | 'HTTPS' | 'SOCKS4' | 'SOCKS5' | undefined) ?? undefined,
      },
      {
        timeoutMs: 120_000,
        intervalMs: 5_000,
        signal: controller.signal,
        onNotReady: ({ taskId, attempt }) => console.log('waiting', taskId, attempt),
      },
    );
    console.log(token);
  } finally {
    clearTimeout(timer);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
