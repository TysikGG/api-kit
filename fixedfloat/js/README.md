# fixedfloat-client

[![npm version](https://img.shields.io/npm/v/fixedfloat-client.svg)](https://www.npmjs.com/package/fixedfloat-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/fixedfloat-client.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client library for the [FixedFloat](https://fixedfloat.com/api) cryptocurrency exchange REST API v2.

Official API documentation: <https://fixedfloat.com/api>

---

## Features

- ⚡ **Fixed & Float Exchange Rates** — Choose between guaranteed fixed rates (1% fee) and floating market rates (0.5% fee).
- 🔐 **Automatic Request Signing** — Cryptographic HMAC-SHA256 signature generation (`X-API-KEY` & `X-API-SIGN`) built-in.
- 🪙 **Multi-Currency Support** — Trade Bitcoin, Ethereum, USDT, Solana, Monero, and dozens of other coins across multiple blockchains.
- 🛡️ **Fully Typed** — Written in TypeScript with complete type definitions (`Order`, `PriceResult`, `Currency`, `QrResult`).
- 🚨 **Emergency Handling** — Support for emergency choice actions (`EXCHANGE` or `REFUND`) on interrupted orders.

---

## Installation

```bash
npm install fixedfloat-client
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects supported currencies and price quotes. It does not create orders or spend funds:

```typescript
import { FixedFloat } from "fixedfloat-client";

const client = new FixedFloat({
  apiKey: process.env.FIXEDFLOAT_API_KEY,
  apiSecret: process.env.FIXEDFLOAT_API_SECRET,
});

// 1. Fetch available currencies
const currencies = await client.getCurrencies();
console.log(`Available currencies: ${currencies.length}`);

// 2. Query price calculation for 0.1 BTC to ETH
const price = await client.getPrice({
  fromCcy: "BTC",
  toCcy: "ETH",
  amount: 0.1,
  direction: "from",
  type: "float",
});
console.log(`0.1 BTC -> ${price.to.amount} ETH (Rate: ${price.to.rate})`);
```

---

## Usage Guide

### 1. Creating a Floating Rate Order

Create an exchange order with a floating rate, deposit instructions, and receive destination address:

```typescript
import { FixedFloat, FixedFloatError } from "fixedfloat-client";

const client = new FixedFloat({
  apiKey: process.env.FIXEDFLOAT_API_KEY!,
  apiSecret: process.env.FIXEDFLOAT_API_SECRET!,
});

// Create float order
const order = await client.createOrder({
  fromCcy: "BTC",
  toCcy: "ETH",
  amount: 0.1,
  direction: "from",
  type: "float",
  toAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  refundAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", // optional
});

console.log(`Order Created! ID: ${order.id}`);
console.log(`Security Token: ${order.token}`);
console.log(`Send BTC to: ${order.from.address}`);
console.log(`Order Status: ${order.status}`);
```

### 2. Creating a Fixed Rate Order

Lock in a guaranteed rate for 10 minutes:

```typescript
const fixedOrder = await client.createOrder({
  fromCcy: "ETH",
  toCcy: "BTC",
  amount: 2.5,
  direction: "from",
  type: "fixed",
  toAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
});

console.log(`Fixed Order ID: ${fixedOrder.id}`);
console.log(`Expected Payout: ${fixedOrder.to.amount} BTC`);
console.log(`Send ETH to: ${fixedOrder.from.address}`);
```

### 3. Tracking Order Status & QR Codes

Check order execution, transaction confirmations, and fetch QR codes:

```typescript
// Query status using order ID and secret token
const current = await client.getOrder(order.id, order.token);
console.log(`Status: ${current.status}`);

if (current.from.tx) {
  console.log(`Deposit confirmations: ${current.from.tx.confirmations}`);
}

// Fetch QR code for deposit address
const qr = await client.getQr(order.id, order.token);
console.log(`Deposit QR code: ${qr.src}`);

// Attach email address for status notifications
await client.setEmail(order.id, order.token, "user@example.com");
```

### 4. Setting Emergency Action Choice

If an order requires user decision (e.g. rate shifted or deposit was delayed):

```typescript
// Choose to execute exchange at current market rate or refund
await client.setEmergency({
  id: order.id,
  token: order.token,
  choice: "REFUND",
  address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
});
console.log("Emergency action submitted.");
```

---

## API Reference

### `FixedFloat` Class

#### Constructor

```typescript
new FixedFloat(options?: FixedFloatOptions)
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | `undefined` | Your FixedFloat API key. |
| `apiSecret` | `string` | `undefined` | Your FixedFloat API secret for HMAC signatures. |
| `baseUrl` | `string` | `"https://ff.io/api/v2"` | FixedFloat API v2 base URL. |
| `timeout` | `number` | `15000` | HTTP request timeout in milliseconds. |

#### Methods

- **`getCurrencies(): Promise<Currency[]>`** — Retrieves all supported cryptocurrencies and networks.
- **`getPrice(params: GetPriceParams): Promise<PriceResult>`** — Calculates price estimates, rates, and minimum/maximum limits.
- **`createOrder(params: CreateOrderParams): Promise<Order>`** — Creates a new exchange order.
- **`getOrder(id: string, token: string): Promise<Order>`** — Retrieves current order status and transaction info.
- **`setEmergency(params: SetEmergencyParams): Promise<unknown>`** — Sets emergency choice (`EXCHANGE` or `REFUND`).
- **`setEmail(id: string, token: string, email: string): Promise<unknown>`** — Sets email address for order updates.
- **`getQr(id: string, token: string): Promise<QrResult>`** — Retrieves deposit address QR code.

---

## Error Handling

When the FixedFloat API returns an error or non-zero status code, a `FixedFloatError` is thrown:

```typescript
import { FixedFloat, FixedFloatError } from "fixedfloat-client";

try {
  const client = new FixedFloat();
  await client.getOrder("INVALID_ID", "INVALID_TOKEN");
} catch (error) {
  if (error instanceof FixedFloatError) {
    console.error(`FixedFloat Error: ${error.message} (Code: ${error.code})`);
  }
}
```

Common error codes:
- `101` — Invalid currency pair or amount out of limits.
- `102` — Missing required parameter.
- `103` — Invalid destination wallet address.
- `401` — Unauthorized: invalid API key or signature.

---

## License

MIT
