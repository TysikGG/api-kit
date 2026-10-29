import { Peak, formatProxy } from "../src/index.js";

/**
 * Proxied Turnstile. The token is minted from your proxy's IP.
 * Pass action and cdata when the widget sets them.
 * This call spends a credit when the solve succeeds.
 *
 *   PEAK_API_KEY=pk_... PEAK_PROXY=http://user:pass@1.2.3.4:8080 \
 *     npx tsx examples/turnstile-proxy.ts
 */
async function main() {
  const apiKey = process.env.PEAK_API_KEY;
  const proxy = process.env.PEAK_PROXY;
  if (!apiKey || !proxy) {
    console.error("Set PEAK_API_KEY and PEAK_PROXY (http://user:pass@host:port).");
    process.exit(1);
  }

  const client = new Peak({ apiKey });
  const { token } = await client.solveTurnstile({
    url: "https://example.com/",
    sitekey: "0x4AAAAAAADnPIDROrmt1Wwj",
    proxy: formatProxy(proxy),
    action: "login",
    cdata: "session-42",
  });
  console.log("cf-turnstile-response:", token);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
