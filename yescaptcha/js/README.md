# yescaptcha-client

[![npm version](https://img.shields.io/npm/v/yescaptcha-client.svg)](https://www.npmjs.com/package/yescaptcha-client)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/yescaptcha-client.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client for the [YesCaptcha Recognition API](https://docs.yescaptcha.com). Supports reCAPTCHA (v2/v3/Enterprise), hCaptcha, Cloudflare Turnstile, FunCaptcha, AWS WAF, and image captchas.

Official API documentation: <https://docs.yescaptcha.com>

---

## Features

- 🧩 **Multi-Captcha Support** — reCAPTCHA v2/v3/Enterprise, hCaptcha, Cloudflare Turnstile, Arkose FunCaptcha, AWS WAF, and ImageToText.
- ⏳ **Built-in Polling** — `waitForResult()` and `solve()` handle polling intervals, timeouts, and `AbortSignal` cancellation automatically.
- 💰 **Balance Tracking** — Check account balance and point statistics via `getBalance()`.
- 📦 **Dual Module Support** — Works out-of-the-box with both ES Modules and CommonJS.
- 🛡️ **Typed & Robust** — Complete TypeScript definitions and structured `YesCaptchaError` exceptions with error codes.

---

## Installation

```bash
npm install yescaptcha-client
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance. It does not submit tasks or spend credits.

### TypeScript / ESM

```ts
import { YesCaptcha } from "yescaptcha-client";

const client = new YesCaptcha({
  clientKey: process.env.YESCAPTCHA_CLIENT_KEY!,
});

const balance = await client.getBalance();
console.log(`Balance: ${balance.balance} points`);
```

### CommonJS

```js
const { YesCaptcha } = require("yescaptcha-client");

async function main() {
  const client = new YesCaptcha({
    clientKey: process.env.YESCAPTCHA_CLIENT_KEY,
  });

  const balance = await client.getBalance();
  console.log(`Balance: ${balance.balance} points`);
}

main().catch(console.error);
```

---

## Usage Guide

### 1. High-Level Solve (Recommended)

`client.solve()` creates the task and automatically polls until the solution is ready:

```ts
import { YesCaptcha } from "yescaptcha-client";

const client = new YesCaptcha(process.env.YESCAPTCHA_CLIENT_KEY!);

// Solve Cloudflare Turnstile
const solution = await client.solve<{ token: string }>({
  type: "TurnstileTaskProxyless",
  websiteURL: "https://example.com/",
  websiteKey: "0x4AAAAAAAx...",
});

console.log("Turnstile Token:", solution.token);
```

### 2. Solving reCAPTCHA v2

```ts
const solution = await client.solve<{ gRecaptchaResponse: string }>({
  type: "NoCaptchaTaskProxyless",
  websiteURL: "https://google.com/recaptcha/api2/demo",
  websiteKey: "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
});

console.log("gRecaptchaResponse:", solution.gRecaptchaResponse);
```

### 3. Manual Task Lifecycle

If you prefer to decouple task submission from polling:

```ts
// 1. Submit task
const taskId = await client.createTask({
  type: "TurnstileTaskProxyless",
  websiteURL: "https://example.com/",
  websiteKey: "0x4AAAAAAAx...",
});
console.log("Task ID:", taskId);

// 2. Poll for result manually
const result = await client.getTaskResult(taskId);
if (result.status === "ready") {
  console.log("Solution:", result.solution);
} else {
  console.log("Task is still processing...");
}
```

---

## Error Handling

When the API returns an error (`errorId > 0` or HTTP status >= 400), the client throws a `YesCaptchaError`:

```ts
import { YesCaptcha, YesCaptchaError } from "yescaptcha-client";

try {
  const client = new YesCaptcha("invalid_key");
  await client.getBalance();
} catch (err) {
  if (err instanceof YesCaptchaError) {
    console.error(`YesCaptcha error #${err.errorId} [${err.errorCode}]: ${err.message}`);
  }
}
```

Common error codes:
- `ERROR_KEY_DOES_NOT_EXIST` — Account key does not exist.
- `ERROR_ZERO_BALANCE` — Account has 0 points remaining.
- `ERROR_NO_SLOT_AVAILABLE` — Concurrency limit exceeded.
- `TIMEOUT` — Polling in `waitForResult()` exceeded the configured timeout.

---

## License

[ISC](LICENSE) © api-kit contributors
