# sv-number

[![npm version](https://img.shields.io/npm/v/sv-number-client.svg)](https://www.npmjs.com/package/sv-number-client)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/sv-number.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client for the [SV Number SMS Verification Service](https://sms-verification-number.com/en/api-sms-activate/). Rent virtual phone numbers to receive verification SMS across hundreds of platforms (WhatsApp, Telegram, Apple, Google, and more).

Official API documentation: <https://sms-verification-number.com/en/api-sms-activate/>

---

## Features

- 📱 **Virtual Phone Number Rental** — Rent numbers for any service across global countries.
- ⏳ **Automated Polling** — `waitForCode()` handles polling with customizable timeouts and intervals.
- 🏷️ **Price & Service Catalogs** — Real-time lookup of available numbers and pricing via `getPrices()` and `getServicesAndCost()`.
- 📦 **Dual Module Format** — Full support for ES Modules and CommonJS.
- 🛡️ **Typed & Robust** — Written in TypeScript with full TSDoc and `SvNumberError` exceptions.

---

## Installation

```bash
npm install sv-number-client
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only reads your current account balance and fetches available services. It does not order numbers or spend money.

### TypeScript / ESM

```ts
import { SvNumber } from "sv-number";

const client = new SvNumber({
  apiKey: process.env.SV_NUMBER_API_KEY!,
});

const balance = await client.getBalance();
const services = await client.getServicesAndCost({ country: 0 });

console.log(`Balance: $${balance}`);
console.log(`Services in country 0: ${services.length}`);
```

### CommonJS

```js
const { SvNumber } = require("sv-number");

async function main() {
  const client = new SvNumber({
    apiKey: process.env.SV_NUMBER_API_KEY,
  });

  const balance = await client.getBalance();
  console.log(`Balance: $${balance}`);
}

main().catch(console.error);
```

---

## Usage Guide

### 1. Renting a Number and Receiving an SMS

```ts
import { SvNumber, SvNumberError } from "sv-number";

const client = new SvNumber(process.env.SV_NUMBER_API_KEY!);

// 1. Order a number for Telegram (service 'tg') in country 0
const order = await client.getNumber({ service: "tg", country: 0 });
console.log(`Ordered phone number: ${order.phoneNumber} (ID: ${order.activationId})`);

// 2. Inform the service that you are ready to receive the SMS
await client.ready(order.activationId);

// 3. Poll for the verification code
try {
  const { code } = await client.waitForCode(order.activationId, {
    timeoutMs: 120_000,
    intervalMs: 3_000,
  });
  console.log(`Received SMS code: ${code}`);

  // 4. Mark activation completed
  await client.complete(order.activationId);
} catch (err) {
  if (err instanceof SvNumberError && err.code === "TIMEOUT") {
    console.error("SMS timed out, canceling order...");
    await client.cancel(order.activationId);
  } else {
    throw err;
  }
}
```

### 2. Checking Prices

```ts
// Get price matrix for country 0
const prices = await client.getPrices(0);
console.log("Prices:", prices);
```

---

## Error Handling

When the API returns an error status (such as `BAD_KEY`, `NO_NUMBERS`, `NO_BALANCE`), the client throws an `SvNumberError`:

```ts
import { SvNumber, SvNumberError } from "sv-number";

try {
  const client = new SvNumber("invalid_key");
  await client.getBalance();
} catch (err) {
  if (err instanceof SvNumberError) {
    console.error(`SV Number error: ${err.code}`);
  }
}
```

---

## License

[ISC](LICENSE) © api-kit contributors
