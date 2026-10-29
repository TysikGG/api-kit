# simpleswap-client

[![npm version](https://img.shields.io/npm/v/simpleswap-client.svg)](https://www.npmjs.com/package/simpleswap-client)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/simpleswap-client.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org/)

Typed Node.js client for the [SimpleSwap](https://simpleswap.io) instant cryptocurrency exchange REST API (v3).

SimpleSwap is a non-custodial swap aggregator. A partner API key lets your product quote a pair, open an exchange, and track it until SimpleSwap sends the payout. Partner revenue is attributed by the `x-api-key` header this client sends. An optional `customFee` (documented by SimpleSwap as 0.4–5 percent) overrides the reward configured on that key. Fiat keys are separate, and their fee cannot be customized.

Official reference: [Swagger UI](https://api.simpleswap.io/v3) and the [public API guide](https://simpleswap.io/en/affiliate-program/help-center/article/public-api-guide).

The public API allows 50 requests per 10 seconds. A burst past that limit can block the caller IP for one minute.

---

## Table of contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick start](#quick-start)
- [Currencies](#currencies)
- [Pairs](#pairs)
- [Estimates](#estimates)
- [Ranges and minimums](#ranges-and-minimums)
- [Check an exchange](#check-an-exchange)
- [Create an exchange](#create-an-exchange)
- [Fixed-rate exchanges](#fixed-rate-exchanges)
- [Reverse quotes](#reverse-quotes)
- [Memos and refunds](#memos-and-refunds)
- [Confirm a provider deposit](#confirm-a-provider-deposit)
- [Read one exchange](#read-one-exchange)
- [List exchanges](#list-exchanges)
- [Wait until a status](#wait-until-a-status)
- [Market table](#market-table)
- [Address validation](#address-validation)
- [Error handling](#error-handling)
- [Advanced usage](#advanced-usage)
- [TypeScript](#typescript)
- [Comparison](#comparison)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- Currencies, per-currency metadata, all pairs, and pairs for one ticker and network.
- Floating and fixed estimates, including reverse quotes and the partner `customFee`.
- Deposit ranges and a `getMin()` helper for the legacy minimum-only call.
- Exchange pre-check, create, fetch, list, and status polling with timeout and abort.
- Provider deposit confirmation (`PUT /v3/exchanges`).
- Fixed-rate market rows (min, max, rate, miner fee, reserve, `rateId`).
- Local address checks against the currency validation regex.
- Typed errors for HTTP 400, 401, 403, 404, 422, 429, and 5xx, plus network and polling timeouts.
- Retries for safe reads. Creates and confirms are repeated only on HTTP 429.
- Custom base URL, timeout, proxy, client IP header, and User-Agent.
- The default User-Agent stays `simpleswap-client/0.1.0`, and the API key stays in `x-api-key`.

Runnable scripts for every method live in [`examples/`](examples).

---

## Installation

```bash
npm install simpleswap-client
```

Node.js 18 or newer is required. The package ships TypeScript declarations.

```typescript
import { SimpleSwap, SimpleSwapError } from "simpleswap-client";
```

---

## Configuration

```typescript
const client = new SimpleSwap({
  apiKey: process.env.SIMPLESWAP_API_KEY, // or SIMPLESWAP_API_KEY in the environment
  baseURL: "https://api.simpleswap.io",   // alias: baseUrl
  timeoutMs: 30_000,                      // alias: timeout
  userAgent: "simpleswap-client/0.1.0",   // also sent as x-user-agent
  clientIp: "203.0.113.10",               // x-client-ip, the end-user IP
  proxy: "http://user:pass@127.0.0.1:8888",
  maxRetries: 2,
  retryDelayMs: 200,
  pollingIntervalMs: 5_000,
  pollingTimeoutMs: 600_000,
});
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | `SIMPLESWAP_API_KEY` | Partner key. Sent as `x-api-key`. Empty string falls through to the environment variable. |
| `baseURL` | `string` | `https://api.simpleswap.io` | API origin. Trailing slashes are removed. Paths already include `/v3`. `baseURL` wins over `baseUrl`. |
| `baseUrl` | `string` | — | Alias of `baseURL`. |
| `timeoutMs` | `number` | `30000` | Per-request timeout in milliseconds. `timeoutMs` wins over `timeout`. |
| `timeout` | `number` | — | Alias of `timeoutMs`. |
| `userAgent` | `string` | `simpleswap-client/0.1.0` | `User-Agent` and `x-user-agent`. An empty string keeps the default. |
| `clientIp` | `string` | — | Forwarded as `x-client-ip` when set. |
| `proxy` | `string` | — | `http://` or `https://` proxy URL. Credentials may be included. |
| `maxRetries` | `number` | `2` | Extra attempts after the first try. `0` disables retries. Negative values are treated as `0`. |
| `retryDelayMs` | `number` | `200` | Base backoff in milliseconds. It doubles each attempt and is capped at 60 seconds. `Retry-After` replaces it. |
| `pollingIntervalMs` | `number` | `5000` | Default delay between `waitForExchange` polls. |
| `pollingTimeoutMs` | `number` | `600000` | Default `waitForExchange` deadline (10 minutes). |

Create a key in the SimpleSwap affiliate dashboard under API / DeFi API. Crypto and fiat keys are not interchangeable.

---

## Quick start

This only lists currencies and asks for a quote. It does not create an exchange.

```typescript
import { SimpleSwap } from "simpleswap-client";

const client = new SimpleSwap({ apiKey: process.env.SIMPLESWAP_API_KEY });

const currencies = await client.getCurrencies();
console.log(`${currencies.length} currencies`);

const estimate = await client.getEstimate({
  tickerFrom: "btc",
  networkFrom: "btc",
  tickerTo: "eth",
  networkTo: "eth",
  amount: "0.1",
  fixed: false,
});
console.log(`0.1 BTC -> ${estimate.estimatedAmount} ETH`);
```

[`examples/quickstart.ts`](examples/quickstart.ts)

---

## Currencies

`GET /v3/currencies` and `GET /v3/currencies/{ticker}/{network}`.

```typescript
const all = await client.getCurrencies();
const same = await client.getAllCurrencies(); // alias

const btc = await client.getCurrency("btc", "btc");
console.log(btc.name, btc.precision, btc.hasExtraId, btc.validationAddress);
console.log(btc.isAvailableFloat, btc.isAvailableFixed, btc.isFiat);
console.log(btc.warningsFrom, btc.warningsTo);
console.log(btc.addressExplorer, btc.txExplorer, btc.confirmationsFrom);
```

Tickers and networks are lowercase (`btc`, `eth`, `trx`). The same symbol can exist on more than one network, so pass both. `getAllCurrencies` is the legacy name for the full list.

[`examples/currencies.ts`](examples/currencies.ts)

---

## Pairs

`GET /v3/pairs` and `GET /v3/pairs/{ticker}/{network}`.

The result is a map. Keys and values look like `btc:btc` and `eth:bsc`.

```typescript
const fromBtc = await client.getPairs("btc", "btc", { fixed: false });
console.log(fromBtc["btc:btc"]?.slice(0, 5));

const fixedOnly = await client.getPairs("btc", "btc", { fixed: true });

// Every pair. The payload is large; omit it unless you need the full map.
const all = await client.getAllPairs({ fixed: false });
```

`getPairs` with only a ticker throws. Pass both ticker and network, or neither.

[`examples/pairs.ts`](examples/pairs.ts)

---

## Estimates

`GET /v3/estimates`.

```typescript
const quote = await client.getEstimate({
  tickerFrom: "btc",
  networkFrom: "btc",
  tickerTo: "eth",
  networkTo: "eth",
  amount: "0.2",
  fixed: false,
  reverse: false,
  customFee: "0.4", // optional partner reward percent; null omits the field
});

console.log(quote.estimatedAmount); // amount the user is estimated to receive
console.log(quote.rateId);          // present on fixed quotes
console.log(quote.validUntil);      // ISO timestamp for that rateId
```

`getEstimated()` is an alias with the same argument object. Amounts are sent as strings. `customFee: 0` is sent as `"0"`. `customFee: null` is omitted so the key's dashboard fee stays in place.

[`examples/estimate.ts`](examples/estimate.ts)

---

## Ranges and minimums

`GET /v3/ranges`.

```typescript
const ranges = await client.getRanges({
  tickerFrom: "btc",
  networkFrom: "btc",
  tickerTo: "eth",
  networkTo: "eth",
  fixed: false,
  reverse: false,
});
console.log(`Deposit between ${ranges.min} and ${ranges.max ?? "no maximum"}`);

const minimum = await client.getMin({
  tickerFrom: "btc",
  tickerTo: "eth",
  networkFrom: "btc",
  networkTo: "eth",
});
```

`getMin()` returns `ranges.min` and exists because the legacy API exposed `get_min`. `max` is `null` when the floating pair has no upper bound.

[`examples/ranges.ts`](examples/ranges.ts)

---

## Check an exchange

`GET /v3/exchanges/check` answers whether SimpleSwap can open an exchange for the pair, direction, and amount. It does not take a payout address. Check the address separately with `isValidAddress`, then create the exchange.

```typescript
const check = await client.checkExchange({
  tickerFrom: "btc",
  networkFrom: "btc",
  tickerTo: "eth",
  networkTo: "eth",
  amount: "0.1",
  fixed: false,
  reverse: false,
});

if (!check.canCreate) {
  console.log("Pair or amount is not exchangeable right now.");
}
```

A bare boolean from the API is normalized to `{ canCreate }`.

[`examples/check-exchange.ts`](examples/check-exchange.ts)

---

## Create an exchange

`POST /v3/exchanges`. The response includes the deposit address (`addressFrom`) and the public id.

```typescript
const order = await client.createExchange({
  tickerFrom: "btc",
  networkFrom: "btc",
  tickerTo: "eth",
  networkTo: "eth",
  amount: "0.1",
  addressTo: "0xYourEthereumAddress",
  fixed: false,
  reverse: false,
  userRefundAddress: "bc1qYourBitcoinRefundAddress",
});

console.log(order.publicId ?? order.id);
console.log(`Send ${order.amountFrom} ${order.tickerFrom} to ${order.addressFrom}`);
console.log(`Payout goes to ${order.addressTo}`);
```

v3 identifies the order with `publicId`. Some payloads also include `id`. `exchangeId(order)` returns whichever is present.

This call opens a real exchange. The example script does not POST unless `SIMPLESWAP_EXAMPLE_CREATE=1`.

[`examples/create-exchange.ts`](examples/create-exchange.ts)

---

## Fixed-rate exchanges

Set `fixed: true`. Take `rateId` from a fixed estimate and pass it to `createExchange` before `validUntil`.

```typescript
const quote = await client.getEstimate({
  tickerFrom: "btc",
  networkFrom: "btc",
  tickerTo: "eth",
  networkTo: "eth",
  amount: "0.1",
  fixed: true,
});

const order = await client.createExchange({
  tickerFrom: "btc",
  networkFrom: "btc",
  tickerTo: "eth",
  networkTo: "eth",
  amount: "0.1",
  addressTo: "0xYourEthereumAddress",
  fixed: true,
  rateId: quote.rateId,
});
```

`false` is sent when you set `fixed: false` or `reverse: false`. Omitted fields stay off the JSON body. `customFee: null` is omitted. A numeric `customFee` is sent as a JSON number on create (the estimate query sends it as a string, matching the current wire format).

---

## Reverse quotes

`reverse: true` means `amount` is the amount the user wants to receive. The estimate and the range then describe the deposit required to reach that payout.

```typescript
const needed = await client.getEstimate({
  tickerFrom: "btc",
  networkFrom: "btc",
  tickerTo: "eth",
  networkTo: "eth",
  amount: "1",
  reverse: true,
});
console.log(`Deposit about ${needed.estimatedAmount} BTC to receive 1 ETH`);
```

Use the same `reverse` flag on `getRanges`, `checkExchange`, and `createExchange`.

---

## Memos and refunds

Currencies with `hasExtraId` need a memo, destination tag, or message. Put the payout memo in `extraIdTo`. Put a refund destination in `userRefundAddress` and, when that currency needs it, `userRefundExtraId`.

```typescript
const xrp = await client.getCurrency("xrp", "xrp");
if (xrp.hasExtraId && !client.isValidAddress("123456", xrp.validationExtra)) {
  throw new Error(`Destination tag does not match ${xrp.extraId}`);
}

await client.createExchange({
  tickerFrom: "btc",
  networkFrom: "btc",
  tickerTo: "xrp",
  networkTo: "xrp",
  amount: "0.02",
  addressTo: "rYourXrpAddress",
  extraIdTo: "123456",
  userRefundAddress: "bc1qYourRefund",
});
```

An empty `extraIdTo` is omitted. Pass a non-empty tag when the currency requires one.

---

## Confirm a provider deposit

`PUT /v3/exchanges` is the provider confirm step: your service already accepted the user's deposit and must hand SimpleSwap the transaction id. A normal wallet-to-deposit-address swap does not need this call. SimpleSwap sees the on-chain transfer by itself.

```typescript
const confirmed = await client.confirmExchange({
  publicId: "exchange-public-id",
  txFrom: "deposit-transaction-id",
  providerUserDepositAddress: "address-that-received-the-deposit",
  targetAddress: "0xUserPayoutAddress",
});
console.log(confirmed.status);
```

[`examples/confirm-exchange.ts`](examples/confirm-exchange.ts) sends the PUT only when `SIMPLESWAP_EXAMPLE_CONFIRM=1`.

---

## Read one exchange

`GET /v3/exchanges/{publicId}`.

```typescript
const order = await client.getExchange("exchange-public-id");
console.log(order.status, order.amountFrom, order.amountTo);
console.log(order.txFrom, order.txTo);
console.log(order.currencies?.currencyFrom?.name);
```

Known statuses are exported as `ExchangeStatus`: `waiting`, `confirming`, `exchanging`, `sending`, `finished`, `failed`, `refunded`, `expired`, and `verifying`. The API can add statuses. Anything outside `TERMINAL_EXCHANGE_STATUSES` (`finished`, `failed`, `refunded`, `expired`) is still in progress.

[`examples/exchanges.ts`](examples/exchanges.ts)

---

## List exchanges

`GET /v3/exchanges` lists exchanges created with this API key.

```typescript
const page = await client.getExchanges({
  limit: 100,
  offset: 0,
  startDate: "2025-03-19T00:00:00.000Z",
  finishDate: "2025-03-26T00:00:00.000Z",
});
```

Blank date strings are omitted. There is no status filter on this endpoint; filter `page` in your process.

---

## Wait until a status

```typescript
import { ExchangeStatus, SimpleSwapTimeoutError } from "simpleswap-client";

try {
  const done = await client.waitForExchange("exchange-public-id", {
    timeoutMs: 10 * 60 * 1000,
    intervalMs: 5_000,
    statuses: [
      ExchangeStatus.Finished,
      ExchangeStatus.Failed,
      ExchangeStatus.Refunded,
      ExchangeStatus.Expired,
    ],
    onUpdate: (order) => console.log(order.status),
    signal: abortController.signal,
  });
  console.log(done.txTo);
} catch (error) {
  if (error instanceof SimpleSwapTimeoutError) {
    console.log("Last payload:", error.responseBody);
  }
}
```

The first poll happens immediately. `onUpdate` runs for every response, including the one that stops the wait. Aborting the signal throws `SimpleSwapError` with `code: "ABORTED"`. The in-flight HTTP request is not cancelled. Each poll is a GET, so the client's retry policy applies to that request.

[`examples/wait-for-exchange.ts`](examples/wait-for-exchange.ts)

---

## Market table

`GET /v3/market` returns fixed-rate rows. `getMarketInfo()` is the legacy alias.

```typescript
const rows = await client.getMarket();
for (const row of rows.slice(0, 3)) {
  console.log(
    `${row.tickerFrom}:${row.networkFrom} -> ${row.tickerTo}:${row.networkTo}`,
    row.rate,
    row.min,
    row.max,
    row.minerFee,
    row.reserve,
    row.rateId,
    row.untilTime
  );
}
```

The full table is large. Cache it instead of calling it on every page view.

[`examples/market.ts`](examples/market.ts)

---

## Address validation

`isValidAddress` does not call the network. It checks the whole string against `validationAddress` or `validationExtra` from a currency.

```typescript
const eth = await client.getCurrency("eth", "eth");
const ok = client.isValidAddress("0x" + "ab".repeat(20), eth);
const noRule = client.isValidAddress("anything-non-empty", null); // true
```

An empty address is invalid. A missing pattern accepts any non-empty address. An invalid regular expression throws `SimpleSwapError`.

[`examples/validate-address.ts`](examples/validate-address.ts) runs the local check with no API key.

---

## Error handling

Failures throw `SimpleSwapError` or a subclass. HTTP status, `traceId`, response body, API `code`, and `retryable` are on the error.

```typescript
import {
  SimpleSwapAuthError,
  SimpleSwapBadRequestError,
  SimpleSwapError,
  SimpleSwapForbiddenError,
  SimpleSwapNetworkError,
  SimpleSwapNotFoundError,
  SimpleSwapRateLimitError,
  SimpleSwapServerError,
  SimpleSwapTimeoutError,
  SimpleSwapValidationError,
} from "simpleswap-client";

try {
  await client.getCurrency("nope", "nope");
} catch (error) {
  if (error instanceof SimpleSwapNotFoundError) {
    console.log(error.statusCode, error.message, error.traceId);
  }
}
```

| Class | When |
| :--- | :--- |
| `SimpleSwapBadRequestError` | HTTP 400. Amount, pair, or address was rejected. |
| `SimpleSwapAuthError` | HTTP 401. Missing or unknown API key. |
| `SimpleSwapForbiddenError` | HTTP 403. The key cannot call this operation. |
| `SimpleSwapNotFoundError` | HTTP 404. Unknown currency, pair, or exchange id. |
| `SimpleSwapValidationError` | HTTP 422. Body or query failed validation. |
| `SimpleSwapRateLimitError` | HTTP 429. More than 50 requests in 10 seconds, or a one-minute IP block. |
| `SimpleSwapServerError` | HTTP 500, 502, 503, 504, and other 5xx responses. |
| `SimpleSwapNetworkError` | DNS, connection, or timeout before a response. `retryable` is true. |
| `SimpleSwapTimeoutError` | `waitForExchange` reached its deadline. `responseBody` is the last order. |
| `SimpleSwapError` | Other failures, including HTTP 200 bodies with `error: true`, aborted waits (`code: "ABORTED"`), and a bad address regex. |

Application errors look like:

```json
{ "code": 400, "error": "Bad Request", "message": "string", "traceId": "..." }
```

or `{ "error": true, "message": "...", "traceId": "..." }`. A string `error` next to `result` is ignored. A string `error` without `result` is thrown. Plain-text error bodies are used as the message.

`parseRetryAfter` reads a `Retry-After` header (seconds or an HTTP date) into milliseconds.

[`examples/errors.ts`](examples/errors.ts)

---

## Advanced usage

### Retries

GET requests retry network errors, HTTP 408, HTTP 429, and HTTP 5xx. POST and PUT retry only HTTP 429. A create or confirm is not sent again after a timeout or a 5xx response, because the exchange may already exist.

```typescript
const client = new SimpleSwap({
  apiKey: process.env.SIMPLESWAP_API_KEY,
  maxRetries: 2,
  retryDelayMs: 200,
});
```

Backoff is `retryDelayMs * 2^attempt`, capped at 60 seconds. A `Retry-After` value replaces that delay. Set `maxRetries: 0` to fail on the first attempt.

### Proxies, timeouts, and base URL

```typescript
const client = new SimpleSwap({
  apiKey: process.env.SIMPLESWAP_API_KEY,
  baseURL: "https://api.simpleswap.io",
  timeoutMs: 15_000,
  proxy: process.env.HTTPS_PROXY,
  clientIp: request.ip,
});
```

[`examples/retries-and-proxy.ts`](examples/retries-and-proxy.ts)

### Callbacks

SimpleSwap's public v3 API does not publish a webhook. Poll with `waitForExchange` and pass `onUpdate` if you want a callback on each status.

### What this client does not call

The Swagger components include `PartnerProfitDto`, and the dashboard has a separate DeFi API. The published v3 operation list used here is currencies, pairs, estimates, ranges, exchanges (check, get, list, create, confirm), and market. Partner profit for a crypto exchange is the `customFee` on the estimate and the create call, or the fee stored on the API key. There is no second referral id to set, and this client does not add one.

---

## TypeScript

The package is written in TypeScript and publishes `dist/index.d.ts`.

```typescript
import type {
  CheckExchangeResult,
  ConfirmExchangeParams,
  CreateExchangeParams,
  EstimateResult,
  ExchangeOrder,
  GetEstimateParams,
  MarketRate,
  PairsMap,
  RangesResult,
  SimpleSwapClientOptions,
  SimpleSwapCurrency,
  WaitForExchangeOptions,
} from "simpleswap-client";
import { ExchangeStatus, TERMINAL_EXCHANGE_STATUSES, exchangeId } from "simpleswap-client";

const options: SimpleSwapClientOptions = { apiKey: "key" };
const params: GetEstimateParams = {
  tickerFrom: "btc",
  tickerTo: "eth",
  amount: "0.1",
};
const order: ExchangeOrder = await client.getExchange("id");
const id: string = exchangeId(order);
```

`ExchangeOrder` keeps `id` and adds `publicId`, `type`, `validUntil`, and `currencies`.

---

## Comparison

Reviewed on 2026-10-29.

| Capability | simpleswap-client | PyPI `simpleswap` 1.0.0 | npm search for "simpleswap" |
| :--- | :---: | :---: | :---: |
| API generation | v3 (`/v3/...`, `x-api-key`) | Legacy query API (`/get_estimated`, `api_key` query) | No other `api.simpleswap.io` client. Unrelated hits: Dexalot RFQ, Uniswap helpers, string-swap utilities |
| Networks on every call | Yes | No | — |
| Pairs and full pair map | Yes | Yes (legacy paths) | — |
| Fixed and floating quotes | Yes | `fixed` flag only | — |
| Reverse quotes | Yes | No | — |
| Partner `customFee` | Yes | No | — |
| Ranges and minimum | Yes | Yes | — |
| Create, fetch, list | Yes | Yes | — |
| Provider confirm (`PUT /v3/exchanges`) | Yes | No | — |
| Market table | Yes | `get_market_info` (legacy) | — |
| Typed errors per HTTP status | Yes | One exception class | — |
| Retries, proxy, timeout, base URL | Yes | No | — |
| Status polling | Yes | No | — |
| Address regex helper | Yes | No | — |
| TypeScript declarations | Yes | No | — |
| Async client | This package is async. The Python package also has `AsyncSimpleSwap`. | Sync `requests` only | — |

`github.com/core01/simpleswap` is an archived front-end exercise. It is not an SDK. It called the legacy `get_all_currencies`, `get_min`, and `get_estimated` methods, which this client covers with `getCurrencies`, `getMin`, and `getEstimate`.

---

## FAQ

**Where does the API key go?**
In the `x-api-key` header. The constructor reads `apiKey` or `SIMPLESWAP_API_KEY`. Do not put the key in a query string. That was the legacy v1 shape.

**Does a quick start create an order?**
No. `getCurrencies` and `getEstimate` are read-only. `createExchange` and `confirmExchange` change state.

**Why is `customFee` sometimes omitted?**
`null` and `undefined` leave the key's dashboard reward unchanged. SimpleSwap documents a partner fee from 0.4 to 5 percent. This client does not clamp the value; the API returns the validation error.

**Fixed or floating?**
Floating follows the market when the deposit confirms and often has no maximum. Fixed locks `rateId` until `validUntil` and has a maximum. Pass `fixed` on the estimate, the range, the check, and the create call.

**How do I get the minimum?**
`getRanges(...).min`, or `getMin(...)`.

**How do I know an exchange finished?**
Poll `getExchange`, or call `waitForExchange`. There is no public webhook in v3.

**What if a POST times out?**
The client does not retry it, except for HTTP 429. Look the exchange up with `getExchanges` before creating another one.

**Can I point the client at a mock?**
Yes. Set `baseURL` to the mock origin. Paths stay `/v3/...`.

---

## Contributing

The library lives in the [api-kit](https://github.com/TysikGG/api-kit) monorepo under `simpleswap/js`.

```bash
npm install
npm test          # Jest unit tests and line coverage
npm run typecheck
npm run build
npm run test:live # skipped unless SIMPLESWAP_API_KEY is set
```

Unit tests mock HTTP. Live tests only call read-only endpoints (currency list, one currency, one pair list, one range, one estimate). Issues and pull requests go to the monorepo.

---

## License

ISC. See [LICENSE](LICENSE).
