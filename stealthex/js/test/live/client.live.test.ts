import { StealthEX } from "../../src/index.js";

const apiKey = process.env.STEALTHEX_API_KEY;
const describeLive = apiKey ? describe : describe.skip;

describeLive("StealthEX live API", () => {
  const client = new StealthEX({ apiKey });

  test("getCurrencies returns currency list", async () => {
    const currencies = await client.getCurrencies();
    expect(Array.isArray(currencies)).toBe(true);
    expect(currencies.length).toBeGreaterThan(0);
    expect(currencies[0]).toHaveProperty("symbol");
  });

  test("getEstimate returns estimated return", async () => {
    const est = await client.getEstimate("btc", "eth", "0.1");
    expect(est).toHaveProperty("estimated_amount");
  });
});
