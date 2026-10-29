# give-sms

[![npm version](https://img.shields.io/npm/v/give-sms.svg)](https://www.npmjs.com/package/give-sms)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/give-sms.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org/)

Typed TypeScript client for [Give-SMS](https://give-sms.com/): short activations, the SMS-Activate compatible handler, and week/month number rentals.

Official API reference: <https://give-sms.com/api.html>

The client speaks three HTTP surfaces on `https://give-sms.com`:

| Surface | Path | Use it for |
| --- | --- | --- |
| Native JSON | `GET /api/v1/` | Balance, stock, 15-minute orders, extra SMS, reactivation |
| Handler | `GET /stubs/handler_api.php` | Existing SMS-Activate software (`ACCESS_NUMBER`, `STATUS_OK`) |
| Rent | `GET /api/v2/rent/rent_number.php` | Numbers kept for weeks or months |

Every request includes the built-in `partner_key`. Do not strip it.

---

## Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick start](#quick-start)
- [Native API](#native-api)
- [Waiting for an SMS](#waiting-for-an-sms)
- [Handler API](#handler-api)
- [Rent API](#rent-api)
- [Countries and services](#countries-and-services)
- [Errors](#errors)
- [Retries, proxies, and timeouts](#retries-proxies-and-timeouts)
- [TypeScript](#typescript)
- [Comparison](#comparison)
- [FAQ](#faq)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- Native methods match the current docs: `getbalance`, `getcount`, `getallcount`, `getnumber`, `getcode`, `wrongcode`, `refusenumber`, `bannumber`, `reactivationoptions`, `reactivation`.
- Status `400` on `getcode` / `wrongcode` is “SMS not here yet”, returned as `status: "WAIT"`, not an exception.
- Handler actions: `getBalance`, `getNumbersStatus`, `getNumber` (with `maxPrice`), `setStatus`, `getStatus`, `getPrices` (with `tiers`), `getReactivationOptions`, `reactivation`.
- Rent methods: `countries`, `getdatacountry`, `allorders`, `createorder`, `getsms`, `prolong`.
- `waitForCode`, `waitForNextCode`, `handlerWaitForCode`, and `rentWaitForSms` poll until a deadline or an `AbortSignal`.
- One error class per handler symbol and per native status code.
- Configurable base URL, timeout, retries, and HTTP proxy.
- `COUNTRIES` (130 slugs plus handler ids) and `SERVICES` (548 codes) from the public docs.

---

## Installation

```bash
npm install give-sms
```

Node.js 18 or newer.

---

## Configuration

```ts
import { GiveSms } from "give-sms";

const client = new GiveSms({
  apiKey: process.env.GIVE_SMS_API_KEY!, // required. Also accepted as new GiveSms(apiKey)
  baseUrl: "https://give-sms.com",       // no trailing slash required
  timeout: 30_000,                        // milliseconds, per request
  retries: 2,                             // extra attempts after network, timeout, 502, ERROR_SQL
  retryDelayMs: 1_000,                    // first pause; later attempts wait 2s, 3s, ...
  retryOn: [502, "ERROR_SQL"],            // added to network failures and timeouts
  proxy: "http://user:pass@127.0.0.1:8080",
  headers: { "X-Debug": "1" },
});
```

| Option | Default | Description |
| --- | --- | --- |
| `apiKey` | — | Account key. Sent as `userkey` on JSON calls and `api_key` on the handler. |
| `baseUrl` | `https://give-sms.com` | Origin only. Paths are appended by the client. |
| `timeout` | `30000` | Axios timeout in milliseconds. |
| `retries` | `0` | Extra tries. The first attempt is not counted. |
| `retryDelayMs` | `1000` | Linear backoff: delay × attempt number. `0` disables the pause. |
| `retryOn` | `[502, "ERROR_SQL"]` | Logical codes worth repeating. `401` and `NO_NUMBERS` are never in the default list. |
| `proxy` | unset | `http://` or `https://` proxy URL. Userinfo is decoded into Axios `proxy.auth`. |
| `headers` | `Accept`, `User-Agent` | Merged on top of the defaults. |

`callApi` and `callHandler` are public if Give-SMS adds a method before this package does. `partner_key` is always applied last, so a caller cannot overwrite it.

---

## Quick start

Balance and stock only. This does not reserve a number.

```ts
import { GiveSms } from "give-sms";

const client = new GiveSms({ apiKey: process.env.GIVE_SMS_API_KEY! });

const balance = await client.getBalance();
console.log(balance);

const stock = await client.getCount({ country: "kazakhstan", operator: "ANY" });
console.log(stock.ANY);
```

A full activation reserves money for about 15 minutes. Cancel (or let it expire without an SMS) to release it. The handler `maxPrice` path charges the real tier, which can be above the cheapest number.

```ts
const order = await client.getNumber({ service: "tg", country: "kazakhstan" });
console.log(order.id, order.number);

const sms = await client.waitForCode(order.id, { timeoutMs: 180_000, intervalMs: 5_000 });
console.log(sms.code, sms.fullSms);

await client.cancelNumber(order.id); // if you did not use the code
```

Runnable scripts live in [`examples/`](examples).

---

## Native API

Parameters documented by Give-SMS are sent with those names (`order_id`, not `id`). `getNumber` still returns `{ id, number }` so existing callers keep working. The id is `order_id` when the API sends it, and the number is `phone`.

### `getBalance()`

```ts
const balance = await client.getBalance();
```

`data.balance`, `data.user_balance`, or a bare number. `0` is a real balance.

### `getCount({ country, operator })`

```ts
const counts = await client.getCount({ country: "kazakhstan", operator: "ANY" });
// counts.ANY.vk = { count: 0, price: "5" }
```

Both filters are optional. The server defaults the country to Kazakhstan.

### `getAllCount({ service })` and `getAll`

`getAll` is the same call. Without `service` the payload is every country and its services. With `service` each country is `{ price, count_all }`.

```ts
const everywhere = await client.getAllCount();
const telegram = await client.getAllCount({ service: "tg" });
const same = await client.getAll({ service: "tg" });
```

Success for this method is the raw object. It is not wrapped in `{ status, data }`.

### `getNumber({ service, country, operator, maxPrice })`

```ts
const ordered = await client.getNumber({
  service: "vk",
  country: "kazakhstan", // slug or handler id, including 0
  operator: "ANY",
  maxPrice: 25,
});
console.log(ordered.id, ordered.number, ordered.startTime);
```

`service` is required. A missing number throws `GiveSmsError`. Status `500` here means no free numbers (`ApiStatus500Error`).

### `purchase(options)` and `Activation`

`purchase` orders a number and returns an `Activation` bound to the client:

```ts
const activation = await client.purchase({ service: "wa", country: "kazakhstan" });
const sms = await activation.waitForCode({ timeoutMs: 120_000 });
await activation.wrongCode(sms.smsId);
await activation.repeatCode(sms.smsId); // true when the request is accepted
await activation.cancel();
await activation.ban();
```

### `getCode(id)`

```ts
const result = await client.getCode(ordered.id);
if (result.status === "WAIT") {
  // HTTP-level status 400. Try again in 5–10 seconds.
} else {
  console.log(result.code, result.fullSms, result.sender, result.smsId, result.phonePass);
}
```

`code` may be missing even when the SMS arrived (`fullSms` is the body). `smsId` is what `wrongCode` wants as `lastId`.

### `wrongCode(id, lastId)` and `repeatCode(id, lastId)`

Another SMS during the same 15 minutes is free. `lastId` defaults to the order id, which the docs say is usually correct.

```ts
const next = await client.wrongCode(order.id, previous.smsId);
const accepted = await client.repeatCode(order.id, previous.smsId);
```

`repeatCode` returns `true` for both a delivered SMS and a wait. Use `wrongCode` when you need the payload.

### `cancelNumber(id)` and `refuseNumber(id)`

```ts
await client.cancelNumber(order.id);
await client.refuseNumber(order.id); // alias
```

`method=refusenumber`. Returns `true` after status 200.

### `banNumber(id)`

```ts
await client.banNumber(order.id);
```

Use this when the number cannot register on the service (`method=bannumber`).

### `getReactivationOptions(id)` and `reactivationOptions(id)`

```ts
const quote = await client.getReactivationOptions(finishedOrderId);
for (const option of quote.options ?? []) {
  console.log(option.duration, option.price);
}
```

Reactivation is only offered after a code was received, and only while the number is still in the system. Status `507` carries `reason`: `sim_offline`, `no_code`, `expired`, `already_active`, `no_available`, or later `price_changed`.

### `reactivate(id, { duration, price })`

```ts
const again = await client.reactivate(finishedOrderId, { duration: 20, price: 12.6 });
console.log(again.order_id, again.phone, again.end_time);
const sms = await client.waitForCode(again.order_id!);
```

`duration` must be one of the quoted values. Pass `price` if you want the server to refuse, without charging, when the price moved (`507` / `price_changed`). The charge is immediate and is not refunded. The response is a **new** order id. `duration` may be omitted; the server then validates the call itself.

---

## Waiting for an SMS

```ts
const controller = new AbortController();
const sms = await client.waitForCode(order.id, {
  timeoutMs: 180_000,
  intervalMs: 5_000,
  signal: controller.signal,
});

const following = await client.waitForNextCode(order.id, sms.smsId, {
  timeoutMs: 60_000,
  intervalMs: 5_000,
});
```

Polling stops when `status` is anything other than `WAIT`, when the deadline passes (`GiveSmsTimeoutError`), or when `signal` aborts (`GiveSmsAbortError`). A dead order (`500`, `505`, …) is thrown immediately and is not treated as “keep waiting”.

---

## Handler API

Plain text, except `getNumbersStatus`, `getPrices`, and `getReactivationOptions`, which are JSON. Give-SMS documents this protocol as compatible and unmaintained. Prefer the native API for new code.

### Balance, stock, and prices

```ts
const balance = await client.handlerGetBalance(); // ACCESS_BALANCE

const counts = await client.handlerGetNumbersStatus({ country: 2, operator: "any" });
// { vk_0: 28, tg_0: 30 }

const prices = await client.handlerGetPrices({ country: 2, service: "vk", tiers: 1 });
// { "2": { vk: { "25": 36, "30": 10 } } }
```

`tiers: 1` lists every price tier. Those prices are the legal `maxPrice` values for `handlerGetNumber`.

### Order and status

```ts
import { HandlerSetStatus } from "give-sms";

const ordered = await client.handlerGetNumber({
  service: "vk",
  country: 2,
  operator: "mts",
  maxPrice: 25,
});
// ACCESS_NUMBER:id:number — the number may contain extra colons

await client.handlerReady(ordered.id);                 // status 1 → ACCESS_READY
await client.handlerRequestAnotherSms(ordered.id);     // status 3 → ACCESS_RETRY_GET
await client.handlerComplete(ordered.id);              // status 6 → ACCESS_ACTIVATION
await client.handlerCancel(ordered.id);                // status 8 → ACCESS_CANCEL
await client.handlerSetStatus(ordered.id, HandlerSetStatus.Ready);

const status = await client.handlerGetStatus(ordered.id);
// STATUS_WAIT_CODE
// STATUS_WAIT_RETRY:<previous code>
// STATUS_WAIT_RESEND
// STATUS_CANCEL
// STATUS_OK:<code>
```

```ts
const done = await client.handlerWaitForCode(ordered.id, { timeoutMs: 180_000, intervalMs: 5_000 });
console.log(done.code);
```

`handlerWaitForCode` keeps polling on `STATUS_WAIT_CODE` and `STATUS_WAIT_RETRY`. `STATUS_CANCEL` throws `GiveSmsError` with code `STATUS_CANCEL`. `STATUS_WAIT_RESEND` throws `ResendRequiredError`: resend the SMS in the app, then set status `6`.

### Handler reactivation

```ts
const tiers = await client.handlerGetReactivationOptions(finishedId);
// { "20": 12.6 }

const fresh = await client.handlerReactivate(finishedId, 20, 12.6);
// new ACCESS_NUMBER
```

`PRICE_CHANGED` means the quote moved and nothing was charged. Fetch the options again.

---

## Rent API

Rentals are not refundable, including when you change your mind. `createorder` and `prolong` need `GIVE_SMS_ALLOW_PAID`-style care in your own scripts. Listing countries does not rent anything.

```ts
const countries = await client.rentCountries();
const kz = await client.rentGetDataCountry({ country: "KZ" });
const existing = await client.rentAllOrders();

const rented = await client.rentCreateOrder({
  type: "week",          // or "month"
  period: 1,
  services: [82, 1, 4],  // or "82,1,4"
  country: "KZ",
  operator: "ANY",
});
console.log(rented.orderId, rented.phone, rented.endTime, rented.endTimeTimestamp);

const inbox = await client.rentGetSms(rented.orderId);
for (const message of inbox.messages) {
  console.log(message.date, message.text, message.timestamp);
}

const extended = await client.rentProlong({ rentId: rented.orderId, type: "week", period: 1 });
console.log(extended.days, extended.price, extended.rentAtFormatted);

const arrived = await client.rentWaitForSms(rented.orderId, {
  timeoutMs: 120_000,
  intervalMs: 5_000,
  since: 0, // ignore messages at or before this unix time; omit to accept any message
});
```

`rentAllOrders` includes finished rentals. `status_rent` `1` is active and `0` is expired, on each order object inside `orders`.

---

## Countries and services

```ts
import { COUNTRIES, SERVICES, findCountry } from "give-sms";

findCountry("kazakhstan"); // { code, info: { name, handlerId: 2 } }
findCountry(16);           // England
SERVICES.tg;               // "Telegram"
SERVICES.wa;               // "Whatsapp"
SERVICES.call;             // incoming missed-call service
Object.keys(COUNTRIES);
```

Slugs are the native `country` parameter. `handlerId` is the numeric `country` on `/stubs/handler_api.php`. Rent countries use a different code (`KZ`, `AT`, …) from `rentCountries()`.

---

## Errors

```ts
import { ApiStatus401Error, GiveSmsError, NoNumbersError, WrongMaxPriceError } from "give-sms";

try {
  await client.handlerGetNumber({ service: "vk", country: 2, maxPrice: 0.01 });
} catch (error) {
  if (error instanceof WrongMaxPriceError) {
    console.log("Minimum price:", error.responseData); // text after the colon
  } else if (error instanceof NoNumbersError) {
    console.log(error.code); // "NO_NUMBERS"
  } else if (error instanceof ApiStatus401Error) {
    console.log(error.message);
  } else if (error instanceof GiveSmsError) {
    console.log(error.code, error.reason, error.responseData);
  }
}
```

`error.message` is the API `msg` when there is one. `error.reason` is the native `reason` field. `error.code` is the handler symbol or the numeric status. `error.responseData` is the body, or the text after `CODE:`.

### Native status codes

The same number means different things on different methods. The class is still one per code.

| Status | Class | Typical meaning |
| --- | --- | --- |
| 400 | `ApiStatus400Error` | On `getcode` / `wrongcode` this is **not** thrown. Elsewhere it is an error. |
| 401 | `ApiStatus401Error` | Missing or wrong API key. Rent: bad `userkey`. |
| 402 | `ApiStatus402Error` | Rent: bad `country` parameter. |
| 404 | `ApiStatus404Error` | Unknown `method`. Rent: country or order not found. |
| 500 | `ApiStatus500Error` | Generic failure, no numbers, or the order expired. |
| 501 | `ApiStatus501Error` | `wrongcode` rejected the method parameter. |
| 502 | `ApiStatus502Error` | Unknown service, or “try again”. Retried when `retries` > 0. |
| 503 | `ApiStatus503Error` | Unknown operator, or a rent server error. |
| 504 | `ApiStatus504Error` | Not enough balance, or a bad rent period type. |
| 505 | `ApiStatus505Error` | Unknown country, or the order does not exist. |
| 506 | `ApiStatus506Error` | Missing `order_id`, or a bad rent period length. |
| 507 | `ApiStatus507Error` | Reactivation refused, temporary ban, or maintenance. Read `reason`. |
| 508 | `ApiStatus508Error` | Bad reactivation `duration`. |
| 509 | `ApiStatus509Error` | Too many active orders. |

### Handler symbols

| Response | Class |
| --- | --- |
| `BAD_KEY` | `BadKeyError` |
| `NO_KEY` | `NoKeyError` |
| `ERROR_SQL` | `ErrorSqlError` |
| `BAD_ACTION` | `BadActionError` |
| `BAD_SERVICE` | `BadServiceError` |
| `NO_ACTIVATION` | `NoActivationError` |
| `BAD_STATUS` | `BadStatusError` |
| `NO_BALANCE` | `NoBalanceError` |
| `NO_NUMBERS` | `NoNumbersError` |
| `WRONG_SERVICE` | `WrongServiceError` |
| `BAD_COUNTRY` | `BadCountryError` |
| `YOU_TEMPORARY_BANNED` | `TemporaryBannedError` |
| `WRONG_MAX_PRICE:<min>` | `WrongMaxPriceError` |
| `TOO_MANY_ACTIVE_ORDERS` | `TooManyActiveOrdersError` |
| `TOO_MANY_ATTEMPTS` | `TooManyAttemptsError` |
| `NUMBER_UNAVAILABLE` | `NumberUnavailableError` |
| `ALREADY_ACTIVE` | `AlreadyActiveError` |
| `BAD_DURATION` | `BadDurationError` |
| `PRICE_CHANGED` | `PriceChangedError` |

`STATUS_WAIT_RESEND` is not a handler error string. The waiter raises `ResendRequiredError`.

`NetworkError` (`code: "NETWORK"`) is a connection failure. `GiveSmsTimeoutError` (`TIMEOUT`) is an HTTP timeout or a poll deadline. `GiveSmsAbortError` (`ABORTED`) is a cancelled wait.

Successful handler replies that are not errors: `ACCESS_BALANCE`, `ACCESS_NUMBER`, `ACCESS_READY`, `ACCESS_RETRY_GET`, `ACCESS_ACTIVATION`, `ACCESS_CANCEL`, `STATUS_WAIT_CODE`, `STATUS_WAIT_RETRY`, `STATUS_OK`, `STATUS_CANCEL`.

---

## Retries, proxies, and timeouts

```ts
const client = new GiveSms({
  apiKey: process.env.GIVE_SMS_API_KEY!,
  timeout: 15_000,
  retries: 3,
  retryDelayMs: 400,
  retryOn: [502, 503, "ERROR_SQL"],
  proxy: process.env.HTTPS_PROXY,
});
```

Retried: network errors, Axios `ECONNABORTED`, and any `error.code` listed in `retryOn` (defaults `502` and `ERROR_SQL`). Not retried: bad keys, no numbers, no balance, cancels. The poll helpers do not hide those errors behind the deadline.

Proxy URLs use the standard Axios proxy object (`protocol`, `host`, `port`, `auth`). This is not an SMS-Activate upstream proxy; it is the HTTP proxy your process uses to reach Give-SMS.

There is no webhook API in the Give-SMS docs. Wait with the poll helpers or call `getCode` / `handlerGetStatus` / `rentGetSms` yourself.

---

## TypeScript

The package ships declarations from `dist/index.d.ts`. `strict` is on. Import types alongside values:

```ts
import {
  type ActivationNumber,
  type CodeResult,
  type GetNumberOptions,
  type RentOrder,
  GiveSms,
  HandlerSetStatus,
} from "give-sms";

const options: GetNumberOptions = { service: "tg", country: "kazakhstan" };
const client = new GiveSms(process.env.GIVE_SMS_API_KEY!);
const ordered: ActivationNumber = await client.getNumber(options);
const sms: CodeResult = await client.getCode(ordered.id);
const rented: RentOrder = await client.rentCreateOrder({
  type: "week",
  period: 1,
  services: "82",
  country: "KZ",
});
void HandlerSetStatus.Complete;
```

Low-level responses that Give-SMS leaves untyped (`getAllCount`, raw handler price trees) stay `unknown` or `Record<string, unknown>`.

---

## Comparison

npm search for `give-sms` / `givesms` and PyPI project `give-sms` return this package (0.1.0 before this release). Libraries below target SMS-Activate-shaped handlers or a different host. They are what people otherwise wire to `give-sms.com`.

| Capability | give-sms | sms-activate / sms-activate-org | sms-activate-ts | hero-sms | herosms (PyPI) | aiosmsactivate | smsactivate | get-sms-online |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Give-SMS native `/api/v1/` | yes | no | no | no | no | no | no | no (different host) |
| Handler protocol | yes | yes | yes | yes | yes | yes | yes | no |
| Give-SMS rent `/api/v2/rent` | yes | no | no | partial rent API on their host | rent on their host | no | no | no |
| Reactivation quote + buy | native and handler | no | no | no | no | no | no | no |
| `getallcount` | yes | no | no | no | no | no | no | no |
| Wait helper with timeout and cancel | yes | `getCode(seconds)` on a number object | same | manual `getStatus` | `wait_for_sms` | `wait_sms_code` | no | `wait_for_sms` |
| Sync and async Python | Python package | — | — | — | yes | async | sync | sync |
| Error class per code | yes | some enums | some enums | status enum | exception hierarchy | status enum | strings | one error |
| Proxy | client option | no | env vars | no | client option | no | no | no |
| Webhooks | not in Give-SMS docs | no | no | no | parser for their host | no | no | incoming message + priority |
| Country/service catalog in the SDK | yes | name lookup | name lookup | list endpoints | list endpoints | service lookup | no | service names |

`get-sms-online` (`getsms.online` / tellabot) is a different company that search results confuse with Give-SMS. It is listed so the gap is explicit: webhooks exist there, not here.

---

## FAQ

**Does `getCode` throw while the SMS is still on the way?**  
No. Status 400 becomes `{ status: "WAIT" }`. Other 4xx/5xx statuses throw.

**Why does `repeatCode` call `wrongcode`?**  
That is the documented “send me the next SMS” method. `repeatcode` is not in the API reference. `repeatCode` remains as the older method name.

**Is `cancelNumber` a refund?**  
`refusenumber` releases the reservation when the rules allow it. A reactivation charge and a rent charge are not refunded.

**Which country id is the United States?**  
Native slug `ssha` is handler id `187`. `usavirt` is `12`. Kazakhstan is `kazakhstan` / `2`. Rent uses `KZ`.

**Can I point this at a test server?**  
Set `baseUrl`. Paths stay `/api/v1/`, `/stubs/handler_api.php`, and `/api/v2/rent/rent_number.php`.

**What does the balance number mean?**  
The handler docs describe it as rubles. The native field is the account balance in the currency Give-SMS shows you. It is not converted to USD.

---

## Examples

| File | What it does |
| --- | --- |
| [`examples/check.ts`](examples/check.ts) | Balance and Kazakhstan stock. No order. |
| [`examples/catalog.ts`](examples/catalog.ts) | Offline country and service lookup. |
| [`examples/native-activation.ts`](examples/native-activation.ts) | `getAllCount`, `purchase`, `waitForCode`, `wrongCode`, `cancel`. |
| [`examples/handler-activation.ts`](examples/handler-activation.ts) | Prices, counts, `handlerGetNumber`, ready / wait / complete / cancel. |
| [`examples/rent.ts`](examples/rent.ts) | Countries, catalog, orders, and an optional rental. |

```bash
npx tsx examples/catalog.ts
GIVE_SMS_API_KEY=... npx tsx examples/check.ts
GIVE_SMS_API_KEY=... GIVE_SMS_ALLOW_PAID=1 npx tsx examples/native-activation.ts
```

Paid examples exit before ordering unless `GIVE_SMS_ALLOW_PAID=1`.

---

## Contributing

The library lives in the [api-kit](https://github.com/TysikGG/api-kit) monorepo under `give-sms/js`.

```bash
cd give-sms/js
npm install
npm test          # Jest, mocked HTTP, coverage in the text report
npm run typecheck
npm run build
```

Live checks are skipped unless `GIVE_SMS_API_KEY` is set. They only read balance, stock, prices, and rent countries:

```bash
GIVE_SMS_API_KEY=... npm run test:live
```

Open a pull request against `main` for this package only when you change it.

---

## License

[ISC](LICENSE) © api-kit contributors.
