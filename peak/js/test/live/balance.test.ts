import { Peak } from "../../src/index.js";

const apiKey = process.env.PEAK_API_KEY;
const describeIf = apiKey ? describe : describe.skip;

describeIf("Peak live API", () => {
  it("fetches real balance", async () => {
    const client = new Peak(apiKey!);
    const balance = await client.getBalance();
    expect(balance).toBeDefined();
    expect(balance.type).toBeDefined();
  });
});
