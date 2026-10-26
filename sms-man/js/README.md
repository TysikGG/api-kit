# sms-man

[![npm version](https://img.shields.io/npm/v/sms-man.svg)](https://www.npmjs.com/package/sms-man)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/sms-man.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client library for the [SMS-MAN](https://sms-man.com/site/api) virtual phone numbers and SMS verification API.

Official API documentation: <https://sms-man.com/site/api>

---

## Features

- 📱 **Dual Protocol Support** — Use either the native SMS-MAN Control API (`/control/`) or the SMS-Activate compatible handler protocol (`/stubs/handler_api.php`).
- 🌍 **Global Coverage** — Rent disposable virtual phone numbers across 300+ countries and hundreds of applications (Telegram, WhatsApp, Google, etc.).
- 🔄 **Full Activation Lifecycle** — Rent numbers, query status, fetch SMS verification codes, mark ready, or reject/cancel.
- 🛡️ **Fully Typed** — Written in TypeScript with complete type definitions, TSDoc comments, and dedicated `SmsManError` exceptions.

---

## Installation

```bash
npm install sms-man
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance. It does not order numbers or consume funds:

```typescript
import { SmsMan } from "sms-man";

const client = new SmsMan({
  apiKey: process.env.SMSMAN_API_KEY!,
});

const balance = await client.getBalance();
console.log(`Current SMS-MAN balance: $${balance.toFixed(2)} USD`);
```

---

## Usage Guide

### 1. Renting a Number and Receiving an SMS Code (Control API)

Full activation lifecycle using the native Control API:

```typescript
import { SmsMan, SmsManError } from "sms-man";

const client = new SmsMan({ apiKey: process.env.SMSMAN_API_KEY! });

// 1. Order a number for Telegram (app ID 1) in USA (country ID 1)
const order = await client.getNumber(1, 1);
console.log(`Received number: +${order.number} (Request ID: ${order.requestId})`);

// 2. Poll for the incoming SMS verification code
let code: string | null = null;
for (let attempt = 0; attempt < 30; attempt++) {
  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    const res = await client.getSms(order.requestId);
    if (res.smsCode) {
      code = res.smsCode;
      break;
    }
  } catch (err) {
    if (err instanceof SmsManError && err.code === "wait_code") {
      // Still waiting for SMS
      continue;
    }
    throw err;
  }
}

if (code) {
  console.log(`Verification code received: ${code}`);
} else {
  console.log("SMS did not arrive. Rejecting number to refund balance...");
  await client.setStatus(order.requestId, "reject");
}
```

### 2. Inspecting Available Limits, Prices & Applications

Check available number limits and application IDs:

```typescript
// Get list of supported countries
const countries = await client.getCountries();
console.log("Countries:", countries);

// Get list of supported applications
const apps = await client.getApplications();
console.log("Applications:", apps);

// Check limits for Telegram in USA
const limits = await client.getLimits(1, 1);
console.log("Available limits:", limits);
```

### 3. Using the SMS-Activate Protocol (`handler_api.php`)

If your existing workflow uses standard `handler_api.php`:

```typescript
// 1. Check balance via handler
const handlerBalance = await client.handlerGetBalance();
console.log(`Handler balance: ${handlerBalance}`);

// 2. Order number via handler
const activation = await client.handlerGetNumber({
  service: "tg",
  country: 1,
});
console.log(`Order ID: ${activation.id}, Number: ${activation.number}`);

// 3. Mark ready (status 1)
await client.handlerSetStatus(activation.id, 1);

// 4. Check status
const status = await client.handlerGetStatus(activation.id);
console.log(`Status: ${status.status}, Code: ${status.code}`);

// 5. Complete activation (status 6) or cancel (status 8)
await client.handlerSetStatus(activation.id, 6);
```

---

## API Reference

### `SmsMan` Class

#### Constructor

```typescript
new SmsMan(apiKey: string)
// or
new SmsMan(options: SmsManOptions)
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | **Required** | Your SMS-MAN API key. |
| `baseUrl` | `string` | `"https://api.sms-man.com"` | Base URL of SMS-MAN API. |
| `timeout` | `number` | `30000` | HTTP request timeout in milliseconds. |

#### Control API Methods (`/control/`)

- **`getBalance(): Promise<number>`** — Returns current balance in USD.
- **`getLimits(countryId?, applicationId?): Promise<unknown>`** — Checks number availability and limits.
- **`getPrices(countryId?): Promise<unknown>`** — Returns pricing for services and countries.
- **`getCountries(): Promise<unknown>`** — Lists all supported countries with IDs.
- **`getApplications(): Promise<unknown>`** — Lists all supported applications with IDs.
- **`getNumber(countryId, applicationId): Promise<PhoneNumberOrder>`** — Orders a number for the application.
- **`getSms(requestId): Promise<SmsCodeResult>`** — Checks for received SMS verification code.
- **`setStatus(requestId, status): Promise<boolean>`** — Sets status (`'ready'` or `'reject'`).

#### Handler API Methods (`/stubs/handler_api.php`)

- **`handlerGetBalance(): Promise<number>`** — Returns balance via handler API.
- **`handlerGetNumber(options): Promise<HandlerNumberResult>`** — Orders number (`ACCESS_NUMBER`).
- **`handlerGetStatus(id): Promise<HandlerStatusResult>`** — Retrieves status and code (`STATUS_WAIT_CODE`, `STATUS_OK`).
- **`handlerSetStatus(id, status): Promise<string>`** — Updates activation state (1 = ready, 6 = complete, 8 = cancel).
- **`handlerGetPrices(country?): Promise<unknown>`** — Retrieves prices via handler API.

---

## Error Handling

When an API error occurs, `SmsManError` is thrown:

```typescript
import { SmsMan, SmsManError } from "sms-man";

try {
  const client = new SmsMan({ apiKey: "invalid_key" });
  await client.getBalance();
} catch (error) {
  if (error instanceof SmsManError) {
    console.error(`SMS-MAN Error: ${error.message} (Code: ${error.code})`);
  }
}
```

Common error codes:
- `no_numbers` — No available phone numbers for selected application/country.
- `balance_empty` — Insufficient funds on account.
- `wrong_token` — Invalid API key.
- `wait_code` — SMS code has not arrived yet.
- `WRONG_ACTIVATION_ID` — Order ID does not exist or expired.

---

## License

ISC
