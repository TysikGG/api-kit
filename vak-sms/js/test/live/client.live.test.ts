import { VakSmsClient } from '../../src/index.js';

const apiKey = process.env.VAK_SMS_API_KEY;
const describeLive = apiKey ? describe : describe.skip;

describeLive('VakSmsClient (live)', () => {
  const client = new VakSmsClient({ apiKey: apiKey! });

  it('fetches balance', async () => {
    const balance = await client.getBalance();
    expect(typeof balance).toBe('number');
  });

  it('fetches country list', async () => {
    const countries = await client.getCountryList();
    expect(Array.isArray(countries)).toBe(true);
  });
});
