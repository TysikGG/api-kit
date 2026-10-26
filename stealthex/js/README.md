# stealthex

[![npm version](https://img.shields.io/npm/v/stealthex.svg)](https://www.npmjs.com/package/stealthex)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/stealthex.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client library for the [StealthEX](https://stealthex.io) instant non-custodial cryptocurrency exchange API.

Official API documentation: <https://documenter.getpostman.com/view/24333719/2s9YJZ54yN>

---

## Features

- ⚡ **Fixed & Floating Swaps** — Exchange at real-time floating market rates or lock in a fixed rate for 20 minutes.
- 🪙 **1400+ Coins & Tokens** — Wide asset selection across Bitcoin, Ethereum, Monero, Ripple, Solana, and more.
- 🔒 **Non-Custodial & Private** — Direct wallet-to-wallet transactions with no mandatory account registration.
- 🛡️ **Fully Typed** — Written in TypeScript with complete type definitions (`ExchangeDetails`, `StealthEXCurrency`, `RangeResult`).

---

## Installation

```bash
npm install stealthex
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects supported currencies and price estimates. It does not create orders:

```typescript
import { StealthEX } from "stealthex";

const client = new StealthEX({
  apiKey: process.env.STEALTHEX_API_KEY!,
});

// 1. Fetch available currencies
const currencies = await client.getCurrencies();
console.log(`Available currencies: ${currencies.length}`);

// 2. Query floating rate estimate for 0.1 BTC to ETH
const estimate = await client.getEstimate("btc", "eth", 0.1, false);
console.log(`Estimated receive amount: ${estimate.estimated_amount} ETH`);
```

---

## Usage Guide

### 1. Creating a Floating Rate Swap

Check exchange limits, get estimate, create swap order, and monitor progress:

```typescript
import { StealthEX, StealthEXError } from "stealthex";

const client = new StealthEX({ apiKey: process.env.STEALTHEX_API_KEY! });

// 1. Check deposit range (min and max limits)
const range = await client.getRange("btc", "eth", false);
console.log(`Min: ${range.min_amount} BTC, Max: ${range.max_amount || "No limit"}`);

// 2. Create the exchange order
const order = await client.createExchange({
  currency_from: "btc",
  currency_to: "eth",
  amount: 0.1,
  address_to: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  refund_address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", // optional
  fixed: false,
});

console.log(`Exchange Created! ID: ${order.id}`);
console.log(`Send 0.1 BTC to: ${order.address_from}`);
console.log(`Current Status: ${order.status}`);
```

### 2. Creating a Fixed Rate Swap

Lock in an exact payout amount for 20 minutes:

```typescript
const fixedOrder = await client.createExchange({
  currency_from: "eth",
  currency_to: "btc",
  amount: 2.0,
  address_to: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  fixed: true,
});

console.log(`Fixed Exchange ID: ${fixedOrder.id}`);
console.log(`Guaranteed Payout: ${fixedOrder.amount_to} BTC`);
console.log(`Deposit Address: ${fixedOrder.address_from}`);
```

### 3. Tracking Exchange Status

Check deposit confirmations and outbound transaction hashes:

```typescript
const status = await client.getExchange(order.id);
console.log(`Status: ${status.status}`);

if (status.status === "finished") {
  console.log(`Payout Tx Hash: ${status.tx_to}`);
}
```

---

## API Reference

### `StealthEX` Class

#### Constructor

```typescript
new StealthEX(options: StealthEXOptions)
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | **Required** | Your StealthEX API key. |
| `baseUrl` | `string` | `"https://api.stealthex.io/v2"` | StealthEX API base URL. |
| `timeout` | `number` | `30000` | HTTP request timeout in milliseconds. |

#### Methods

- **`getCurrencies(params?): Promise<StealthEXCurrency[]>`** — Retrieves all supported coins.
- **`getCurrency(symbol: string): Promise<StealthEXCurrency>`** — Gets metadata for a specific coin.
- **`getPairs(symbol?): Promise<string[]>`** — Returns available trading pairs for an asset.
- **`getRange(symbolFrom, symbolTo, fixed?): Promise<RangeResult>`** — Retrieves min/max limits.
- **`getMinAmount(symbolFrom, symbolTo, fixed?): Promise<{ min_amount: number }>`** — Minimum deposit limit.
- **`getEstimate(symbolFrom, symbolTo, amount, fixed?): Promise<EstimateResult>`** — Returns estimated receive amount.
- **`createExchange(params: CreateExchangeParams): Promise<ExchangeDetails>`** — Creates a new swap order.
- **`getExchange(id: string): Promise<ExchangeDetails>`** — Retrieves status of an exchange.
- **`getExchanges(limit?): Promise<ExchangeDetails[]>`** — Lists past exchanges.

---

## Error Handling

When the API returns an error, `StealthEXError` is thrown:

```typescript
import { StealthEX, StealthEXError } from "stealthex";

try {
  const client = new StealthEX({ apiKey: "invalid_key" });
  await client.getCurrencies();
} catch (error) {
  if (error instanceof StealthEXError) {
    console.error(`StealthEX Error: ${error.message} (Status: ${error.status})`);
  }
}
```

Common HTTP status codes:
- `400 Bad Request` — Amount outside limits or invalid address.
- `401 Unauthorized` — Invalid API key.
- `404 Not Found` — Exchange ID not found.

---

## License

ISC
