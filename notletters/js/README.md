# notletters

[![npm version](https://img.shields.io/npm/v/notletters.svg)](https://www.npmjs.com/package/notletters)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/notletters.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client for the [NotLetters API](https://notletters.com). Manage disposable email mailboxes, retrieve incoming messages, search message contents, change mailbox passwords, and purchase mail accounts in bulk.

Official API documentation: <https://notletters.com/user/documentation>

---

## Features

- ✉️ **Message Retrieval & Search** — Fetch incoming emails with full HTML and plain text bodies, search queries, and star filters.
- 📬 **Bulk Mailbox Purchase** — Order mailboxes programmatically across limit, unlimited, RU zone, and personal categories.
- 🔑 **Password Management** — Change passwords for managed mailboxes.
- 💰 **Account Information** — Check your account balance and rate limits.
- 📦 **Dual Module Format** — Full support for ES Modules and CommonJS.
- 🛡️ **Typed & Robust** — Written in TypeScript with full TSDoc annotations and dedicated error classes.

---

## Installation

```bash
npm install notletters
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only reads your current account balance and profile. It does not purchase mailboxes or spend money.

### TypeScript / ESM

```ts
import { NotLetters } from "notletters";

const client = new NotLetters({
  apiToken: process.env.NOTLETTERS_API_TOKEN!,
});

const profile = await client.getMe();
console.log(`Authenticated as: ${profile.username}`);
console.log(`Balance: ${profile.balance} RUB`);
console.log(`Rate limit: ${profile.rate_limit} req/min`);
```

### CommonJS

```js
const { NotLetters } = require("notletters");

async function main() {
  const client = new NotLetters({
    apiToken: process.env.NOTLETTERS_API_TOKEN,
  });

  const balance = await client.getBalance();
  console.log(`Balance: ${balance} RUB`);
}

main().catch(console.error);
```

---

## Usage Guide

### 1. Retrieving Emails from a Mailbox

Retrieve incoming messages for a mailbox with optional text search and star filtering:

```ts
import { NotLetters } from "notletters";

const client = new NotLetters({ apiToken: process.env.NOTLETTERS_API_TOKEN });

const letters = await client.getLetters({
  email: "test@notletters.com",
  password: "mailbox-password",
  filters: {
    search: "Confirmation Code",
    star: false,
  },
});

for (const letter of letters) {
  console.log(`ID: ${letter.id}`);
  console.log(`From: ${letter.sender_name} <${letter.sender}>`);
  console.log(`Subject: ${letter.subject}`);
  console.log(`Date: ${new Date(letter.date * 1000).toISOString()}`);
  console.log(`Text body: ${letter.letter.text}`);
}
```

### 2. Changing Mailbox Password

Update the password of an existing mailbox:

```ts
import { NotLetters } from "notletters";

const client = new NotLetters({ apiToken: process.env.NOTLETTERS_API_TOKEN });

const res = await client.changePassword({
  email: "test@notletters.com",
  oldPassword: "old-password",
  newPassword: "new-password",
});

console.log(res.data); // "password successful changed"
```

### 3. Purchasing Mailboxes

> [!WARNING]
> Purchasing mailboxes charges your NotLetters account balance.

```ts
import { NotLetters, EmailType } from "notletters";

const client = new NotLetters({ apiToken: process.env.NOTLETTERS_API_TOKEN });

// EmailType:
// - EmailType.LIMIT (0) - Limited emails
// - EmailType.UNLIMITED (1) - Unlimited emails
// - EmailType.RU_ZONE (2) - Russian zone emails
// - EmailType.PERSONAL (3) - Personal emails

const accounts = await client.buyEmails({
  count: 2,
  typeEmail: EmailType.LIMIT,
});

for (const account of accounts) {
  console.log(`Email: ${account.email}`);
  console.log(`Password: ${account.password}`);
  console.log(`Raw: ${account.raw}`);
}
```

### 4. Parsing Credentials

Parse any raw `"email:password"` string into a structured object:

```ts
import { parseMail } from "notletters";

const parsed = parseMail("user@notletters.com:pass123");
console.log(parsed.email);    // "user@notletters.com"
console.log(parsed.password); // "pass123"
```

---

## Error Handling

All client errors inherit from `NotLettersError`, with specific subclasses for common HTTP status codes:

```ts
import {
  NotLetters,
  NotLettersError,
  NotLettersBadRequestError,
  NotLettersUnauthorizedError,
  NotLettersPaymentRequiredError,
  NotLettersNotFoundError,
} from "notletters";

const client = new NotLetters({ apiToken: "invalid-token" });

try {
  await client.getMe();
} catch (err) {
  if (err instanceof NotLettersUnauthorizedError) {
    console.error("Invalid or expired API token");
  } else if (err instanceof NotLettersPaymentRequiredError) {
    console.error("Insufficient balance for operation");
  } else if (err instanceof NotLettersError) {
    console.error(`NotLetters API error [${err.statusCode}]: ${err.message}`);
  }
}
```

---

## Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiToken` | `string` | `process.env.NOTLETTERS_API_TOKEN` | Bearer token for API authentication |
| `baseURL` | `string` | `https://api.notletters.com/v1` | Custom base URL for the API |
| `timeoutMs` | `number` | `30000` | Request timeout in milliseconds |
| `userAgent` | `string` | `notletters/0.1.0` | Custom User-Agent header |

---

## License

[ISC](LICENSE)
