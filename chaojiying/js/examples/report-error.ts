import { Chaojiying } from "../src/index.js";

/**
 * Ask for a refund of one pic_id. Only call this when the answer is actually wrong,
 * and within about three minutes of recognition.
 *   npx tsx examples/report-error.ts 9160109360600112681
 */
async function main() {
  const picId = process.argv[2];
  const username = process.env.CHAOJIYING_USER;
  const password = process.env.CHAOJIYING_PASS;
  if (!username || !password || !picId) {
    console.error("Usage: CHAOJIYING_USER=... CHAOJIYING_PASS=... npx tsx examples/report-error.ts <pic_id>");
    process.exit(1);
  }
  const client = new Chaojiying({ username, password });
  const result = await client.reportError(picId);
  console.log(result);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
