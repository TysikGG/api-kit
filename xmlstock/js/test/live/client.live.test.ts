import { XmlStockClient } from '../../src/index.js';

const user = process.env.XMLSTOCK_USER;
const apiKey = process.env.XMLSTOCK_KEY;

const describeLive = user && apiKey ? describe : describe.skip;

describeLive('XmlStockClient (live)', () => {
  it('fetches balance without spending funds', async () => {
    const client = new XmlStockClient({
      user: user!,
      apiKey: apiKey!,
    });

    const balance = await client.getBalance();
    expect(balance).toBeDefined();
  });
});
