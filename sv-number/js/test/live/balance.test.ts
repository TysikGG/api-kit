import { SvNumber } from "../../src/index.js";

const apiKey = process.env.SV_NUMBER_API_KEY;
const describeIf = apiKey ? describe : describe.skip;

describeIf("SV Number live API", () => {
  it("fetches real balance", async () => {
    const client = new SvNumber(apiKey!);
    const balance = await client.getBalance();
    expect(typeof balance).toBe("number");
  });
});
