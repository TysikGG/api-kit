import { NotLetters } from "../src/index.js";

async function main() {
  const apiToken = process.env.NOTLETTERS_API_TOKEN;
  if (!apiToken) {
    console.error("Please set NOTLETTERS_API_TOKEN environment variable");
    process.exit(1);
  }

  const client = new NotLetters({ apiToken });
  const profile = await client.getMe();

  console.log(`Authenticated as: ${profile.username} (ID: ${profile.id})`);
  console.log(`Current balance: ${profile.balance} RUB`);
  console.log(`Rate limit: ${profile.rate_limit} req/min`);
}

main().catch(console.error);
