import { OnlineSim } from '../../src/index.js';

const apiKey = process.env.ONLINESIM_API_KEY;

(apiKey ? describe : describe.skip)('OnlineSim Live', () => {
  const client = new OnlineSim({ apiKey: apiKey! });

  it('fetches balance without throwing', async () => {
    const balance = await client.getBalance();
    expect(typeof balance).toBe('number');
  });

  it('fetches countries without throwing', async () => {
    const countries = await client.getCountries();
    expect(countries).toBeDefined();
  });
});
