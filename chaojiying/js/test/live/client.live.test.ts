import { Chaojiying } from "../../src/index.js";

const username = process.env.CHAOJIYING_USER;
const password = process.env.CHAOJIYING_PASS;
const describeLive = username && password ? describe : describe.skip;

describeLive("Chaojiying live API", () => {
  const client = new Chaojiying({ username, password });

  test("getScore returns point balance", async () => {
    const score = await client.getScore();
    expect(score.err_no).toBe(0);
    expect(typeof score.tifen).toBe("number");
  });
});
