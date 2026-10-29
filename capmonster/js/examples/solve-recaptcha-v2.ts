import { CapMonster, recaptchaV2Task } from "../src/index.js";

/**
 * Spends balance. Submits one reCAPTCHA v2 task and prints the token.
 *
 *   CAPMONSTER_API_KEY=... npx tsx examples/solve-recaptcha-v2.ts
 */
async function main() {
  const clientKey = process.env.CAPMONSTER_API_KEY;
  if (!clientKey) {
    throw new Error("Set CAPMONSTER_API_KEY");
  }

  const client = new CapMonster({ clientKey, retries: 2 });
  const solved = await client.solveDetailed<{ gRecaptchaResponse: string }>(
    recaptchaV2Task({
      websiteURL: "https://lessons.zennolab.com/captchas/recaptcha/v2_simple.php?level=high",
      websiteKey: "6Lcg7CMUAAAAANphynKgn9YAgA4tQ2KI_iqRyTwd",
    }),
    { timeoutMs: 180_000 },
  );

  console.log("taskId:", solved.taskId);
  console.log(solved.solution.gRecaptchaResponse);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
