import { CapMonster, imageToTextTask } from "../src/index.js";

/**
 * Spends balance. Recognizes a base64 image.
 * Replace BODY with a single-line base64 image under 50 KB.
 *
 *   CAPMONSTER_API_KEY=... npx tsx examples/solve-image.ts
 */
async function main() {
  const clientKey = process.env.CAPMONSTER_API_KEY;
  if (!clientKey) {
    throw new Error("Set CAPMONSTER_API_KEY");
  }

  const client = new CapMonster(clientKey);
  const solution = await client.solve<{ text: string }>(
    imageToTextTask({
      body: process.env.CAPTCHA_BODY ?? "BASE64_BODY_HERE",
      capMonsterModule: "universal",
      recognizingThreshold: 70,
      case: true,
      numeric: 0,
      math: false,
    }),
  );
  console.log(solution.text);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
