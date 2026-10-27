import { ChangeNow } from "../../src/index.js";

const apiKey = process.env.CHANGENOW_API_KEY;
const describeLive = apiKey ? describe : describe.skip;

const ETH_ADDRESS = "0x57f31ad4b64095347F87eDB1675566DAfF5EC886";

describeLive("ChangeNOW live API", () => {
  const client = new ChangeNow({ apiKey });

  test("getCurrencies returns a currency list", async () => {
    const currencies = await client.getCurrencies({ active: true, flow: "standard" });
    expect(Array.isArray(currencies)).toBe(true);
    expect(currencies.length).toBeGreaterThan(0);
    expect(currencies[0]).toHaveProperty("ticker");
    expect(currencies[0]).toHaveProperty("network");
  });

  test("getMinAmount returns a positive minimum for BTC to ETH", async () => {
    const min = await client.getMinAmount({
      fromCurrency: "btc",
      toCurrency: "eth",
      fromNetwork: "btc",
      toNetwork: "eth",
      flow: "standard",
    });
    expect(min.minAmount).toBeGreaterThan(0);
  });

  test("getEstimatedAmount returns a standard-flow estimate", async () => {
    const estimate = await client.getEstimatedAmount({
      fromCurrency: "btc",
      toCurrency: "eth",
      fromNetwork: "btc",
      toNetwork: "eth",
      fromAmount: "0.1",
      flow: "standard",
      type: "direct",
    });
    expect(Number(estimate.toAmount)).toBeGreaterThan(0);
    expect(estimate.flow).toBe("standard");
  });

  test("validateAddress accepts a well-formed Ethereum address", async () => {
    const check = await client.validateAddress({
      currency: "eth",
      address: ETH_ADDRESS,
    });
    expect(check.result).toBe(true);
  });
});
