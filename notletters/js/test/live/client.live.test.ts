import { NotLetters } from "../../src/index.js";

const apiToken = process.env.NOTLETTERS_API_TOKEN;
const describeIf = apiToken ? describe : describe.skip;

describeIf("NotLetters live API", () => {
  it("fetches real user profile and balance without spending money", async () => {
    const client = new NotLetters({ apiToken });
    const profile = await client.getMe();

    expect(typeof profile.id).toBe("string");
    expect(typeof profile.username).toBe("string");
    expect(typeof profile.balance).toBe("number");
    expect(typeof profile.rate_limit).toBe("number");

    const balance = await client.getBalance();
    expect(typeof balance).toBe("number");
    expect(balance).toBe(profile.balance);
  });
});
