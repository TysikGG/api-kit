import { GreedySMS } from "../../src/index.js";

const apiKey = process.env.GREEDY_SMS_API_KEY;
const describeIf = apiKey ? describe : describe.skip;

describeIf("GreedySMS live API", () => {
  it("fetches health, profile, and country catalog without spending balance", async () => {
    const client = new GreedySMS({ apiKey });

    const health = await client.checkHealth();
    expect(health.status).toBe("ok");

    const me = await client.getMe();
    expect(typeof me.id).toBe("string");
    expect(typeof me.balance).toBe("number");
    expect(me.balance).toBeGreaterThanOrEqual(0);

    const countries = await client.getCountries({ page: 1, pageSize: 5 });
    expect(Array.isArray(countries.countries)).toBe(true);
    expect(countries.countries.length).toBeGreaterThan(0);
  });
});
