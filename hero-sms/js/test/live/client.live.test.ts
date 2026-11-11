import { HeroSMS } from "../../src/index.js";

const apiKey = process.env.HERO_SMS_API_KEY;
const describeIf = apiKey ? describe : describe.skip;

describeIf("HeroSMS live API", () => {
  it("fetches balance and countries catalog without spending balance", async () => {
    const client = new HeroSMS({ apiKey });

    const balance = await client.getBalance();
    expect(typeof balance).toBe("number");
    expect(balance).toBeGreaterThanOrEqual(0);

    const countries = await client.getCountries();
    expect(typeof countries).toBe("object");
    expect(countries).not.toBeNull();
    expect(Object.keys(countries).length).toBeGreaterThan(0);
  });
});
