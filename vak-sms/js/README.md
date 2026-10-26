# vak-sms

[![npm version](https://img.shields.io/npm/v/vak-sms.svg)](https://www.npmjs.com/package/vak-sms)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/vak-sms.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client library for the [VAK-SMS](https://vak-sms.com/api/) virtual phone numbers and SMS OTP receiving service.

Official API documentation: <https://vak-sms.com/api/vak/>

---

## Features

- 📱 **Virtual Phone Numbers** — Disposable phone numbers across dozens of countries for Telegram, WhatsApp, Discord, Google, and 100+ services.
- 🔁 **Number Prolongation** — Re-rent or prolong previously used numbers for secondary SMS verification.
- ⏳ **Built-in Auto Polling** — `waitForCode()` method automatically polls until the SMS verification code is received or timeout is reached.
- 🛡️ **Fully Typed** — Complete TypeScript definitions with TSDoc comments and dedicated `VakSmsError` exceptions.

---

## Installation

```bash
npm install vak-sms
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance and supported countries. It does not order numbers or consume funds:

```typescript
import { VakSmsClient } from "vak-sms";

const client = new VakSmsClient({
  apiKey: process.env.VAK_SMS_API_KEY!,
});

const balance = await client.getBalance();
console.log(`Current VAK-SMS balance: ${balance.toFixed(2)} RUB`);

const countries = await client.getCountryList();
console.log(`Supported countries count: ${countries.length}`);
```

---

## Usage Guide

### 1. Renting a Number and Receiving an SMS Code

Full activation lifecycle: order a number, wait for the incoming SMS verification code, and finish the activation:

```typescript
import { VakSmsClient, VakSmsError } from "vak-sms";

const client = new VakSmsClient({ apiKey: process.env.VAK_SMS_API_KEY! });

// 1. Order a number for Telegram in United States ('us')
const order = await client.getNumber({
  service: "tg",
  country: "us",
});
console.log(`Rented Number: +${order.tel} (ID: ${order.idNum})`);

// 2. Poll for the incoming verification code using built-in helper
try {
  const code = await client.waitForCode(order.idNum, 120_000, 3_000);
  console.log(`Received verification code: ${code}`);

  // 3. Mark activation successfully finished ('end')
  await client.setStatus(order.idNum, "end");
} catch (err) {
  if (err instanceof VakSmsError && err.code === "TIMEOUT") {
    console.error("SMS did not arrive in time. Marking as bad number ('bad')...");
    await client.setStatus(order.idNum, "bad");
  } else {
    throw err;
  }
}
```

### 2. Requesting Repeat / Second SMS ('send')

If you need a second SMS message on the same rented number:

```typescript
// Notify provider that you want to receive another SMS code
await client.setStatus(order.idNum, "send");

// Wait for the second code
const secondCode = await client.waitForCode(order.idNum);
console.log(`Second code: ${secondCode}`);

// Finish
await client.setStatus(order.idNum, "end");
```

### 3. Number Prolongation (Re-using Previous Number)

Prolong an existing number for a service if it is still available on the SIM farm:

```typescript
const prolonged = await client.prolongNumber("tg", order.idNum);
console.log(`Prolonged number: +${prolonged.tel}`);
```

### 4. Inspecting Stock Availability

Check available numbers for a service:

```typescript
// Count available numbers for Telegram in USA
const count = await client.getCountNumber("tg", "us");
console.log(`Available numbers: ${count}`);

// All service counts in a country
const list = await client.getCountNumbersList("us");
console.log("USA counts by service:", list);
```

---

## API Reference

### `VakSmsClient` Class

#### Constructor

```typescript
new VakSmsClient(options: VakSmsOptions)
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | **Required** | Your VAK-SMS API key. |
| `baseUrl` | `string` | `"https://vak-sms.com"` | Base URL of VAK-SMS API. |
| `timeout` | `number` | `30000` | HTTP request timeout in milliseconds. |

#### Methods

- **`getBalance(): Promise<number>`** — Returns account balance in RUB.
- **`getNumber(options: GetNumberOptions): Promise<VakNumber>`** — Orders a phone number (`tel`, `idNum`).
- **`prolongNumber(service, idNum, operator?): Promise<VakNumber>`** — Re-activates a previous number.
- **`getSmsCode(idNum, all?): Promise<string | string[] | null>`** — Checks for incoming SMS code (`null` if waiting).
- **`waitForCode(idNum, timeoutMs?, intervalMs?): Promise<string>`** — Automatically polls until code arrives.
- **`setStatus(idNum, status: 'send' | 'end' | 'bad'): Promise<string>`** — Sets activation state.
- **`getCountNumber(service, country?, operator?): Promise<number>`** — Available numbers for a service.
- **`getCountryList(): Promise<CountryOperator[]>`** — Lists supported countries and operators.
- **`getCountNumbersList(country?, operator?): Promise<Record<string, number>>`** — Map of service counts.

---

## Error Handling

When the API returns an error response, `VakSmsError` is thrown:

```typescript
import { VakSmsClient, VakSmsError } from "vak-sms";

try {
  const client = new VakSmsClient({ apiKey: "invalid_key" });
  await client.getBalance();
} catch (error) {
  if (error instanceof VakSmsError) {
    console.error(`VAK-SMS Error: ${error.message} (Code: ${error.code})`);
  }
}
```

Common error codes:
- `noNumber` — No numbers currently available for the service/country.
- `noMoney` — Insufficient balance on account.
- `apiKeyNotFound` — Invalid API key.
- `badStatus` — Invalid status passed.
- `TIMEOUT` — Polling timeout exceeded in `waitForCode()`.

---

## License

ISC
