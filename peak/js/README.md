# peak-client

[![npm version](https://img.shields.io/npm/v/peak-client.svg)](https://www.npmjs.com/package/peak-client)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/peak-client.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](https://www.typescriptlang.org/)

Node.js client for the [Peak Solutions](https://peak.fo) CAPTCHA solving API. One call solves Cloudflare Turnstile (with your proxy or through Peak's pool), the Cloudflare 5-second challenge, or an AWS WAF mobile-SDK token. Typed responses, one error class per API status, retries that do not double-bill, and a helper that turns a 5-second solution into the follow-up POST.

Official API reference: <https://peak.fo/docs>

The compiled package is CommonJS with TypeScript declarations. Use it from `require` or from `import` on Node.js 18+.

---

## Table of contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick start](#quick-start)
- [Cloudflare Turnstile](#cloudflare-turnstile)
- [Cloudflare 5-second challenge](#cloudflare-5-second-challenge)
- [AWS WAF](#aws-waf)
- [Balance](#balance)
- [Raw solve](#raw-solve)
- [Error handling](#error-handling)
- [Advanced usage](#advanced-usage)
- [TypeScript](#typescript)
- [Comparison](#comparison)
- [FAQ](#faq)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Turnstile, proxyless and proxied.** Omitting `proxy` sends `TurnstileTaskProxyLess`. Passing one sends `turnstiletask`, with optional `action` and `cdata`.
- **Cloudflare 5-second challenge.** Cookies, headers, form attributes, and `cf_rt`, plus `buildClearanceRequest()` for the follow-up POST.
- **AWS WAF mobile SDK.** `awswaftask` for iOS and Android. Peak has shipped this task as disabled; the client still sends it and raises `TaskDisabledError` when the platform says so.
- **Balance for both billing shapes.** Pay-per-solve `balance`, and package fields from both the older (`package`) and current (`package_name`, `remaining_solves`, `total_solves`, `allowed_tasks`) responses.
- **Errors by status.** `AuthenticationError`, `InsufficientBalanceError`, `BadRequestError`, `RateLimitError`, `TaskDisabledError`, `UpstreamError`, and `SolveError`. All of them are `PeakError`.
- **Retries with a deadline.** Default is a single attempt. Extra attempts run only for unpaid or transient failures.
- **Your transport, Peak's proxy.** `httpProxy` is how this process reaches `api.peak.fo`. The `proxy` on a solve is what Peak uses to open the target site.
- **Attribution stays put.** Every solve body includes the library `appId`. That value is not configurable.

Peak bills only successful solves. A `200` with `success: false` is not charged.

---

## Installation

```bash
npm install peak-client
```

Requires Node.js 18 or newer. The only runtime dependency is Axios.

---

## Configuration

```ts
import { Peak } from "peak-client";

const client = new Peak({
  apiKey: process.env.PEAK_API_KEY!,
  baseUrl: "https://api.peak.fo",
  timeoutMs: 60_000,
  httpProxy: "http://user:pass@10.0.0.1:8888",
  retries: 2,
  retryDelayMs: 1_000,
  retryTimeoutMs: 30_000,
  onResult: (event) => console.log(event.taskType, event.data),
});
```

`new Peak("pk_...")` is the same as `new Peak({ apiKey: "pk_..." })`. The key is trimmed. An empty key throws `PeakError` before any request.

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | required | Dashboard key, `pk_...`. Sent as `X-API-Key`. |
| `baseUrl` | `string` | `https://api.peak.fo` | API origin. A trailing slash is removed. |
| `timeoutMs` | `number` | `60000` | Per-request Axios timeout. |
| `httpProxy` | `string` | unset | HTTP or HTTPS proxy used only to reach the API. `socks5://` is rejected here. |
| `retries` | `number` | `0` | Extra attempts after a retryable failure. |
| `retryDelayMs` | `number` | `1000` | Pause between those attempts. |
| `retryTimeoutMs` | `number` | unset | Wall-clock budget for the whole loop. |
| `onResult` | function | unset | Called after each successful solve. |
| `axios` | `AxiosInstance` | unset | Replace the HTTP client. `httpProxy`, `baseUrl`, and `timeoutMs` apply only when this is omitted. |

The same retry and callback fields can be set on a single call. A call-level value wins.

There is no task id and no poll interval. The solve HTTP call blocks until Peak returns the token or the clearance. `timeoutMs` is that wait.

---

## Quick start

This only reads the balance. It does not solve anything and does not spend credit.

```ts
import { Peak, formatBalance } from "peak-client";

const client = new Peak({ apiKey: process.env.PEAK_API_KEY! });
const balance = await client.getBalance();
console.log(formatBalance(balance));
```

`formatBalance` prints `$12.5` for pay-per-solve keys and a package name with remaining solves and days when those fields are present.

CommonJS:

```js
const { Peak } = require("peak-client");

async function main() {
  const client = new Peak({ apiKey: process.env.PEAK_API_KEY });
  console.log(await client.getBalance());
}

main().catch(console.error);
```

---

## Cloudflare Turnstile

Submit the returned `token` as the form field `cf-turnstile-response`. The page URL must be absolute `http` or `https`. A missing trailing slash on the path is added for you, and the query string is left alone: `https://example.com/a?x=1` is sent as `https://example.com/a/?x=1`.

Average Peak latency is under a second. A failed solve is not billed.

### Proxyless

Peak solves through its own pool (`TurnstileTaskProxyLess`). Use this when the site accepts the token from any IP. Billed at the proxyless rate published on peak.fo (currently $1.20 / 1,000).

```ts
const { token } = await client.solveTurnstile({
  url: "https://example.com/",
  sitekey: "0x4AAAAAAADnPIDROrmt1Wwj",
});
```

Runnable file: [`examples/turnstile-proxyless.ts`](examples/turnstile-proxyless.ts).

### With your proxy

Sites that bind the token to the solver IP need `turnstiletask` and your proxy. The string form is `http://user:pass@ip:port`. `https`, `socks4`, `socks5`, and `socks5h` are also passed through.

```ts
const { token } = await client.solveTurnstile({
  url: "https://example.com/",
  sitekey: "0x4AAAAAAADnPIDROrmt1Wwj",
  proxy: "http://user:pass@1.2.3.4:8080",
  action: "login",
  cdata: "session-42",
});
```

`action` and `cdata` are optional and must match the widget. Empty strings are omitted.

The same proxy as an object:

```ts
import { formatProxy } from "peak-client";

const proxy = formatProxy({
  protocol: "socks5",
  host: "2001:db8::1",
  port: 1080,
  username: "user",
  password: "p:q",
});

await client.solveTurnstile({
  url: "https://example.com/",
  sitekey: "0x4AAAAAAADnPIDROrmt1Wwj",
  proxy,
});
```

Runnable file: [`examples/turnstile-proxy.ts`](examples/turnstile-proxy.ts).

### Explicit task type

`taskType` replaces the automatic choice. You still need a proxy when you pick the proxied task yourself.

```ts
await client.solveTurnstile({
  url: "https://example.com/",
  sitekey: "0x4AAAAAAADnPIDROrmt1Wwj",
  proxy: "http://user:pass@1.2.3.4:8080",
  taskType: "turnstiletask",
});
```

| Field | Task when `taskType` is omitted |
| :--- | :--- |
| no `proxy` | `TurnstileTaskProxyLess` |
| `proxy` set | `turnstiletask` |

---

## Cloudflare 5-second challenge

`solveCloudflare5s` sends `cloudflare5stask`. The proxy has to be sticky: Cloudflare checks that one IP carries the whole session. Only a Windows Chrome user-agent is accepted. Pass `WINDOWS_CHROME_USER_AGENT` or leave `userAgent` unset and let Peak choose.

`html` is optional pre-fetched page HTML so Peak can skip its first GET.

```ts
import { Peak, WINDOWS_CHROME_USER_AGENT, buildClearanceRequest } from "peak-client";

const target = "https://example.com/";
const proxy = "http://user:pass@1.2.3.4:8080";

const solution = await client.solveCloudflare5s({
  url: target,
  proxy,
  userAgent: WINDOWS_CHROME_USER_AGENT,
  html: "<html>...</html>",
});

const next = buildClearanceRequest(target, solution);
// POST `next.body` to `next.url` through the same sticky proxy.
// Headers: next.headers (User-Agent, Referer, Content-Type, Cookie).
```

`solveCloudflareWaf` and `solveCloudFlareWAF` are aliases with the same arguments. The second spelling matches the official JavaScript SDK.

What you do with the body, in order:

1. Apply `solution.cookies` (`cf_clearance`, and `__cf_bm` when present).
2. POST `solution.attributes` as `application/x-www-form-urlencoded` to the target URL.
3. Set `Referer` to `{url}?__cf_chl_tk={cf_rt}`.
4. Keep the `user-agent` from `solution.headers` on every later request, still via the same proxy.

`buildClearanceRequest` returns `url`, `method`, `headers`, `body`, `cookies`, `cookieHeader`, `referer`, and `userAgent`. `clearanceUserAgent(solution)` returns only the user-agent string.

Runnable file: [`examples/cloudflare-5s.ts`](examples/cloudflare-5s.ts).

---

## AWS WAF

`solveAwsWaf` / `solveAWSWAF` send `awswaftask`. This is the mobile SDK challenge (iOS or Android), not a browser WAF page. `os` defaults to `"ios"`. Anything else throws `BadRequestError` locally. `sdkUrl` is sent unchanged (no slash is appended). The page `url` is still normalized.

```ts
const { token } = await client.solveAwsWaf({
  url: "https://app.example.com/",
  sdkUrl: "https://xxx.edge.sdk.awswaf.com/xxx/xxx",
  proxy: "http://user:pass@1.2.3.4:8080",
  userAgent: "ExampleApp/1.0 (iOS 17.0)",
  os: "ios",
});
```

The official Python client documents this task as switched off. Expect `TaskDisabledError` (HTTP 503, or a message that says the task is disabled) until Peak enables it. A disabled response is not a successful solve.

Runnable file: [`examples/aws-waf.ts`](examples/aws-waf.ts).

---

## Balance

`GET /balance`. No credit is spent.

Pay-per-solve:

```json
{ "type": "pay_per_solve", "balance": 12.5 }
```

Current package shape:

```json
{
  "type": "package",
  "package_name": "Turnstile 500K",
  "remaining_solves": 342819,
  "total_solves": 500000,
  "allowed_tasks": ["turnstiletask"],
  "expires_at": "2026-06-25T00:00:00Z",
  "days_remaining": 30
}
```

Older package responses used `package` instead of `package_name`. Both fields are on `PackageBalance`, and both are optional so either payload type-checks. `formatBalance` prefers `package_name`, then `package`.

```ts
const balance = await client.getBalance();
if (balance.type === "pay_per_solve") {
  console.log(balance.balance);
} else {
  console.log(balance.package_name ?? balance.package, balance.days_remaining);
}
```

Per-call retries:

```ts
await client.getBalance({ retries: 2, retryDelayMs: 250 });
```

---

## Raw solve

`solve` posts whatever you pass and then sets `appId` to the library id. A value you put in the body is replaced. That keeps the developer attribution stable.

```ts
const data = await client.solve({
  task_type: "TurnstileTaskProxyLess",
  url: "https://example.com/",
  sitekey: "0x4AAAAAAADnPIDROrmt1Wwj",
});
```

The second argument is retry and callback options. Those keys are not copied into the JSON body when you use the typed methods. If you put `retries` inside the raw object, Peak will see that field, so keep retry options in the second argument.

```ts
await client.solve(task, {
  retries: 2,
  onResult: (event) => console.log(event.taskType),
});
```

`onResult` on the call runs first, then the client-level hook, unless they are the same function.

---

## Error handling

Every failure throws `PeakError` or a subclass. `instanceof PeakError` still matches the subclasses. `status` is the HTTP status, or `0` for a local or transport failure. `code` is a stable string from `PeakErrorCode`. `data` (and the `response` alias) is the raw body when there was one.

```ts
import {
  AuthenticationError,
  BadRequestError,
  InsufficientBalanceError,
  Peak,
  PeakError,
  RateLimitError,
  RetryTimeoutError,
  SolveError,
  TaskDisabledError,
  UpstreamError,
} from "peak-client";

try {
  await client.solveTurnstile({ url: "https://example.com/", sitekey: "0x4..." });
} catch (err) {
  if (err instanceof AuthenticationError) {
    // 401, or the body says the API key is missing or invalid
  } else if (err instanceof InsufficientBalanceError) {
    // 402, insufficient balance, or package solves exhausted
  } else if (err instanceof BadRequestError) {
    // 400, or the client rejected the arguments before sending
  } else if (err instanceof RateLimitError) {
    // 429
  } else if (err instanceof TaskDisabledError) {
    // 503, or "disabled" / "no solver"
  } else if (err instanceof UpstreamError) {
    // 502
  } else if (err instanceof SolveError) {
    // unpaid solve failure, including HTTP 200 success:false
  } else if (err instanceof RetryTimeoutError) {
    // the retry budget ran out
  } else if (err instanceof PeakError) {
    console.error(err.status, err.code, err.message);
  }
}
```

Runnable file: [`examples/errors.ts`](examples/errors.ts).

### HTTP statuses

| Status | Class | Meaning |
| :--- | :--- | :--- |
| `200` and `success: false` | `SolveError`, or a more specific class if the message says so | Solve failed. Not billed. |
| `400` | `BadRequestError` | Missing or invalid fields. |
| `401` | `AuthenticationError` | API key missing, invalid, or expired. |
| `402` | `InsufficientBalanceError` | Not enough balance, or the package is used up. |
| `429` | `RateLimitError` | Rate limit. |
| `502` | `UpstreamError` | Peak or the target could not complete the call. |
| `503` | `TaskDisabledError` or `ServiceUnavailableError` | Task disabled or no solver capacity. |

`ServiceUnavailableError` extends `TaskDisabledError`, so one `catch` covers both. A 503 whose message names a disabled task stays `TaskDisabledError`.

### Documented error messages

Peak returns `{ "success": false, "error": "..." }`. The client also maps these phrases onto `code` when they appear at HTTP 200:

| Message | `code` | Class | What to do |
| :--- | :--- | :--- | :--- |
| `missing API key` | `missing_api_key` | `AuthenticationError` | Send `X-API-Key`. |
| `insufficient balance` | `insufficient_balance` | `InsufficientBalanceError` | Top up, or buy a package. |
| `package solves exhausted` | `package_solves_exhausted` | `InsufficientBalanceError` | Buy another package. |
| `Proxy connection failed` | `proxy_connection_failed` | `SolveError` | Check `http://user:pass@ip:port` and that the proxy answers. |
| `Request timed out` | `request_timed_out` | `SolveError` | Use a faster proxy, closer to the target. |
| `IP address is blocked by CloudFlare` | `ip_blocked` | `SolveError` | Switch to a cleaner proxy IP. |
| `No WAF challenge detected` | `no_waf_challenge` | `SolveError` | The page has no challenge, or the URL is wrong. |
| `Invalid sitekey` | `invalid_sitekey` | `SolveError` | The sitekey is scoped to the domain. |
| `Turnstile challenge was flagged` | `turnstile_flagged` | `SolveError` | Use a proxy with a cleaner reputation. |
| `Unsupported user agent` | `unsupported_user_agent` | `SolveError` | Windows Chrome only, on the 5-second task. |

A phrase that says the key is bad or the balance is gone wins over a generic HTTP 200 or 400, so you still get `AuthenticationError` or `InsufficientBalanceError`.

Local validation (`url` missing, bad scheme, empty sitekey, bad `os`, empty proxy, SOCKS in `httpProxy`) throws `BadRequestError` with status `0` and does not call the network.

Transport failures use status `0`. Axios `ECONNABORTED` / `ETIMEDOUT` sets `code` to `request_timed_out`. Other network errors use `network`.

### What gets retried

| Error | Retried |
| :--- | :--- |
| `SolveError` | yes |
| `RateLimitError` | yes |
| `TaskDisabledError` / `ServiceUnavailableError` | yes |
| `UpstreamError` | yes |
| Network `PeakError` (status 0) | yes |
| `AuthenticationError` | no |
| `InsufficientBalanceError` | no |
| `BadRequestError` | no |
| `RetryTimeoutError` | no |

A success is never retried, so a retry loop cannot buy the same token twice. `retries: 2` means one try plus two more after retryable failures.

```ts
const client = new Peak({
  apiKey: process.env.PEAK_API_KEY!,
  retries: 2,
  retryDelayMs: 500,
  retryTimeoutMs: 15_000,
});
```

If the budget expires, the thrown error is `RetryTimeoutError` and `cause` sits on `data`. See [`examples/retries.ts`](examples/retries.ts).

---

## Advanced usage

### Proxies

Two different proxies show up in this client:

| Option | Who connects | Protocols |
| :--- | :--- | :--- |
| `httpProxy` on the client | This Node process, to `api.peak.fo` | `http`, `https` |
| `proxy` on a solve | Peak's worker, to the target site | `http`, `https`, `socks4`, `socks5`, `socks5h` |

The 5-second challenge needs a sticky session proxy and you must reuse it for the clearance POST. Turnstile with a proxy needs that same IP to be the one that submits the token.

### Timeouts

`timeoutMs` bounds one HTTP call. `retryTimeoutMs` bounds the whole retry loop, including delays. Leave `retryTimeoutMs` unset to bound the loop only by `retries` and the per-call timeout.

### Callbacks

Peak's public API has no webhook or callback URL field. `onResult` is local. It runs after a successful solve and does not run when the call throws.

```ts
await client.solveTurnstile({
  url: "https://example.com/",
  sitekey: "0x4AAAAAAADnPIDROrmt1Wwj",
  onResult: (event) => {
    console.log(event.taskType, event.data);
  },
});
```

### Custom Axios

Pass `axios` for tests or a proxy agent you already configured. The instance must send JSON and must set `X-API-Key` itself if you do not use the default client. `baseUrl` on `Peak` is ignored in that case; set `baseURL` on the instance.

### Task constants

```ts
import { TaskType } from "peak-client";

TaskType.Turnstile; // "turnstiletask"
TaskType.TurnstileProxyLess; // "TurnstileTaskProxyLess"
TaskType.Cloudflare5s; // "cloudflare5stask"
TaskType.AwsWaf; // "awswaftask"
```

---

## TypeScript

The package ships `dist/index.d.ts`. Strict mode is the source setting. Useful exports:

| Name | Kind |
| :--- | :--- |
| `Peak`, `PeakClient` | Client class. `PeakClient` extends `Peak`. |
| `PeakOptions`, `CallOptions`, `SolveEvent` | Config and hooks. |
| `SolveTurnstileParams`, `TurnstileResult` | Turnstile. |
| `SolveCloudflare5sParams`, `Cloudflare5sResult` | 5-second challenge. |
| `SolveAwsWafParams`, `AwsWafResult`, `AwsWafOs` | AWS WAF. |
| `BalanceData`, `PayPerSolveBalance`, `PackageBalance` | Balance. |
| `ProxyConfig`, `ProxyInput` | Proxy object or string. |
| `ClearanceRequest` | Follow-up POST. |
| `PeakError` and the subclasses, `PeakErrorCode` | Errors. |
| `TaskType`, `WINDOWS_CHROME_USER_AGENT`, `APP_ID` | Constants. |
| `formatProxy`, `formatBalance`, `buildClearanceRequest` | Helpers. |

`PeakClient` is the class name used by the official SDK. It is the same client.

---

## Comparison

Public clients reviewed while building this package: [`peakfo` on npm 1.0.0](https://www.npmjs.com/package/peakfo) (official JavaScript), [`peakfo` on PyPI 1.1.0](https://pypi.org/project/peakfo/) (official Python), and [`github.com/PeakFO/peakfo-go`](https://github.com/PeakFO/peakfo-go). Browser wrappers such as `playwright-turnstile` and `scrapy-turnstile` call the same API for one task; they are not general clients.

| | peak-client | peakfo npm 1.0.0 | peakfo PyPI 1.1.0 | peakfo-go |
| :--- | :--- | :--- | :--- | :--- |
| Turnstile with proxy | yes | yes | yes | yes |
| Turnstile proxyless | yes | no (always `turnstiletask`) | yes | not in the Feb 2026 client |
| `action` / `cdata` | yes | yes | yes | partial |
| 5-second challenge | yes | yes | yes | yes |
| `user_agent` and `html` | yes | no | yes | partial |
| AWS WAF `awswaftask` | yes | yes | yes (documented disabled) | yes |
| Package balance fields | both shapes | loose `type` | raw dict | raw struct |
| Error class per HTTP status | 400, 401, 402, 429, 502, 503, 200 | message keywords | 401, 402, disabled, else solve | sentinel errors |
| Retries and a retry deadline | yes | no | no | caller uses context |
| Clearance POST helper | yes | no | no | no |
| Proxy object helper | yes | no | no | no |
| HTTP proxy to the API | yes | no | no | caller transport |
| Custom base URL and timeout | yes | yes | timeout, base URL | yes |
| Library `appId` on every solve | always | no | optional argument | no |
| Runs in the browser | no (Node, Axios) | yes (fetch) | no | no |
| Async and sync | async (Node) | async | sync only | sync with context |

---

## FAQ

**Does a retry charge me twice?**
No. The loop retries only failed or unpaid calls. A `success: true` response is returned immediately.

**Where is `getTaskResult`?**
Peak does not create a task id. `POST /solve` returns the token or the clearance in that response. There is nothing to poll. `timeoutMs` is the wait.

**Can I set my own `appId`?**
No. The client writes the library id on every solve and overwrites a body field of the same name. Referral links (`https://peak.fo/?ref=...`) are a separate dashboard feature and are not a request parameter.

**Is there a report or refund method?**
The public API documents `POST /solve` and `GET /balance` only. Failed solves are already not billed. There is no report endpoint to call.

**Is there a webhook?**
No request field for one. Use `onResult` in-process.

**Why did AWS WAF throw?**
The task exists in the official SDKs and is currently disabled on the platform. `TaskDisabledError` is the expected result until Peak turns it on.

**Which URL form does Peak want?**
An absolute URL whose path ends with `/`. The client adds that slash. It does not rewrite the host or the query.

---

## Examples

| File | Calls the network | Spends credit |
| :--- | :--- | :--- |
| [`examples/check.ts`](examples/check.ts) | balance only | no |
| [`examples/retries.ts`](examples/retries.ts) | balance only | no |
| [`examples/errors.ts`](examples/errors.ts) | balance with the key you set, or a dummy key | no |
| [`examples/turnstile-proxyless.ts`](examples/turnstile-proxyless.ts) | solve | yes, if it succeeds |
| [`examples/turnstile-proxy.ts`](examples/turnstile-proxy.ts) | solve | yes, if it succeeds |
| [`examples/cloudflare-5s.ts`](examples/cloudflare-5s.ts) | solve | yes, if it succeeds |
| [`examples/aws-waf.ts`](examples/aws-waf.ts) | solve | yes, if it succeeds |

```bash
PEAK_API_KEY=pk_... npx tsx examples/check.ts
```

---

## Contributing

Issues and pull requests: <https://github.com/TysikGG/api-kit> (`peak/js`).

```bash
cd peak/js
npm install
npm test          # Jest, mocked HTTP, coverage
npm run typecheck
npm run build
npm run test:live # skipped unless PEAK_API_KEY is set; balance only
```

Unit tests mock Axios. The live test only calls `GET /balance`. Please leave `APP_ID` in `src/client.ts` as it is; solves are attributed to that developer id.

---

## License

[ISC](LICENSE) © api-kit contributors
