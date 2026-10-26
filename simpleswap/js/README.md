# simpleswap-client

[![npm version](https://img.shields.io/npm/v/simpleswap-client.svg)](https://www.npmjs.com/package/simpleswap-client)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/simpleswap-client.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client library for the [SimpleSwap](https://simpleswap.io) instant cryptocurrency exchange REST API (v3).

Official API documentation: <https://api.simpleswap.io>

---

## Features

- ⚡ **Fixed & Floating Exchange Rates** — Execute exchanges at floating market rates or lock in a guaranteed fixed rate.
- 🪙 **1000+ Cryptocurrencies** — Trade Bitcoin, Ethereum, Solana, Monero, and hundreds of tokens across various blockchains.
- 🔄 **Full Swap Lifecycle** — Calculate rate estimates, verify limits with `getRanges()`, validate addresses with `checkExchange()`, create swaps, and track transactions.
- 🛡️ **Fully Typed** — Written in TypeScript with complete type definitions (`ExchangeOrder`, `EstimateResult`, `SimpleSwapCurrency`, `RangesResult`).

---

## Installation

```bash
npm install simpleswap-client
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only queries supported currencies and exchange estimates. It does not create orders:

```typescript
import { SimpleSwap } from "simpleswap-client";

const client = new SimpleSwap({
  apiKey: process.env.SIMPLESWAP_API_KEY!,
});

// 1. Fetch available currencies
const currencies = await client.getCurrencies();
console.log(`Available currencies: ${currencies.length}`);

// 2. Get floating rate estimate for 0.1 BTC to ETH
const estimate = await client.getEstimate({
  fixed: false,
  tickerFrom: "btc",
  networkFrom: "btc",
  tickerTo: "eth",
  networkTo: "eth",
  amount: 0.1,
});
console.log(`0.1 BTC -> ${estimate.amountTo} ETH (Rate: ${estimate.rate})`);
```

---

## Usage Guide

### 1. Creating a Floating Rate Swap

Full lifecycle: check minimum/maximum limits, validate address, create order, and track status:

```typescript
import { SimpleSwap, SimpleSwapError } from "simpleswap-client";

const client = new SimpleSwap({ apiKey: process.env.SIMPLESWAP_API_KEY! });

// 1. Check minimum and maximum deposit limits
const ranges = await client.getRanges({
  fixed: false,
  tickerFrom: "btc",
  networkFrom: "btc",
  tickerTo: "eth",
  networkTo: "eth",
});
console.log(`Min: ${ranges.min} BTC, Max: ${ranges.max || "No limit"} BTC`);

// 2. Validate destination address
const check = await client.checkExchange({
  addressReceive: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  ticker: "eth",
  network: "eth",
});
if (!check.valid) {
  throw new Error("Invalid destination address!");
}

// 3. Create exchange order
const order = await client.createExchange({
  fixed: false,
  tickerFrom: "btc",
  networkFrom: "btc",
  tickerTo: "eth",
  networkTo: "eth",
  amount: 0.1,
  addressReceive: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  userRefundAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", // optional
});

console.log(`Exchange created! ID: ${order.id}`);
console.log(`Send 0.1 BTC to: ${order.addressDeposit}`);
console.log(`Status: ${order.status}`);
```

### 2. Creating a Fixed Rate Swap

Lock in a guaranteed exchange amount:

```typescript
const fixedOrder = await client.createExchange({
  fixed: true,
  tickerFrom: "eth",
  networkFrom: "eth",
  tickerTo: "btc",
  networkTo: "btc",
  amount: 2.0,
  addressReceive: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
});

console.log(`Fixed Order ID: ${fixedOrder.id}`);
console.log(`Guaranteed Receive Amount: ${fixedOrder.amountTo} BTC`);
console.log(`Send ETH to: ${fixedOrder.addressDeposit}`);
```

### 3. Tracking Exchange Status

Monitor exchange progress until funds are delivered:

```typescript
const current = await client.getExchange(order.id);
console.log(`Current Status: ${current.status}`);

if (current.status === "finished") {
  console.log(`Payout Tx Hash: ${current.txTo}`);
}
```

---

## API Reference

### `SimpleSwap` Class

#### Constructor

```typescript
new SimpleSwap(options: SimpleSwapOptions)
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | **Required** | Your SimpleSwap API key. |
| `baseUrl` | `string` | `"https://api.simpleswap.io/v3"` | SimpleSwap API base URL. |
| `timeout` | `number` | `30000` | HTTP request timeout in milliseconds. |

#### Methods

- **`getCurrencies(): Promise<SimpleSwapCurrency[]>`** — Retrieves all supported currencies and networks.
- **`getCurrency(ticker: string, network: string): Promise<SimpleSwapCurrency>`** — Gets metadata for a single currency.
- **`getEstimate(params: GetEstimateParams): Promise<EstimateResult>`** — Calculates exchange amount estimate and rate.
- **`getRanges(params: GetRangesParams): Promise<RangesResult>`** — Retrieves minimum and maximum deposit amounts.
- **`checkExchange(params: CheckExchangeParams): Promise<CheckExchangeResult>`** — Validates destination wallet address.
- **`createExchange(params: CreateExchangeParams): Promise<ExchangeOrder>`** — Creates a new swap order.
- **`getExchange(id: string): Promise<ExchangeOrder>`** — Retrieves status and transactions of an exchange.
- **`getExchanges(params?: GetExchangesParams): Promise<ExchangeOrder[]>`** — Lists past exchanges.

---

## Error Handling

When the API returns an error, `SimpleSwapError` is thrown:

```typescript
import { SimpleSwap, SimpleSwapError } from "simpleswap-client";

try {
  const client = new SimpleSwap({ apiKey: "invalid_key" });
  await client.getCurrencies();
} catch (error) {
  if (error instanceof SimpleSwapError) {
    console.error(`SimpleSwap Error: ${error.message} (Status: ${error.status})`);
  }
}
```

Common HTTP status codes:
- `400 Bad Request` — Amount outside limits or invalid address.
- `401 Unauthorized` — Invalid or missing API key.
- `404 Not Found` — Exchange ID not found.

---

## License

ISC
