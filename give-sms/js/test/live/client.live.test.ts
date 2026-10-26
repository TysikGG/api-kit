import { GiveSms } from '../../src/index.js';

const apiKey = process.env.GIVE_SMS_API_KEY;

(apiKey ? describe : describe.skip)('GiveSms Live', () => {
  const client = new GiveSms({ apiKey: apiKey! });

  it('fetches balance without throwing', async () => {
    const balance = await client.getBalance();
    expect(typeof balance).toBe('number');
  });

  it('fetches counts without throwing', async () => {
    const counts = await client.getCount({ country: 'kazakhstan' });
    expect(typeof counts).toBe('object');
  });
});
