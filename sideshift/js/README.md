# sideshift

TypeScript/JavaScript client for the [SideShift.ai](https://docs.sideshift.ai) crypto swap and exchange REST API (v2).

## Installation

```bash
npm install sideshift
```

## Quick Start

```ts
import { SideShift } from 'sideshift';

const client = new SideShift();

async function run() {
  // Check API permissions
  const permissions = await client.getPermissions();
  console.log(`Can create shift: ${permissions.createShift}`);

  // Get current exchange rate for a trading pair
  const pair = await client.getPair('eth', 'ethereum', 'btc', 'bitcoin');
  console.log(`ETH/BTC Rate: ${pair.rate} (Min: ${pair.min}, Max: ${pair.max})`);
}

run();
```

## Features

- Full coverage of SideShift.ai REST API v2:
  - `getCoins()`: List 200+ cryptocurrencies, tokens, and supported networks.
  - `getPair(depositCoin, depositNetwork, settleCoin, settleNetwork)`: Query live exchange rate and limits.
  - `getPairs(pairs)`: Bulk pair rates query.
  - `requestQuote(params)`: Request fixed-rate quotes.
  - `createFixedShift(params)`: Order fixed-rate shift using quote.
  - `createVariableShift(params)`: Order market-rate variable shift.
  - `getShift(shiftId)`: Check shift deposit and settlement status.
  - `getShifts(shiftIds)`: Bulk shift status check.
  - `getRecentShifts(limit)`: Query public recently completed shifts.
  - `getPermissions()`: Check regional and network permissions.
  - `getXaiStats()`: Retrieve XAI token staking statistics.
  - `getAccount()`: Private account metadata (requires secret).
  - `setRefundAddress(shiftId, refundAddress)`: Set emergency refund destination.
  - `cancelOrder(orderId)`: Cancel active order after timeout.
- Fully typed request and response objects.
- Built-in error handling with `SideShiftError`.

## License

ISC
