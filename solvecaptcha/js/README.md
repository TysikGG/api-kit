# solvecaptcha

[![npm version](https://img.shields.io/npm/v/solvecaptcha.svg)](https://www.npmjs.com/package/solvecaptcha)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/solvecaptcha.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client library for the [SolveCaptcha](https://solvecaptcha.com/captcha-solver-api) recognition API.

Official API documentation: <https://solvecaptcha.com/captcha-solver-api>

---

## Features

- ⚡ **Multi-Captcha Support** — Cloudflare Turnstile, Google reCAPTCHA v2 / v3, Arkose Labs FunCaptcha, GeeTest v3, normal image captchas, and text questions.
- 🔄 **Built-in Auto Polling** — `solveTurnstile()`, `solveRecaptchaV2()`, and other high-level methods automatically poll until the token is ready.
- 🛡️ **Complete TypeScript Types** — Comprehensive type declarations for all options, payloads, and results.
- 🛠️ **Asynchronous Task Queue** — Low-level `createTask()` and `getTaskResult()` methods for custom task processing pipelines.
- ⚖️ **Accuracy Reporting** — Built-in `reportGood()` and `reportBad()` methods for quality feedback and automated refunds.

---

## Installation

```bash
npm install solvecaptcha
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance. It does not create tasks or consume credits.

```typescript
import { SolveCaptchaClient } from "solvecaptcha";

const client = new SolveCaptchaClient({
  apiKey: process.env.SOLVECAPTCHA_API_KEY!,
});

const balance = await client.getBalance();
console.log(`Current SolveCaptcha balance: $${balance.toFixed(4)} USD`);
```

---

## Usage Guide

### 1. Solving Cloudflare Turnstile

Solve Cloudflare Turnstile challenges and retrieve the verification token:

```typescript
import { SolveCaptchaClient } from "solvecaptcha";

const client = new SolveCaptchaClient({ apiKey: process.env.SOLVECAPTCHA_API_KEY! });

const token = await client.solveTurnstile({
  sitekey: "0x4AAAAAAADnPIDROrmt1Wwj",
  pageurl: "https://example.com/protected",
  action: "login", // optional
});

console.log("Turnstile solution token:", token);
```

### 2. Solving Google reCAPTCHA v2 & v3

Solve normal or invisible reCAPTCHA v2, or score-based reCAPTCHA v3:

```typescript
// reCAPTCHA v2
const tokenV2 = await client.solveRecaptchaV2({
  googlekey: "6Le-wvkSAAAAAPBMRTvw0Q4CeHg-tUnSQVwyYcxQ",
  pageurl: "https://example.com/login",
  invisible: 0,
});
console.log("reCAPTCHA v2 token:", tokenV2);

// reCAPTCHA v3
const tokenV3 = await client.solveRecaptchaV3({
  googlekey: "6LdyC2cUAAAAABlzY2Hg-tUnSQVwyYcxQ",
  pageurl: "https://example.com/checkout",
  action: "checkout",
  minScore: 0.7,
});
console.log("reCAPTCHA v3 token:", tokenV3);
```

### 3. Solving Normal Image CAPTCHA

Solve distorted image or text-in-image captchas by passing base64-encoded image data:

```typescript
import * as fs from "node:fs";

const imageBuffer = fs.readFileSync("./captcha.png");
const base64Image = imageBuffer.toString("base64");

const solutionText = await client.solveImage({
  body: base64Image,
  numeric: 1, // numbers only
  minLen: 4,
  maxLen: 6,
});

console.log("Solved captcha text:", solutionText);
```

### 4. Low-Level Asynchronous Task Flow

For background workers and task queues:

```typescript
// 1. Submit task
const taskId = await client.createTask({
  method: "turnstile",
  sitekey: "0x4AAAAAAADnPIDROrmt1Wwj",
  pageurl: "https://example.com",
});
console.log(`Task submitted: ${taskId}`);

// 2. Poll manually or wait
let token: string | null = null;
for (let attempt = 0; attempt < 30; attempt++) {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  token = await client.getTaskResult(taskId);
  if (token) break;
}

if (token) {
  console.log("Solved:", token);
  await client.reportGood(taskId);
} else {
  console.error("Failed to solve in time.");
}
```

---

## API Reference

### `SolveCaptchaClient` Class

#### Constructor

```typescript
new SolveCaptchaClient(options: SolveCaptchaOptions)
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | **Required** | Your SolveCaptcha API key. |
| `baseUrl` | `string` | `"https://solvecaptcha.com"` | Custom API base URL. |
| `timeout` | `number` | `30000` | HTTP request timeout in milliseconds. |
| `defaultPollingTimeoutMs` | `number` | `120000` | Default polling timeout for solve methods. |
| `defaultPollingIntervalMs` | `number` | `5000` | Default interval between status checks. |

#### Methods

- **`getBalance(): Promise<number>`** — Retrieves the current account balance in USD.
- **`solveTurnstile(options, polling?): Promise<string>`** — Solves Cloudflare Turnstile captcha.
- **`solveRecaptchaV2(options, polling?): Promise<string>`** — Solves reCAPTCHA v2 (checkbox or invisible).
- **`solveRecaptchaV3(options, polling?): Promise<string>`** — Solves reCAPTCHA v3 with score.
- **`solveFunCaptcha(options, polling?): Promise<string>`** — Solves Arkose Labs FunCaptcha.
- **`solveGeeTest(options, polling?): Promise<GeeTestResult>`** — Solves GeeTest v3.
- **`solveImage(options, polling?): Promise<string>`** — Solves base64 image captcha.
- **`solveText(text, options?, polling?): Promise<string>`** — Solves text question captcha.
- **`createTask(params): Promise<string>`** — Submits raw task to `/in.php` and returns task ID.
- **`getTaskResult(taskId): Promise<string | null>`** — Checks task status, returns solution or `null` if not ready.
- **`waitForResult(taskId, options?): Promise<string>`** — Polls until task is completed or timeout is reached.
- **`reportGood(taskId): Promise<boolean>`** — Reports correctly solved captcha.
- **`reportBad(taskId): Promise<boolean>`** — Reports incorrectly solved captcha for refund.

---

## Error Handling

When an API error occurs, the client throws a `SolveCaptchaError`:

```typescript
import { SolveCaptchaClient, SolveCaptchaError } from "solvecaptcha";

try {
  const client = new SolveCaptchaClient({ apiKey: "invalid_key" });
  await client.getBalance();
} catch (error) {
  if (error instanceof SolveCaptchaError) {
    console.error(`Error Code: ${error.code}`);
    console.error(`Message: ${error.message}`);
  }
}
```

Common error codes:
- `ERROR_WRONG_USER_KEY` — Provided API key is incorrect.
- `ERROR_KEY_DOES_NOT_EXIST` — Invalid API key parameter.
- `ERROR_ZERO_BALANCE` — Insufficient funds on account.
- `ERROR_NO_SLOT_AVAILABLE` — Solving queue currently congested.
- `CAPCHA_NOT_READY` — Resolution in progress.
- `TIMEOUT` — Maximum polling wait duration exceeded.

---

## License

ISC
