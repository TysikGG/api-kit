import { SimpleSwap } from "../src/index.js";

async function main() {
  const apiKey = process.env.SIMPLESWAP_API_KEY;
  if (!apiKey) {
    console.error("Set SIMPLESWAP_API_KEY to run this example.");
    process.exit(1);
  }

  const client = new SimpleSwap({
    apiKey,
    baseURL: process.env.SIMPLESWAP_BASE_URL,
    timeoutMs: 20_000,
    maxRetries: 2,
    retryDelayMs: 200,
    proxy: process.env.SIMPLESWAP_PROXY,
    clientIp: process.env.SIMPLESWAP_CLIENT_IP,
    pollingIntervalMs: 4000,
    pollingTimeoutMs: 180000,
  });

  const ranges = await client.getRanges({
    tickerFrom: "btc",
    tickerTo: "eth",
    networkFrom: "btc",
    networkTo: "eth",
  });
  console.log(`Min BTC after optional proxy and retries: ${ranges.min}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
