# exolix-client

[![npm version](https://img.shields.io/npm/v/exolix-client.svg)](https://www.npmjs.com/package/exolix-client)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/exolix-client.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client library for the [Exolix](https://exolix.com) instant cryptocurrency exchange API (v2).

Official API documentation: <https://exolix.com/developers>

The npm package is `exolix-client`.

---

## Features

- ⚡ **Fixed & Floating Rates** — Quote a swap by deposit `amount` or by desired `withdrawalAmount`, at a floating or fixed rate.
- 🪙 **Currencies & Networks** — List coins, networks for one coin, and the full network catalog.
- 🔄 **Transactions** — Create a swap, fetch it by id, and list affiliate transaction history.
- 🛡️ **Fully Typed** — TypeScript definitions for currencies, networks, rates, and transactions.

---

## Installation

```bash
npm install exolix-client
```

Requires Node.js 18 or higher.

---

## Authentication

Partner attribution is the affiliate API key. The default affiliate share is 0.3%. The client sends the key in one header and does not add a referral parameter:

```typescript
import { EXOLIX_API_KEY_HEADER } from "exolix-client";

console.log(EXOLIX_API_KEY_HEADER); // "Authorization"
```

Pass the key to the constructor. The client does not read `EXOLIX_API_KEY` from the environment. Public reads work without a key. Transaction history requires a key that Exolix has enabled for that route.

---

## Quick Start (Safe Check)

The quick check only queries currencies and a rate. It does not create a transaction:

```typescript
import { Exolix } from "exolix-client";

const client = new Exolix({
  apiKey: process.env.EXOLIX_API_KEY!,
});

const currencies = await client.getCurrencies({ page: 1, size: 5, withNetworks: true });
console.log(`Available currencies: ${currencies.count}`);

const quote = await client.getRate({
  coinFrom: "BTC",
  coinTo: "ETH",
  networkFrom: "BTC",
  networkTo: "ETH",
  amount: "0.1",
  rateType: "float",
});
console.log(`0.1 BTC -> ${quote.toAmount} ETH (rate ${quote.rate})`);
```

---

## Usage Guide

### 1. Creating a Floating Rate Swap

```typescript
import { Exolix, ExolixError } from "exolix-client";

const client = new Exolix({ apiKey: process.env.EXOLIX_API_KEY! });

const quote = await client.getRate({
  coinFrom: "ETH",
  coinTo: "USDT",
  networkFrom: "ETH",
  networkTo: "ETH",
  amount: "0.5",
  rateType: "float",
});
console.log(`Min ${quote.minAmount}, you receive ${quote.toAmount} USDT`);

const tx = await client.createTransaction({
  coinFrom: "ETH",
  networkFrom: "ETH",
  coinTo: "USDT",
  networkTo: "ETH",
  amount: 0.5,
  withdrawalAddress: "0x0E29D1E501f90649Ad5982E900c455006e4522FC",
  rateType: "float",
});
console.log(`Send ETH to ${tx.depositAddress} (${tx.id})`);
```

`createTransaction` opens a real swap. Quote with `getRate` first.

### 2. Fixed Rate by Withdrawal Amount

```typescript
const quote = await client.getRate({
  coinFrom: "ETH",
  coinTo: "USDT",
  networkFrom: "ETH",
  networkTo: "ETH",
  withdrawalAmount: "50",
  rateType: "fixed",
});
console.log(`Send ${quote.fromAmount} ETH to receive ${quote.toAmount} USDT`);
```

### 3. Tracking Status and History

```typescript
const tx = await client.getTransaction("ab93061434dd0s");
console.log(tx.status); // wait, confirmation, confirmed, exchanging, sending, success, ...

const history = await client.getTransactions({ page: 1, size: 25, order: "desc" });
console.log(history.count);
```

History is authenticated. Exolix enables it per API key.

---

## API Reference

### `Exolix` Class

#### Constructor

```typescript
new Exolix(options?: ExolixClientOptions)
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | unset | Affiliate API key. Sent as `Authorization`. |
| `baseURL` | `string` | `"https://exolix.com/api/v2"` | API base URL. |
| `timeoutMs` | `number` | `30000` | Request timeout in milliseconds. |
| `userAgent` | `string` | `"exolix-client/0.1.0"` | User-Agent header. |

#### Methods

- **`getCurrencies(params?)`** — `GET /currencies`
- **`getCurrencyNetworks(code)`** — `GET /currencies/{code}/networks`
- **`getNetworks(params?)`** — `GET /currencies/networks`
- **`getRate(params)`** — `GET /rate` (`rateType` `float` or `fixed`, `amount` or `withdrawalAmount`)
- **`createTransaction(params)`** — `POST /transactions`
- **`getTransaction(id)`** — `GET /transactions/{id}`
- **`getTransactions(params?)`** — `GET /transactions` (authenticated history)

---

## Error Handling

```typescript
import { Exolix, ExolixError } from "exolix-client";

try {
  const client = new Exolix({ apiKey: "invalid_key" });
  await client.getTransactions();
} catch (error) {
  if (error instanceof ExolixError) {
    console.error(`${error.code}: ${error.message} (HTTP ${error.statusCode})`);
  }
}
```

---

## Live Tests

Unit tests mock HTTP and always run. The live suite calls the real API and runs only when `EXOLIX_API_KEY` is set. It is read-only: currencies, networks, a floating rate, a fixed rate, and transaction history. It never creates a transaction.

```bash
npm test
EXOLIX_API_KEY=your_key npm run test:live
```

---

## License

ISC
