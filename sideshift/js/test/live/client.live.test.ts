import { SideShift } from '../../src/index.js';

const runLive = process.env.SIDESHIFT_LIVE === 'true';

(runLive ? describe : describe.skip)('SideShift Live', () => {
  const client = new SideShift();

  it('fetches coins without throwing', async () => {
    const coins = await client.getCoins();
    expect(Array.isArray(coins)).toBe(true);
    expect(coins.length).toBeGreaterThan(0);
  });

  it('fetches pair rate without throwing', async () => {
    const pair = await client.getPair('eth', 'ethereum', 'btc', 'bitcoin');
    expect(typeof pair.rate).toBe('string');
  });
});
