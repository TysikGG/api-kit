import { SideShift } from '../src/index.js';

async function main() {
  const client = new SideShift();

  console.log('Connecting to SideShift.ai API...');
  try {
    const permissions = await client.getPermissions();
    console.log('Shift creation permitted:', permissions.createShift);

    const pair = await client.getPair('eth', 'ethereum', 'btc', 'bitcoin');
    console.log(`ETH-BTC Rate: ${pair.rate} (Min: ${pair.min}, Max: ${pair.max})`);
  } catch (error) {
    console.error('Error connecting to SideShift:', error);
  }
}

main();
