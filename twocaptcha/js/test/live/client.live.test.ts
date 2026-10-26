import { TwoCaptchaClient } from '../../src/index.js';

const apiKey = process.env.TWOCAPTCHA_API_KEY;

(apiKey ? describe : describe.skip)('TwoCaptcha Live', () => {
  const client = new TwoCaptchaClient({ apiKey: apiKey! });

  it('fetches balance without throwing', async () => {
    const balance = await client.getBalance();
    expect(typeof balance).toBe('number');
  });
});
