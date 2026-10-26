# grizzly-sms

[![npm version](https://img.shields.io/npm/v/grizzly-sms.svg)](https://www.npmjs.com/package/grizzly-sms)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/node/v/grizzly-sms.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client for the [Grizzly SMS](https://grizzlysms.com) API (compatible with the `sms-activate` protocol) and the Grizzly SMS Partner push API.

Official API documentation:
- Activation protocol: <https://grizzlysms.com/docs>
- Partner push protocol: <https://grizzlysms.com/docs/partner>
- Utility & wallet endpoints: <https://grizzlysms.com/docs/utility>

---

## Features

- 📱 **Virtual Number Rental** — Rent disposable numbers across 100+ countries and hundreds of services (Telegram, WhatsApp, Google, etc.).
- ⏳ **Built-in Polling** — `waitForCode()` handles polling with customizable timeouts, intervals, and `AbortSignal` support.
- 🏷️ **Comprehensive Pricing** — Query prices and availability via V1, V2, and V3 endpoints or use convenient helpers like `findPrices()`.
- 🤝 **Partner Push Support** — Dedicated `GrizzlyPartner` client for forwarding incoming SMS, voice calls, and call recordings.
- 🛡️ **Typed & Robust** — Written in TypeScript with full TSDoc annotations, ES modules and CommonJS dual-support, and dedicated `GrizzlySmsError` exceptions.

---

## Installation

```bash
npm install grizzly-sms
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance and retrieves the supported country directory. It does not spend any money or order numbers.

### TypeScript / ESM

```ts
import { GrizzlySms } from "grizzly-sms";

const sms = new GrizzlySms({
  apiKey: process.env.GRIZZLY_API_KEY!,
});

const balance = await sms.getBalance();
const countries = await sms.getCountries();

console.log(`Balance: ${balance} RUB`);
console.log(`Available countries: ${countries.length}`);
```

### CommonJS

```js
const { GrizzlySms } = require("grizzly-sms");

async function main() {
  const sms = new GrizzlySms({
    apiKey: process.env.GRIZZLY_API_KEY,
  });

  const balance = await sms.getBalance();
  const countries = await sms.getCountries();
  console.log(`Balance: ${balance} RUB`);
}

main().catch(console.error);
```

---

## Usage Guide

### 1. Renting a Number and Receiving an SMS Code

The full activation lifecycle consists of requesting a number, waiting for the verification code, and marking the activation complete:

```ts
import { GrizzlySms, GrizzlySmsError } from "grizzly-sms";

const sms = new GrizzlySms({ apiKey: process.env.GRIZZLY_API_KEY! });

// 1. Rent a number for Telegram (service code 'tg') in USA (country code '187')
const order = await sms.getNumber({
  service: "tg",
  country: "187",
});
console.log(`Rented number: +${order.number} (ID: ${order.activationId})`);

// 2. Notify the provider that you are ready to receive the SMS
await sms.ready(order.activationId);

// 3. Poll for the incoming verification code with a timeout
try {
  const code = await sms.waitForCode(order.activationId, {
    timeoutMs: 120_000,
    intervalMs: 3_000,
  });
  console.log(`Received verification code: ${code}`);

  // 4. Mark activation successfully finished
  await sms.complete(order.activationId);
} catch (error) {
  if (error instanceof GrizzlySmsError && error.code === "TIMEOUT") {
    console.error("SMS code did not arrive within the timeout window.");
    // Cancel activation to release the number and refund balance
    await sms.cancel(order.activationId);
  } else {
    throw error;
  }
}
```

### 2. Searching Prices and Stock

Search real-time price quotes and available number stock across services and countries:

```ts
// Flat search across country/service filters
const quotes = await sms.findPrices({
  service: "tg",
  country: "187",
});

for (const quote of quotes) {
  console.log(`Country ${quote.country}: ${quote.count} numbers available at ${quote.price} RUB`);
}
```

### 3. Partner Push Client (`GrizzlyPartner`)

If you operate your own SMS gateway / SIM farm integrated with Grizzly SMS as a provider, use `GrizzlyPartner` to push incoming messages and calls:

```ts
import { GrizzlyPartner } from "grizzly-sms";

const partner = new GrizzlyPartner({
  apiKey: process.env.GRIZZLY_PARTNER_KEY!,
});

// Push an inbound SMS
await partner.pushSms({
  port: 1,
  phone: "79001234567",
  sender: "Telegram",
  text: "Your code is 12345",
  receivedAt: new Date().toISOString(),
});

// Push a voice verification call
await partner.pushCall({
  port: 1,
  phone: "79001234567",
  callerPhone: "79009876543",
  receivedAt: new Date().toISOString(),
});
```

---

## Error Handling

When the API returns an error status (such as `NO_NUMBERS`, `BAD_KEY`, or `NO_BALANCE`), the client raises a `GrizzlySmsError`:

```ts
import { GrizzlySms, GrizzlySmsError } from "grizzly-sms";

try {
  const sms = new GrizzlySms({ apiKey: "invalid_key" });
  await sms.getBalance();
} catch (error) {
  if (error instanceof GrizzlySmsError) {
    console.error(`Grizzly API error: ${error.code} - ${error.message}`);
  }
}
```

Common error codes:
- `BAD_KEY` — Invalid API key.
- `NO_NUMBERS` — No available numbers for the requested service/country.
- `NO_BALANCE` — Insufficient account balance.
- `WRONG_ACTIVATION_ID` — The activation identifier does not exist or has expired.
- `TIMEOUT` — Polling in `waitForCode()` exceeded the configured timeout duration.

---

## License

[ISC](LICENSE) © api-kit contributors
