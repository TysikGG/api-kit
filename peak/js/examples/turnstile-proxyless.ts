import { Peak } from "../src/index.js";

/**
 * Proxyless Turnstile. Peak solves through its own pool.
 * Use this when the target accepts a token from any IP.
 * This call spends a credit when the solve succeeds.
 *
 *   PEAK_API_KEY=pk_... npx tsx examples/turnstile-proxyless.ts
 */
async function main() {
  const apiKey = process.env.PEAK_API_KEY;
  if (!apiKey) {
    console.error("Set PEAK_API_KEY to your Peak API key.");
    process.exit(1);
  }

  const client = new Peak({ apiKey, timeoutMs: 60_000 });
  const { token } = await client.solveTurnstile({
    url: "https://example.com/",
    sitekey: "0x4AAAAAAADnPIDROrmt1Wwj",
  });
  console.log("cf-turnstile-response:", token);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
