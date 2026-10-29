import { BitcoinVn } from "../../src/index.js";

const apiKey = process.env.BITCOINVN_API_KEY?.trim();

(apiKey ? describe : describe.skip)("live BitcoinVN", () => {
  it("reads a public ticker", async () => {
    const client = new BitcoinVn({ apiKey });
    const health = await client.getHealth();
    const ticker = await client.getTicker("BTC", "USDT");
    const pair = await client.getPair("btc", "usdt");
    const offers = await client.listStakingOffers();
    expect(health.status).toBe("ok");
    expect(typeof ticker.rate).toBe("number");
    expect(typeof ticker.volume24h).toBe("number");
    expect(typeof pair.rate).toBe("number");
    expect(Array.isArray(offers)).toBe(true);
  });
});
