import { Peak, TaskDisabledError } from "../src/index.js";

/**
 * AWS WAF mobile SDK task (awswaftask).
 * Peak has shipped this task as disabled; TaskDisabledError is the expected result
 * until the platform turns it back on. A successful call spends a credit.
 *
 *   PEAK_API_KEY=pk_... PEAK_PROXY=http://user:pass@1.2.3.4:8080 \
 *     npx tsx examples/aws-waf.ts
 */
async function main() {
  const apiKey = process.env.PEAK_API_KEY;
  const proxy = process.env.PEAK_PROXY;
  if (!apiKey || !proxy) {
    console.error("Set PEAK_API_KEY and PEAK_PROXY.");
    process.exit(1);
  }

  const client = new Peak({ apiKey });
  try {
    const { token } = await client.solveAwsWaf({
      url: "https://app.example.com/",
      sdkUrl: "https://xxx.edge.sdk.awswaf.com/xxx/xxx",
      proxy,
      userAgent: "ExampleApp/1.0 (iOS 17.0)",
      os: "ios",
    });
    console.log("aws-waf token:", token);
  } catch (err) {
    if (err instanceof TaskDisabledError) {
      console.error("AWS WAF is disabled on Peak right now:", err.message);
      process.exit(2);
    }
    throw err;
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
