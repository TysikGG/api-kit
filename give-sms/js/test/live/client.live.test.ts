import { GiveSms } from '../../src/index.js';

const apiKey = process.env.GIVE_SMS_API_KEY;

(apiKey ? describe : describe.skip)('GiveSms live (read-only)', () => {
  const client = new GiveSms({ apiKey: apiKey ?? '' });

  it('reads the native balance and Kazakhstan counts', async () => {
    const balance = await client.getBalance();
    expect(typeof balance).toBe('number');
    const counts = await client.getCount({ country: 'kazakhstan' });
    expect(counts).toBeTruthy();
  });

  it('reads the handler balance and price catalog', async () => {
    const balance = await client.handlerGetBalance();
    expect(typeof balance).toBe('number');
    const prices = await client.handlerGetPrices({ country: 2, service: 'tg' });
    expect(prices).toBeTruthy();
  });

  it('reads the rent country list', async () => {
    const countries = await client.rentCountries();
    expect(countries).toBeTruthy();
  });
});
