# simpleswap-client

TypeScript client for the [SimpleSwap](https://simpleswap.io) cryptocurrency exchange API (v3).

API Documentation: [https://simpleswap.io/en/affiliate-program/help-center/article/public-api-guide](https://simpleswap.io/en/affiliate-program/help-center/article/public-api-guide)

## Features

- **TypeScript-first**: Strictly typed definitions for currencies, estimates, ranges, and orders.
- **API v3**: Modern endpoint schema supporting fixed/floating rates, reverse estimates, and custom fee adjustments.
- **Full Lifecycle**: From checking currency availability and calculating ranges to creating orders and tracking statuses.
- **Zero Configuration**: Automatically reads `SIMPLESWAP_API_KEY` from environment variables.

## Installation

```bash
npm install simpleswap-client
```

## Quick Start

```typescript
import { SimpleSwap } from "simpleswap-client";

const client = new SimpleSwap({
  apiKey: process.env.SIMPLESWAP_API_KEY,
});

async function main() {
  // Get supported currencies
  const currencies = await client.getCurrencies();
  console.log(`Supported currencies: ${currencies.length}`);

  // Get estimated exchange amount
  const estimate = await client.getEstimate({
    tickerFrom: "btc",
    tickerTo: "eth",
    networkFrom: "btc",
    networkTo: "eth",
    amount: "0.1",
  });
  console.log(`Estimated ETH: ${estimate.estimatedAmount}`);

  // Create an exchange order
  const order = await client.createExchange({
    tickerFrom: "btc",
    tickerTo: "eth",
    networkFrom: "btc",
    networkTo: "eth",
    amount: "0.1",
    addressTo: "0xReceiverEthereumAddress...",
  });
  console.log(`Send BTC deposit to: ${order.addressFrom}`);
}

main().catch(console.error);
```

## API Overview

### Market & Currencies

- `client.getCurrencies()`: List all supported currencies and networks.
- `client.getCurrency(ticker, network)`: Get detailed information for a specific currency and network.
- `client.getEstimate(params)`: Calculate expected return amount for an exchange (supports `customFee`).
- `client.getRanges(params)`: Query minimum and maximum deposit limits.
- `client.checkExchange(params)`: Verify whether an exchange order can be created.

### Orders

- `client.createExchange(params)`: Create a new exchange order.
- `client.getExchange(id)`: Query status and transaction hashes of an exchange order.
- `client.getExchanges(params?)`: List previous exchange orders created by the account.

## License

ISC
