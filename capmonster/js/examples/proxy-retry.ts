import { CapMonster, recaptchaV2Task, withProxy } from "../src/index.js";

/**
 * Spends balance. Shows a customer proxy, retries, and an AbortSignal.
 *
 *   CAPMONSTER_API_KEY=... npx tsx examples/proxy-retry.ts
 */
async function main() {
  const clientKey = process.env.CAPMONSTER_API_KEY;
  if (!clientKey) {
    throw new Error("Set CAPMONSTER_API_KEY");
  }

  const client = new CapMonster({
    clientKey,
    timeoutMs: 60_000,
    retries: 2,
    retryDelayMs: 1_000,
  });

  const controller = new AbortController();
  const solution = await client.solve<{ gRecaptchaResponse: string }>(
    withProxy(
      recaptchaV2Task({
        websiteURL: "https://example.com/login",
        websiteKey: "site-key",
        userAgent: await client.getUserAgent(),
      }),
      {
        proxyType: "http",
        proxyAddress: "1.2.3.4",
        proxyPort: 8080,
        proxyLogin: "user",
        proxyPassword: "secret",
      },
    ),
    { timeoutMs: 120_000, intervalMs: 3_000, signal: controller.signal },
  );
  console.log(solution.gRecaptchaResponse);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
