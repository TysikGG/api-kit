# capmonster-client

[![npm version](https://img.shields.io/npm/v/capmonster-client.svg)](https://www.npmjs.com/package/capmonster-client)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/capmonster-client.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org/)

Typed TypeScript client for the [CapMonster Cloud](https://capmonster.cloud/) recognition API. It covers every documented JSON method and captcha task, with polling, retries, proxies, callbacks, and one error class per API code.

Official docs: <https://docs.capmonster.cloud>

`capmonster` is already published on npm, so this package is `capmonster-client`.

## Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick start](#quick-start)
- [API methods](#api-methods)
- [Task types](#task-types)
- [Error handling](#error-handling)
- [Advanced usage](#advanced-usage)
- [TypeScript](#typescript)
- [Comparison](#comparison)
- [FAQ](#faq)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Features

- Every documented task: reCAPTCHA v2/v3/Enterprise, Turnstile, Cloudflare Challenge (token and `cf_clearance`), Waiting Room, GeeTest v3/v4, ImageToText, ComplexImage, DataDome, Amazon WAF, Binance, FunCaptcha, hCaptcha, Basilisk, Imperva, Prosopo, Yidun, MTCaptcha, Altcha, Friendly Captcha, Temu, Castle, TSPD, Hunt, TenDI, and Alibaba.
- `getBalance`, `getUserAgent`, `createTask`, `getTaskResult`, `waitForResult`, `solve`, `solveDetailed`.
- Bad-token reports: `reportIncorrectImageCaptcha`, `reportIncorrectTokenCaptcha`, and `reportIncorrectRecaptcha`.
- Polling with timeout, interval, initial delay, max attempts, `AbortSignal`, and an `onPoll` callback. `CAPTCHA_NOT_READY` stays in the processing state.
- Optional retries for transient network failures and retryable API codes.
- Customer proxies (`http`, `https`, `socks4`, `socks5`) and CapMonster's built-in proxies when proxy fields are omitted.
- `callbackUrl`, `nocache`, recognition threshold, and module name, including the documented client-key suffixes.
- `softId` is omitted until you set it. `DEFAULT_SOFT_ID` stays empty while the developer program is pending.
- A subclass of `CapMonsterError` for every documented error code.

## Installation

```bash
npm install capmonster-client
```

Node.js 18 or newer.

## Configuration

```ts
import { CapMonster } from "capmonster-client";

const client = new CapMonster({
  clientKey: process.env.CAPMONSTER_API_KEY!,
  baseUrl: "https://api.capmonster.cloud",
  timeoutMs: 30_000,
  softId: "",
  retries: 0,
  retryDelayMs: 1_000,
  userAgentUrl: "https://capmonster.cloud/api/useragent/actual",
  nocache: false,
  recognizingThreshold: undefined,
  moduleName: undefined,
});
```

A string is accepted too: `new CapMonster(process.env.CAPMONSTER_API_KEY!)`.

| Option | Default | Purpose |
| :--- | :--- | :--- |
| `clientKey` | required | Dashboard API key. Sent as `clientKey`. |
| `baseUrl` | `https://api.capmonster.cloud` | JSON API origin. Trailing slashes are removed. |
| `timeoutMs` | `30000` | Per-request Axios timeout. |
| `softId` | `""` | Developer software id. Omitted when empty or `0`. |
| `retries` | `0` | Extra attempts for transient failures. |
| `retryDelayMs` | `1000` | Base retry delay. Attempt n waits `n * retryDelayMs`. |
| `userAgentUrl` | `https://capmonster.cloud/api/useragent/actual` | `GET` endpoint used by `getUserAgent()`. |
| `nocache` | `false` | Appends `__nocache` to the client key. |
| `recognizingThreshold` | unset | Appends `__recognizingthreshold_{n}` to the client key. |
| `moduleName` | unset | Appends `__moduleName` to the client key. |
| `axios` | Axios instance | Inject a custom client in tests or behind a corporate proxy. |

Pass `nocache`, `recognizingThreshold`, and `capMonsterModule` on the task when only that task should change. Client-key suffixes apply to every request.

## Quick start

Balance and the current User-Agent do not create a captcha task.

```ts
import { CapMonster } from "capmonster-client";

const client = new CapMonster(process.env.CAPMONSTER_API_KEY!);
console.log(await client.getBalance());
console.log(await client.getUserAgent());
```

```js
const { CapMonster } = require("capmonster-client");

async function main() {
  const client = new CapMonster(process.env.CAPMONSTER_API_KEY);
  console.log(await client.getBalance());
}

main().catch(console.error);
```

## API methods

### getBalance

`POST /getBalance`. Returns `{ balance }`. A zero balance is not an error here. `createTask` returns `ERROR_ZERO_BALANCE` when the account cannot pay for a task.

```ts
const { balance } = await client.getBalance();
```

### getUserAgent

`GET https://capmonster.cloud/api/useragent/actual`. Returns the Windows User-Agent CapMonster currently supports. Send that same string on the task and on the target site.

```ts
const userAgent = await client.getUserAgent();
```

### createTask

`POST /createTask`. Returns a numeric `taskId`. `softId` is included only when it is set. `callbackUrl` receives the same JSON body as `getTaskResult`.

```ts
import { turnstileTask } from "capmonster-client";

const taskId = await client.createTask(
  turnstileTask({
    websiteURL: "https://example.com/",
    websiteKey: "0x4AAAAAAA...",
  }),
  { callbackUrl: "https://example.com/capmonster-callback" },
);
```

### getTaskResult

`POST /getTaskResult`. `status` is `processing` or `ready`. `CAPTCHA_NOT_READY` is returned as `processing` instead of thrown. The API allows 120 result requests per task and asks for at least 2 seconds between them. The default poll interval is 3 seconds.

```ts
const result = await client.getTaskResult<{ token: string }>(taskId);
if (result.status === "ready") {
  console.log(result.solution);
}
```

### waitForResult

Polls until `status` is `ready` and `solution` is present.

```ts
const solution = await client.waitForResult<{ token: string }>(taskId, {
  intervalMs: 3_000,
  timeoutMs: 120_000,
  initialDelayMs: 0,
  maxAttempts: 120,
  signal: new AbortController().signal,
  onPoll: (update) => console.log(update.attempt, update.status),
});
```

### solve and solveDetailed

`solve` creates a task and waits. `solveDetailed` also returns `taskId`, which you need to report a rejected token.

```ts
const solved = await client.solveDetailed<{ gRecaptchaResponse: string }>(task, {
  timeoutMs: 180_000,
  callbackUrl: "https://example.com/hook",
});
```

### Reports

`POST` these paths with `{ clientKey, taskId }`. A successful report is `{ status: "success" }`.

```ts
await client.reportIncorrectImageCaptcha(taskId);
await client.reportIncorrectTokenCaptcha(taskId);
await client.reportIncorrectRecaptcha(taskId);
```

`reportIncorrectImage` and `reportIncorrectToken` are aliases. `/reportIncorrectRecaptcha` is the documented alias of the token report and is sent to its own path.

## Task types

Builders set `type` and, for custom captchas, `class`. Extra fields are forwarded unchanged. Legacy type names `NoCaptchaTask`, `NoCaptchaTaskProxyless`, `RecaptchaV2TaskProxyless`, and `HCaptchaTaskProxyless` are still accepted.

| Captcha | Builder | `type` / `class` |
| :--- | :--- | :--- |
| reCAPTCHA v2 | `recaptchaV2Task` | `RecaptchaV2Task` |
| reCAPTCHA v2 proxyless alias | `recaptchaV2ProxylessTask` | `RecaptchaV2TaskProxyless` |
| NoCaptcha alias | `noCaptchaTask` / `noCaptchaProxylessTask` | `NoCaptchaTask` |
| reCAPTCHA v2 Enterprise | `recaptchaV2EnterpriseTask` | `RecaptchaV2EnterpriseTask` |
| reCAPTCHA v3 | `recaptchaV3Task` | `RecaptchaV3TaskProxyless` |
| reCAPTCHA v3 Enterprise | `recaptchaV3EnterpriseTask` | `RecaptchaV3EnterpriseTask` |
| Turnstile | `turnstileTask` | `TurnstileTask` |
| Challenge token | `turnstileChallengeTokenTask` | `cloudflareTaskType: token` |
| Challenge cookie | `turnstileChallengeCookieTask` | `cloudflareTaskType: cf_clearance` |
| Waiting Room | `turnstileWaitingRoomTask` | `cloudflareTaskType: wait_room` |
| GeeTest | `geeTestTask` / `geeTestV3Task` / `geeTestV4Task` | `GeeTestTask` |
| ImageToText | `imageToTextTask` | `ImageToTextTask` |
| Complex image | `complexImageTask` and the class helpers | `ComplexImageTask` |
| DataDome | `dataDomeTask` | `CustomTask` / `DataDome` |
| TenDI | `tenDITask` | `CustomTask` / `TenDI` |
| Amazon WAF | `amazonTask` | `AmazonTask` |
| Binance | `binanceTask` | `BinanceTask` |
| FunCaptcha | `funCaptchaTask` | `FunCaptchaTask` |
| hCaptcha | `hCaptchaTask` / `hCaptchaProxylessTask` | `HCaptchaTask` |
| Basilisk | `basiliskTask` | `CustomTask` / `Basilisk` |
| Imperva | `impervaTask` | `CustomTask` / `Imperva` |
| Prosopo | `prosopoTask` | `ProsopoTask` |
| Yidun | `yidunTask` | `YidunTask` |
| MTCaptcha | `mtCaptchaTask` | `MTCaptchaTask` |
| Altcha | `altchaTask` | `CustomTask` / `altcha` |
| Friendly Captcha | `friendlyCaptchaTask` | `CustomTask` / `friendly` |
| Temu | `temuTask` | `CustomTask` / `Temu` |
| Castle | `castleTask` | `CustomTask` / `Castle` |
| TSPD | `tspdTask` | `CustomTask` / `tspd` |
| Hunt | `huntTask` | `CustomTask` / `HUNT` |
| Alibaba | `alibabaTask` | `CustomTask` / `alibaba` |

`withProxy(task, proxy)` copies `proxyType`, `proxyAddress`, `proxyPort`, `proxyLogin`, and `proxyPassword` onto any task.

### reCAPTCHA v2

Built-in proxies are used when you omit proxy fields. Add your own proxy when the site rejects the token. `nocache: true` avoids a cached token. `isInvisible` covers the invisible widget. `recaptchaDataSValue` is the `data-s` attribute.

```ts
import { recaptchaV2Task } from "capmonster-client";

const solution = await client.solve<{ gRecaptchaResponse: string }>(
  recaptchaV2Task({
    websiteURL: "https://lessons.zennolab.com/captchas/recaptcha/v2_simple.php?level=high",
    websiteKey: "6Lcg7CMUAAAAANphynKgn9YAgA4tQ2KI_iqRyTwd",
    isInvisible: false,
    userAgent: await client.getUserAgent(),
    nocache: true,
  }),
);
```

### reCAPTCHA v2 Enterprise

```ts
import { recaptchaV2EnterpriseTask } from "capmonster-client";

await client.solve(
  recaptchaV2EnterpriseTask({
    websiteURL: "https://example.com/enterprise",
    websiteKey: "6Le...",
    apiDomain: "www.recaptcha.net",
    enterprisePayload: { s: "data-s-value" },
    pageAction: "login",
  }),
);
```

### reCAPTCHA v3 and v3 Enterprise

v3 uses CapMonster proxies. Set `pageAction` and `minScore` (0.1–0.9). `isEnterprise: true` on `recaptchaV3Task` is solved like `RecaptchaV3EnterpriseTask`.

```ts
import { recaptchaV3EnterpriseTask, recaptchaV3Task } from "capmonster-client";

await client.solve(
  recaptchaV3Task({
    websiteURL: "https://example.com/",
    websiteKey: "6Le...",
    pageAction: "login",
    minScore: 0.7,
  }),
);

await client.solve(
  recaptchaV3EnterpriseTask({
    websiteURL: "https://example.com/",
    websiteKey: "6Le...",
    minScore: 0.7,
    pageAction: "submit",
  }),
);
```

### Cloudflare Turnstile

All standard Turnstile subtypes (manual, non-interactive, invisible) use `TurnstileTask` without `cloudflareTaskType`.

```ts
import { turnstileTask } from "capmonster-client";

const solution = await client.solve<{ token: string }>(
  turnstileTask({
    websiteURL: "https://example.com/",
    websiteKey: "0x4AAAAAAA...",
    userAgent: await client.getUserAgent(),
  }),
);
```

### Cloudflare Challenge

Token mode returns a Turnstile token. Cookie mode returns `cf_clearance` and requires your proxy plus the base64 "Just a moment" HTML.

```ts
import { turnstileChallengeCookieTask, turnstileChallengeTokenTask } from "capmonster-client";

await client.solve(
  turnstileChallengeTokenTask({
    websiteURL: "https://example.com/",
    websiteKey: "0x4AAAAAAA...",
    pageAction: "managed",
    data: "data-from-page",
    pageData: "page-data",
    userAgent: await client.getUserAgent(),
  }),
);

await client.solve<{ cf_clearance: string }>(
  turnstileChallengeCookieTask({
    websiteURL: "https://example.com/",
    websiteKey: "xxxxxx",
    htmlPageBase64: htmlBase64,
    userAgent: await client.getUserAgent(),
    proxyType: "http",
    proxyAddress: "1.2.3.4",
    proxyPort: 8080,
    proxyLogin: "user",
    proxyPassword: "secret",
  }),
);
```

### Cloudflare Waiting Room

`cloudflareTaskType` is `wait_room`. Your proxy is required. The HTML must contain "Waiting Room powered by Cloudflare". The solution is a `cf_clearance` cookie.

```ts
import { turnstileWaitingRoomTask } from "capmonster-client";

await client.solve<{ cf_clearance: string }>(
  turnstileWaitingRoomTask({
    websiteURL: "https://example.com/",
    websiteKey: "xxxxxx",
    htmlPageBase64: htmlBase64,
    userAgent: await client.getUserAgent(),
    proxyType: "http",
    proxyAddress: "1.2.3.4",
    proxyPort: 8080,
    proxyLogin: "user",
    proxyPassword: "secret",
  }),
);
```

### GeeTest v3 and v4

v3 needs a fresh `challenge` taken before the widget initializes. v4 uses `gt` as `captcha_id`.

```ts
import { geeTestV3Task, geeTestV4Task } from "capmonster-client";

await client.solve(
  geeTestV3Task({
    websiteURL: "https://example.com/",
    gt: "gt-public-key",
    challenge: "fresh-challenge",
    geetestApiServerSubdomain: "api.geetest.com",
  }),
);

await client.solve(
  geeTestV4Task({
    websiteURL: "https://example.com/",
    gt: "captcha-id",
  }),
);
```

### ImageToText

`body` is a single-line base64 image, at least 100 bytes and at most 50 KB. `recognizingThreshold` is 0–100. Below the threshold the task ends as `ERROR_CAPTCHA_UNSOLVABLE` and is not charged. Do not combine `math: true` with the `captcha_math` module.

```ts
import { imageToTextTask } from "capmonster-client";

const solution = await client.solve<{ text: string }>(
  imageToTextTask({
    body: base64Image,
    capMonsterModule: "yandex",
    recognizingThreshold: 80,
    case: true,
    numeric: 0,
    math: false,
  }),
);
```

The same threshold and module can be appended to the key: `API_KEY__solvemedia__recognizingthreshold_70`. Set `moduleName` and `recognizingThreshold` on the client for that form.

### ComplexImage

`class` is `recaptcha`, `hcaptcha`, `funcaptcha`, or `recognition` (BLS, Shein, and similar grids).

```ts
import { complexRecaptchaTask } from "capmonster-client";

await client.solve(
  complexRecaptchaTask({
    imageUrls: ["https://example.com/grid.jpg"],
    metadata: { Task: "Select all traffic lights", Grid: "3x3" },
    websiteURL: "https://example.com/",
    userAgent: await client.getUserAgent(),
  }),
);
```

`complexHCaptchaTask`, `complexFunCaptchaTask`, and `complexRecognitionTask` set the other classes. `complexImageTask({ class, ... })` is the generic form.

### DataDome

Your proxy is required. `metadata.datadomeCookie` is required. Whitelist `65.21.190.34` when the proxy uses IP authorization.

```ts
import { dataDomeTask } from "capmonster-client";

await client.solve(
  dataDomeTask({
    websiteURL: "https://example.com/",
    metadata: {
      captchaUrl: "https://geo.captcha-delivery.com/captcha/?initialCid=...",
      datadomeCookie: "datadome=...",
    },
    userAgent: await client.getUserAgent(),
    proxyType: "http",
    proxyAddress: "1.2.3.4",
    proxyPort: 8080,
    proxyLogin: "user",
    proxyPassword: "secret",
  }),
);
```

### TenDI (Tencent)

CapMonster documents this captcha as TenDI. It is not a Tenable product.

```ts
import { tenDITask } from "capmonster-client";

await client.solve(
  tenDITask({
    websiteURL: "https://example.com/",
    websiteKey: "189123456",
    userAgent: await client.getUserAgent(),
    metadata: { captchaUrl: "https://example.com/captcha", aidEncrypted: "..." },
  }),
);
```

### Amazon / AWS WAF

```ts
import { amazonTask } from "capmonster-client";

await client.solve(
  amazonTask({
    websiteURL: "https://example.com/",
    websiteKey: "website-key",
    captchaScript: "https://example.com/captcha.js",
    challengeScript: "https://example.com/challenge.js",
    context: "context",
    iv: "iv",
    cookieSolution: true,
  }),
);
```

### Binance

```ts
import { binanceTask } from "capmonster-client";

await client.solve(
  binanceTask({
    websiteURL: "https://accounts.binance.com/en/login",
    websiteKey: "website-key",
    validateId: "validate-id",
    userAgent: await client.getUserAgent(),
  }),
);
```

### FunCaptcha

Your proxy is required. `data` is the `blob` JSON when the site uses it. Do not load the iframe before reading `blob`. `funcaptchaApiJSSubdomain` is the host only, without `https://`.

```ts
import { funCaptchaTask } from "capmonster-client";

await client.solve(
  funCaptchaTask({
    websiteURL: "https://example.com/",
    websitePublicKey: "EX72CCFB-26EX-40E5-91E6-85EX70BE98ED",
    funcaptchaApiJSSubdomain: "client-api.arkoselabs.com",
    data: JSON.stringify({ blob: "blob-value" }),
    userAgent: await client.getUserAgent(),
    proxyType: "http",
    proxyAddress: "1.2.3.4",
    proxyPort: 8080,
    proxyLogin: "user",
    proxyPassword: "secret",
  }),
);
```

### hCaptcha

```ts
import { hCaptchaTask } from "capmonster-client";

await client.solve(
  hCaptchaTask({
    websiteURL: "https://example.com/",
    websiteKey: "site-key",
    isInvisible: true,
    userAgent: await client.getUserAgent(),
  }),
);
```

### Basilisk, Prosopo, Yidun, MTCaptcha

```ts
import { basiliskTask, mtCaptchaTask, prosopoTask, yidunTask } from "capmonster-client";

await client.solve(basiliskTask({ websiteURL: "https://example.com/", websiteKey: "key" }));
await client.solve(prosopoTask({ websiteURL: "https://example.com/", websiteKey: "key" }));
await client.solve(yidunTask({
  websiteURL: "https://example.com/",
  websiteKey: "key",
  userAgent: await client.getUserAgent(),
}));
await client.solve(mtCaptchaTask({
  websiteURL: "https://example.com/",
  websiteKey: "key",
  pageAction: "login",
  isInvisible: false,
}));
```

### Imperva (Incapsula)

```ts
import { impervaTask } from "capmonster-client";

await client.solve(
  impervaTask({
    websiteURL: "https://example.com/",
    userAgent: await client.getUserAgent(),
    metadata: {
      incapsulaScriptUrl: "https://example.com/_Incapsula_Resource?...",
      incapsulaCookies: "visid_incap_...=...; incap_ses_...=...",
      reese84UrlEndpoint: "https://example.com/reese84-endpoint",
    },
    proxyType: "http",
    proxyAddress: "1.2.3.4",
    proxyPort: 8080,
    proxyLogin: "user",
    proxyPassword: "secret",
  }),
);
```

### Altcha and Friendly Captcha

```ts
import { altchaTask, friendlyCaptchaTask } from "capmonster-client";

await client.solve(altchaTask({
  websiteURL: "https://example.com/",
  websiteKey: "key",
  metadata: { challenge: "c", iterations: "1000", salt: "s", signature: "sig" },
}));

await client.solve(friendlyCaptchaTask({
  websiteURL: "https://example.com/",
  websiteKey: "key",
  metadata: { apiGetLib: "https://example.com/friendly.js" },
}));
```

### Temu, Castle, TSPD, Hunt, Alibaba

```ts
import { alibabaTask, castleTask, huntTask, temuTask, tspdTask } from "capmonster-client";

await client.solve(temuTask({
  websiteURL: "https://www.temu.com/",
  metadata: { cookie: "session=..." },
  userAgent: await client.getUserAgent(),
}));

await client.solve(castleTask({
  websiteURL: "https://example.com/",
  websiteKey: "key",
  metadata: { wUrl: "https://example.com/w", swUrl: "https://example.com/sw" },
}));

await client.solve(tspdTask({
  websiteURL: "https://example.com/",
  userAgent: await client.getUserAgent(),
  metadata: { tspdCookie: "cookie", htmlPageBase64: htmlBase64 },
}));

await client.solve(huntTask({
  websiteURL: "https://example.com/",
  metadata: { apiGetLib: "https://example.com/hunt.js" },
}));

await client.solve(alibabaTask({
  websiteURL: "https://example.com/",
  metadata: { sceneId: "scene", prefix: "prefix", region: "cn" },
}));
```

You can also pass a raw object to `createTask` / `solve`. `type` is required. Custom captchas also require `class`.

## Error handling

API failures throw `CapMonsterError`. Known codes use a subclass, so `instanceof ZeroBalanceError` works and `instanceof CapMonsterError` still matches.

```ts
import { CapMonsterError, ZeroBalanceError } from "capmonster-client";

try {
  await client.solve(task);
} catch (err) {
  if (err instanceof ZeroBalanceError) {
    console.error(err.errorCode, err.message);
  } else if (err instanceof CapMonsterError) {
    console.error(err.errorId, err.errorCode, err.httpStatus, err.response);
  }
}
```

| Code | Meaning |
| :--- | :--- |
| `ERROR_KEY_DOES_NOT_EXIST` | API key missing or malformed |
| `ERROR_PROXY_CREDENTIALS_INVALID_CHARACTER` | Proxy login or password contains `%` |
| `ERROR_ZERO_BALANCE` | Not enough funds to create a task |
| `ERROR_TOO_BIG_CAPTCHA_FILESIZE` | Image larger than 50 KB |
| `ERROR_ZERO_CAPTCHA_FILESIZE` | Image smaller than 100 bytes |
| `ERROR_NO_SUCH_CAPCHA_ID` / `WRONG_CAPTCHA_ID` | Unknown or expired task id |
| `ERROR_CAPTCHA_UNSOLVABLE` | Could not solve. Not charged |
| `CAPTCHA_NOT_READY` | Still solving. Not thrown by `getTaskResult` |
| `ERROR_IP_NOT_ALLOWED` | IP is not on the key allow list |
| `ERROR_IP_BANNED` | IP temporarily blocked. Do not retry immediately |
| `ERROR_NO_SUCH_METHOD` | Unknown task type |
| `ERROR_TOO_MUCH_REQUESTS` | Poll slower. At least 2 seconds between result calls |
| `ERROR_DOMAIN_NOT_ALLOWED` | Domain cannot be solved |
| `ERROR_TOKEN_EXPIRED` | Challenge or token expired. Create a new task |
| `ERROR_RECAPTCHA_INVALID_SITEKEY` | Bad `websiteKey` |
| `ERROR_RECAPTCHA_INVALID_DOMAIN` | `websiteURL` must be a full `http(s)` URL and match the site key |
| `ERROR_RECAPTCHA_TIMEOUT` | Solve window elapsed |
| `ERROR_IP_BLOCKED` | IP blocked after many failed requests |
| `ERROR_PROXY_CONNECT_REFUSED` | Proxy refused the connection |
| `ERROR_PROXY_BANNED` | Target site blocked the proxy |
| `ERROR_PROXY_MISSING` | Proxy fields or `proxyType` are wrong |
| `ERROR_PROXY_NOT_AUTHORISED` | Proxy username or password rejected |
| `ERROR_PROXY_READ_TIMEOUT` | Proxy read timed out |
| `ERROR_TASK_NOT_SUPPORTED` | `type` is unsupported |
| `ERROR_TASK_ABSENT` | Task object missing or JSON invalid |
| `ERROR_WRONG_USERAGENT` | User-Agent is not the one CapMonster supports |
| `ERROR_SERVICE_NOT_AVAILABLE` | Service or callback URL unavailable |
| `ERROR_INVALID_TASK` | Task fields are present but invalid. Read `errorDescription` |
| `TIMEOUT` | Local poll timeout |
| `ABORTED` | `AbortSignal` fired |
| `MISSING_CLIENT_KEY` | Constructor received an empty key |
| `EMPTY_USER_AGENT` | User-Agent endpoint returned an empty body |

`CAPMONSTER_ERRORS` maps each code to that description. The API `errorDescription` wins when CapMonster sends one.

Retries, when `retries` is greater than 0, apply to `ERROR_SERVICE_NOT_AVAILABLE`, `ERROR_TOO_MUCH_REQUESTS`, `ERROR_PROXY_CONNECT_REFUSED`, `ERROR_PROXY_READ_TIMEOUT`, HTTP 429/502/503/504, and network failures. Balance, key, and task errors are not retried. `CAPTCHA_NOT_READY` is not retried inside `post`. It is polled.

## Advanced usage

### Proxies

Omit proxy fields to use CapMonster's built-in proxies (included in the price for most types). FunCaptcha, DataDome, Waiting Room, and the Challenge cookie flow require your proxy. For IP-authorized proxies, whitelist `65.21.190.34`. Do not use transparent proxies or a proxy on the local machine. `proxyType` is `http`, `https`, `socks4`, or `socks5`.

```ts
import { recaptchaV2Task, withProxy } from "capmonster-client";

const task = withProxy(recaptchaV2Task({ websiteURL, websiteKey }), {
  proxyType: "socks5",
  proxyAddress: "1.2.3.4",
  proxyPort: 1080,
  proxyLogin: "user",
  proxyPassword: "secret",
});
```

### Timeouts, polling, and cancellation

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 10_000);

await client.solve(task, {
  timeoutMs: 90_000,
  intervalMs: 3_000,
  initialDelayMs: 2_000,
  maxAttempts: 40,
  signal: controller.signal,
});
```

`timeoutMs` on the client is the HTTP timeout. `timeoutMs` on `solve` / `waitForResult` is how long to poll.

### Callbacks

```ts
await client.createTask(task, {
  callbackUrl: "https://example.com/capmonster",
});
```

CapMonster `POST`s the `getTaskResult` payload to that URL. Respond within 2 seconds. The body is not signed.

### Developer id

`DEFAULT_SOFT_ID` is `""`. Requests omit `softId` until the CapMonster developer program assigns one. Set `softId` on the client or on a single `createTask` call. Numeric strings are sent as numbers.

## TypeScript

The package ships declarations from `dist/index.d.ts`. Task builders return the matching interface. Solution helpers include `RecaptchaSolution`, `TurnstileSolution`, `ImageToTextSolution`, `GeeTestV3Solution`, and `GeeTestV4Solution`. `solve<T>()` is generic when you want a narrower solution type.

## Comparison

| | capmonster-client | Official JS SDK | node-capmonster | capmonster_python |
| :--- | :--- | :--- | :--- | :--- |
| Documented JSON methods | balance, user-agent, create, result, both report paths | balance, solve | balance, create, result | balance, user-agent, create, result, reports |
| Task coverage | Every type in the current docs, plus legacy type aliases | Official request classes | Popular subset | Most types, vanilla payload escape hatch |
| Error class per API code | Yes | No | No | No |
| Poll timeout, abort, callbacks | Yes | Solve loop | `joinTaskResult` | `join_task_result` |
| HTTP retries separate from polling | Yes | No | Poll retries | Poll retries (`max_retries`) |
| `softId` left unset by default | Yes | Varies | No | No |
| Python sync and async | This package's sibling | Separate SDK | No | Both on one class |

## FAQ

**Does getBalance spend credit?** No. `getUserAgent` does not either.

**Why is softId empty?** The developer program has not issued an id. The field is omitted so requests stay valid. Set `softId` when you have one. Do not invent an id.

**The site rejected the token.** Call `reportIncorrectTokenCaptcha(taskId)`, then create a new task with `nocache: true` and the same proxy and User-Agent you will use to submit the token.

**How often should I poll?** At least every 2 seconds, no more than 120 times per task. The default interval is 3 seconds and the default timeout is 120 seconds.

**Which User-Agent do I send?** The string from `getUserAgent()`, not the newest Chrome version string you build yourself.

## Examples

| File | What it does |
| :--- | :--- |
| `examples/check.ts` | Balance and User-Agent. Needs `CAPMONSTER_API_KEY` |
| `examples/get-user-agent.ts` | User-Agent only |
| `examples/solve-recaptcha-v2.ts` | One paid reCAPTCHA v2 solve |
| `examples/solve-turnstile.ts` | One paid Turnstile solve |
| `examples/solve-image.ts` | One paid ImageToText solve |
| `examples/report-incorrect.ts` | Solve, then report when `REPORT=1` |
| `examples/proxy-retry.ts` | Proxy fields, retries, and `AbortSignal` |

```bash
npx tsx examples/get-user-agent.ts
CAPMONSTER_API_KEY=... npx tsx examples/check.ts
```

## Tests

```bash
npm install
npm test          # mocked HTTP, coverage on
npm run typecheck
npm run build
CAPMONSTER_API_KEY=... npm run test:live
```

Unit tests mock HTTP. The live file checks balance, the current User-Agent, an invalid key, and `ERROR_ZERO_BALANCE` on `createTask` only when the balance is exactly 0. A funded key does not submit a paid task.

## Contributing

Issues and pull requests belong on the [api-kit](https://github.com/TysikGG/api-kit) repository, in `capmonster/js`. Keep `DEFAULT_SOFT_ID` empty until CapMonster assigns an id. Run `npm test`, `npm run typecheck`, and `npm run build` before opening a PR.

## License

[ISC](LICENSE) © api-kit contributors
