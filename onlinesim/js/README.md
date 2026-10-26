# onlinesim

[![npm version](https://img.shields.io/npm/v/onlinesim.svg)](https://www.npmjs.com/package/onlinesim)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/onlinesim.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client library for the [OnlineSIM](https://onlinesim.io/docs/api/en) virtual number and SMS activation API.

Official API documentation: <https://onlinesim.io/docs/api/en>

---

## Features

- 📱 **One-Time SMS Verification** — Rent disposable virtual phone numbers across 90+ countries for Telegram, WhatsApp, Google, and hundreds of other services.
- ⏳ **Long-Term Rentals** — Full support for long-term number rental (`getRentNum`, `getRentState`, `closeRentNum`).
- 📊 **Tariffs & Availability** — Inspect real-time tariffs, service lists, and supported countries.
- 🛡️ **Fully Typed** — Written in TypeScript with complete type definitions and dedicated `OnlineSimError` exceptions.

---

## Installation

```bash
npm install onlinesim
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance. It does not order numbers or consume funds:

```typescript
import { OnlineSim } from "onlinesim";

const client = new OnlineSim({
  apiKey: process.env.ONLINESIM_API_KEY!,
});

const balance = await client.getBalance();
console.log(`Current OnlineSIM balance: $${balance.toFixed(2)} USD`);
```

---

## Usage Guide

### 1. Renting a Number and Receiving an SMS Code

Full activation lifecycle: order a number, poll for the verification code, and mark the order complete:

```typescript
import { OnlineSim, OnlineSimError } from "onlinesim";

const client = new OnlineSim({ apiKey: process.env.ONLINESIM_API_KEY! });

// 1. Order a number for Telegram in United States (country 1)
const order = await client.getNum({
  service: "telegram",
  country: 1,
});
console.log(`Order created with TZID: ${order.tzid}`);

// 2. Poll for incoming SMS code
let code: string | null = null;
let phoneNumber: string | null = null;

for (let attempt = 0; attempt < 30; attempt++) {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const states = await client.getState({ tzid: order.tzid });
  const current = states[0];

  if (current) {
    phoneNumber = current.number;
    console.log(`Assigned Number: ${current.number}, Status: ${current.response}`);

    if (current.msg) {
      code = current.msg;
      break;
    }
  }
}

if (code) {
  console.log(`Received SMS code: ${code}`);
  // 3. Mark operation complete
  await client.setOperationOk(order.tzid);
} else {
  console.log("No SMS received. Requesting refund / revision...");
  await client.setOperationRevise(order.tzid);
}
```

### 2. Inspecting Tariffs and Available Countries

Check available numbers and prices before ordering:

```typescript
// Get list of supported countries
const countries = await client.getCountries();
console.log("Countries:", countries);

// Inspect tariffs for a specific country
const tariffs = await client.getTariffs(1); // 1 = USA
console.log("USA Tariffs:", tariffs);
```

### 3. Long-Term Number Rental

Rent a dedicated number for multiple days:

```typescript
// Get rental tariffs
const rentTariffs = await client.getRentTariffs();
console.log("Rent Tariffs:", rentTariffs);

// Rent a number for 1 day
const rentOrder = await client.getRentNum({
  country: 1,
  days: 1,
});
console.log("Rent Order:", rentOrder);
```

---

## API Reference

### `OnlineSim` Class

#### Constructor

```typescript
new OnlineSim(apiKey: string)
// or
new OnlineSim(options: OnlineSimOptions)
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | **Required** | Your OnlineSIM API key. |
| `baseUrl` | `string` | `"https://onlinesim.io"` | Custom API base URL. |
| `timeout` | `number` | `30000` | HTTP request timeout in milliseconds. |

#### Methods

- **`getBalance(): Promise<number>`** — Retrieves current balance in USD.
- **`getCountries(): Promise<unknown>`** — Returns list of supported countries.
- **`getTariffs(country?): Promise<unknown>`** — Returns tariffs for services.
- **`getServiceList(country?): Promise<unknown>`** — Returns list of services and available numbers.
- **`getNum(options: GetNumOptions): Promise<OrderResult>`** — Orders a virtual number for a service (`tzid`).
- **`getState(options?): Promise<ActivationState[]>`** — Retrieves status and incoming messages for an order.
- **`setOperationOk(tzid): Promise<boolean>`** — Confirms code received and completes activation.
- **`setOperationRevise(tzid): Promise<boolean>`** — Cancels activation and requests refund.
- **`getRentTariffs(): Promise<unknown>`** — Retrieves tariffs for long-term rentals.
- **`getRentNum(options): Promise<unknown>`** — Orders a long-term rental number.
- **`getRentState(tzid?): Promise<unknown>`** — Checks status of rented numbers.
- **`closeRentNum(tzid): Promise<boolean>`** — Closes/cancels long-term rental.

---

## Error Handling

When the API returns an error response, `OnlineSimError` is thrown:

```typescript
import { OnlineSim, OnlineSimError } from "onlinesim";

try {
  const client = new OnlineSim({ apiKey: "invalid_key" });
  await client.getBalance();
} catch (error) {
  if (error instanceof OnlineSimError) {
    console.error(`OnlineSIM Error: ${error.message} (Code: ${error.code})`);
  }
}
```

Common error codes:
- `ACCOUNT_BLOCKED` — Account has been blocked.
- `NO_NUMBER` — No numbers currently available for this service.
- `NO_BALANCE` — Insufficient funds.
- `WRONG_SERVICE` — Unsupported or incorrect service identifier.
- `EXCEED_CONCURRENT_OPERATIONS` — Maximum simultaneous orders limit reached.

---

## License

ISC
