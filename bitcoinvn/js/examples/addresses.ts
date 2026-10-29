import { BitcoinVn } from "../src/index.js";

async function main(): Promise<void> {
  const client = new BitcoinVn();
  const address = process.env.BITCOINVN_ADDRESS ?? "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
  const checked = await client.validateAddress({ transferMethod: "btc", address });
  console.log("valid", checked.valid, checked.error ?? "");

  const name = process.env.BITCOINVN_ENS_NAME;
  if (!name) {
    console.log("Set BITCOINVN_ENS_NAME to resolve an ENS name.");
    return;
  }
  const resolved = await client.resolveAddress({ transferMethod: "eth", name });
  console.log(resolved.address, resolved.ensResolutionToken, resolved.expiresAt);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
