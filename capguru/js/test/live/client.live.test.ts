import { CapGuruClient } from '../../src/index.js';

const apiKey = process.env.CAPGURU_API_KEY;

(apiKey ? describe : describe.skip)('CapGuru Live', () => {
  const client = new CapGuruClient({ apiKey: apiKey! });

  it('fetches balance without throwing', async () => {
    const balance = await client.getBalance();
    expect(typeof balance).toBe('number');
  });
});
