import { NextCaptcha, NextCaptchaError } from "../../src/index.js";

const apiKey = process.env.NEXTCAPTCHA_API_KEY;
const describeLive = apiKey ? describe : describe.skip;

describeLive("NextCaptcha live API", () => {
  it("fetches balance", async () => {
    const client = new NextCaptcha(apiKey!);
    const balance = await client.getBalance();
    expect(typeof balance.balance).toBe("number");
    expect(Number.isFinite(balance.balance)).toBe(true);
  });

  it("rejects an invalid client key", async () => {
    const invalid = new NextCaptcha("invalid_key_000");
    try {
      await invalid.getBalance();
      fail("expected ERROR_KEY_DOES_NOT_EXIST");
    } catch (err) {
      expect(err).toBeInstanceOf(NextCaptchaError);
      expect((err as NextCaptchaError).errorCode).toBe("ERROR_KEY_DOES_NOT_EXIST");
    }
  });
});
