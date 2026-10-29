import { Peak, RetryTimeoutError } from "../src/index.js";

/**
 * Balance check with retries. Does not spend credits.
 * Retries apply to network errors, HTTP 429, 502, and 503, and to unpaid solve failures.
 * Authentication, balance, and bad-request errors are not retried.
 *
 *   PEAK_API_KEY=pk_... npx tsx examples/retries.ts
 */
async function main() {
  const apiKey = process.env.PEAK_API_KEY;
  if (!apiKey) {
    console.error("Set PEAK_API_KEY to your Peak API key.");
    process.exit(1);
  }

  const client = new Peak({
    apiKey,
    retries: 2,
    retryDelayMs: 500,
    retryTimeoutMs: 10_000,
  });

  try {
    const balance = await client.getBalance();
    console.log(balance);
  } catch (err) {
    if (err instanceof RetryTimeoutError) {
      console.error("Gave up before the retry budget elapsed.");
    }
    throw err;
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
