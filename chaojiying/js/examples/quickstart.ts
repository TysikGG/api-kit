import { Chaojiying } from "../src/index.js";

async function main() {
  const username = process.env.CHAOJIYING_USER;
  const password = process.env.CHAOJIYING_PASS;

  if (!username || !password) {
    console.error("Please set CHAOJIYING_USER and CHAOJIYING_PASS environment variables.");
    process.exit(1);
  }

  const client = new Chaojiying({ username, password });

  // Query account score / points
  const score = await client.getScore();
  console.log(`Current Points (tifen): ${score.tifen}`);
  console.log(`Locked Points (tifen_lock): ${score.tifen_lock}`);
}

main().catch((err) => {
  console.error("Error in quickstart:", err);
  process.exit(1);
});
