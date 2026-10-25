import { BitcoinVn } from "../../src/index.js";

const apiKey = process.env.BITCOINVN_API_KEY?.trim();

(apiKey ? describe : describe.skip)("live BitcoinVN", () => {
  it("reads a public ticker", async () => {
    const client = new BitcoinVn({ apiKey });
    const ticker = await client.getTicker("BTC", "USDT");
    expect(typeof ticker.rate).toBe("number");
    expect(typeof ticker.volume24h).toBe("number");
  });
});
