import { SimpleSwap, SimpleSwapAuthError, SimpleSwapError, SimpleSwapNotFoundError } from "../src/index.js";

async function main() {
  const client = new SimpleSwap();
  try {
    client.isValidAddress("abc", "(");
  } catch (error) {
    if (error instanceof SimpleSwapError) {
      console.log(`Local validation error: ${error.message}`);
    }
  }

  const apiKey = process.env.SIMPLESWAP_API_KEY;
  if (!apiKey) {
    console.log("Set SIMPLESWAP_API_KEY to trigger a live 404.");
    return;
  }

  const authed = new SimpleSwap({ apiKey, maxRetries: 0 });
  try {
    await authed.getExchange("not-a-real-exchange-id");
  } catch (error) {
    if (error instanceof SimpleSwapNotFoundError || error instanceof SimpleSwapAuthError) {
      console.log(`${error.name} [${error.statusCode}] ${error.message} trace=${error.traceId ?? ""}`);
      return;
    }
    if (error instanceof SimpleSwapError) {
      console.log(`${error.name} [${error.statusCode}] ${error.message}`);
      return;
    }
    throw error;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
