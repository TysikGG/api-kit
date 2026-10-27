# changenow-client

[![npm version](https://img.shields.io/npm/v/changenow-client.svg)](https://www.npmjs.com/package/changenow-client)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/changenow-client.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client library for the [ChangeNOW](https://changenow.io) cryptocurrency exchange API (v2).

Official API documentation: <https://documenter.getpostman.com/view/8180765/SVfTPnM8>

The npm package is `changenow-client` because `changenow` is already taken.

---

## Features

- ⚡ **Standard & Fixed-Rate Swaps** — Floating estimates and fixed-rate locks via `rateId`.
- 🪙 **Multi-Network Assets** — Currencies, pairs, limits, and fees include the network (BTC, ERC-20, TRC-20, and the rest of the v2 catalog).
- 🔒 **Non-Custodial** — Create an exchange, then poll status until ChangeNOW pays the payout address.
- 🛡️ **Fully Typed** — TypeScript definitions for currencies, estimates, exchanges, fees, markets, and private transfers.

---

## Installation

```bash
npm install changenow-client
```

Requires Node.js 18 or higher.

---

## Authentication

Partner attribution is the partner API key. The client sends it in one header:

```typescript
import { CHANGENOW_API_KEY_HEADER } from "changenow-client";

console.log(CHANGENOW_API_KEY_HEADER); // "x-changenow-api-key"
```

TODO: the partner header name is pending confirmation from ChangeNOW. The published v2 docs and 401 text use `x-changenow-api-key`. The available-pairs sample uses `x-api-key`. Change `CHANGENOW_API_KEY_HEADER` in `src/client.ts` if ChangeNOW confirms a different name. Do not add a second partner header until they confirm one.

`userId` and `payload` on create are optional and stay disabled until ChangeNOW enables "Special partner fields". `contactEmail` and `source` are optional create fields from the public examples. Pass the end-user IP as `userIp` to send the documented `x-forwarded-for` header.

---

## Quick Start (Safe Check)

The quick check only reads currencies, the minimum, an estimate, and an address check. It does not create an exchange:

```typescript
import { ChangeNow } from "changenow-client";

const client = new ChangeNow({
  apiKey: process.env.CHANGENOW_API_KEY!,
});

const currencies = await client.getCurrencies({ active: true, flow: "standard" });
console.log(`Available currencies: ${currencies.length}`);

const min = await client.getMinAmount({
  fromCurrency: "btc",
  toCurrency: "eth",
  fromNetwork: "btc",
  toNetwork: "eth",
  flow: "standard",
});
console.log(`Minimum: ${min.minAmount} BTC`);

const estimate = await client.getEstimatedAmount({
  fromCurrency: "btc",
  toCurrency: "eth",
  fromNetwork: "btc",
  toNetwork: "eth",
  fromAmount: "0.1",
  flow: "standard",
});
console.log(`Estimated receive amount: ${estimate.toAmount} ETH`);
```

---

## Usage Guide

### 1. Creating a Standard (Floating) Exchange

```typescript
import { ChangeNow, ChangeNowError } from "changenow-client";

const client = new ChangeNow({ apiKey: process.env.CHANGENOW_API_KEY! });

const order = await client.createExchange({
  fromCurrency: "btc",
  toCurrency: "eth",
  fromNetwork: "btc",
  toNetwork: "eth",
  fromAmount: "0.1",
  address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  refundAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  flow: "standard",
  userId: "user-42", // optional, requires Special partner fields
  contactEmail: "trader@example.com",
  source: "wallet",
});

console.log(`Send BTC to: ${order.payinAddress}`);
console.log(`Exchange id: ${order.id}`);
```

### 2. Creating a Fixed-Rate Exchange

```typescript
const quote = await client.getEstimatedAmount({
  fromCurrency: "btc",
  toCurrency: "eth",
  fromNetwork: "btc",
  toNetwork: "eth",
  fromAmount: "0.1",
  flow: "fixed-rate",
  useRateId: true,
});

const fixedOrder = await client.createExchange({
  fromCurrency: "btc",
  toCurrency: "eth",
  fromNetwork: "btc",
  toNetwork: "eth",
  fromAmount: "0.1",
  address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  flow: "fixed-rate",
  rateId: quote.rateId ?? undefined,
});

console.log(`Locked until ${quote.validUntil}`);
console.log(`Payout: ${fixedOrder.toAmount} ETH`);
```

### 3. Tracking Status

```typescript
const status = await client.getExchange(order.id);
console.log(status.status); // waiting, confirming, exchanging, sending, finished, ...

if (status.status === "finished") {
  console.log(`Payout hash: ${status.payoutHash}`);
}
```

---

## API Reference

### `ChangeNow` Class

#### Constructor

```typescript
new ChangeNow(options?: ChangeNowClientOptions)
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | `CHANGENOW_API_KEY` | Partner API key. |
| `baseURL` | `string` | `"https://api.changenow.io/v2"` | API base URL. |
| `timeoutMs` | `number` | `30000` | Request timeout in milliseconds. |
| `userAgent` | `string` | `"changenow-client/0.1.0"` | User-Agent header. |
| `userIp` | `string` | unset | Sent as `x-forwarded-for`. |

#### Methods

- **`getCurrencies(params?)`** — `GET /exchange/currencies`
- **`getAvailablePairs(params?)`** — `GET /exchange/available-pairs`
- **`getMinAmount(params)`** — `GET /exchange/min-amount`
- **`getRange(params)`** — `GET /exchange/range`
- **`getEstimatedAmount(params)`** — `GET /exchange/estimated-amount` (standard and fixed-rate)
- **`createExchange(params)`** — `POST /exchange`
- **`getExchange(id)`** — `GET /exchange/by-id`
- **`validateAddress(params)`** — `GET /validate/address`
- **`getUserAddresses(name)`** — `GET /addresses-by-name`
- **`getNetworkFee(params)`** — `GET /exchange/network-fee`
- **`getMarketEstimate(params)`** — `GET /markets/estimate` (crypto and fiat, informational, fees excluded)
- **`getExchanges(params?)`** — `GET /exchanges` (private API key)
- **`getExchangeActions(id)`** — `GET /exchange/actions`
- **`continueExchange(params)`** — `POST /exchange/continue`
- **`refundExchange(params)`** — `POST /exchange/refund`
- **`getPrivateTransferEstimate(params)`** — `GET /private-transfer/estimated-amount`
- **`createPrivateTransfer(params)`** — `POST /private-transfer`

Several of these routes are enabled per partner key. A `403` means the endpoint is not activated for that key.

---

## Error Handling

```typescript
import { ChangeNow, ChangeNowError } from "changenow-client";

try {
  const client = new ChangeNow({ apiKey: "invalid_key" });
  await client.getCurrencies();
} catch (error) {
  if (error instanceof ChangeNowError) {
    console.error(`${error.code}: ${error.message} (HTTP ${error.statusCode})`);
  }
}
```

Address validation does not throw for a bad address. The response is HTTP 200 with `result: false`.

---

## Live Tests

Unit tests mock HTTP and always run. The live suite calls the real API and runs only when `CHANGENOW_API_KEY` is set. It is read-only: currencies, minimum amount, a standard-flow estimate, and address validation. It never creates an exchange.

```bash
npm test
CHANGENOW_API_KEY=your_key npm run test:live
```

---

## License

ISC
