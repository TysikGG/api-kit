# sideshift

[![npm version](https://img.shields.io/npm/v/sideshift.svg)](https://www.npmjs.com/package/sideshift)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/sideshift.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client library for the [SideShift.ai](https://docs.sideshift.ai) instant cross-chain crypto swap and exchange REST API (v2).

Official API documentation: <https://docs.sideshift.ai>

---

## Features

- 🔄 **Fixed & Variable Rate Swaps** — Lock in guaranteed rates with fixed quotes, or create flexible variable-rate shifts.
- 🪙 **DEX & Cross-Chain Aggregator** — Support for 100+ cryptocurrencies across Bitcoin, Ethereum, Solana, Arbitrum, BSC, Tron, and more.
- ⚡ **No Mandatory KYC / Account** — Non-custodial, fast automated swaps directly to your destination wallet.
- 🛡️ **Fully Typed** — Written in TypeScript with complete type definitions (`Shift`, `Quote`, `PairRate`, `Coin`, `Permissions`).

---

## Installation

```bash
npm install sideshift
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only queries public exchange permissions and pair exchange rates. It does not create orders:

```typescript
import { SideShift } from "sideshift";

const client = new SideShift();

// Check if shifts are enabled
const permissions = await client.getPermissions();
console.log(`Shifts enabled: ${permissions.createShift}`);

// Inspect exchange rate for ETH to BTC
const pair = await client.getPair("eth", "ethereum", "btc", "bitcoin");
console.log(`ETH/BTC Rate: ${pair.rate} (Min: ${pair.min}, Max: ${pair.max})`);
```

---

## Usage Guide

### 1. Creating a Fixed Rate Shift (Guaranteed Rate)

Get a guaranteed price quote and create a fixed-rate shift with deposit and settlement addresses:

```typescript
import { SideShift, SideShiftError } from "sideshift";

const client = new SideShift();

// 1. Request a 15-minute guaranteed quote
const quote = await client.requestQuote({
  depositCoin: "eth",
  depositNetwork: "ethereum",
  settleCoin: "btc",
  settleNetwork: "bitcoin",
  depositAmount: "0.5",
});
console.log(`Quote ID: ${quote.id}`);
console.log(`You send: ${quote.depositAmount} ETH -> You receive: ${quote.settleAmount} BTC`);
console.log(`Rate: ${quote.rate}, Valid until: ${quote.expiresAt}`);

// 2. Create the fixed shift using the quote ID
const shift = await client.createFixedShift({
  quoteId: quote.id,
  settleAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  refundAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", // optional
});

console.log(`Shift Created! ID: ${shift.id}`);
console.log(`Deposit Address: ${shift.depositAddress}`);
console.log(`Status: ${shift.status}`);
```

### 2. Creating a Variable Rate Shift (Floating Rate)

Create a variable shift where the final exchange rate is determined at the time your deposit confirms:

```typescript
const varShift = await client.createVariableShift({
  depositCoin: "usdt",
  depositNetwork: "ethereum",
  settleCoin: "sol",
  settleNetwork: "solana",
  settleAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  refundAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
});

console.log(`Variable Shift ID: ${varShift.id}`);
console.log(`Send USDT to: ${varShift.depositAddress}`);
```

### 3. Tracking Shift Status

Check real-time deposit confirmations and settlement transaction hashes:

```typescript
const status = await client.getShift(shift.id);
console.log(`Status: ${status.status}`);

if (status.status === "settled") {
  console.log(`Settlement Tx: ${status.settleTx?.hash}`);
  console.log(`Delivered Amount: ${status.settleAmount}`);
}
```

### 4. Querying Supported Coins and Assets

List all supported cryptocurrencies and networks:

```typescript
const coins = await client.getCoins();
console.log(`Supported coins: ${coins.length}`);

const usdt = coins.find((c) => c.coin === "USDT");
console.log("USDT supported networks:", usdt?.networks);
```

---

## API Reference

### `SideShift` Class

#### Constructor

```typescript
new SideShift(options?: SideShiftOptions)
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `secret` | `string` | `undefined` | Optional SideShift account API secret. |
| `baseUrl` | `string` | `"https://sideshift.ai/api/v2"` | SideShift API v2 base URL. |
| `timeout` | `number` | `30000` | Request timeout in milliseconds. |

#### Methods

- **`getPermissions(): Promise<Permissions>`** — Checks API permissions and platform status.
- **`getCoins(): Promise<Coin[]>`** — Retrieves all supported coins and their networks.
- **`getPair(depCoin, depNet, setCoin, setNet): Promise<PairRate>`** — Returns exchange rate and limits for a pair.
- **`getPairs(pairs: string[]): Promise<PairRate[]>`** — Batch queries rates for multiple pairs.
- **`requestQuote(params: RequestQuoteParams): Promise<Quote>`** — Requests a guaranteed fixed-rate quote.
- **`createFixedShift(params: CreateFixedShiftParams): Promise<Shift>`** — Creates a fixed-rate shift from quote.
- **`createVariableShift(params: CreateVariableShiftParams): Promise<Shift>`** — Creates a variable-rate shift.
- **`getShift(shiftId: string): Promise<Shift>`** — Retrieves status and transactions of a shift.
- **`getShifts(shiftIds: string[]): Promise<Shift[]>`** — Batch status for multiple shifts.
- **`getRecentShifts(limit?: number): Promise<Shift[]>`** — Returns user's recent shifts.
- **`setRefundAddress(shiftId, refundAddress): Promise<unknown>`** — Sets refund address for pending shift.
- **`cancelOrder(orderId): Promise<unknown>`** — Cancels order.
- **`getXaiStats(): Promise<XaiStats>`** — Retrieves staking and token statistics.
- **`getAccount(): Promise<Account>`** — Returns account information.

---

## Error Handling

When the API returns an error, `SideShiftError` is thrown:

```typescript
import { SideShift, SideShiftError } from "sideshift";

try {
  const client = new SideShift();
  await client.getShift("invalid_id");
} catch (error) {
  if (error instanceof SideShiftError) {
    console.error(`SideShift Error: ${error.message} (Status: ${error.statusCode})`);
  }
}
```

Common HTTP status codes:
- `400 Bad Request` — Invalid address format or pair parameters.
- `404 Not Found` — Shift or quote expired/not found.
- `429 Too Many Requests` — Rate limit exceeded.

---

## License

ISC
