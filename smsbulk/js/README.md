# smsbulk

[![npm version](https://img.shields.io/npm/v/smsbulk.svg)](https://www.npmjs.com/package/smsbulk)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/smsbulk.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client library for the [SMSBulk](https://smsbulk.net) virtual phone number and disposable email OTP verification API.

Official API documentation: <https://smsbulk.net/en/docs>

---

## Features

- 📱 **Virtual Phone Numbers** — Rent numbers across hundreds of countries for Telegram, WhatsApp, Google, OpenAI, and more.
- 📧 **Disposable Email Verification** — Purchase temporary email addresses and read incoming email OTP codes with real-time polling.
- 📊 **Catalogs & Real-time Rates** — Query countries, services, and live pricing with availability counts.
- 🛡️ **Fully Typed** — Written in TypeScript with complete type definitions, TSDoc comments, and structured exceptions.
- ⚡ **Zero Setup** — Automatically resolves `SMSBULK_API_KEY` from environment variables if not passed explicitly.

---

## Installation

```bash
npm install smsbulk
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance and retrieves available services without consuming funds:

```typescript
import { SMSBulk } from "smsbulk";

const client = new SMSBulk({
  apiKey: process.env.SMSBULK_API_KEY!,
});

const balance = await client.getBalance();
console.log(`Balance: ${balance.balance} ${balance.currency}`);

const { data: services } = await client.getServices();
console.log(`Available services: ${services.length}`);
```

---

## Usage Guide

### 1. Renting a Phone Number and Receiving SMS

Order a virtual phone number, poll for incoming SMS verification codes, and complete the activation:

```typescript
import { SMSBulk, SMSBulkError } from "smsbulk";

const client = new SMSBulk();

// 1. Create phone activation for Telegram in United States (US)
const activation = await client.createActivation({
  service: "telegram",
  country: "US",
});
console.log(`Assigned Number: ${activation.phone} (ID: ${activation.id})`);

// 2. Poll for incoming SMS code
let code: string | null = null;
for (let attempt = 0; attempt < 30; attempt++) {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const current = await client.getActivation(activation.id);

  if (current.sms && current.sms.length > 0) {
    code = current.sms[0].code;
    break;
  }
}

if (code) {
  console.log(`Verification code received: ${code}`);
  // 3. Mark activation completed
  await client.completeActivation(activation.id);
} else {
  console.log("No SMS arrived. Cancelling activation to refund balance...");
  await client.cancelActivation(activation.id);
}
```

### 2. Disposable Email Verification

Purchase a temporary email address, receive email verification codes, and complete:

```typescript
// 1. Get available domains for target service (e.g. 'google')
const domains = await client.getEmailDomains("google");
console.log("Supported domains:", domains);

// 2. Create email activation
const emailOrder = await client.createEmailActivation({
  site: "google",
  domain: domains[0]?.domain,
});
console.log(`Temporary Email: ${emailOrder.email} (ID: ${emailOrder.id})`);

// 3. Poll for incoming email OTP code
let emailCode: string | null = null;
for (let attempt = 0; attempt < 30; attempt++) {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const current = await client.getEmailActivation(emailOrder.id);

  if (current.code) {
    emailCode = current.code;
    break;
  }
}

if (emailCode) {
  console.log(`Email OTP code: ${emailCode}`);
} else {
  await client.cancelEmailActivation(emailOrder.id);
}
```

### 3. Querying Countries and Pricing

Check available numbers, prices, and countries before purchasing:

```typescript
// Get list of all countries
const countries = await client.getCountries();
console.log(`Found ${countries.data.length} countries`);

// Get countries offering Telegram numbers
const tgCountries = await client.getServiceCountries("telegram");
for (const c of tgCountries.data) {
  console.log(`${c.country_name} (${c.country_code}): price ${c.cost}, available ${c.count}`);
}
```

---

## API Reference

### `SMSBulk` Class

#### Constructor

```typescript
new SMSBulk(options?: SMSBulkOptions)
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | `process.env.SMSBULK_API_KEY` | Your SMSBulk API key. |
| `baseUrl` | `string` | `"https://smsbulk.net"` | Custom API base URL. |
| `timeout` | `number` | `30000` | HTTP request timeout in milliseconds. |

#### Methods

- **`getBalance(): Promise<BalanceResponse>`** — Retrieves wallet balance and currency.
- **`getTransactions(params?): Promise<TransactionsResponse>`** — Lists billing transactions.
- **`getServices(): Promise<ServicesResponse>`** — Lists supported services.
- **`getService(slug: string): Promise<ServiceCatalogItem>`** — Details of a specific service.
- **`getCountries(): Promise<CountriesResponse>`** — Lists all supported countries.
- **`getServiceCountries(slug: string): Promise<ServiceCountriesResponse>`** — Countries and prices for a service.
- **`createActivation(params: CreateActivationParams): Promise<Activation>`** — Reserves a phone number.
- **`getActivations(params?): Promise<ActivationsResponse>`** — Lists active and past activations.
- **`getActivation(id: string): Promise<Activation>`** — Checks status and incoming SMS for an activation.
- **`cancelActivation(id: string): Promise<Activation>`** — Cancels order and refunds balance.
- **`completeActivation(id: string): Promise<Activation>`** — Marks activation as successfully finished.
- **`resendActivation(id: string): Promise<Activation>`** — Requests an additional SMS on the number.
- **`getEmailDomains(site: string): Promise<EmailDomainItem[]>`** — Returns available domains for an email service.
- **`createEmailActivation(params): Promise<EmailActivation>`** — Reserves a temporary email address.
- **`getEmailActivations(params?): Promise<EmailActivationsResponse>`** — Lists active email activations.
- **`getEmailActivation(id: string): Promise<EmailActivation>`** — Checks status and code of email activation.
- **`cancelEmailActivation(id: string): Promise<EmailActivation>`** — Cancels email activation.
- **`reorderEmailActivation(id: string): Promise<EmailActivation>`** — Re-orders verification on the same email.

---

## Error Handling

If an API error occurs, `SMSBulkError` is thrown:

```typescript
import { SMSBulk, SMSBulkError } from "smsbulk";

try {
  const client = new SMSBulk({ apiKey: "invalid_key" });
  await client.getBalance();
} catch (error) {
  if (error instanceof SMSBulkError) {
    console.error(`Status: ${error.status}`);
    console.error(`Message: ${error.message}`);
  }
}
```

Common HTTP error statuses:
- `401 Unauthorized` — Invalid or missing API key.
- `402 Payment Required` — Insufficient wallet balance.
- `404 Not Found` — Activation ID or service slug not found.
- `422 Unprocessable Entity` — No numbers available or invalid parameters.

---

## License

ISC
