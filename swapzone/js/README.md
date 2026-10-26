# swapzone

[![npm version](https://img.shields.io/npm/v/swapzone.svg)](https://www.npmjs.com/package/swapzone)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/swapzone.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client library for the [Swapzone](https://swapzone.io) instant cryptocurrency exchange & DEX cross-chain aggregator REST API.

Official API documentation: <https://documenter.getpostman.com/view/16362858/UVXokDS6>

---

## Features

- 🔄 **15+ Exchange Providers Aggregated** — Compares rates in real time across top instant swap platforms (SimpleSwap, StealthEX, ChangeNOW, Changelly, etc.).
- 🪙 **1000+ Cryptocurrencies** — Full support for fixed and floating cross-chain swaps.
- ⚡ **DEX Aggregation** — DEX blockchain routes, token catalogs, and quote comparisons.
- 🛡️ **Address Validation** — Built-in `validateAddress()` helper to verify destination wallet addresses.
- 🛡️ **Fully Typed** — Written in TypeScript with complete type definitions (`RateOffer`, `TransactionResult`, `SupportedCurrency`, `TransactionStatus`).

---

## Installation

```bash
npm install swapzone
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects supported currencies and compares live provider exchange rates. It does not create orders:

```typescript
import { Swapzone } from "swapzone";

const client = new Swapzone({
  apiKey: process.env.SWAPZONE_API_KEY!,
});

// 1. Fetch supported currencies
const currencies = await client.getCurrencies();
console.log(`Available currencies: ${currencies.length}`);

// 2. Query best rate offer for 0.1 BTC to ETH
const rate = await client.getRate({
  from: "btc",
  to: "eth",
  amount: 0.1,
  rateType: "all",
});
console.log(`Best Provider: ${rate.bestOffer.adapter}`);
console.log(`Estimated Receive: ${rate.bestOffer.amountTo} ETH`);
```

---

## Usage Guide

### 1. Finding the Best Rate and Creating a Swap

Full lifecycle: query provider rates, validate destination address, create transaction, and monitor status:

```typescript
import { Swapzone, SwapzoneError } from "swapzone";

const client = new Swapzone({ apiKey: process.env.SWAPZONE_API_KEY! });

// 1. Get rate offers across all providers
const rate = await client.getRate({
  from: "btc",
  to: "eth",
  amount: 0.1,
  rateType: "all",
});
const bestOffer = rate.bestOffer;
console.log(`Selected Provider: ${bestOffer.adapter} (Quota: ${bestOffer.amountTo} ETH)`);

// 2. Validate destination wallet address
const check = await client.validateAddress({
  currency: "eth",
  address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
});
if (!check.result) {
  throw new Error("Invalid destination wallet address!");
}

// 3. Create transaction with the selected provider
const tx = await client.createTransaction({
  from: "btc",
  to: "eth",
  amountDeposit: 0.1,
  addressReceive: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  quotaId: bestOffer.quotaId,
  refundAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", // optional
});

console.log(`Transaction Created! ID: ${tx.transaction.id}`);
console.log(`Send BTC to Deposit Address: ${tx.transaction.addressDeposit}`);
console.log(`Status: ${tx.transaction.status}`);
```

### 2. Tracking Transaction Progress

Monitor swap progress from deposit to settlement:

```typescript
const current = await client.getTransaction(tx.transaction.id);
console.log(`Status: ${current.status}`);

if (current.status === "finished") {
  console.log(`Received: ${current.amountReceive} ETH`);
}
```

### 3. Querying DEX Aggregation

Inspect supported DEX blockchains and token pairs:

```typescript
// List supported DEX blockchains
const blockchains = await client.getDEXBlockchains();
console.log("DEX Blockchains:", blockchains);

// Check DEX tokens
const dexTokens = await client.getDEXTokens();
console.log(`DEX Tokens count: ${dexTokens.length}`);
```

---

## API Reference

### `Swapzone` Class

#### Constructor

```typescript
new Swapzone(options: SwapzoneOptions)
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | **Required** | Your Swapzone API key. |
| `baseUrl` | `string` | `"https://api.swapzone.io/v1"` | Swapzone API base URL. |
| `timeout` | `number` | `30000` | HTTP request timeout in milliseconds. |

#### Methods

- **`getCurrencies(): Promise<SupportedCurrency[]>`** — Returns all supported cryptocurrencies.
- **`getRate(params: GetRateParams): Promise<RateOffer>`** — Returns aggregated quotes across all providers.
- **`createTransaction(params: CreateTransactionParams): Promise<TransactionResult>`** — Creates an exchange transaction.
- **`getTransaction(id: string): Promise<TransactionStatus>`** — Checks swap status and execution details.
- **`validateAddress(params: ValidateAddressParams): Promise<ValidateAddressResult>`** — Validates destination wallet address.
- **`getMarkets(rateType?): Promise<unknown[]>`** — Retrieves active market pairs.
- **`getDEXBlockchains(): Promise<DEXBlockchain[]>`** — Lists supported DEX blockchains.
- **`getDEXTokens(): Promise<unknown[]>`** — Lists tokens supported on DEX routers.
- **`getDEXQuote(params: DEXQuoteParams): Promise<unknown>`** — Queries cross-chain DEX swap route.
- **`getDEXSwapStatus(swapId: string, fromHash?): Promise<unknown>`** — Checks DEX swap execution.

---

## Error Handling

When the API returns an error, `SwapzoneError` is thrown:

```typescript
import { Swapzone, SwapzoneError } from "swapzone";

try {
  const client = new Swapzone({ apiKey: "invalid_key" });
  await client.getCurrencies();
} catch (error) {
  if (error instanceof SwapzoneError) {
    console.error(`Swapzone Error: ${error.message} (Status: ${error.status})`);
  }
}
```

Common HTTP status codes:
- `400 Bad Request` — Invalid address or amount out of limits.
- `401 Unauthorized` — Invalid API key.
- `404 Not Found` — Transaction ID not found.

---

## License

ISC
