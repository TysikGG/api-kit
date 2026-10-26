import { SimpleSwap } from "../../src/index.js";

const apiKey = process.env.SIMPLESWAP_API_KEY;
const describeLive = apiKey ? describe : describe.skip;

describeLive("SimpleSwap live API", () => {
  const client = new SimpleSwap({ apiKey });

  test("getCurrencies returns currency list", async () => {
    const currencies = await client.getCurrencies();
    expect(Array.isArray(currencies)).toBe(true);
    expect(currencies.length).toBeGreaterThan(0);
    expect(currencies[0]).toHaveProperty("ticker");
  });

  test("getEstimate returns estimated amounts", async () => {
    const estimate = await client.getEstimate({
      tickerFrom: "btc",
      tickerTo: "eth",
      networkFrom: "btc",
      networkTo: "eth",
      amount: "0.1",
    });
    expect(estimate).toHaveProperty("estimatedAmount");
  });
});
