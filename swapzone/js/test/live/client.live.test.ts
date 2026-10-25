import { Swapzone } from "../../src/index.js";

const apiKey = process.env.SWAPZONE_API_KEY;
const describeLive = apiKey ? describe : describe.skip;

describeLive("Swapzone live API", () => {
  const client = new Swapzone({ apiKey });

  test("getCurrencies returns list of supported currencies", async () => {
    const currencies = await client.getCurrencies();
    expect(Array.isArray(currencies)).toBe(true);
    expect(currencies.length).toBeGreaterThan(0);
    expect(currencies[0]).toHaveProperty("ticker");
  });

  test("getRate returns rate offer for btc to eth", async () => {
    const rate = await client.getRate({
      from: "btc",
      to: "eth",
      amount: "0.1",
    });
    expect(rate).toHaveProperty("amountTo");
    expect(rate).toHaveProperty("adapter");
  });
});
