import { CapMonster, CapMonsterError, recaptchaV2Task } from "../../src/index.js";

const apiKey = process.env.CAPMONSTER_API_KEY;
const describeLive = apiKey ? describe : describe.skip;

describeLive("CapMonster Cloud live API", () => {
  it("fetches balance", async () => {
    const client = new CapMonster(apiKey!);
    const balance = await client.getBalance();
    expect(typeof balance.balance).toBe("number");
    expect(Number.isFinite(balance.balance)).toBe(true);
  });

  it("rejects an invalid client key", async () => {
    const invalid = new CapMonster("invalid_key_000");
    try {
      await invalid.getBalance();
      fail("expected ERROR_KEY_DOES_NOT_EXIST");
    } catch (err) {
      expect(err).toBeInstanceOf(CapMonsterError);
      expect((err as CapMonsterError).errorCode).toBe("ERROR_KEY_DOES_NOT_EXIST");
    }
  });

  it("rejects createTask with ERROR_ZERO_BALANCE when the account is empty", async () => {
    const client = new CapMonster(apiKey!);
    const { balance } = await client.getBalance();
    if (balance !== 0) {
      // A funded key must not submit a paid task. The assertion below runs
      // only for an empty account, which is the case this check covers.
      expect(balance).toBeGreaterThan(0);
      return;
    }

    await expect(
      client.createTask(
        recaptchaV2Task({
          websiteURL: "https://lessons.zennolab.com/captchas/recaptcha/v2_simple.php?level=high",
          websiteKey: "6Lcg7CMUAAAAANphynKgn9YAgA4tQ2KI_iqRyTwd",
        }),
      ),
    ).rejects.toMatchObject({ errorCode: "ERROR_ZERO_BALANCE" });
  });
});
