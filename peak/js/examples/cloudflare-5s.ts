import { Peak, WINDOWS_CHROME_USER_AGENT, buildClearanceRequest } from "../src/index.js";

/**
 * Cloudflare 5-second challenge. Requires a sticky proxy.
 * Prints the POST you send through that same proxy to finish the challenge.
 * This call spends a credit when the solve succeeds.
 *
 *   PEAK_API_KEY=pk_... PEAK_PROXY=http://user:pass@1.2.3.4:8080 \
 *     npx tsx examples/cloudflare-5s.ts
 */
async function main() {
  const apiKey = process.env.PEAK_API_KEY;
  const proxy = process.env.PEAK_PROXY;
  if (!apiKey || !proxy) {
    console.error("Set PEAK_API_KEY and PEAK_PROXY (sticky http://user:pass@host:port).");
    process.exit(1);
  }

  const target = "https://example.com/";
  const client = new Peak({ apiKey, retries: 2, retryDelayMs: 1000 });
  const solution = await client.solveCloudflare5s({
    url: target,
    proxy,
    userAgent: WINDOWS_CHROME_USER_AGENT,
  });
  const request = buildClearanceRequest(target, solution);
  console.log("Cookie:", request.cookieHeader);
  console.log("Referer:", request.referer);
  console.log("User-Agent:", request.userAgent);
  console.log("Form body:", request.body);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
