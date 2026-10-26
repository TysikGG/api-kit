# swapzone

TypeScript client for the [Swapzone](https://swapzone.io) instant cryptocurrency exchange and DEX aggregator API.

API Documentation: [https://documenter.getpostman.com/view/16362858/UVXokDS6](https://documenter.getpostman.com/view/16362858/UVXokDS6)

## Features

- **TypeScript-first**: Comprehensive type definitions for instant exchange and DEX methods.
- **Instant Exchanges**: Compare rates across 15+ instant exchange partners, fetch quotes, create orders, and track transaction statuses.
- **DEX & Cross-chain**: Access decentralized swaps, liquidity quotes, and supported blockchain networks.
- **Address Validation**: Check address validity across supported blockchains and asset networks.
- **Environment Discovery**: Automatically picks up `SWAPZONE_API_KEY` from environment variables.

## Installation

```bash
npm install swapzone
```

## Quick Start

```typescript
import { Swapzone } from "swapzone";

const client = new Swapzone({
  apiKey: process.env.SWAPZONE_API_KEY,
});

async function main() {
  // Get supported currencies
  const currencies = await client.getCurrencies();
  console.log(`Currencies available: ${currencies.length}`);

  // Get best exchange rate for 0.1 BTC to ETH
  const rate = await client.getRate({
    from: "btc",
    to: "eth",
    amount: "0.1",
  });
  console.log(`Estimated ETH: ${rate.amountTo} (via ${rate.adapter})`);

  // Create an exchange transaction
  const order = await client.createTransaction({
    from: "btc",
    to: "eth",
    amountDeposit: "0.1",
    addressReceive: "0xYourEthereumAddress...",
    quotaId: rate.quotaId,
  });
  console.log(`Send BTC deposit to: ${order.addressDeposit}`);
}

main().catch(console.error);
```

## API Overview

### Instant Exchange

- `client.getCurrencies()`: List all supported currencies and networks.
- `client.getRate(params)`: Fetch rate estimates from all available exchange partners.
- `client.createTransaction(params)`: Create an exchange order and obtain a deposit address.
- `client.getTransaction(id)`: Check status and blockchain hashes for an exchange transaction.
- `client.validateAddress(params)`: Verify recipient address format for a cryptocurrency network.
- `client.getMarkets(rateType?)`: Retrieve bulk market rates.

### Decentralized Exchange (DEX)

- `client.getDEXBlockchains()`: List supported blockchain networks for on-chain/cross-chain swaps.
- `client.getDEXTokens()`: List supported tokens for DEX routes.
- `client.getDEXQuote(params)`: Query real-time quotes across decentralized liquidity bridges.
- `client.getDEXSwapStatus(swapId, fromHash?)`: Track status of a DEX swap transaction.

## License

ISC
