# smsbower-client

[![npm version](https://img.shields.io/npm/v/smsbower-client.svg)](https://www.npmjs.com/package/smsbower-client)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/smsbower-client.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client library for the [SMSBower](https://smsbower.com) virtual phone numbers and SMS OTP receiving API.

Official API documentation: <https://smsbower.com/api.html>

---

## Features

- 📱 **Virtual Phone Numbers** — Disposable phone numbers across 200+ countries for Telegram, WhatsApp, Discord, Google, and more.
- 🔄 **Full Activation Lifecycle** — Reserve numbers, mark ready, poll for incoming SMS OTP codes, complete, or cancel.
- 🏷️ **Comprehensive Pricing** — V1, V2, and V3 pricing queries, service catalogs, top country recommendations, and availability stats.
- 🛡️ **Fully Typed** — Written in TypeScript with complete type definitions, TSDoc comments, and dedicated `SmsBowerError` exceptions.

---

## Installation

```bash
npm install smsbower-client
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance and supported countries. It does not order numbers or consume funds:

```typescript
import { SmsBowerClient } from "smsbower-client";

const client = new SmsBowerClient({
  apiKey: process.env.SMSBOWER_API_KEY!,
});

const balance = await client.getBalance();
console.log(`Current SMSBower balance: ${balance.toFixed(2)} RUB`);

const countries = await client.getCountries();
console.log(`Supported countries count: ${Object.keys(countries).length}`);
```

---

## Usage Guide

### 1. Renting a Number and Receiving an SMS Code

Full activation lifecycle: order a number, notify readiness, poll for the incoming verification code, and complete the order:

```typescript
import { SmsBowerClient, SmsBowerError } from "smsbower-client";

const client = new SmsBowerClient({ apiKey: process.env.SMSBOWER_API_KEY! });

// 1. Order a number for Telegram in USA (country code '187' or country ID)
const order = await client.getNumber({
  service: "tg",
  country: "187",
});
console.log(`Rented Number: +${order.number} (Activation ID: ${order.activationId})`);

// 2. Notify provider that you are ready to receive the SMS (status 1)
await client.setStatus(order.activationId, 1);

// 3. Poll for the incoming verification code
let code: string | null = null;
for (let attempt = 0; attempt < 30; attempt++) {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const res = await client.getStatus(order.activationId);

  if (res.status === "STATUS_OK" && res.code) {
    code = res.code;
    break;
  }
}

if (code) {
  console.log(`Received verification code: ${code}`);
  // 4. Mark activation completed (status 6)
  await client.setStatus(order.activationId, 6);
} else {
  console.log("SMS did not arrive. Cancelling activation to refund balance (status 8)...");
  await client.setStatus(order.activationId, 8);
}
```

### 2. Searching Prices and Stock Availability

Query real-time prices and availability across services and countries:

```typescript
// Query prices across countries for Telegram
const prices = await client.getPrices("tg");
console.log("Prices for Telegram:", prices);

// Inspect top recommended countries for Telegram
const top = await client.getTopCountriesByService("tg");
console.log("Top countries:", top);
```

---

## API Reference

### `SmsBowerClient` Class

#### Constructor

```typescript
new SmsBowerClient(options: SmsBowerOptions)
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | **Required** | Your SMSBower API key. |
| `baseUrl` | `string` | `"https://smsbower.com"` | Base URL of SMSBower API. |
| `timeout` | `number` | `30000` | HTTP request timeout in milliseconds. |

#### Methods

- **`getBalance(): Promise<number>`** — Retrieves account balance in RUB.
- **`getNumber(options: GetNumberOptions): Promise<ActivationNumber>`** — Orders a number (`activationId`, `number`).
- **`getNumberV2(options): Promise<ActivationNumberV2>`** — Orders number using extended V2 format.
- **`getStatus(id: string | number): Promise<ActivationStatus>`** — Checks current activation state and code (`STATUS_WAIT_CODE`, `STATUS_OK`).
- **`setStatus(id, status: number): Promise<string>`** — Sets activation state (1 = ready, 6 = complete, 8 = cancel).
- **`getPrices(service?, country?): Promise<unknown>`** — Returns V1 prices and availability.
- **`getPricesV2(service?, country?): Promise<unknown>`** — Returns V2 prices.
- **`getPricesV3(service?, country?): Promise<unknown>`** — Returns V3 prices.
- **`getServicesList(): Promise<ServiceItem[]>`** — Lists all supported services.
- **`getCountries(): Promise<Record<string, CountryItem>>`** — Lists all supported countries.
- **`getTopCountriesByService(service: string): Promise<Record<string, unknown>>`** — Recommended countries for service.
- **`getActualWalletAddress(coin: string, network: string): Promise<string>`** — Returns deposit wallet address for top-up.

---

## Error Handling

When the API returns an error status code, `SmsBowerError` is thrown:

```typescript
import { SmsBowerClient, SmsBowerError } from "smsbower-client";

try {
  const client = new SmsBowerClient({ apiKey: "invalid_key" });
  await client.getBalance();
} catch (error) {
  if (error instanceof SmsBowerError) {
    console.error(`SMSBower Error: ${error.message} (Code: ${error.code})`);
  }
}
```

Common error codes:
- `NO_NUMBERS` — No available numbers for selected service/country.
- `NO_BALANCE` — Insufficient funds on account.
- `BAD_KEY` — Invalid API key.
- `BAD_ACTION` — Invalid action requested.
- `WRONG_ACTIVATION_ID` — Activation ID does not exist or expired.

---

## License

ISC
