# capguru-client

[![npm version](https://img.shields.io/npm/v/capguru-client.svg)](https://www.npmjs.com/package/capguru-client)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/capguru-client.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org/)

Typed Node.js client for the [Cap.guru](https://cap.guru/) captcha API: RuCaptcha-compatible `in.php` / `res.php` and the Anti-Captcha-compatible JSON task API.

Official docs: <https://docs.cap.guru/en/>

---

## Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick start](#quick-start)
- [Token tasks](#token-tasks)
- [Image and text](#image-and-text)
- [Click, grid, and slider](#click-grid-and-slider)
- [Site presets](#site-presets)
- [JSON task API](#json-task-api)
- [Low-level tasks and reports](#low-level-tasks-and-reports)
- [Error handling](#error-handling)
- [Advanced usage](#advanced-usage)
- [TypeScript](#typescript)
- [Comparison](#comparison)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

## Features

- Token tasks: reCAPTCHA v2 (normal, invisible, Enterprise, `data-s`), reCAPTCHA v3, Cloudflare Turnstile, hCaptcha, FunCaptcha, GeeTest v3.
- Click and grid tasks: reCAPTCHA, hCaptcha, FunCaptcha, GeeTest, plus Binance, TikTok, Temu, AWS WAF, Bitget, Linkvertise, SeoFast, and World.cash.
- Slider answers parsed into coordinates and scaled to the on-screen track (271px reference field).
- Image-to-text (`method=base64` and multipart `method=post`) with `vernet` presets, and text questions.
- Automatic polling, abort via `AbortSignal`, retries for network failures, HTTP errors, and `ERROR_NO_SLOT_AVAILABLE`.
- Reports (`reportgood` / `reportbad`), balance, and raw `createTask` / `getTaskResult`.
- Anti-Captcha JSON API (`/createTask`, `/getTaskResult`) with `softId` attribution.
- Every request forces `key`, `json=1`, and developer id `softguru=164125`. Callers cannot overwrite those fields.

## Installation

```bash
npm install capguru-client
```

Node.js 18 or newer. The package is ESM (`"type"` is not set; consumers import the compiled `dist` via the `exports` map).

```typescript
import { CapGuru, CapGuruClient } from "capguru-client";
```

`CapGuru` is an alias of `CapGuruClient`. A string constructor argument is shorthand for `{ apiKey }`.

## Configuration

```typescript
const client = new CapGuruClient({
  apiKey: process.env.CAPGURU_API_KEY!,
  baseUrl: "https://api.cap.guru",          // also CAPGURU_API2_URL, CAPGURU_IPV6_URL
  timeout: 30_000,                          // HTTP timeout, milliseconds
  defaultPollingTimeoutMs: 120_000,         // solve helpers
  defaultPollingIntervalMs: 5_000,
  maxRetries: 0,                            // extra attempts after a retryable failure
  retryDelayMs: 0,
  headers: { "X-Debug": "1" },              // sent on every request
});
```

| Option | Default | Meaning |
| --- | --- | --- |
| `apiKey` | required | Dashboard key. Empty string throws `MissingApiKeyError`. |
| `baseUrl` | `https://api.cap.guru` | Origin. Trailing slashes are removed. |
| `timeout` | `30000` | Axios timeout in milliseconds. |
| `defaultPollingTimeoutMs` | `120000` | How long `solve*` and `waitForResult` poll. `0` means a single poll. |
| `defaultPollingIntervalMs` | `5000` | Delay between polls. The first poll runs immediately. |
| `maxRetries` | `0` | Extra attempts for `NETWORK_ERROR`, `HTTP_ERROR`, and `ERROR_NO_SLOT_AVAILABLE`. |
| `retryDelayMs` | `0` | Pause before each retry. |
| `headers` | none | Extra request headers. |

Polling options (`timeoutMs`, `intervalMs`, `onNotReady`, `signal`) can sit on the task object or in a second argument. The second argument wins when both set the same field.

Token tasks accept transport fields:

| Field | API parameter |
| --- | --- |
| `cookies` | `cookies` |
| `userAgent` | `userAgent` |
| `proxy` | `proxy` (`host:port` or `user:pass@host:port`) |
| `proxyType` | `proxytype`: `HTTP`, `HTTPS`, `SOCKS4`, `SOCKS5` |
| `extra` | Merged underneath explicit fields, so it cannot replace `googlekey`, `method`, and similar. |

`key`, `json`, and `softguru` are applied after your parameters.

## Quick start

Balance only. This does not create a task or spend credit.

```typescript
import { CapGuruClient } from "capguru-client";

const client = new CapGuruClient(process.env.CAPGURU_API_KEY!);
const balance = await client.getBalance();
console.log(balance);
```

`balance()` is an alias of `getBalance()`.

Runnable copy: [`examples/check.ts`](examples/check.ts).

## Token tasks

High-level solvers submit the task and poll until the token is ready.

### reCAPTCHA v2

```typescript
const token = await client.solveRecaptchaV2({
  googlekey: "6Le-wvkSAAAAAPBMRTvw0Q4CeHg-tUnSQVwyYcxQ",
  pageurl: "https://example.com/login",
  invisible: 1,
  enterprise: 0,
  dataS: "optional-data-s",
});
```

`solveReCaptchaV2` is the same method. Set `invisible: 1` or `enterprise: 1` only when the widget needs it.

### reCAPTCHA v3

```typescript
const token = await client.solveRecaptchaV3({
  googlekey: "6Le-wvkSAAAAAPBMRTvw0Q4CeHg-tUnSQVwyYcxQ",
  pageurl: "https://example.com/checkout",
  action: "checkout",
  minScore: 0.3,
  enterprise: 1,
});
```

`solveReCaptchaV3` is an alias. The request sends `version=v3` and `min_score`.

### Cloudflare Turnstile

```typescript
const token = await client.solveTurnstile({
  sitekey: "0x4AAAAAAADnPIDROrmt1Wwj",
  pageurl: "https://example.com/protected",
  action: "login",
  data: "optional-cdata",
});
```

### hCaptcha token

Cap.guru currently documents hCaptcha **tokens** as unavailable and recommends the click API. `solveHCaptcha` remains for the published parameters and existing callers.

```typescript
const token = await client.solveHCaptcha({
  sitekey: "10000000-ffff-ffff-ffff-000000000001",
  pageurl: "https://example.com",
  invisible: 1,
  data: "rqdata-value",
});
```

Prefer [`solveHCaptchaClick`](#hcaptcha-click) for image challenges.

### FunCaptcha token

```typescript
const token = await client.solveFunCaptcha({
  publickey: "ARKOSE-PUBLIC-KEY",
  pageurl: "https://example.com",
  surl: "https://client-api.arkoselabs.com",
  data: "optional-blob",
});
```

### GeeTest v3 token

```typescript
const result = await client.solveGeeTest({
  gt: "gt-value",
  challenge: "challenge-value",
  pageurl: "https://example.com",
  apiServer: "api.geetest.com",
});
// result.challenge, result.validate, result.seccode
```

JSON objects map `geetest_challenge` / `challenge`, `geetest_validate` / `validate`, and `geetest_seccode` / `seccode`. A non-JSON answer uses `validate` as the raw string and `seccode` as `` `${raw}|jordan` ``.

### Proxy on a token task

```typescript
const token = await client.solveRecaptchaV2({
  googlekey: "6Le-wvkSAAAAAPBMRTvw0Q4CeHg-tUnSQVwyYcxQ",
  pageurl: "https://example.com/login",
  proxy: "user:pass@203.0.113.10:8080",
  proxyType: "HTTP",
  cookies: "session=abc",
  userAgent: "Mozilla/5.0",
});
```

[`examples/tokens.ts`](examples/tokens.ts) runs each token method when you pass its name.

## Image and text

### Base64 image

```typescript
import { readFileSync } from "node:fs";
import { VERNET } from "capguru-client";

const body = readFileSync("./captcha.png").toString("base64");
const text = await client.solveImage({
  body,
  phrase: 0,
  regsense: 1,
  numeric: 1,
  calc: 0,
  minLen: 4,
  maxLen: 6,
  language: 2,
  textinstructions: "enter the blue characters",
  vernet: VERNET.MICROSOFT,
});
```

| Field | Meaning |
| --- | --- |
| `phrase` | `0` one word, `1` two or more words |
| `regsense` | `0` case insensitive, `1` case sensitive |
| `numeric` | `0` unspecified, `1` numbers, `2` letters, `3` numbers or letters |
| `calc` | `1` when the image is a math expression |
| `language` | `0` any, `1` Cyrillic, `2` Latin |
| `vernet` | Recognition preset. See `VERNET` (`2`, `6`, `22`, `12`, `18`, `20`, `16`, `14`, `13`, `9`, `17`, `5`) |

`solveImage` also accepts a base64 string as the first argument: `solveImage(body, options)`.

### Multipart file upload

```typescript
const text = await client.solveImageFile(readFileSync("./captcha.png"), {
  filename: "captcha.png",
  vernet: VERNET.GENERAL_V2,
});
```

This posts `method=post` as multipart form data.

### Text question

```typescript
const answer = await client.solveText("What is 2 + 2?", { language: 2 });
```

[`examples/images.ts`](examples/images.ts).

## Click, grid, and slider

Click answers are `ClickSolution`:

- `raw` — text with a leading `OK|` removed
- `points` — `{ x, y, w? }[]` from `coordinates:x=143,y=53,w=42` or `coordinate:x=44,y=32;x=143,y=11`
- `cells` — grid indexes such as `1,2,6,9`

`solveCoordinates` is an alias of `solveClick`.

### Generic click

```typescript
import { CLICK } from "capguru-client";

const solution = await client.solveClick({
  textinstructions: "Select all traffic lights",
  click: CLICK.RECAPTCHA,       // coordinates
  body: imageBase64,
});
```

`CLICK` values: `recap`, `recap2`, `hcap`, `hcap2`, `geetest`, `geetest2`, `funcap`, `funcap2`, `temu`, `oth`.

### reCAPTCHA, hCaptcha, FunCaptcha, GeeTest images

```typescript
const cells = await client.solveRecaptchaClick({
  textinstructions: "cars",
  body: imageBase64,
  grid: true,                    // click=recap2
});

await client.solveHCaptchaClick({ textinstructions: "boats", body: imageBase64 });
await client.solveFunCaptchaClick({ textinstructions: "pick the animal", body: imageBase64, grid: true });
await client.solveGeeTestClick({ textinstructions: "geetestv2", body: imageBase64 });
```

GeeTest instruction strings exported as `TEXT_INSTRUCTIONS`: `slider`, `geetestv2`, `geetesticonv4`, `five`, `three`, `geetesticonhand`.

### Slider

```typescript
import { scaleSliderOffset, sliderOffset } from "capguru-client";

const solution = await client.solveSlider({
  body: backgroundBase64,        // or body0
  piece: pieceBase64,            // sent as body1; background moves to body0
  textinstructions: "slider",    // default
  click: "geetest",              // default
});

const offset = sliderOffset(solution);
if (offset != null) {
  const pixels = scaleSliderOffset(offset, {
    windowWidth: 280,
    imageWidth: 340,             // omit to use the 271px field
  });
}
```

Pass `body0` and `body1` yourself when you already split the images. [`examples/clicks.ts`](examples/clicks.ts).

## Site presets

### Binance

```typescript
const solution = await client.solveBinance({
  object: "dog",                  // textinstructions=binance,dog
  body: imageBase64,
  grid: false,                    // true sends click=geetest2
});
```

`textinstructions` overrides `object` when both are set.

### TikTok

```typescript
await client.solveTikTok({
  variant: "kolesso",             // kolesso | koleso | abc | slider | question
  body0: firstBase64,
  body1: secondBase64,
});

await client.solveTikTok({
  variant: "question",
  question: "select the letter A",
  body: imageBase64,
});
```

`kolesso` and `koleso` send two images. `question` sends `abc,<question>`. `click` is `geetest`.

### AWS WAF

```typescript
await client.solveAws({
  instruction: "Place a dot at the end of the car's path",
  body: imageBase64,
});
```

The instruction is prefixed with `Amazon,` when that prefix is missing. `click` is `oth`.

### Temu

```typescript
await client.solveTemu({
  textinstructions: "Select the object that fits",
  body: imageBase64,
});
```

`click` is `temu`.

### Bitget, Linkvertise, SeoFast, World.cash

```typescript
await client.solveBitget({ body: imageBase64 });
// textinstructions=geetesticonhand, click=geetest

await client.solveLinkvertise({
  instruction: "click the matching icon",
  body: imageBase64,
});
// custom1221,<instruction>, click=oth

await client.solveSeoFast({
  instruction: "click the matching icon",
  body: imageBase64,
});
// custom1222,<instruction>, click=oth

await client.solveWorldCash({ body: imageBase64 });
// textinstructions=custom1224, click=oth
```

[`examples/sites.ts`](examples/sites.ts).

## JSON task API

Anti-Captcha compatible `POST /createTask` and `POST /getTaskResult`. The client adds `clientKey`, `softId=164125`, and `softguru=164125`.

```typescript
const taskId = await client.createJsonTask(
  {
    type: "NoCaptchaTaskProxyless",
    websiteURL: "https://example.com",
    websiteKey: "6Le-wvkSAAAAAPBMRTvw0Q4CeHg-tUnSQVwyYcxQ",
  },
  { languagePool: "en" },
);

const pending = await client.getJsonTaskResult(taskId); // null while processing
const ready = await client.waitForJsonResult(taskId);
const solved = await client.solveJsonTask({
  type: "NoCaptchaTaskProxyless",
  websiteURL: "https://example.com",
  websiteKey: "6Le-wvkSAAAAAPBMRTvw0Q4CeHg-tUnSQVwyYcxQ",
});
```

`getJsonTaskResult` returns `null` while `status` is `processing` or `pending`, and also when the body is RuCaptcha `CAPCHA_NOT_READY`. `readSolutionToken(ready.solution)` pulls `gRecaptchaResponse`, `token`, `text`, or `request`.

[`examples/json-task.ts`](examples/json-task.ts).

## Low-level tasks and reports

```typescript
const taskId = await client.createTask({
  method: "userrecaptcha",
  googlekey: "site-key",
  pageurl: "https://example.com",
});

const once = await client.getTaskResult(taskId); // null on CAPCHA_NOT_READY
const text = await client.waitForResult(taskId, { timeoutMs: 60_000, intervalMs: 3_000 });

await client.createTaskMultipart(
  { method: "post", vernet: 5 },
  readFileSync("./captcha.png"),
  "captcha.png",
);

const accepted = await client.reportGood(taskId);
await client.reportBad(taskId);
```

`reportCorrect` and `reportIncorrect` alias `reportGood` and `reportBad`. A recorded report resolves to `true`.

[`examples/reports.ts`](examples/reports.ts).

## Error handling

Failures throw `CapGuruError` (`message` is `CapGuru error: CODE`). Known codes use a subclass (`ZeroBalanceError`, `TimeoutError`, `AbortedError`, …). `code`, `description`, and `responseData` are set when the service sent them.

```typescript
import { CapGuruError, ZeroBalanceError } from "capguru-client";

try {
  await client.solveImage({ body });
} catch (error) {
  if (error instanceof ZeroBalanceError) {
    console.error(error.description);
  } else if (error instanceof CapGuruError) {
    console.error(error.code, error.responseData);
  }
}
```

| Code | Class | When |
| --- | --- | --- |
| `ERROR_WRONG_USER_KEY` | `WrongUserKeyError` | Invalid API key |
| `ERROR_KEY_DOES_NOT_EXIST` | `KeyDoesNotExistError` | Invalid API key |
| `ERROR_ZERO_BALANCE` | `ZeroBalanceError` | Empty balance |
| `ERROR_TOO_BIG_CAPTCHA_FILESIZE` | `TooBigCaptchaError` | Image too large |
| `ERROR_UPLOAD` | `UploadError` | Upload failed |
| `ERROR_IMAGE_TYPE_NOT_SUPPORTED` | `ImageTypeNotSupportedError` | Unsupported image |
| `ERROR_CAPTCHA_UNSOLVABLE` | `CaptchaUnsolvableError` | Not solved |
| `ERROR_NO_SLOT_AVAILABLE` | `NoSlotAvailableError` | Queue is full (retryable) |
| `ERROR_PAGEURL` | `PageUrlError` | Bad page URL |
| `ERROR_GOOGLEKEY` | `GoogleKeyError` | Bad reCAPTCHA key |
| `ERROR_RECAPTCHA_INVALID_DOMAIN` | `RecaptchaInvalidDomainError` | Bad reCAPTCHA domain |
| `ERROR_RECAPTCHA_INVALID_SITEKEY` | `RecaptchaInvalidSitekeyError` | Bad reCAPTCHA site key |
| `ERROR_HKEY` | `HCaptchaKeyError` | Bad hCaptcha key |
| `CAPCHA_NOT_READY` | `CapGuruError` | Still solving. `getTaskResult` returns `null` instead of throwing |
| `ERROR_NO_SUCH_CAPCHA_ID` | `NoSuchCaptchaIdError` | Unknown task id |
| `ERROR_WRONG_CAPTCHA_ID` | `WrongCaptchaIdError` | Unknown task id |
| `notpic` | `NotPicError` | Object not found |
| `ERROR_GEETTEST_GT` | `GeeTestGtError` | Empty GeeTest `gt` |
| `ERROR_GEETTEST_challenge` | `GeeTestChallengeError` | Empty GeeTest challenge |
| `ERROR_CAPTCHA_BAD_GT_OR_CNANNEL` | `GeeTestBadGtError` | Bad GeeTest parameters (service spelling) |
| `ERROR_PROXY_CONNECTION_FAILED` | `ProxyConnectionError` | Proxy failed |
| `MISSING_API_KEY` | `MissingApiKeyError` | Client constructed without a key |
| `PARSE_ERROR` | `ParseError` | Response could not be parsed |
| `INVALID_RESPONSE` | `InvalidResponseError` | Unexpected payload |
| `NETWORK_ERROR` | `NetworkError` | Transport failure (retryable) |
| `HTTP_ERROR` | `HttpError` | HTTP status >= 400 without an API error code (retryable) |
| `TIMEOUT` | `TimeoutError` | Polling budget elapsed |
| `ABORTED` | `AbortedError` | `AbortSignal` aborted |

Plain-text bodies (`OK|id`, `ERROR_*`, `CAPCHA_NOT_READY`, a bare balance) are accepted alongside JSON.

## Advanced usage

### Timeouts, callbacks, and abort

```typescript
const controller = new AbortController();
const token = await client.solveTurnstile(
  { sitekey, pageurl },
  {
    timeoutMs: 90_000,
    intervalMs: 2_000,
    signal: controller.signal,
    onNotReady: ({ taskId, attempt, elapsedMs }) => {
      console.log(taskId, attempt, elapsedMs);
    },
  },
);
```

Abort before the first poll, during `onNotReady`, or while sleeping between polls. All three throw `AbortedError`.

### Retries

```typescript
const client = new CapGuruClient({
  apiKey,
  maxRetries: 2,
  retryDelayMs: 1_000,
});
```

Retries wrap task creation and result reads. `ERROR_ZERO_BALANCE` and other non-retryable codes fail immediately. `RETRYABLE_ERROR_CODES` lists the retryable set.

### Manual poll loop

```typescript
const taskId = await client.createTask({ method: "base64", body, vernet: 6 });
let answer = await client.getTaskResult(taskId);
while (answer === null) {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  answer = await client.getTaskResult(taskId);
}
```

[`examples/advanced.ts`](examples/advanced.ts).

## TypeScript

Public types live on the package entry:

`CapGuruOptions`, `PollingOptions`, `TokenTransportOptions`, `ImageCaptchaOptions`, `ImageFileOptions`, `TextCaptchaOptions`, `RecaptchaV2Options`, `RecaptchaV3Options`, `TurnstileOptions`, `HCaptchaOptions`, `FunCaptchaOptions`, `GeeTestOptions`, `ClickCaptchaOptions`, `GridClickOptions`, `BinanceOptions`, `TikTokOptions`, `AwsOptions`, `TemuOptions`, `SliderOptions`, `InstructionClickOptions`, `JsonTaskPayload`, `JsonTaskOptions`, `ClickSolution`, `Point`, `GeeTestResult`, `JsonTaskResult`, `ProxyType`, `ClickType`.

Constants: `DEFAULT_SOFTGURU`, `CAPGURU_API_URL`, `CAPGURU_API2_URL`, `CAPGURU_IPV6_URL`, `CLICK`, `VERNET`, `TEXT_INSTRUCTIONS`, `DEFAULT_SLIDER_FIELD_WIDTH`, `ERROR_CODE_DESCRIPTIONS`.

## Comparison

| Capability | capguru-client | @captcha-libs/capguru | capguru (npm) | capguru (PyPI) |
| --- | --- | --- | --- | --- |
| Raw HTTP API | Yes | Yes | No (Puppeteer helper) | No (Playwright helper) |
| reCAPTCHA v2/v3 and Turnstile tokens | Yes | Yes | Browser flow | Browser flow |
| Click: reCAPTCHA, hCaptcha, GeeTest, FunCaptcha | Yes | Task classes | No | No |
| TikTok, Binance, Temu, AWS, Bitget, Linkvertise, SeoFast, World.cash | Yes | Partial | No | No |
| Slider coordinate scaling | Yes | Coordinates parsed | No | No |
| JSON `/createTask` | Yes | No | No | No |
| Multipart image upload and `vernet` presets | Yes | Image task | No | No |
| Reports, retries, `AbortSignal` | Yes | Polling | No | No |
| `softguru` developer attribution | Yes (`164125`) | No | n/a | n/a |
| Typed error subclasses | Yes | Errors | No | No |

`capguru` on npm (0.4.x) and `capguru` on PyPI are browser automation modules. `capguru-mcp` is an MCP server, not a library client. This package is the HTTP client.

## FAQ

**Does `getBalance` spend credit?** No. It calls `res.php?action=getbalance`.

**Why is `softguru` always 164125?** It is this library's developer id. It is applied after user parameters on both the form API and the JSON API (`softId` as well).

**Can I point at api2 or IPv6?** Yes. Pass `baseUrl: CAPGURU_API2_URL` or `CAPGURU_IPV6_URL`.

**hCaptcha token calls fail. What should I use?** `solveHCaptchaClick`. The token method stays for compatibility.

**What does polling timeout `0` do?** One request. If the answer is `CAPCHA_NOT_READY`, the call throws `TimeoutError`.

## Contributing

```bash
cd capguru/js
npm ci
npm test          # Jest with coverage, 95% line threshold
npm run typecheck
npm run build
npm run test:live # requires CAPGURU_API_KEY, balance only
```

## License

ISC. See [LICENSE](LICENSE).
