import { CapMonster, turnstileTask } from "../src/index.js";

/**
 * Spends balance. Solves a Turnstile widget.
 *
 *   CAPMONSTER_API_KEY=... npx tsx examples/solve-turnstile.ts
 */
async function main() {
  const clientKey = process.env.CAPMONSTER_API_KEY;
  if (!clientKey) {
    throw new Error("Set CAPMONSTER_API_KEY");
  }

  const client = new CapMonster(clientKey);
  const userAgent = await client.getUserAgent();
  const solution = await client.solve<{ token: string }>(
    turnstileTask({
      websiteURL: "https://example.com/",
      websiteKey: "0x4AAAAAAA...",
      userAgent,
    }),
  );
  console.log(solution.token);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
