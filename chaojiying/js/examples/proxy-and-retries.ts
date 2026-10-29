import { Chaojiying } from "../src/index.js";

/**
 * Balance check through an HTTP proxy, with retries for HTTP 429 / connection drops.
 *   CHAOJIYING_USER=... CHAOJIYING_PASS=... HTTPS_PROXY is NOT required.
 *   npx tsx examples/proxy-and-retries.ts http://127.0.0.1:8888
 */
async function main() {
  const proxy = process.argv[2];
  const username = process.env.CHAOJIYING_USER;
  const password = process.env.CHAOJIYING_PASS;
  if (!username || !password) {
    console.error("Set CHAOJIYING_USER and CHAOJIYING_PASS. Optional arg: proxy URL.");
    process.exit(1);
  }
  const client = new Chaojiying({
    username,
    password,
    proxy,
    retries: 2,
    retryDelayMs: 400,
    timeoutMs: 60_000,
    userAgent: "chaojiying-client-example",
  });
  const score = await client.getScore();
  console.log(score);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
