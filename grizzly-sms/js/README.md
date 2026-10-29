# grizzly-sms

[![npm version](https://img.shields.io/npm/v/grizzly-sms.svg)](https://www.npmjs.com/package/grizzly-sms)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/node/v/grizzly-sms.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](https://www.typescriptlang.org/)

TypeScript client for the [Grizzly SMS](https://grizzlysms.com) activation API, the documented rent API, the crypto deposit wallet, and the partner push protocol. The activation handler speaks the sms-activate protocol on `GET /stubs/handler_api.php`.

Official documentation:

- Activation protocol: <https://grizzlysms.com/docs>
- Utility endpoints and crypto wallet: <https://grizzlysms.com/docs/utility>
- Partner push protocol: <https://grizzlysms.com/docs/partner>
- Machine-readable client spec: <https://api.grizzlysms.com/docs/client/swagger.json>

## Table of contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick start](#quick-start)
- [Activation methods](#activation-methods)
- [Prices, catalogs, and stock](#prices-catalogs-and-stock)
- [Rentals](#rentals)
- [Wallet](#wallet)
- [Polling helpers](#polling-helpers)
- [Webhooks](#webhooks)
- [Partner push](#partner-push)
- [Error handling](#error-handling)
- [Advanced usage](#advanced-usage)
- [TypeScript](#typescript)
- [Comparison](#comparison)
- [FAQ](#faq)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Features

- Every documented activation action: balance (including `version=2`), `getNumber`, `getNumberV2`, `setStatus`, `getStatus`, `getStatusV2`, prices V1/V2/V3, services, countries, active activations, and `getNumbersStatus`.
- Number filters from the current docs and the official MCP client: `maxPrice`, `minPrice`, `providerIds`, `exceptProviderIds`, `phoneException`, `operator`, `forward`, and `activationType`.
- Rent API from the service's older public docs: `getRentNumber`, `continueRentNumber`, `getRentStatus`, `setRentStatus`, `getRentHistory`, `getRentPrices`.
- `waitForCode`, `waitForMessage`, and `activate` with timeouts, status callbacks, and abort flags.
- Retries for transport failures, HTTP 408/429/5xx, and retryable API bodies (`ERROR_SQL`, `SQL_ERROR`, `SERVER_ERROR`). Purchases and status changes are not retried unless you opt in.
- HTTP proxy URL, custom base URL, custom timeout, and an injectable axios instance.
- One error class per known API code, plus HTTP, network, timeout, and abort errors.
- Crypto wallet lookup (`GET /public/crypto/wallet`) and a parser for profile webhook bodies.
- Partner outbound pushes (`PUSH_SMS`, `PUSH_CALL`, `PUSH_CALL_RECORD`) and helpers for inbound `GET_SERVICES`, `GET_NUMBER`, and `FINISH_ACTIVATION`.

## Installation

```bash
npm install grizzly-sms
```

Node.js 18 or newer. The package ships compiled JavaScript and `.d.ts` files.

## Configuration

```ts
import { GrizzlySms } from "grizzly-sms";

const sms = new GrizzlySms({
  apiKey: process.env.GRIZZLY_API_KEY!,
  baseUrl: "https://api.grizzlysms.com",
  timeoutMs: 30_000,
  retries: 2,
  retryDelayMs: 1_000,
  retryMutations: false,
  proxy: "http://127.0.0.1:8080",
});
```

A string argument is the API key with every other option at its default:

```ts
const sms = new GrizzlySms(process.env.GRIZZLY_API_KEY!);
```

| Option | Default | Meaning |
| --- | --- | --- |
| `apiKey` | required | Profile API key. Blank keys throw `BadKeyError`. |
| `baseUrl` | `https://api.grizzlysms.com` | API origin. Trailing slashes are removed. |
| `timeoutMs` | `30000` | Axios timeout in milliseconds. |
| `retries` | `0` | Extra attempts after the first request. |
| `retryDelayMs` | `1000` | Pause between attempts. |
| `retryMutations` | `false` | Also retry purchases and status changes. |
| `proxy` | unset | `http://` or `https://` proxy URL. Ignored when `axios` is set. |
| `axios` | unset | Injected axios instance. You own its lifecycle. |

Every handler call sends `ref_id=tysik`. That partner attribution is fixed; a `ref_id` you pass to `call()` is overwritten. The crypto wallet request does not send `ref_id`. The User-Agent is `grizzly-sms/2.0.0`.

`getNumber`, `getNumberV2`, `setStatus`, `getRentNumber`, `continueRentNumber`, and `setRentStatus` are mutating. With the default `retryMutations: false` they run once, so a timeout cannot buy a second number.

## Quick start

This path only reads the balance and the country catalog.

```ts
import { GrizzlySms } from "grizzly-sms";

const sms = new GrizzlySms({ apiKey: process.env.GRIZZLY_API_KEY! });
const balance = await sms.getBalance();
const countries = await sms.getCountries();
console.log(balance, countries.length);
```

Runnable file: [`examples/check.ts`](examples/check.ts).

## Activation methods

### `getBalance(options?)`

Returns the account balance as a number. `version: 2` asks for the reserve-aware balance; the client still returns the first amount in `ACCESS_BALANCE`.

```ts
const balance = await sms.getBalance();
const reserveAware = await sms.getBalance({ version: 2 });
```

### `getNumber(params)`

Orders a number and returns `{ activationId, phoneNumber }`. This spends balance.

```ts
const ordered = await sms.getNumber({
  service: "tg",
  country: "any",
  maxPrice: 1,
  minPrice: 0.1,
  providerIds: [1, 7],
  exceptProviderIds: "3,4",
  phoneException: ["1628", "147220"],
  operator: "any",
  forward: true,
  activationType: 0,
});
console.log(ordered.activationId, ordered.phoneNumber);
```

`country` may be a numeric id, `"any"`, `"*"`, or omitted. `forward: true` is sent as `1` and `false` as `0`. Lists are joined with commas.

### `getNumberV2(params)`

Same query as `getNumber`, plus price, currency, and timestamps.

```ts
const ordered = await sms.getNumberV2({ service: "wa", country: 16, maxPrice: 0.5 });
console.log(ordered.activationCost, ordered.currency, ordered.canGetAnotherSms);
console.log(ordered.activationTime, ordered.activationEnd);
```

### `setStatus(id, status, forward?)`

Changes an activation. Prefer the named constants.

```ts
import { ActivationAction } from "grizzly-sms";

await sms.setStatus(ordered.activationId, ActivationAction.Ready);
await sms.setStatus(ordered.activationId, ActivationAction.Retry);
await sms.setStatus(ordered.activationId, ActivationAction.Complete);
await sms.setStatus(ordered.activationId, ActivationAction.Cancel);
await sms.setStatus(ordered.activationId, ActivationAction.CancelAlt);
await sms.setStatus(ordered.activationId, 6, "447911000000");
```

| Status | Result text | Meaning |
| --- | --- | --- |
| `1` | `ACCESS_READY` | The SMS was requested. |
| `3` | `ACCESS_RETRY_GET` | Another code was requested. |
| `6` | `ACCESS_ACTIVATION` | The activation is finished. |
| `8` or `-1` | `ACCESS_CANCEL` | The activation was cancelled. |

The optional third argument is the `forward` phone passed through to `setStatus`.

### `ready` / `requestAnotherCode` / `complete` / `cancel`

```ts
await sms.ready(ordered.activationId);
await sms.requestAnotherCode(ordered.activationId);
await sms.complete(ordered.activationId);
await sms.cancel(ordered.activationId);
await sms.cancel(ordered.activationId, -1);
```

`cancel` defaults to status `8`.

### `getStatus(id)`

```ts
const status = await sms.getStatus(ordered.activationId);
if (status.status === "STATUS_OK") {
  console.log(status.code);
}
```

`STATUS_WAIT_CODE` means the code has not arrived. `STATUS_WAIT_RETRY` keeps the previous code in `code`. `STATUS_WAIT_RESEND` means another SMS can be requested. `STATUS_CANCEL` means the activation is closed.

### `getStatusV2(id)`

JSON status, including SMS and call payloads.

```ts
const status = await sms.getStatusV2(ordered.activationId);
console.log(status.verificationType, status.sms?.text, status.call?.code);
```

### `call(action, params?)`

Escape hatch for an action this client does not wrap yet. Known error strings still throw. `ref_id` stays `tysik`.

```ts
const raw = await sms.call("getBalance");
```

## Prices, catalogs, and stock

### `getPrices` / `getPricesV2` / `getPricesV3`

```ts
const prices = await sms.getPrices({ service: "tg" });
const country = prices["16"]?.tg;
console.log(country?.cost, country?.count);

const buckets = await sms.getPricesV2({ service: "tg", country: 0 });
const offers = await sms.getPricesV3({ service: "tg", country: 0 });
```

`getPrices` maps country to service to `{ cost, count }`. `getPricesV2` maps country to service to a price string to a count. `getPricesV3` adds per-provider offers. Some hosts answer `BAD_ACTION` for a price action; that error is raised as `BadActionError`.

### `findPrices(params?)`

Flattens `getPrices` and sorts by cost, then by count descending.

```ts
const quotes = await sms.findPrices({
  service: "tg",
  country: 16,
  minCount: 10,
  maxPrice: 1,
});
const cheapest = quotes[0];
```

### `getServices` / `getCountries` / `getActiveActivations`

```ts
const services = await sms.getServices();
const telegram = services.find((service) => service.code === "tg");

const countries = await sms.getCountries();
const ukraine = countries.find((country) => country.id === 1);
console.log(ukraine?.eng, ukraine?.visible, ukraine?.retry);

const active = await sms.getActiveActivations();
```

`getActiveActivations` returns `[]` when the API answers `null`.

### `getNumbersStatus(params?)`

```ts
const stock = await sms.getNumbersStatus({ country: 0, operator: "any" });
const telegramStock = stock.find((row) => row.service === "tg");
console.log(telegramStock?.count, telegramStock?.suffix);
```

Keys look like `tg_0`. The suffix after the underscore is kept on `suffix`.

## Rentals

Rent actions follow the service's previously published rent documentation. They return JSON `{ status, phone | values }` and spend balance when a number is rented.

### `getRentNumber` / `continueRent`

```ts
import { RentAction } from "grizzly-sms";

const rented = await sms.getRentNumber({ service: "tg", country: 0, rentTime: 4 });
console.log(rented.id, rented.number, rented.endDate);

const extended = await sms.continueRent(rented.id, 4);
```

`rentTime` is hours.

### `getRentStatus` / `setRentStatus` / `finishRent` / `cancelRent`

```ts
const rent = await sms.getRentStatus(rented.id);
console.log(rent.quantity);
for (const message of rent.messages) {
  console.log(message.phoneFrom, message.text, message.date);
}

await sms.finishRent(rented.id);
await sms.setRentStatus(rented.id, RentAction.Cancel);
await sms.cancelRent(rented.id);
```

`RentAction.Finish` is `1`. `RentAction.Cancel` is `2`.

### `getRentHistory` / `getRentPrices`

```ts
const history = await sms.getRentHistory(rented.id);
for (const entry of history.entries) {
  console.log(entry.date, entry.price, entry.hours);
}

const rentPrices = await sms.getRentPrices({ service: "tg", country: 0, rentTime: 4 });
```

## Wallet

`GET /public/crypto/wallet`. Defaults are USDT on Tron. This request does not include `ref_id`.

```ts
const wallet = await sms.getWallet();
const usdt = await sms.getWallet({ coin: "usdt", network: "tron" });
console.log(usdt.walletAddress);
```

Documented top-up amounts start at 50 USD. The client only reads the address.

## Polling helpers

### `waitForCode(id, options?)`

Polls `getStatus` until `STATUS_OK`. `STATUS_CANCEL` throws `AbortedError` with code `STATUS_CANCEL`. A deadline throws `TimeoutError`.

```ts
const received = await sms.waitForCode(ordered.activationId, {
  intervalMs: 3_000,
  timeoutMs: 120_000,
  onStatus(status) {
    console.log(status.status);
  },
});
console.log(received.code);
```

`signal` is any object with an `aborted` boolean, including a small adapter around `AbortSignal`:

```ts
const controller = new AbortController();
const signal = {
  get aborted() {
    return controller.signal.aborted;
  },
};
setTimeout(() => controller.abort(), 10_000);
const received = await sms.waitForCode(ordered.activationId, { signal });
```

### `waitForMessage(id, options?)`

Polls `getStatusV2` until `sms.code` or `call.code` is non-empty. SMS wins when both are present.

```ts
const message = await sms.waitForMessage(ordered.activationId, {
  timeoutMs: 120_000,
  onStatus(status) {
    console.log(status.sms?.text ?? status.call?.text);
  },
});
console.log(message.source, message.code, message.text, message.verificationType);
```

### `activate(params, options?)`

`getNumberV2`, then `ready` (unless `ready: false`), then `waitForCode`.

```ts
const result = await sms.activate(
  { service: "tg", country: 12, maxPrice: 1 },
  {
    timeoutMs: 120_000,
    cancelOnTimeout: true,
    cancelOnError: true,
    onStatus(status) {
      console.log(status.status);
    },
  },
);
console.log(result.order.phoneNumber, result.code);
await sms.complete(result.order.activationId);
```

`cancelOnTimeout` cancels on `TIMEOUT`. `cancelOnError` cancels on any other error except `STATUS_CANCEL`. A failed cancel is swallowed and the original error is rethrown. `activate` spends balance.

## Webhooks

Profile settings accept up to three webhook URLs. Grizzly does not publish a separate webhook schema. `parseActivationWebhook` accepts the sms-activate-compatible body `{ activationId, service, text, code, country, receivedAt }` and the snake_case aliases `activation_id` and `received_at`.

```ts
import { parseActivationWebhook } from "grizzly-sms";
import express from "express";

const app = express();
app.use(express.json());
app.post("/grizzly", (req, res) => {
  const event = parseActivationWebhook(req.body);
  console.log(event.activationId, event.code, event.text);
  res.sendStatus(200);
});
```

Registering the URL is done in the Grizzly profile, not through `handler_api.php`.

## Partner push

`GrizzlyPartner` posts to `/agent/api/sms`. A status other than `SUCCESS` is retried only when `retries` is set. The protocol pause defaults to 10 seconds (`retryDelayMs`).

```ts
import { GrizzlyPartner } from "grizzly-sms";

const partner = new GrizzlyPartner({
  key: process.env.GRIZZLY_PARTNER_KEY!,
  baseUrl: "https://api.grizzlysms.com",
  timeoutMs: 30_000,
  proxy: "http://127.0.0.1:8080",
});

const smsPush = await partner.pushSms({
  smsId: 1,
  phone: 447472190082,
  phoneFrom: "Microsoft",
  text: "code 5015",
  retries: 2,
  retryDelayMs: 10_000,
});

const callPush = await partner.pushCall({
  callId: 10,
  phone: 447472190082,
  phoneFrom: "100",
});

const recordPush = await partner.pushCallRecord({
  callId: 10,
  phone: 447472190082,
  phoneFrom: "100",
  text: "your code is 5015",
});

const filePush = await partner.pushCallRecord({
  callId: 11,
  phone: 447472190082,
  phoneFrom: "100",
  file: Buffer.from("audio"),
  filename: "call.wav",
});
```

`pushCallRecord` requires `text` or `file`. The upload is `multipart/form-data`. Allowed recording types in the protocol are wav, amr, mp3, and ogg. A missing `filename` is sent as `record`.

Inbound requests are calls Grizzly makes to your server. The helpers classify them and build the documented replies.

```ts
import {
  parsePartnerRequest,
  partnerFinishResponse,
  partnerNumberResponse,
  partnerServicesResponse,
} from "grizzly-sms";

const inbound = parsePartnerRequest(body);
if (inbound.action === "GET_SERVICES") {
  reply(partnerServicesResponse([{ country: 0, operatorMap: { any: { tg: 10 } } }]));
}
if (inbound.action === "GET_NUMBER") {
  reply(partnerNumberResponse({ number: 79990001122, activationId: 15 }));
}
if (inbound.action === "FINISH_ACTIVATION") {
  reply(partnerFinishResponse());
}
```

`FINISH_ACTIVATION` status `1` means forbidden, `3` sold, `4` cancelled, and `5` returned. Any other status raises `BadStatusError`.

## Error handling

Public methods throw `GrizzlySmsError`. Subclasses keep `instanceof GrizzlySmsError` working.

```ts
import { GrizzlySmsError, NoNumbersError, TimeoutError } from "grizzly-sms";

try {
  await sms.getNumber({ service: "tg", country: 0 });
} catch (error) {
  if (error instanceof NoNumbersError) {
    console.log(error.code, error.raw);
  } else if (error instanceof TimeoutError) {
    console.log("poll deadline");
  } else if (error instanceof GrizzlySmsError) {
    console.log(error.code);
  }
}
```

| Code | Class |
| --- | --- |
| `BAD_KEY` | `BadKeyError` |
| `BAD_ACTION` | `BadActionError` |
| `BAD_SERVICE` | `BadServiceError` |
| `BAD_STATUS` | `BadStatusError` |
| `BAD_COUNTRY` | `BadCountryError` |
| `NO_BALANCE` | `NoBalanceError` |
| `NO_NUMBERS` | `NoNumbersError` |
| `NO_ACTIVATION` | `NoActivationError` |
| `NO_KEY` | `NoKeyError` |
| `ERROR_SQL` | `ErrorSqlError` |
| `SQL_ERROR` | `SqlErrorError` |
| `SERVER_ERROR` | `ServerError` |
| `SERVICE_UNAVAILABLE_REGION` | `ServiceUnavailableRegionError` |
| `WRONG_MAX_PRICE` | `WrongMaxPriceError` (`WRONG_MAX_PRICE:0.5` keeps the suffix on `raw`) |
| `USERS_IP_IS_NOT_ALLOWED` | `UsersIpNotAllowedError` |
| `SERVICE_PROHIBITED` | `ServiceProhibitedError` (also the "prohibited for sale" sentence) |
| `EMPTY_RESPONSE` | `EmptyResponseError` |
| `NETWORK` | `NetworkError` |
| `TIMEOUT` | `TimeoutError` |
| `ABORTED` | `AbortedError` |
| `STATUS_CANCEL` | `AbortedError` |
| `UNEXPECTED_RESPONSE` | `UnexpectedResponseError` |
| `INVALID_TIME` | `InvalidTimeError` |
| `NO_ID_RENT` | `NoIdRentError` |
| `RENT_DIE` | `RentDieError` |
| `CANT_CANCEL` | `CantCancelError` |
| `ALREADY_FINISH` | `AlreadyFinishError` |
| `ALREADY_CANCEL` | `AlreadyCancelError` |
| `INCORECT_STATUS` | `IncorrectStatusError` (docs spelling; `INCORRECT_STATUS` maps here too) |
| `INVALID_PHONE` | `InvalidPhoneError` |
| `OPERATORS_NOT_FOUND` | `OperatorsNotFoundError` |
| `OUT_OF_STOCK` | `OutOfStockError` |
| `ORDER_ALREADY_EXISTS` | `OrderAlreadyExistsError` |
| `HTTP_<status>` | `HttpStatusError` (`.status` is the numeric code) |

JSON `{ "status": "error", "error": "NO_BALANCE" }` is raised the same way as a plain-text code. `ACCESS_*` and `STATUS_*` bodies are returned, except `STATUS_CANCEL` inside the wait helpers.

## Advanced usage

### Proxies

```ts
const sms = new GrizzlySms({
  apiKey: process.env.GRIZZLY_API_KEY!,
  proxy: "http://user:pass@127.0.0.1:8080",
});
```

An invalid proxy URL throws `BadActionError` before any request. When you pass `axios`, set the proxy on that instance; `proxy` is ignored.

### Timeouts and retries

```ts
const sms = new GrizzlySms({
  apiKey: process.env.GRIZZLY_API_KEY!,
  timeoutMs: 15_000,
  retries: 3,
  retryDelayMs: 500,
});
```

Retried HTTP statuses are 408, 429, 500, 502, 503, and 504. Retried API bodies are `ERROR_SQL`, `SQL_ERROR`, and `SERVER_ERROR`.

```ts
const aggressive = new GrizzlySms({
  apiKey: process.env.GRIZZLY_API_KEY!,
  retries: 2,
  retryMutations: true,
});
```

`retryMutations` can buy or cancel twice. Leave it off unless the operation is idempotent for your account.

### Custom axios

```ts
import axios from "axios";

const http = axios.create({ baseURL: "https://api.grizzlysms.com" });
const sms = new GrizzlySms({ apiKey: process.env.GRIZZLY_API_KEY!, axios: http });
```

### Low-level handler

```ts
const text = await sms.call<string>("getStatus", { id: ordered.activationId });
```

## TypeScript

The package is strict TypeScript. Import values and types from the root:

```ts
import {
  ActivationAction,
  GrizzlySms,
  GrizzlySmsError,
  RentAction,
  type ActivationWebhook,
  type OrderedNumberV2,
  type PriceQuote,
} from "grizzly-sms";
```

`GrizzlySms`, `GrizzlyPartner`, and the parsers are async where they do I/O. Webhook and partner-inbound helpers are synchronous.

## Comparison

| Capability | grizzly-sms 2.0.0 | grizzly-sms 1.1.1 | Official MCP client | giwih/grizzlysms | kurosaki-sol bot |
| --- | --- | --- | --- | --- | --- |
| Activation order, status, balance | yes | balance and price sort | yes | yes | yes |
| `getNumberV2` and price catalogs V1–V3 | yes | no | prices, countries, services | cost and count | no |
| `operator`, `forward`, `activationType`, balance `version` | yes | no | yes | no | no |
| Rent API | yes | no | no | no (called out as unsupported) | no |
| `getNumbersStatus` | yes | no | no | count helper | no |
| Wait helpers with timeout and cancel | yes | no | no | `get_code` loop | polling |
| Per-code error classes | yes | single error | string match | string match | fatal code set |
| Retries, proxy, custom base URL | yes | no | base URL | no | rate limit |
| Partner push and inbound parsers | yes | no | no | no | no |
| Webhook body parser | yes | no | no | no | no |
| Python sync and async | sibling package | no | no | Python only, thinner | no |

PyPI search at the time of this release found no other Grizzly SMS client besides `grizzly-sms-client` in this repository. npm `grizzly-sms` 1.1.1 is the previous release of this package. `@iflow-mcp/grizzlysms-git-grizzly-sms-mcp` republishes the official MCP server, which wraps a subset of the activation API.

## FAQ

**Does `getNumber` spend money?** Yes. `getNumber`, `getNumberV2`, `activate`, and `getRentNumber` debit the balance. `getBalance`, catalogs, prices, and `getStatus` do not.

**Why is `ref_id` always `tysik`?** It is the partner attribution baked into this client. It is not a user setting.

**Can I point the client at a test host?** Set `baseUrl`. Paths stay `/stubs/handler_api.php`, `/public/crypto/wallet`, and `/agent/api/sms`.

**What if prices return `BAD_ACTION`?** The action is still part of the published docs, so the client sends it and surfaces `BadActionError`. Use `getPricesV2` or `getPricesV3` when the host supports those.

**How do I receive a code without polling?** Add a URL in the Grizzly profile and parse the body with `parseActivationWebhook`. Polling remains the documented handler flow.

**Which cancel code should I send?** `8` (`ActivationAction.Cancel`) is the default. `-1` is the documented alternate and returns the same `ACCESS_CANCEL`.

## Examples

| File | What it does |
| --- | --- |
| [`examples/check.ts`](examples/check.ts) | Balance and country count. Read-only. |
| [`examples/activation.ts`](examples/activation.ts) | Order, wait, complete, and the V2 status path. Spends balance. |
| [`examples/catalog.ts`](examples/catalog.ts) | Prices, stock, services, activations, wallet. Read-only. |
| [`examples/rent.ts`](examples/rent.ts) | Rent, read messages, finish. Spends balance. |
| [`examples/partner.ts`](examples/partner.ts) | Partner pushes and inbound reply builders. |
| [`examples/webhook.ts`](examples/webhook.ts) | Parse a webhook body with no HTTP server. |

```bash
GRIZZLY_API_KEY=... npx tsx examples/check.ts
```

## Contributing

Issues and patches belong on the [api-kit](https://github.com/TysikGG/api-kit) repository, directory `grizzly-sms/js`.

```bash
npm install
npm test
npx tsc -p tsconfig.json
```

`npm test` runs unit tests with coverage. Live tests call the real API, stay skipped unless `GRIZZLY_API_KEY` is set, and only read the balance:

```bash
GRIZZLY_API_KEY=... npm run test:live
```

Keep `ref_id` as `tysik` and the User-Agent as `grizzly-sms/2.0.0`.

## License

ISC. See [LICENSE](LICENSE).
