# give-sms

[![npm version](https://img.shields.io/npm/v/give-sms.svg)](https://www.npmjs.com/package/give-sms)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/give-sms.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client library for the [Give-SMS](https://give-sms.com/api.html) virtual phone numbers and SMS OTP verification service.

Official API documentation: <https://give-sms.com/api.html>

---

## Features

- 📱 **Dual Protocol Support** — First-class support for both the native JSON REST API (`/api/v1/`) and the SMS-Activate compatible handler protocol (`/stubs/handler_api.php`).
- 🌍 **Worldwide Numbers** — Rent disposable virtual numbers across multiple countries for Telegram, WhatsApp, Google, and 100+ other services.
- 🔄 **Full Activation Lifecycle** — Order numbers, fetch codes, request repeated SMS, cancel, or report dead numbers.
- 🛡️ **Fully Typed** — Written in TypeScript with full TSDoc annotations, clean interfaces, and custom exceptions.

---

## Installation

```bash
npm install give-sms
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance. It does not order numbers or consume funds.

```typescript
import { GiveSms } from "give-sms";

const client = new GiveSms({
  apiKey: process.env.GIVE_SMS_KEY!,
});

// Check balance via native REST API
const balance = await client.getBalance();
console.log(`Current balance: $${balance.toFixed(2)} USD`);
```

---

## Usage Guide

### 1. Renting a Number and Receiving an SMS Code (REST API)

Full activation workflow using the `/api/v1/` native JSON API:

```typescript
import { GiveSms, GiveSmsError } from "give-sms";

const client = new GiveSms({ apiKey: process.env.GIVE_SMS_KEY! });

// 1. Rent a number for Telegram in USA (country code '0' or country string)
const order = await client.getNumber({
  service: "tg",
  country: 0,
});
console.log(`Received phone number: +${order.number} (Order ID: ${order.id})`);

// 2. Poll for incoming SMS code
let code: string | null = null;
for (let attempt = 0; attempt < 30; attempt++) {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const res = await client.getCode(order.id);

  if (res.status === "SUCCESS" && res.code) {
    code = res.code;
    break;
  }
}

if (code) {
  console.log(`Verification code received: ${code}`);
} else {
  console.log("No SMS received in time. Cancelling order to refund balance...");
  await client.cancelNumber(order.id);
}
```

### 2. Querying Available Number Stock & Prices

Check available number counts before placing an order:

```typescript
// Query available count for Telegram across countries
const counts = await client.getCount({
  service: "tg",
  country: 0,
});
console.log("Available numbers:", counts);
```

### 3. Using the SMS-Activate Protocol (`handler_api.php`)

If your existing codebase uses the standard `handler_api.php` protocol:

```typescript
// 1. Check balance via handler
const handlerBalance = await client.handlerGetBalance();
console.log(`Handler balance: ${handlerBalance}`);

// 2. Order number via handler
const activation = await client.handlerGetNumber({
  service: "tg",
  country: 0,
});
console.log(`Order ID: ${activation.id}, Number: ${activation.number}`);

// 3. Set status to ready (1)
await client.handlerSetStatus(activation.id, 1);

// 4. Poll status
const status = await client.handlerGetStatus(activation.id);
console.log(`Status: ${status.status}, Code: ${status.code}`);

// 5. Complete activation (6) or cancel (8)
await client.handlerSetStatus(activation.id, 6);
```

---

## API Reference

### `GiveSms` Class

#### Constructor

```typescript
new GiveSms(apiKey: string)
// or
new GiveSms(options: GiveSmsOptions)
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | **Required** | Your Give-SMS API key. |
| `baseUrl` | `string` | `"https://give-sms.com"` | Base URL of Give-SMS API. |
| `timeout` | `number` | `30000` | HTTP request timeout in milliseconds. |

#### Native REST API Methods (`/api/v1/`)

- **`getBalance(): Promise<number>`** — Returns current balance in USD.
- **`getCount(options?): Promise<Record<string, unknown>>`** — Retrieves stock of available numbers.
- **`getNumber(options): Promise<ActivationNumber>`** — Orders a phone number for the given service.
- **`getCode(id): Promise<CodeResult>`** — Checks for incoming SMS code.
- **`repeatCode(id): Promise<boolean>`** — Requests an additional SMS on the same number.
- **`cancelNumber(id): Promise<boolean>`** — Cancels activation and returns funds to balance.
- **`banNumber(id): Promise<boolean>`** — Reports number as already used / banned.
- **`reactivate(id): Promise<unknown>`** — Reactivates a previously used number.

#### Handler API Methods (`/stubs/handler_api.php`)

- **`handlerGetBalance(): Promise<number>`** — Returns balance via handler API.
- **`handlerGetNumber(options): Promise<HandlerNumberResult>`** — Orders number (`ACCESS_NUMBER`).
- **`handlerGetStatus(id): Promise<HandlerStatusResult>`** — Retrieves current status and code (`STATUS_WAIT_CODE`, `STATUS_OK`).
- **`handlerSetStatus(id, status): Promise<string>`** — Updates activation state (e.g. 1 = ready, 6 = complete, 8 = cancel).
- **`handlerGetPrices(options?): Promise<Record<string, unknown>>`** — Retrieves pricing catalog.

---

## Error Handling

If an API request fails, the client throws a `GiveSmsError`:

```typescript
import { GiveSms, GiveSmsError } from "give-sms";

try {
  const client = new GiveSms({ apiKey: "invalid_key" });
  await client.getBalance();
} catch (error) {
  if (error instanceof GiveSmsError) {
    console.error(`Give-SMS Error: ${error.message} (Code: ${error.code})`);
  }
}
```

Common error codes:
- `NO_NUMBERS` — No available phone numbers for selected service/country.
- `NO_BALANCE` — Insufficient funds on account.
- `BAD_KEY` — Invalid API key.
- `BAD_ACTION` — Invalid action parameter.
- `WRONG_ACTIVATION_ID` — Activation ID not found or expired.

---

## License

ISC
