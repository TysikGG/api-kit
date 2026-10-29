import { CapMonster } from "../src/index.js";

/**
 * Read-only: fetches the User-Agent CapMonster Cloud currently supports.
 * No API key and no balance is required.
 *
 *   npx tsx examples/get-user-agent.ts
 */
async function main() {
  const client = new CapMonster({ clientKey: process.env.CAPMONSTER_API_KEY ?? "not-used" });
  const userAgent = await client.getUserAgent();
  console.log(userAgent);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
