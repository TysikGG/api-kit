import { Exolix } from "../../src/index.js";

const apiKey = process.env.EXOLIX_API_KEY;
const describeLive = apiKey ? describe : describe.skip;

describeLive("Exolix live API", () => {
  const client = new Exolix({ apiKey });

  test("getCurrencies returns a currency page", async () => {
    const page = await client.getCurrencies({ page: 1, size: 5, withNetworks: true });
    expect(Array.isArray(page.data)).toBe(true);
    expect(page.data.length).toBeGreaterThan(0);
    expect(page.count).toBeGreaterThan(0);
    expect(page.data[0]).toHaveProperty("code");
    expect(page.data[0]).toHaveProperty("name");
  });

  test("getCurrencyNetworks and getNetworks return network rows", async () => {
    const networks = await client.getCurrencyNetworks("ETH");
    expect(Array.isArray(networks)).toBe(true);
    expect(networks.length).toBeGreaterThan(0);
    expect(networks[0]).toHaveProperty("network");

    const catalog = await client.getNetworks({ page: 1, size: 5 });
    expect(Array.isArray(catalog.data)).toBe(true);
    expect(catalog.data.length).toBeGreaterThan(0);
    expect(catalog.count).toBeGreaterThan(0);
  });

  test("getRate quotes a floating deposit amount", async () => {
    const quote = await client.getRate({
      coinFrom: "BTC",
      coinTo: "ETH",
      networkFrom: "BTC",
      networkTo: "ETH",
      amount: "0.1",
      rateType: "float",
    });
    expect(quote.toAmount).toBeGreaterThan(0);
    expect(quote.rate).toBeGreaterThan(0);
    expect(quote.minAmount).toBeGreaterThan(0);
  });

  test("getRate quotes a fixed withdrawal amount", async () => {
    const quote = await client.getRate({
      coinFrom: "ETH",
      coinTo: "USDT",
      networkFrom: "ETH",
      networkTo: "ETH",
      withdrawalAmount: "50",
      rateType: "fixed",
    });
    expect(quote.fromAmount).toBeGreaterThan(0);
    expect(quote.toAmount).toBeGreaterThan(0);
  });

  test("getTransactions returns authenticated history", async () => {
    const history = await client.getTransactions({ page: 1, size: 5, order: "desc" });
    expect(Array.isArray(history.data)).toBe(true);
    expect(typeof history.count).toBe("number");
  });
});
