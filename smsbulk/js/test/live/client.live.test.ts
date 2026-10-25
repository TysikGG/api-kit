import { SMSBulk } from "../../src/index.js";

const apiKey = process.env.SMSBULK_API_KEY;
const describeLive = apiKey ? describe : describe.skip;

describeLive("SMSBulk live API", () => {
  const client = new SMSBulk({ apiKey });

  test("getBalance returns valid wallet info", async () => {
    const balance = await client.getBalance();
    expect(balance).toHaveProperty("balance");
    expect(balance).toHaveProperty("currency");
    expect(balance.currency).toBe("USD");
  });

  test("getServices returns service list", async () => {
    const res = await client.getServices();
    expect(res).toHaveProperty("data");
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBeGreaterThan(0);
  });

  test("getCountries returns country list", async () => {
    const res = await client.getCountries();
    expect(res).toHaveProperty("data");
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBeGreaterThan(0);
  });
});
