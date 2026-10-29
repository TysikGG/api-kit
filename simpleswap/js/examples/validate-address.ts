import { SimpleSwap } from "../src/index.js";

async function main() {
  const client = new SimpleSwap();
  const ethPattern = "^(0x)[0-9A-Fa-f]{40}$";
  const sample = `0x${"ab".repeat(20)}`;
  console.log(`Local ETH check: ${client.isValidAddress(sample, ethPattern)}`);
  console.log(`Empty address: ${client.isValidAddress("  ", ethPattern)}`);

  const apiKey = process.env.SIMPLESWAP_API_KEY;
  if (!apiKey) {
    console.log("Set SIMPLESWAP_API_KEY to validate against the live currency pattern.");
    return;
  }

  const authed = new SimpleSwap({ apiKey });
  const btc = await authed.getCurrency("btc", "btc");
  const address = process.env.SIMPLESWAP_ADDRESS_TO || "1BoatSLRHtKNngkdXEeobR76b53LETtpyT";
  console.log(`${address} matches ${btc.ticker}: ${authed.isValidAddress(address, btc)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
