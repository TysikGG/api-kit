import {
  AuthenticationError,
  InsufficientBalanceError,
  Peak,
  PeakError,
  SolveError,
} from "../src/index.js";

/**
 * Shows the error subclasses. Uses an invalid key, so it does not spend credits.
 *
 *   npx tsx examples/errors.ts
 */
async function main() {
  const client = new Peak({ apiKey: process.env.PEAK_API_KEY ?? "pk_invalid_example" });
  try {
    await client.getBalance();
    console.log("Request succeeded.");
  } catch (err) {
    if (err instanceof AuthenticationError) {
      console.error(`Auth ${err.status} ${err.code}: ${err.message}`);
    } else if (err instanceof InsufficientBalanceError) {
      console.error(`Balance ${err.status}: ${err.message}`);
    } else if (err instanceof SolveError) {
      console.error(`Unbilled solve failure: ${err.message}`);
    } else if (err instanceof PeakError) {
      console.error(`Peak ${err.status} ${err.code}: ${err.message}`);
    } else {
      throw err;
    }
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
