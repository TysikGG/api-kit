import { Chaojiying } from "../src/index.js";

/**
 * Cheap live check: reads the point balance and does not upload an image.
 *   CHAOJIYING_USER=... CHAOJIYING_PASS=... npx tsx examples/quickstart.ts
 */
async function main() {
  const username = process.env.CHAOJIYING_USER;
  const password = process.env.CHAOJIYING_PASS;
  if (!username || !password) {
    console.error("Set CHAOJIYING_USER and CHAOJIYING_PASS.");
    process.exit(1);
  }

  const client = new Chaojiying({ username, password });
  const score = await client.getScore();
  console.log(`Points (tifen): ${score.tifen}`);
  console.log(`Locked points (tifen_lock): ${score.tifen_lock}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
