# fixedfloat-client

[![npm version](https://img.shields.io/npm/v/fixedfloat-client.svg)](https://www.npmjs.com/package/fixedfloat-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/fixedfloat-client.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org/)

Typed TypeScript client for the [FixedFloat](https://ff.io/api) API v2: currencies, fixed and float quotes, the public XML rate file, order creation, polling, emergency choices, email notifications, and deposit QR codes.

Official API reference: <https://ff.io/api>

## Contents

- [Features](#features)
- [Comparison](#comparison)
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick start](#quick-start)
- [Currencies](#currencies)
- [Quotes](#quotes)
- [XML rates](#xml-rates)
- [Create an order](#create-an-order)
- [Read an order](#read-an-order)
- [Wait for an order](#wait-for-an-order)
- [Emergency choice](#emergency-choice)
- [Email notifications](#email-notifications)
- [QR codes](#qr-codes)
- [Raw requests](#raw-requests)
- [Error handling](#error-handling)
- [Order and quote codes](#order-and-quote-codes)
- [Advanced usage](#advanced-usage)
- [TypeScript](#typescript)
- [Examples](#examples)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

## Features

- Every public v2 method: `ccies`, `price`, `create`, `order`, `emergency`, `setEmail`, `qr`, plus `GET /rates/{fixed|float}.xml`.
- HMAC-SHA256 `X-API-SIGN` over the exact JSON body.
- Fixed (`fixed`) and floating (`float`) rates, `from` and `to` directions, `ccies` and `usd` quote flags, affiliate `afftax`.
- Shorthand quotes compatible with `fixedfloat-api` (`"0.1 ETH", "BTC"` and `"ETH", "0.1 BTC"`).
- Parsed XML rates with pair filters. Use this for the full board. Use `getPrice` for one amount.
- Order polling with timeout, interval, target statuses, and `AbortSignal`.
- Retries with exponential backoff for network errors, timeouts, HTTP 429 and 5xx. `POST /create` is not retried.
- Proxy URL, custom API base URL, custom rates origin, timeout, and extra headers.
- Typed orders, including the refund side (`back`), emergency block, and transaction confirmations.
- QR list (`title`, `src`, `checked`) with `result.src` still pointing at the default image.
- Distinct error classes for API, HTTP, auth, rate limit, network, and timeout failures.

## Comparison

| Capability | fixedfloat-client | ff-io | fixedfloat | fixedfloat-api |
| :--- | :---: | :---: | :---: | :---: |
| Typed TypeScript | yes | no | no | no |
| Currencies, price, create, order | yes | yes | yes | yes |
| `ccies` and `usd` on quotes | yes | no | no | no |
| XML rates export, parsed | yes | raw XML | no | no |
| Email notifications | yes | yes | no | no |
| QR code list | yes | yes | yes | no |
| Emergency memo / tag | yes | address only | yes | address only |
| Order polling with timeout | yes | no | no | no |
| Retries and proxy | yes | no | no | no |
| Error subclasses | yes | no | no | no |

Python users get the same surface, including an async client, from [`fixedfloat-client` on PyPI](https://pypi.org/project/fixedfloat-client/). Community Python wrappers (`FixedFloatApi`, `fixedfloat-py`, `fixedfloat`) cover the basic POST methods and do not ship polling, retries, XML parsing, or an async client.

## Installation

```bash
npm install fixedfloat-client
```

Node.js 18 or newer.

Create an API key and secret in the FixedFloat account under API management. The secret is the HMAC key and is shown once.

## Configuration

```typescript
import { FixedFloat } from "fixedfloat-client";

const ff = new FixedFloat({
  apiKey: process.env.FIXEDFLOAT_API_KEY,
  apiSecret: process.env.FIXEDFLOAT_API_SECRET,
  baseUrl: "https://ff.io/api/v2",
  ratesBaseUrl: "https://ff.io",
  timeout: 15_000,
  retries: 2,
  retryDelay: 200,
  proxy: "http://user:pass@127.0.0.1:8080",
  headers: { "X-Request-Id": "checkout-1" },
});
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | unset | Sent as `X-API-KEY`. |
| `apiSecret` | `string` | unset | HMAC-SHA256 key for `X-API-SIGN`. The message is the raw JSON body. |
| `baseUrl` | `string` | `https://ff.io/api/v2` | JSON API origin and prefix. |
| `ratesBaseUrl` | `string` | `https://ff.io` | Origin for `/rates/float.xml` and `/rates/fixed.xml`. |
| `timeout` | `number` | `15000` | Per-request timeout in milliseconds. |
| `retries` | `number` | `2` | Extra attempts after a transient failure. Business errors are not retried. `POST /create` is never retried. |
| `retryDelay` | `number` | `200` | Base backoff in milliseconds. Attempt n waits `retryDelay * 2^n`. |
| `proxy` | `string` | unset | `http://` or `https://` proxy URL. Userinfo is decoded into axios proxy auth. |
| `headers` | `Record<string, string>` | `{}` | Extra headers on signed JSON calls. `X-API-KEY` and `X-API-SIGN` overwrite collisions. |

Price and create requests always include the package referral code. `afftax` is optional and only changes the affiliate percentage when you pass it.

## Quick start

The check below lists currencies and quotes 0.01 BTC to ETH. It does not create an order.

```typescript
import { FixedFloat } from "fixedfloat-client";

const ff = new FixedFloat({
  apiKey: process.env.FIXEDFLOAT_API_KEY,
  apiSecret: process.env.FIXEDFLOAT_API_SECRET,
});

const currencies = await ff.getCurrencies();
console.log(currencies.length);

const price = await ff.getPrice({
  fromCcy: "BTC",
  toCcy: "ETH",
  amount: 0.01,
  direction: "from",
  type: "float",
});
console.log(`${price.from.amount} ${price.from.code} -> ${price.to.amount} ${price.to.code}`);
```

## Currencies

`POST /ccies`. No body. Returns every asset FixedFloat can show, including network, receive/send flags, memo name, logo, color, priority, and token contract when the asset is not native.

```typescript
const currencies = await ff.getCurrencies();
// alias: await ff.ccies();

const usdtTrc = currencies.find((item) => item.code === "USDTTRC");
if (usdtTrc?.tag) {
  console.log(`Destination field: ${usdtTrc.tag}`);
}
console.log(usdtTrc?.recv, usdtTrc?.send, usdtTrc?.contract);
```

`recv` and `send` may be `1`/`0` or booleans, matching what the API returns.

## Quotes

`POST /price`.

| Field | Required | Meaning |
| :--- | :--- | :--- |
| `type` | yes | `"fixed"` (about 1% service fee) or `"float"` (about 0.5%). |
| `fromCcy`, `toCcy` | yes | FixedFloat currency codes, such as `BTC`, `ETH`, `USDTTRC`. |
| `direction` | yes | `"from"` — `amount` is what the customer sends. `"to"` — `amount` is what the customer receives. |
| `amount` | yes | Number of coins in that direction. |
| `ccies` | no | When true, `data.ccies` lists send/receive availability. |
| `usd` | no | When true, amounts outside the limits are adjusted using the USD equivalent. |
| `afftax` | no | Extra affiliate percentage. See the affiliate formula in the official docs. |

```typescript
const quote = await ff.getPrice({
  fromCcy: "BTC",
  toCcy: "USDTTRC",
  amount: 0.05,
  direction: "from",
  type: "float",
  ccies: true,
  usd: true,
});

console.log(quote.from.min, quote.from.max, quote.from.usd, quote.from.btc);
console.log(quote.to.amount, quote.to.rate, quote.to.precision);
console.log(quote.errors); // [] when an order can be created
console.log(quote.ccies?.[0]);

// Same call under the official method name.
await ff.price({
  fromCcy: "ETH",
  toCcy: "BTC",
  amount: 0.2,
  direction: "to",
  type: "fixed",
});
```

Shorthand, same shape as the `fixedfloat-api` package:

```typescript
// Send 0.1 ETH, receive BTC at a float rate.
const sent = await ff.getPrice("0.1 ETH", "BTC");

// Receive 0.01 BTC, float rate. Direction is "to".
const wanted = await ff.getPrice("ETH", "0.01 BTC", "fixed");
await ff.price("0.1 ETH", "BTC", "float");
```

`getPrice` returns the quote even when `errors` is non-empty, because FixedFloat does that on HTTP 200. `getPriceOrThrow` runs `assertQuoteOk` and throws `FixedFloatError` with code `0` and the code list in `error.data`.

```typescript
import { assertQuoteOk } from "fixedfloat-client";

const quote = await ff.getPrice({
  fromCcy: "BTC",
  toCcy: "ETH",
  amount: 0.01,
  direction: "from",
  type: "float",
});
assertQuoteOk(quote);
```

A single pair quote is not the way to download the whole board. Use the XML export for that.

## XML rates

`GET https://ff.io/rates/float.xml` and `GET https://ff.io/rates/fixed.xml`. No API key and no signature.

```typescript
const xml = await ff.getRatesXml("float");
const allFloat = await ff.getRates({ type: "float" });
const btcEth = await ff.getRates({ type: "fixed", from: "BTC", to: "ETH" });

const row = btcEth[0];
console.log(`${row.in} ${row.from} -> ${row.out} ${row.to}`);
console.log(row.toFee, row.minAmount, row.maxAmount, row.amount);
```

| Field | XML tag | Meaning |
| :--- | :--- | :--- |
| `from`, `to` | `from`, `to` | Currency codes. |
| `in`, `out` | `in`, `out` | Rate base and the amount received for that base. |
| `amount` | `amount` | Reserve indicator. This is not the maximum exchange size. |
| `toFee` | `tofee` | Network fee excluded from the rate, for example `0.0004 ETH`. |
| `minAmount`, `maxAmount` | `minamount`, `maxamount` | Exchange limits, with the coin code in the string. |

`parseRatesXml` and `filterRates` are exported if you already have the file.

## Create an order

`POST /create`. Costs **50** rate-limit weight units (other methods cost 1; the cap is 250 per minute). The call is not retried.

```typescript
const order = await ff.createOrder({
  fromCcy: "BTC",
  toCcy: "USDTTRC",
  amount: 0.02,
  direction: "from",
  type: "float",
  toAddress: "TAzsQ9Gx8eqFNFSKbeXrbi45CuVPHzA8wr",
  tag: "12345", // memo or destination tag; official field name
  afftax: 0.1,
});

// alias
await ff.create({
  fromCcy: "ETH",
  toCcy: "BTC",
  amount: 0.001,
  direction: "to",
  type: "fixed",
  toAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
});
```

A memo can also be appended to the address as `address:memo` instead of `tag`.

`extraId` is still accepted. It is sent as `tag` and as `extraId`. `refundAddress` and `refundExtraId` are forwarded when you set them.

Keep `order.id` and `order.token`. The id is 6 characters. The token is required for every later call. FixedFloat does not have a "list my orders" method.

```typescript
console.log(order.id, order.token, order.type, order.status);
console.log(order.from.address, order.from.tag, order.from.addressMix);
console.log(order.from.reqConfirmations, order.time.expiration, order.time.left);
console.log(order.to.amount, order.to.address);
console.log(order.back?.address); // refund side, once known
console.log(order.emergency); // { status, choice, repeat } during EMERGENCY
```

## Read an order

`POST /order` with `{ id, token }`.

```typescript
const current = await ff.getOrder(order.id, order.token);
// alias: await ff.order(order.id, order.token);

console.log(current.status, ff.statusText(current.status));
console.log(current.from.tx?.id, current.from.tx?.confirmations, current.from.tx?.timeBlock);
console.log(current.to.tx?.id, current.to.tx?.fee, current.to.tx?.ccyfee);
```

| Status | Label from `statusText` |
| :--- | :--- |
| `NEW` | New order |
| `PENDING` | Transaction received, pending confirmation |
| `EXCHANGE` | Transaction confirmed, exchange in progress |
| `WITHDRAW` | Sending funds |
| `DONE` | Order completed |
| `EXPIRED` | Order expired |
| `EMERGENCY` | Emergency, customer choice required |

`orderStatusText` and `ORDER_STATUS_TEXT` are the same map.

## Wait for an order

Polls `getOrder` until the status is one of the targets or the deadline passes.

```typescript
const done = await ff.waitForOrder(order.id, order.token, {
  statuses: ["DONE", "EXPIRED", "EMERGENCY"], // default
  timeoutMs: 30 * 60 * 1000, // default, the usual order lifetime
  intervalMs: 5_000, // default
  signal: new AbortController().signal,
});
```

`EMERGENCY` is included so you can submit a choice and call `waitForOrder` again if you want `DONE`. On timeout the error is `FixedFloatTimeoutError` and `retryable` is false. Aborting the signal throws `FixedFloatError` with message `The order wait was aborted`.

## Emergency choice

`POST /emergency`. Only for orders in `EMERGENCY`.

| `choice` | Meaning |
| :--- | :--- |
| `EXCHANGE` | Continue at the market rate when the choice is made, or when the order is corrected. |
| `REFUND` | Refund minus the miner fee. `address` is required. `tag` is the memo if that network needs one. |

`data.emergency.status` can contain `EXPIRED` (deposit after expiry), `LESS`, `MORE`, and `LIMIT` (combined with `LESS` or `MORE` when the amount is outside the limits). `choice` on the order is `NONE`, `EXCHANGE`, or `REFUND`. `repeat` is true when a second deposit arrived.

```typescript
await ff.setEmergency({
  id: order.id,
  token: order.token,
  choice: "EXCHANGE",
});

await ff.emergency({
  id: order.id,
  token: order.token,
  choice: "REFUND",
  address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  tag: "optional-memo",
});
```

`extraId` is still accepted and is sent as `tag` and `extraId`. The success payload is `true`.

## Email notifications

`POST /setEmail`. Subscribes an address to status mail for that order. Success payload is `true`.

```typescript
await ff.setEmail(order.id, order.token, "user@example.com");
await ff.setEmailNotification(order.id, order.token, "user@example.com");
await ff.subscribe(order.id, order.token, "user@example.com");
```

## QR codes

`POST /qr` returns a list of PNG data URLs.

```typescript
const qr = await ff.getQr(order.id, order.token);
// aliases: ff.qr, ff.getQrCodes, ff.getQRCodes

console.log(qr.title, qr.src); // default (checked) image, or the first
for (const code of qr.codes) {
  console.log(code.title, code.checked, code.src.slice(0, 32));
}
```

A legacy object `{ src }` is still accepted. `src` stays populated either way.

## Raw requests

Signed POST for a path this package does not wrap yet. The return value is the envelope `data` field. Anything except `/create` is retried. Pass `idempotent: false` to disable that.

```typescript
const data = await ff.rawRequest("/order", { id: order.id, token: order.token });
```

## Error handling

```typescript
import {
  FixedFloatApiError,
  FixedFloatAuthError,
  FixedFloatError,
  FixedFloatHttpError,
  FixedFloatNetworkError,
  FixedFloatRateLimitError,
  FixedFloatTimeoutError,
  isFixedFloatError,
} from "fixedfloat-client";

try {
  await ff.getOrder("ABCDEF", "token");
} catch (error) {
  if (error instanceof FixedFloatRateLimitError) {
    // HTTP 429. Back off. create costs 50 weight, everything else costs 1.
  } else if (error instanceof FixedFloatAuthError) {
    // HTTP 401 or 403. Key or signature rejected.
  } else if (error instanceof FixedFloatApiError) {
    // JSON envelope with code != 0. error.code, error.message, error.data.
  } else if (error instanceof FixedFloatTimeoutError) {
    // One HTTP call timed out (retryable) or waitForOrder exceeded its deadline.
  } else if (error instanceof FixedFloatNetworkError) {
    // DNS or connection failure. retryable === true.
  } else if (error instanceof FixedFloatHttpError) {
    // Other HTTP failure. retryable is true for status >= 500.
  } else if (isFixedFloatError(error)) {
    console.error(error.code, error.status, error.message);
  }
}
```

FixedFloat does not publish a stable numeric catalog. `code === 0` is success. Any other numeric `code` is a failure and `msg` is the human-readable reason. Branch on `code !== 0` and `message`, not on guessed numbers.

`instanceof FixedFloatError` matches every subclass.

## Order and quote codes

Quote `errors` (HTTP still succeeds):

| Code | Meaning |
| :--- | :--- |
| `MAINTENANCE_FROM` | Currency being sent is under maintenance. |
| `MAINTENANCE_TO` | Currency being received is under maintenance. |
| `OFFLINE_FROM` | Currency being sent is offline. |
| `OFFLINE_TO` | Currency being received is offline. |
| `RESERVE_FROM` | Not enough reserves of the currency being sent. |
| `RESERVE_TO` | Not enough reserves of the currency being received. |
| `LIMIT_MIN` | Amount is below the minimum. |
| `LIMIT_MAX` | Amount is above the maximum. |

`PRICE_ERROR_TEXT` has the same sentences. `TERMINAL_ORDER_STATUSES` is `DONE`, `EXPIRED`, `EMERGENCY`.

HTTP layer:

| Status | Class | Retried |
| :--- | :--- | :--- |
| 401, 403 | `FixedFloatAuthError` | no |
| 429 | `FixedFloatRateLimitError` | yes |
| 500+ | `FixedFloatApiError` or `FixedFloatHttpError` | yes |
| other 4xx | `FixedFloatHttpError` | no |

Rate limit: 250 weight units per minute. A blocked key stays blocked longer after each new breach.

## Advanced usage

### Proxy, timeout, base URL

```typescript
const ff = new FixedFloat({
  apiKey: process.env.FIXEDFLOAT_API_KEY,
  apiSecret: process.env.FIXEDFLOAT_API_SECRET,
  baseUrl: "https://ff.io/api/v2",
  timeout: 20_000,
  proxy: "http://127.0.0.1:8888",
  retries: 4,
  retryDelay: 100,
});
```

`proxyConfigFromUrl` is exported if you need the axios proxy object yourself.

### Retries

Transient failures retry `retries` extra times. Delay is `retryDelay * 2^attempt` milliseconds. Set `retries: 0` to fail on the first attempt. `create` and `rawRequest("/create")` ignore `retries` so a blip cannot open two orders.

### Async

The client is promise-based. There is no sync API on Node. `AbortSignal` is supported on `waitForOrder`. Parallel quotes are ordinary `Promise.all`.

```typescript
const [btc, eth] = await Promise.all([
  ff.getPrice({ fromCcy: "BTC", toCcy: "USDTTRC", amount: 0.01, direction: "from", type: "float" }),
  ff.getPrice({ fromCcy: "ETH", toCcy: "USDTTRC", amount: 0.1, direction: "from", type: "float" }),
]);
```

### Callbacks

FixedFloat does not offer webhooks. `setEmail` is the notification channel. Poll with `waitForOrder` if you need the status in-process.

## TypeScript

Types are published from `dist/index.d.ts`. Useful exports: `FixedFloat`, `FixedFloatOptions`, `Currency`, `GetPriceParams`, `PriceResult`, `PriceSide`, `CreateOrderParams`, `Order`, `OrderSide`, `OrderTx`, `OrderEmergency`, `QrCode`, `QrResult`, `RateItem`, `OrderType`, `ExchangeDirection`, `EmergencyChoice`, `OrderStatus`, `PriceErrorCode`, `WaitForOrderOptions`.

`strict` is on. Currency codes are strings because FixedFloat adds assets without a client release.

## Examples

Runnable files in [`examples/`](examples):

| File | What it does |
| :--- | :--- |
| `examples/check.ts` | Currencies, one quote, one XML pair. Needs API keys. |
| `examples/price.ts` | Fixed quote, shorthand, `assertQuoteOk`. Needs API keys. |
| `examples/rates.ts` | Downloads the XML board. No API key. |
| `examples/parse-rates.ts` | Parses a sample document offline. |
| `examples/create-order.ts` | Opens an order only when `FIXEDFLOAT_CREATE=1`. |
| `examples/manage-order.ts` | Reads an order, optional email, QR, emergency, and wait. |

```bash
npx tsx examples/parse-rates.ts
npx tsx examples/rates.ts
FIXEDFLOAT_API_KEY=... FIXEDFLOAT_API_SECRET=... npx tsx examples/check.ts
```

## FAQ

**Do I need a key for rates?** No. `getRates` and `getRatesXml` are public. Everything under `/api/v2` needs a key and a secret.

**Why is there no order list?** The API only returns an order when you send its id and token.

**What is the difference between fixed and float?** Fixed locks the rate and uses a higher service fee (1% before affiliate adjustments). Float follows the market at execution (0.5% before adjustments). An order normally lives for 30 minutes (`time.left`).

**Can I change the referral code?** Price and create always send this package's referral code. Pass `afftax` when you want a different affiliate percentage on top of that.

**What if the deposit is the wrong size?** The order becomes `EMERGENCY`. Read `order.emergency.status`, then call `setEmergency` with `EXCHANGE` or `REFUND`.

## Contributing

```bash
cd fixedfloat/js
npm ci
npm test          # Jest unit tests and the 95% line-coverage gate
npm run typecheck
npm run build
npm run test:live # opt-in, read-only, needs FIXEDFLOAT_API_KEY and FIXEDFLOAT_API_SECRET
```

Unit tests mock HTTP. Live tests only call `getCurrencies`, `getPrice`, and `getRates`.

## License

[MIT](LICENSE)
