/**
 * Read-only live checks. Skipped unless FIXEDFLOAT_API_KEY and FIXEDFLOAT_API_SECRET are set.
 * Never creates an order.
 */
import { FixedFloat } from "../../src/index.js";

const apiKey = process.env.FIXEDFLOAT_API_KEY;
const apiSecret = process.env.FIXEDFLOAT_API_SECRET;
const live = apiKey && apiSecret ? describe : describe.skip;

live("FixedFloat live API", () => {
  const client = new FixedFloat({ apiKey, apiSecret, retries: 1 });

  test("lists currencies and quotes BTC to ETH", async () => {
    const currencies = await client.getCurrencies();
    expect(currencies.length).toBeGreaterThan(0);
    expect(currencies.some((item) => item.code === "BTC")).toBe(true);

    const price = await client.getPrice({
      fromCcy: "BTC",
      toCcy: "ETH",
      amount: 0.01,
      direction: "from",
      type: "float",
    });
    expect(price.from.code).toBeTruthy();
    expect(price.to.amount).toBeTruthy();
  }, 30_000);

  test("downloads the public float rates export", async () => {
    const rates = await client.getRates({ type: "float", from: "BTC", to: "ETH" });
    expect(rates.length).toBeGreaterThan(0);
    expect(rates[0].from.toUpperCase()).toBe("BTC");
  }, 30_000);
});
