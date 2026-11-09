import { SteelProxy } from "../src/index.js";

async function main() {
  const apiKey = process.env.STEELPROXY_API_KEY;
  if (!apiKey) {
    console.error("Please set STEELPROXY_API_KEY environment variable");
    process.exit(1);
  }

  const client = new SteelProxy({ apiKey });

  // 1. Fetch available proxy types
  const proxyTypes = await client.getProxyTypes();
  console.log(`Available proxy types (${proxyTypes.length}):`);
  for (const t of proxyTypes) {
    console.log(` - [${t.code}] ${t.title}`);
  }

  // 2. Fetch available locations
  const locations = await client.getLocations();
  console.log(`\nAvailable locations (${locations.length}):`);
  for (const loc of locations.slice(0, 5)) {
    console.log(` - Node #${loc.node_id}: ${loc.title} (${loc.country_code}) [${loc.proxy_type}], terms: ${loc.terms_days.join(", ")} days`);
  }

  // 3. Fetch recent orders summary (read-only, does not spend money)
  const orders = await client.getOrders({ page: 1, page_size: 5 });
  console.log(`\nTotal orders on account: ${orders.total}`);
}

main().catch(console.error);
