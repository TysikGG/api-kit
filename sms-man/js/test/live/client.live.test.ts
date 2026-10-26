import { SmsMan } from '../../src/index.js';

const token = process.env.SMSMAN_API_KEY;

(token ? describe : describe.skip)('SmsMan Live', () => {
  const client = new SmsMan({ token: token! });

  it('fetches balance without throwing', async () => {
    const balance = await client.getBalance();
    expect(typeof balance).toBe('number');
  });

  it('fetches countries without throwing', async () => {
    const countries = await client.getCountries();
    expect(countries).toBeDefined();
  });
});
