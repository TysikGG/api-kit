import { SmsBowerClient } from '../../src/index.js';

const apiKey = process.env.SMSBOWER_API_KEY;
const describeLive = apiKey ? describe : describe.skip;

describeLive('SmsBowerClient (live)', () => {
  const client = new SmsBowerClient({ apiKey: apiKey! });

  it('fetches balance', async () => {
    const balance = await client.getBalance();
    expect(typeof balance).toBe('number');
  });

  it('fetches service list', async () => {
    const services = await client.getServicesList();
    expect(Array.isArray(services)).toBe(true);
    expect(services.length).toBeGreaterThan(0);
  });

  it('fetches countries', async () => {
    const countries = await client.getCountries();
    expect(typeof countries).toBe('object');
    expect(Object.keys(countries).length).toBeGreaterThan(0);
  });
});
