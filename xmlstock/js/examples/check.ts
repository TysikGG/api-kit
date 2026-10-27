import { XmlStockClient } from '../src/index.js';

async function main() {
  const user = process.env.XMLSTOCK_USER || 'demo_user';
  const apiKey = process.env.XMLSTOCK_KEY || 'demo_key';

  const client = new XmlStockClient({
    user,
    apiKey,
  });

  try {
    const balanceInfo = await client.getBalance();
    console.log('XMLStock account balance:', balanceInfo);
  } catch (error) {
    console.error('Error fetching balance:', error);
  }
}

main();
