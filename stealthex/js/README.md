# stealthex-client

TypeScript client for the [StealthEX](https://stealthex.io) non-custodial cryptocurrency exchange API.

API Documentation: [https://documenter.getpostman.com/view/24333719/2s9YJZ54yN](https://documenter.getpostman.com/view/24333719/2s9YJZ54yN)

## Features

- **TypeScript-first**: Comprehensive type definitions for currencies, estimates, ranges, and orders.
- **Limitless Swaps**: Instant exchange across 1,000+ crypto assets without custodial accounts.
- **Fixed & Floating**: Supports both floating and fixed exchange rate flows.
- **Zero Configuration**: Automatically reads `STEALTHEX_API_KEY` from environment variables.

## Installation

```bash
npm install stealthex-client
```

## Quick Start

```typescript
import { StealthEX } from "stealthex-client";

const client = new StealthEX({
  apiKey: process.env.STEALTHEX_API_KEY,
});

async function main() {
  // Get supported currencies
  const currencies = await client.getCurrencies();
  console.log(`Currencies available: ${currencies.length}`);

  // Get estimated amount for 0.1 BTC to ETH
  const estimate = await client.getEstimate("btc", "eth", "0.1");
  console.log(`Estimated ETH: ${estimate.estimated_amount}`);

  // Create an exchange order
  const order = await client.createExchange({
    currencyFrom: "btc",
    currencyTo: "eth",
    amountFrom: "0.1",
    addressTo: "0xReceiverEthereumAddress...",
  });
  console.log(`Send BTC deposit to: ${order.address_from}`);
}

main().catch(console.error);
```

## API Overview

### Market & Currencies

- `client.getCurrencies(params?)`: List all supported currencies and networks.
- `client.getCurrency(symbol)`: Get detailed information for a single asset.
- `client.getPairs(symbol?)`: List available exchange pairs.
- `client.getRange(from, to, fixed?)`: Query minimum and maximum exchange amounts.
- `client.getMinAmount(from, to, fixed?)`: Get minimal deposit threshold.
- `client.getEstimate(from, to, amount, fixed?)`: Calculate expected return for a swap.

### Orders

- `client.createExchange(params)`: Create an exchange order and generate deposit instructions.
- `client.getExchange(id)`: Query exchange status and blockchain transaction hashes.
- `client.getExchanges(limit?)`: List previous transactions.

## License

ISC
