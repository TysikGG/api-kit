import { CapMonster, recaptchaV2Task } from "../src/index.js";

/**
 * Spends balance, then reports the token if you pass REPORT=1 after the site rejects it.
 *
 *   CAPMONSTER_API_KEY=... REPORT=1 npx tsx examples/report-incorrect.ts
 */
async function main() {
  const clientKey = process.env.CAPMONSTER_API_KEY;
  if (!clientKey) {
    throw new Error("Set CAPMONSTER_API_KEY");
  }

  const client = new CapMonster(clientKey);
  const solved = await client.solveDetailed<{ gRecaptchaResponse: string }>(
    recaptchaV2Task({
      websiteURL: "https://lessons.zennolab.com/captchas/recaptcha/v2_simple.php?level=high",
      websiteKey: "6Lcg7CMUAAAAANphynKgn9YAgA4tQ2KI_iqRyTwd",
      nocache: true,
    }),
  );
  console.log(solved.taskId, solved.solution.gRecaptchaResponse);

  if (process.env.REPORT === "1") {
    const report = await client.reportIncorrectTokenCaptcha(solved.taskId);
    console.log(report.status);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
