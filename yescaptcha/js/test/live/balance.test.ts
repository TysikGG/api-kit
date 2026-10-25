import { YesCaptcha } from "../../src/index.js";

const clientKey = process.env.YESCAPTCHA_CLIENT_KEY;
const describeIf = clientKey ? describe : describe.skip;

describeIf("YesCaptcha live API", () => {
  it("fetches real balance", async () => {
    const client = new YesCaptcha(clientKey!);
    const balance = await client.getBalance();
    expect(balance).toBeDefined();
    expect(typeof balance.balance).toBe("number");
  });
});
