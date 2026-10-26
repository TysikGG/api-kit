# bitcoinvn

[![npm version](https://img.shields.io/npm/v/bitcoinvn.svg)](https://www.npmjs.com/package/bitcoinvn)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/node/v/bitcoinvn.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client for the [BitcoinVN Exchange API](https://bitcoinvn.io/api/doc.json) — Vietnam's premier cryptocurrency exchange and instant swap platform.

Official API documentation:
- OpenAPI specification: <https://bitcoinvn.io/api/doc.json>
- Exchange website: <https://bitcoinvn.io>

---

## Features

- 📊 **Public Market Data** — Real-time tickers, exchange rates, pair metadata, and platform health (no API key required).
- 🔄 **Instant Swaps & Quotes** — Request competitive quotes for crypto-to-crypto and crypto-to-fiat swaps.
- 📦 **Order Management** — Full order creation and lifecycle tracking supporting on-chain crypto, Lightning Network, bank wire, and cash pickup settlements.
- 💰 **Balances & Ledgers** — Check internal account balances, ledger history, and submit deposit transaction hashes.
- 📈 **Staking Vaults** — Inspect staking offerings, toggle auto-staking, and configure alert preferences.
- 🛡️ **Cryptographic Proofs** — Retrieve and verify BitcoinVN cryptographic guarantee letters and public keys.
- ⚡ **Resilient** — Automatic rate-limit handling with `X-RateLimit-Retry-After` header extraction and dedicated `BitcoinVnError`.

---

## Installation

```bash
npm install bitcoinvn
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check performs a public ticker lookup for `BTC/USDT`. It requires no API key and does not place orders or move funds.

### TypeScript / ESM

```ts
import { BitcoinVn } from "bitcoinvn";

// Anonymous client for public market endpoints
const client = new BitcoinVn();

const ticker = await client.getTicker("BTC", "USDT");
console.log(`Rate: ${ticker.rate}, 24h Volume: ${ticker.volume24h}`);
```

### CommonJS

```js
const { BitcoinVn } = require("bitcoinvn");

async function main() {
  const client = new BitcoinVn({
    apiKey: process.env.BITCOINVN_API_KEY,
  });

  const ticker = await client.getTicker("BTC", "USDT");
  console.log(`BTC/USDT Rate: ${ticker.rate}`);
}

main().catch(console.error);
```

---

## Usage Guide

### 1. Authentication

Public read operations (health, info, pairs, ticker, address validation) work anonymously without a key.

For account-specific actions (balances, order history, internal deposits, staking), pass your API key:

```ts
const client = new BitcoinVn({
  apiKey: process.env.BITCOINVN_API_KEY!,
});
```

API keys can be generated in your account dashboard on [bitcoinvn.io](https://bitcoinvn.io).

### 2. Market Pairs and Quotes

Inspect supported trading pairs and request live price quotes:

```ts
import { BitcoinVn } from "bitcoinvn";

const client = new BitcoinVn();

// Fetch trading pair limits and fees
const pair = await client.getPair("btc", "usdt");
console.log(`Min deposit: ${pair.minDeposit}, Max deposit: ${pair.maxDeposit}`);

// Request an instant quote
const quote = await client.createQuote({
  depositMethod: "btc",
  settleMethod: "usdt",
  depositAmount: 0.05,
});
console.log(`Expected settle amount: ${quote.settleAmount}`);
```

### 3. Creating and Managing Orders

Create an exchange order with specific settlement instructions (e.g. crypto address, Lightning invoice):

```ts
// Create an order swapping BTC for USDT
const order = await client.createOrder({
  depositMethod: "btc",
  settleMethod: "usdt",
  settleAmount: 1000,
  settleData: {
    address: "0xYourUsdtAddressHere...",
  },
});

console.log(`Order created: ${order.shortId}`);
console.log(`Send BTC deposit to: ${order.depositAddress}`);

// Check order status
const status = await client.getOrder(order.shortId);
console.log(`Order status: ${status.status}`);
```

### 4. Account Balances and History

Inspect your account's internal wallet balances and ledger transactions:

```ts
const client = new BitcoinVn({ apiKey: process.env.BITCOINVN_API_KEY! });

// List all balances
const balances = await client.getBalances();
console.log(balances);

// List balance transaction history
const history = await client.listBalanceHistory({ limit: 10 });
for (const item of history) {
  console.log(`${item.createdAt}: ${item.amount} ${item.asset}`);
}
```

---

## Error Handling

When the API returns a `4xx` or `5xx` error, the client throws a `BitcoinVnError` containing HTTP status code, API error message, and optional rate-limit backoff details:

```ts
import { BitcoinVn, BitcoinVnError } from "bitcoinvn";

const client = new BitcoinVn();

try {
  await client.getTicker("INVALID", "PAIR");
} catch (error) {
  if (error instanceof BitcoinVnError) {
    console.error(`BitcoinVN error [${error.status}]: ${error.message}`);
    if (error.status === 429 && error.retryAfter) {
      console.warn(`Rate limited. Retry after ${error.retryAfter} seconds.`);
    }
  }
}
```

---

## License

[ISC](LICENSE) © api-kit contributors
