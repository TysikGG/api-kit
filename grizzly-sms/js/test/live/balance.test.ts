import { GrizzlySms } from "../../src/index.js";

const apiKey = process.env.GRIZZLY_API_KEY?.trim();

(apiKey ? describe : describe.skip)("live Grizzly SMS", () => {
  it("reads the account balance", async () => {
    const sms = new GrizzlySms(apiKey!);
    const balance = await sms.getBalance();
    expect(typeof balance).toBe("number");
  });
});
