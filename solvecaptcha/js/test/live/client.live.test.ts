import { SolveCaptchaClient } from '../../src/index.js';

const apiKey = process.env.SOLVECAPTCHA_API_KEY;
const describeLive = apiKey ? describe : describe.skip;

describeLive('SolveCaptchaClient (live)', () => {
  const client = new SolveCaptchaClient({ apiKey: apiKey! });

  it('fetches balance', async () => {
    const balance = await client.getBalance();
    expect(typeof balance).toBe('number');
  });
});
