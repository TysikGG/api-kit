# capmonster-client

[![npm version](https://img.shields.io/npm/v/capmonster-client.svg)](https://www.npmjs.com/package/capmonster-client)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/capmonster-client.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client for the [CapMonster Cloud API](https://docs.capmonster.cloud). Supports reCAPTCHA v2/v3/Enterprise, Cloudflare Turnstile (including Challenge and Waiting Room), GeeTest, ImageToText, ComplexImage, DataDome, Amazon AWS WAF, TenDI (Tencent), Binance, and the other task types documented by CapMonster Cloud.

Official API documentation: <https://docs.capmonster.cloud>

`capmonster` is already published on npm, so this package is `capmonster-client`.

---

## Features

- 🧩 **Documented task types** — Builders for reCAPTCHA v2/v3/Enterprise, Turnstile, GeeTest, ImageToText, ComplexImage, DataDome, Amazon WAF, TenDI, Binance, FunCaptcha, hCaptcha, Basilisk, Imperva, Prosopo, Yidun, MTCaptcha, Altcha, Friendly Captcha, Temu, Castle, TSPD, Hunt, and Alibaba.
- ⏳ **Built-in polling** — `waitForResult()` and `solve()` handle intervals, timeouts, and `AbortSignal` cancellation. `CAPTCHA_NOT_READY` stays in the processing state.
- 💰 **Balance tracking** — `getBalance()` reads the account balance and does not spend credit.
- 🏷️ **Developer id** — `softId` is omitted until you set it. CapMonster's developer program is still pending, so `DEFAULT_SOFT_ID` is empty.
- 📦 **Dual module support** — Works with both ES Modules and CommonJS.
- 🛡️ **Typed errors** — `CapMonsterError` carries `errorId` and `errorCode` for every documented API error.

---

## Installation

```bash
npm install capmonster-client
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance. It does not submit tasks or spend credits.

### TypeScript / ESM

```ts
import { CapMonster } from "capmonster-client";

const client = new CapMonster({
  clientKey: process.env.CAPMONSTER_API_KEY!,
});

const balance = await client.getBalance();
console.log(`Balance: ${balance.balance}`);
```

### CommonJS

```js
const { CapMonster } = require("capmonster-client");

async function main() {
  const client = new CapMonster({
    clientKey: process.env.CAPMONSTER_API_KEY,
  });

  const balance = await client.getBalance();
  console.log(`Balance: ${balance.balance}`);
}

main().catch(console.error);
```

---

## Usage Guide

### 1. High-Level Solve (Recommended)

`client.solve()` creates the task and polls until the solution is ready:

```ts
import { CapMonster, turnstileTask } from "capmonster-client";

const client = new CapMonster(process.env.CAPMONSTER_API_KEY!);

const solution = await client.solve<{ token: string }>(
  turnstileTask({
    websiteURL: "https://example.com/",
    websiteKey: "0x4AAAAAAA...",
  }),
);

console.log("Turnstile token:", solution.token);
```

### 2. Solving reCAPTCHA v2

```ts
import { recaptchaV2Task } from "capmonster-client";

const solution = await client.solve<{ gRecaptchaResponse: string }>(
  recaptchaV2Task({
    websiteURL: "https://lessons.zennolab.com/captchas/recaptcha/v2_simple.php?level=high",
    websiteKey: "6Lcg7CMUAAAAANphynKgn9YAgA4tQ2KI_iqRyTwd",
  }),
);

console.log(solution.gRecaptchaResponse);
```

### 3. Manual Task Lifecycle

```ts
const taskId = await client.createTask(
  turnstileTask({
    websiteURL: "https://example.com/",
    websiteKey: "0x4AAAAAAA...",
  }),
);

const result = await client.getTaskResult(taskId);
if (result.status === "ready") {
  console.log("Solution:", result.solution);
} else {
  console.log("Task is still processing...");
}
```

You can also pass a raw task object. `type` is required. Custom captchas (DataDome, TenDI, and the others listed below) also require `class`.

### 4. Developer software id

`createTask` sends `softId` only when it is set:

```ts
import { CapMonster, DEFAULT_SOFT_ID } from "capmonster-client";

console.log(DEFAULT_SOFT_ID); // ""

const client = new CapMonster({
  clientKey: process.env.CAPMONSTER_API_KEY!,
  softId: 12345, // fill this in after the developer program approves the integration
});
```

TODO: replace `DEFAULT_SOFT_ID` in `src/client.ts` once CapMonster assigns a numeric id.

---

## Task Types

| Captcha | `type` | `class` | Builder |
| :--- | :--- | :--- | :--- |
| reCAPTCHA v2 | `RecaptchaV2Task` | | `recaptchaV2Task` |
| reCAPTCHA v2 Enterprise | `RecaptchaV2EnterpriseTask` | | `recaptchaV2EnterpriseTask` |
| reCAPTCHA v3 | `RecaptchaV3TaskProxyless` | | `recaptchaV3Task` |
| reCAPTCHA v3 Enterprise | `RecaptchaV3EnterpriseTask` | | `recaptchaV3EnterpriseTask` |
| Cloudflare Turnstile / Challenge / Waiting Room | `TurnstileTask` | | `turnstileTask` |
| GeeTest v3 / v4 | `GeeTestTask` | | `geeTestTask` |
| ImageToText | `ImageToTextTask` | | `imageToTextTask` |
| ComplexImage (click, grid, recognition) | `ComplexImageTask` | `recaptcha`, `hcaptcha`, `funcaptcha`, `recognition` | `complexImageTask` |
| DataDome | `CustomTask` | `DataDome` | `dataDomeTask` |
| TenDI (Tencent) | `CustomTask` | `TenDI` | `tenDITask` |
| Amazon AWS WAF | `AmazonTask` | | `amazonTask` |
| Binance | `BinanceTask` | | `binanceTask` |
| FunCaptcha | `FunCaptchaTask` | | `funCaptchaTask` |
| hCaptcha | `HCaptchaTask` | | `hCaptchaTask` |
| Basilisk | `CustomTask` | `Basilisk` | `basiliskTask` |
| Imperva (Incapsula) | `CustomTask` | `Imperva` | `impervaTask` |
| Prosopo | `ProsopoTask` | | `prosopoTask` |
| Yidun | `YidunTask` | | `yidunTask` |
| MTCaptcha | `MTCaptchaTask` | | `mtCaptchaTask` |
| Altcha | `CustomTask` | `altcha` | `altchaTask` |
| Friendly Captcha | `CustomTask` | `friendly` | `friendlyCaptchaTask` |
| Temu | `CustomTask` | `Temu` | `temuTask` |
| Castle | `CustomTask` | `Castle` | `castleTask` |
| TSPD | `CustomTask` | `tspd` | `tspdTask` |
| Hunt | `CustomTask` | `HUNT` | `huntTask` |
| Alibaba | `CustomTask` | `alibaba` | `alibabaTask` |

Legacy aliases `NoCaptchaTask`, `NoCaptchaTaskProxyless`, `RecaptchaV2TaskProxyless`, and `HCaptchaTaskProxyless` are accepted on the `type` field. Current docs use `RecaptchaV2Task` with proxy fields omitted when CapMonster's own proxies are enough.

TenDI is the Tencent captcha documented by CapMonster. It is not a Tenable product.

Parameter reference: <https://docs.capmonster.cloud/docs/captchas/>

---

## Error Handling

When the API returns `errorId > 0` or an HTTP error, the client throws `CapMonsterError`:

```ts
import { CapMonster, CapMonsterError } from "capmonster-client";

try {
  const client = new CapMonster("invalid_key");
  await client.getBalance();
} catch (err) {
  if (err instanceof CapMonsterError) {
    console.error(`CapMonster error #${err.errorId} [${err.errorCode}]: ${err.message}`);
  }
}
```

Common error codes (full list: <https://docs.capmonster.cloud/docs/api/api-errors/>):

- `ERROR_KEY_DOES_NOT_EXIST` — Account key does not exist or is malformed.
- `ERROR_ZERO_BALANCE` — Account has no funds. Returned by `createTask`, not by `getBalance`.
- `ERROR_CAPTCHA_UNSOLVABLE` — The captcha could not be solved. Unsolved tasks are not charged.
- `CAPTCHA_NOT_READY` — Still solving. `getTaskResult` maps this to `status: "processing"`.
- `ERROR_TASK_NOT_SUPPORTED` / `ERROR_NO_SUCH_METHOD` — Unknown `type`.
- `ERROR_INVALID_TASK` / `ERROR_TASK_ABSENT` — Task payload is missing or invalid.
- `ERROR_TOO_MUCH_REQUESTS` — Poll `getTaskResult` no more than once every 2 seconds. The default interval is 3 seconds.
- `TIMEOUT` — `waitForResult()` exceeded the configured timeout.

`CAPMONSTER_ERRORS` maps every documented code to a short description. The API `errorDescription` is used when CapMonster sends one.

---

## Live Tests

Unit tests mock HTTP and always run. The live suite calls the real API and runs only when `CAPMONSTER_API_KEY` is set. It checks balance, an invalid key, and `ERROR_ZERO_BALANCE` on `createTask`.

`createTask` is sent only when the account balance is exactly `0`. A funded key skips that assertion so the suite does not spend credit.

```bash
cd capmonster/js
npm install
npm test
CAPMONSTER_API_KEY=your_key npm run test:live
```

Do not commit API keys.

---

## License

[ISC](LICENSE) © api-kit contributors
