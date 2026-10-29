# @tysikgg/nextcaptcha

[![npm version](https://img.shields.io/npm/v/@tysikgg/nextcaptcha.svg)](https://www.npmjs.com/package/@tysikgg/nextcaptcha)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/@tysikgg/nextcaptcha.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client for the [NextCaptcha API](https://nextcaptcha.com/apidocs). Supports the documented reCAPTCHA v2/v3/Enterprise (including high-score and mobile), Cloudflare Turnstile, and the hCaptcha and FunCaptcha task types submitted by the official NextCaptcha clients.

Official API documentation: <https://nextcaptcha.com/apidocs>

Published as `@tysikgg/nextcaptcha` because the unscoped `nextcaptcha` name is too similar to an existing npm package.

---

## Features

- 🧩 **Documented task types** — Builders for reCAPTCHA v2, v2 Enterprise, v2 high-score Enterprise, v3, v3 high-score, mobile reCAPTCHA, and Turnstile (token and cf_clearance), plus hCaptcha, hCaptcha Enterprise, and FunCaptcha.
- ⏳ **Built-in polling** — `waitForResult()` and `solve()` create or poll until the solution is ready, with intervals, timeouts, and `AbortSignal` cancellation.
- ⚡ **getToken** — One-shot `0|TOKEN` / `1|ERROR_MSG` call on `https://api-v2.nextcaptcha.com/getToken`.
- 💰 **Balance tracking** — `getBalance()` reads the account balance and does not spend credit.
- 🏷️ **Developer id** — Every task request sends `softId` (the string field next to `clientKey` and `task`) so NextCaptcha can attribute developer revenue. Override it, or pass `""` to omit it.
- 📦 **Dual module support** — Works with both ES Modules and CommonJS.
- 🛡️ **Typed errors** — `NextCaptchaError` carries `errorId` and `errorCode` for every documented API error.

---

## Installation

```bash
npm install @tysikgg/nextcaptcha
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance. It does not submit tasks or spend credits.

### TypeScript / ESM

```ts
import { NextCaptcha } from "@tysikgg/nextcaptcha";

const client = new NextCaptcha({
  clientKey: process.env.NEXTCAPTCHA_API_KEY!,
});

const balance = await client.getBalance();
console.log(`Balance: ${balance.balance}`);
```

### CommonJS

```js
const { NextCaptcha } = require("@tysikgg/nextcaptcha");

async function main() {
  const client = new NextCaptcha({
    clientKey: process.env.NEXTCAPTCHA_API_KEY,
  });

  const balance = await client.getBalance();
  console.log(`Balance: ${balance.balance}`);
}

main().catch(console.error);
```

---

## Usage Guide

### 1. High-Level Solve (Recommended)

`client.solve()` creates the task and polls `getTaskResult` until the solution is ready:

```ts
import { NextCaptcha, recaptchaV2Task } from "@tysikgg/nextcaptcha";

const client = new NextCaptcha(process.env.NEXTCAPTCHA_API_KEY!);

const solution = await client.solve<{ gRecaptchaResponse: string }>(
  recaptchaV2Task({
    websiteURL: "https://www.google.com/recaptcha/api2/demo",
    websiteKey: "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
  }),
);

console.log(solution.gRecaptchaResponse);
```

### 2. Cloudflare Turnstile

```ts
import { turnstileProxylessTask } from "@tysikgg/nextcaptcha";

const solution = await client.solve<{ token: string }>(
  turnstileProxylessTask({
    websiteURL: "https://example.com/",
    websiteKey: "0x4XXXXXXXXXXXXXXXXX",
  }),
);

console.log("Turnstile token:", solution.token);
```

### 3. Manual Task Lifecycle

```ts
const taskId = await client.createTask(
  recaptchaV2Task({
    websiteURL: "https://www.google.com/recaptcha/api2/demo",
    websiteKey: "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
  }),
);

const result = await client.getTaskResult(taskId);
if (result.status === "ready") {
  console.log("Solution:", result.solution);
} else {
  console.log("Task is still processing...");
}
```

You can also pass a raw task object. `type` is required.

### 4. getToken

`getToken` submits the task and returns the token in one response. The body is plain text: `0|TOKEN` on success and `1|ERROR_MSG` on failure.

```ts
const token = await client.getToken(
  recaptchaV2Task({
    websiteURL: "https://www.google.com/recaptcha/api2/demo",
    websiteKey: "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
  }),
);
```

### 5. Developer software id

`createTask` and `getToken` send `softId` as a top-level string, next to `clientKey` and `task`. `getBalance` and `getTaskResult` do not send it. The default is `DEFAULT_SOFT_ID`.

```ts
import { NextCaptcha, DEFAULT_SOFT_ID } from "@tysikgg/nextcaptcha";

console.log(DEFAULT_SOFT_ID);
// next_softId_b3bdc0a2f7035cc72e1d62d575469f449d

const client = new NextCaptcha({
  clientKey: process.env.NEXTCAPTCHA_API_KEY!,
  softId: "your_soft_id", // overrides the default for every task request
});

await client.createTask(task, { softId: "" }); // omit softId for this call
```

---

## Task Types

| Captcha | `type` | Builder |
| :--- | :--- | :--- |
| reCAPTCHA v2 proxyless | `RecaptchaV2TaskProxyless` | `recaptchaV2Task` |
| reCAPTCHA v2 Enterprise (proxy) | `RecaptchaV2EnterpriseTask` | `recaptchaV2EnterpriseTask` |
| reCAPTCHA v2 Enterprise proxyless | `RecaptchaV2EnterpriseTaskProxyless` | `recaptchaV2EnterpriseProxylessTask` |
| reCAPTCHA v2 Enterprise high score | `ReCaptchaV2HSEnterpriseTaskProxyLess` | `recaptchaV2HsEnterpriseTask` |
| reCAPTCHA v3 (proxy) | `RecaptchaV3Task` | `recaptchaV3Task` |
| reCAPTCHA v3 proxyless | `RecaptchaV3TaskProxyless` | `recaptchaV3ProxylessTask` |
| reCAPTCHA v3 high score | `ReCaptchaV3HSTaskProxyLess` | `recaptchaV3HsTask` |
| reCAPTCHA mobile (proxy) | `ReCaptchaMobileTask` | `recaptchaMobileTask` |
| reCAPTCHA mobile proxyless | `RecaptchaMobileTaskProxyless` | `recaptchaMobileProxylessTask` |
| Cloudflare Turnstile cf_clearance | `TurnstileTask` | `turnstileTask` |
| Cloudflare Turnstile token | `TurnstileTaskProxyless` | `turnstileProxylessTask` |
| hCaptcha | `HCaptchaTask` / `HCaptchaTaskProxyless` | `hCaptchaTask` |
| hCaptcha Enterprise | `HCaptchaEnterpriseTask` | `hCaptchaEnterpriseTask` |
| FunCaptcha | `FunCaptchaTask` / `FunCaptchaTaskProxyless` | `funCaptchaTask` |

Type strings match the JSON examples on the task pages, including the high-score `ReCaptcha…ProxyLess` and mobile `ReCaptchaMobileTask` casing. Proxy tasks take `proxyType` (`http`, `socks4`, `socks5`), `proxyAddress`, `proxyPort`, and optional `proxyLogin` / `proxyPassword`.

hCaptcha and FunCaptcha are advertised by NextCaptcha and implemented by the official clients. They are not listed in the current apidocs sidebar, which covers reCAPTCHA and Turnstile. Passing `proxyAddress` selects the proxy `type`; otherwise the builder uses the proxyless type.

The current task catalog does not document an image-to-text task. `ERROR_IMAGE_TYPE_NOT_SUPPORTED` is still mapped for responses that reject an image.

Parameter reference: <https://nextcaptcha.com/apidocs>

---

## Error Handling

When the API returns `errorId > 0` or an HTTP error, the client throws `NextCaptchaError`:

```ts
import { NextCaptcha, NextCaptchaError } from "@tysikgg/nextcaptcha";

try {
  const client = new NextCaptcha("invalid_key");
  await client.getBalance();
} catch (err) {
  if (err instanceof NextCaptchaError) {
    console.error(`NextCaptcha error #${err.errorId} [${err.errorCode}]: ${err.message}`);
  }
}
```

Common error codes (full list: <https://nextcaptcha.com/apidocs/error-codes>):

- `ERROR_KEY_DOES_NOT_EXIST` — Account key does not exist or is malformed.
- `ERROR_ZERO_BALANCE` — Account has no funds.
- `ERROR_CAPTCHA_UNSOLVABLE` — The captcha could not be solved.
- `ERROR_TASK_NOT_SUPPORTED` / `ERROR_TASK_ABSENT` — Unknown or missing task.
- `ERROR_BAD_PARAMETERS` — A required field is missing or has the wrong shape.
- `ERROR_BAD_PROXY` — Proxy fields are wrong or the proxy could not be reached.
- `ERROR_RECAPTCHA_INVALID_SITEKEY` — The site key is invalid.
- `TIMEOUT` — `waitForResult()` exceeded the configured timeout.

`NEXTCAPTCHA_ERRORS` maps every documented code to a short description. The API `errorDescription` is used when NextCaptcha sends one. `getBalance` returns `balance` as a string such as `"12.34"`; the client parses it to a number.

---

## Live Tests

Unit tests mock HTTP and always run. The live suite calls the real API and runs only when `NEXTCAPTCHA_API_KEY` is set. It only calls `getBalance` (a funded account check and an invalid key). It does not submit a solve.

```bash
cd nextcaptcha/js
npm install
npm test
NEXTCAPTCHA_API_KEY=your_key npm run test:live
```

Do not commit API keys.

---

## License

[ISC](LICENSE) © api-kit contributors
