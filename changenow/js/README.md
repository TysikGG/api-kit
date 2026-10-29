# changenow-client

[![npm version](https://img.shields.io/npm/v/changenow-client.svg)](https://www.npmjs.com/package/changenow-client)
[![CI Tests](https://github.com/TysikGG/api-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/TysikGG/api-kit/actions/workflows/ci.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://github.com/TysikGG/api-kit/blob/main/LICENSE)
[![Node.js Version](https://img.shields.io/node/v/changenow-client.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg)](https://www.typescriptlang.org/)

Typed Node.js client for the [ChangeNOW](https://changenow.io) cryptocurrency exchange. One class covers the partner API (v2), the legacy partner API (v1), and the anonymous catalogue plus version-3 quotes on `vip-api.changenow.io`.

The npm package name is `changenow-client` because `changenow` is already taken. Import the class as `ChangeNow`.

- Partner docs: <https://documenter.getpostman.com/view/8180765/SVfTPnM8>
- Push and refund: <https://documenter.getpostman.com/view/8180765/TzJoFLtG>
- Anonymous OpenAPI: <https://changenow.io/openapi.json>
- API overview: <https://changenow.io/api> and <https://changenow.io/llms.txt>

---

## Table of contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Authentication and partner attribution](#authentication-and-partner-attribution)
- [Quick start](#quick-start)
- [Partner API v2](#partner-api-v2)
- [Polling](#polling)
- [Anonymous catalogue and version 3](#anonymous-catalogue-and-version-3)
- [Legacy API v1](#legacy-api-v1)
- [Exchange links and webhooks](#exchange-links-and-webhooks)
- [Error handling](#error-handling)
- [Retries, proxies, and timeouts](#retries-proxies-and-timeouts)
- [TypeScript](#typescript)
- [Examples](#examples)
- [Comparison](#comparison)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- Partner v2: currencies, pairs, minimums, ranges, standard and fixed-rate estimates, create, status, address checks, FIO and Unstoppable names, network fees, fiat and crypto market estimates, partner exchange lists, push, refund, and private transfers.
- Legacy v1: currencies, pair minimums, floating and fixed-rate amounts, ranges, transactions, market pairs, and address checks.
- Anonymous catalogue (`GET /v1/assets`) and version-3 estimate, create, and status on `https://vip-api.changenow.io`.
- `waitForExchange` and `waitForPublicTransaction` with timeout, interval, terminal-status override, and an `onStatus` callback.
- Retries for idempotent calls (network errors, HTTP 408, 429, and 5xx) with exponential delay and `Retry-After`. POST stays single-shot unless `retryUnsafe` is set.
- HTTP and HTTPS proxy, custom base URLs, extra headers, and end-user `x-forwarded-for`.
- Error subclasses for the version-3 machine codes and for HTTP 400, 401, 403, 404, 429, and 5xx.
- Exchange-link builder and a webhook body parser. The public webhook payload is unsigned; the parser checks the shape only.
- Typed responses for the partner v2 objects. Version stays `0.1.0`.

Partner revenue is attributed by the API key on `api.changenow.io`. The anonymous host does not attribute partner revenue. Use the v2 methods when the exchange should count toward the partner account.

---

## Installation

```bash
npm install changenow-client
```

Requires Node.js 18 or newer. The HTTP client is Axios 1.x.

---

## Configuration

```typescript
import { ChangeNow } from "changenow-client";

const client = new ChangeNow({
  apiKey: process.env.CHANGENOW_API_KEY,          // default: process.env.CHANGENOW_API_KEY
  baseURL: "https://api.changenow.io/v2",         // partner v2
  v1BaseURL: "https://api.changenow.io/v1",       // legacy v1
  publicBaseURL: "https://vip-api.changenow.io",  // catalogue and v3
  timeoutMs: 30_000,
  userAgent: "changenow-client/0.1.0",
  userIp: "203.0.113.10",                         // sent as x-forwarded-for
  retries: 2,                                     // extra attempts after the first try
  retryDelayMs: 200,                              // doubles each attempt
  retryUnsafe: false,                             // also retry POST when true
  proxy: "http://127.0.0.1:8888",                 // http or https, user:pass supported
  headers: { "X-Request-Id": "demo" },            // cannot replace the API key header
});
```

| Option | Default | Purpose |
| --- | --- | --- |
| `apiKey` | `CHANGENOW_API_KEY` | Partner key. Sent as `x-changenow-api-key`. |
| `baseURL` | `https://api.changenow.io/v2` | Partner v2 origin. |
| `v1BaseURL` | `https://api.changenow.io/v1` | Legacy v1 origin. |
| `publicBaseURL` | `https://vip-api.changenow.io` | Anonymous catalogue and v3. |
| `timeoutMs` | `30000` | Per-request timeout. |
| `userAgent` | `changenow-client/0.1.0` | `User-Agent` header. |
| `userIp` | unset | End-user IP as `x-forwarded-for`. |
| `retries` | `2` | Extra attempts for idempotent calls. |
| `retryDelayMs` | `200` | Base backoff in milliseconds. |
| `retryUnsafe` | `false` | Retry POST, including create, refund, and continue. |
| `proxy` | unset | `http://` or `https://` proxy URL. |
| `headers` | unset | Extra headers. The API key header is applied after this map. |

`flow` on create defaults to `"standard"` inside the client, matching the previous release. Omit `flow` on estimates when you want the API default.

---

## Authentication and partner attribution

The only partner header is `x-changenow-api-key`. The exported constant is `CHANGENOW_API_KEY_HEADER`. A second partner header is not sent. On legacy v1, the same key is also the documented `api_key` query parameter, except on paths that already embed the key (`/transactions/{apiKey}` and `/transactions/{id}/{apiKey}`).

```typescript
import { CHANGENOW_API_KEY_HEADER } from "changenow-client";

console.log(CHANGENOW_API_KEY_HEADER); // "x-changenow-api-key"
```

Optional create fields:

| Field | When to send it |
| --- | --- |
| `userId` | After ChangeNOW enables "Special partner fields". |
| `payload` | Same feature. Up to five fields, each up to 64 characters. |
| `contactEmail` | Optional contact stored with the exchange. |
| `source` | Optional partner source label from the public create example. |

Leave `userId` and `payload` unset until that feature is enabled. Leave `source` unset on anonymous v3 and on exchange links unless you intend to set it. The client does not default `source` or `utm_source` to `llms`.

Catalogue reads, v1 currency reads, floating v1 quotes, and v3 estimates work without a key. Creating a v1 transaction, listing v1 transactions, and reading a v1 transaction by id require a key and throw `ChangeNowAuthError` with code `AUTHENTICATION_REQUIRED` when it is missing. Listing partner exchanges (`getExchanges`) requires a private API key from ChangeNOW.

---

## Quick start

The safe check only reads data. It does not create an exchange.

```typescript
import { ChangeNow } from "changenow-client";

const client = new ChangeNow({ apiKey: process.env.CHANGENOW_API_KEY });

const currencies = await client.getCurrencies({ active: true, flow: "standard" });
console.log(currencies.length);

const min = await client.getMinAmount({
  fromCurrency: "btc",
  toCurrency: "eth",
  fromNetwork: "btc",
  toNetwork: "eth",
  flow: "standard",
});
console.log(min.minAmount);

const estimate = await client.getEstimatedAmount({
  fromCurrency: "btc",
  toCurrency: "eth",
  fromNetwork: "btc",
  toNetwork: "eth",
  fromAmount: "0.1",
  flow: "standard",
});
console.log(estimate.toAmount);

const address = await client.validateAddress({
  currency: "eth",
  address: "0x57f31ad4b64095347F87eDB1675566DAfF5EC886",
});
console.log(address.result);
```

From this repository:

```bash
cd changenow/js
npm install
CHANGENOW_API_KEY=your-key npx tsx examples/quickstart.ts
npx tsx examples/public.ts
```

`examples/partner.ts` exits when `CHANGENOW_API_KEY` is unset. Order-creating calls run only when `CHANGENOW_RUN_WRITES=1`.

---

## Partner API v2

Base URL `https://api.changenow.io/v2`. Amounts may be numbers or decimal strings. The client forwards them as strings so large values stay exact.

### Currencies — `getCurrencies`

`GET /exchange/currencies`.

```typescript
const all = await client.getCurrencies();
const active = await client.getCurrencies({ active: true, flow: "standard", buy: true });
const sellable = await client.getCurrencies({ sell: true, flow: "fixed-rate" });
```

Each row includes `ticker`, `network`, `legacyTicker`, `hasExternalId`, `supportsFixedRate`, `isFiat`, and buy/sell flags.

### Pairs — `getAvailablePairs`

`GET /exchange/available-pairs`.

```typescript
const pairs = await client.getAvailablePairs({
  fromCurrency: "btc",
  fromNetwork: "btc",
  flow: "standard",
});
const onePair = await client.getAvailablePairs({
  fromCurrency: "usdt",
  toCurrency: "usdt",
  fromNetwork: "eth",
  toNetwork: "trx",
  flow: "fixed-rate",
});
```

### Minimum — `getMinAmount`

`GET /exchange/min-amount`.

```typescript
const min = await client.getMinAmount({
  fromCurrency: "btc",
  toCurrency: "eth",
  fromNetwork: "btc",
  toNetwork: "eth",
  flow: "standard",
});
```

### Range — `getRange`

`GET /exchange/range`. `maxAmount` is null when the pair is uncapped.

```typescript
const range = await client.getRange({
  fromCurrency: "btc",
  toCurrency: "eth",
  fromNetwork: "btc",
  toNetwork: "eth",
  flow: "fixed-rate",
});
```

### Estimate — `getEstimatedAmount`

`GET /exchange/estimated-amount`.

Standard direct quote:

```typescript
const floating = await client.getEstimatedAmount({
  fromCurrency: "btc",
  toCurrency: "eth",
  fromNetwork: "btc",
  toNetwork: "eth",
  fromAmount: "0.1",
  flow: "standard",
  type: "direct",
});
```

Fixed-rate lock. Pass `rateId` to `createExchange` before it expires:

```typescript
const locked = await client.getEstimatedAmount({
  fromCurrency: "btc",
  toCurrency: "eth",
  fromNetwork: "btc",
  toNetwork: "eth",
  fromAmount: "0.1",
  flow: "fixed-rate",
  useRateId: true,
});
console.log(locked.rateId);
```

Reverse quote (you set the payout amount):

```typescript
const reverse = await client.getEstimatedAmount({
  fromCurrency: "btc",
  toCurrency: "eth",
  fromNetwork: "btc",
  toNetwork: "eth",
  toAmount: "1",
  type: "reverse",
  flow: "standard",
});
```

Top-up estimate (withdrawal fee omitted):

```typescript
const topUp = await client.getEstimatedAmount({
  fromCurrency: "btc",
  toCurrency: "eth",
  fromNetwork: "btc",
  toNetwork: "eth",
  fromAmount: "0.1",
  isTopUp: true,
});
```

### Create — `createExchange`

`POST /exchange`. Default `flow` is `"standard"`.

```typescript
const created = await client.createExchange({
  fromCurrency: "btc",
  toCurrency: "eth",
  fromNetwork: "btc",
  toNetwork: "eth",
  fromAmount: "0.1",
  address: "0xReceiver",
  extraId: undefined,
  refundAddress: "bc1qrefund",
  refundExtraId: undefined,
  contactEmail: "desk@example.com",
  flow: "standard",
  type: "direct",
});
console.log(created.id, created.payinAddress);
```

Fixed-rate create uses the lock from the estimate:

```typescript
const fixed = await client.createExchange({
  fromCurrency: "btc",
  toCurrency: "eth",
  fromNetwork: "btc",
  toNetwork: "eth",
  fromAmount: "0.1",
  address: "0xReceiver",
  flow: "fixed-rate",
  rateId: locked.rateId!,
});
```

Reverse create sends `toAmount` and `type: "reverse"`. Optional `userId`, `payload`, and `source` are forwarded only when you set them:

```typescript
await client.createExchange({
  fromCurrency: "btc",
  toCurrency: "eth",
  fromNetwork: "btc",
  toNetwork: "eth",
  toAmount: "1",
  address: "0xReceiver",
  type: "reverse",
  flow: "standard",
  userId: "user-42",
  payload: { order: "1001" },
  source: "checkout",
});
```

### Status — `getExchange`, `getTransaction`, `getTransactionStatus`

`GET /exchange/by-id`. The last two names are aliases of `getExchange`.

```typescript
const status = await client.getExchange(created.id);
await client.getTransaction(created.id);
await client.getTransactionStatus(created.id);
console.log(status.status, status.payinHash, status.payoutHash);
```

Known status strings (the set is open; an unknown string is still returned):

`new`, `waiting`, `confirming`, `exchanging`, `sending`, `finished`, `failed`, `refunded`, `verifying`, `expired`, `refunding`, `rejected`.

Terminal statuses that stop a wait: `finished`, `failed`, `refunded`, `expired`, `rejected`.

### Address check — `validateAddress`

`GET /validate/address`. An invalid checksum is HTTP 200 with `result: false`.

```typescript
const check = await client.validateAddress({
  currency: "eth",
  address: "0x57f31ad4b64095347F87eDB1675566DAfF5EC886",
});
```

### Name resolution — `getUserAddresses`

`GET /addresses-by-name`. Unknown names return `success: false`.

```typescript
const named = await client.getUserAddresses("example.crypto");
```

### Network fee — `getNetworkFee`

`GET /exchange/network-fee`. The fee is already included in `getEstimatedAmount`.

```typescript
const fees = await client.getNetworkFee({
  fromCurrency: "usdt",
  toCurrency: "usdt",
  fromNetwork: "eth",
  toNetwork: "trx",
  fromAmount: "100",
  flow: "standard",
  convertedCurrency: "usd",
  convertedNetwork: "usd",
});
console.log(fees.estimatedFee.withdrawal.amount);
```

### Market estimate — `getMarketEstimate`

`GET /markets/estimate`. Informational crypto or fiat price. Fees are excluded, and the result is not a tradable quote. This is the supported fiat surface, together with catalogue rows where `kind` is `fiat` and exchange links with `fiatMode: true`.

```typescript
const market = await client.getMarketEstimate({
  fromCurrency: "usd",
  toCurrency: "btc",
  fromAmount: "1000",
  type: "direct",
});

const reverseMarket = await client.getMarketEstimate({
  fromCurrency: "btc",
  toCurrency: "eur",
  toAmount: "100",
  type: "reverse",
});
```

### Partner exchange list — `getExchanges`

`GET /exchanges`. Requires a private API key. `statuses` may be one string or an array; arrays are repeated query parameters. `limit` must be greater than 0 and less than 100.

```typescript
const page = await client.getExchanges({
  limit: 10,
  offset: 0,
  sortDirection: "DESC",
  sortField: "createdAt",
  dateField: "createdAt",
  dateFrom: "2024-01-01T00:00:00.000Z",
  dateTo: "2024-12-31T23:59:59.000Z",
  requestId: created.id,
  payoutAddress: "0xReceiver",
  statuses: ["finished", "waiting"],
});
console.log(page.count, page.exchanges);
```

### Actions, push, and refund

`GET /exchange/actions`, `POST /exchange/continue`, `POST /exchange/refund`.

```typescript
const actions = await client.getExchangeActions(created.id);
if (actions.continue) {
  await client.continueExchange({ id: created.id });
}
if (actions.refund) {
  await client.refundExchange({
    id: created.id,
    address: "bc1qrefund",
    extraId: undefined,
  });
}
```

The push block in the JSON body uses the key `continue`.

### Private transfers

`GET /private-transfer/estimated-amount` and `POST /private-transfer`. Status for a private transfer stays `getExchange` / `waitForExchange`. `userId` on the estimate is optional and uses the same special-partner-fields rule.

```typescript
const quote = await client.getPrivateTransferEstimate({
  currency: "eth",
  network: "eth",
  toAmount: "0.05",
});

const transfer = await client.createPrivateTransfer({
  currency: "eth",
  network: "eth",
  toAmount: "0.05",
  address: "0xReceiver",
  extraId: undefined,
  refundAddress: "0xRefund",
  refundExtraId: undefined,
  rateId: quote.rateId,
});

const transferStatus = await client.getExchange(transfer.id);
```

---

## Polling

`waitForExchange` calls `getExchange` until the status is terminal, then returns the last payload. `onStatus` runs for every sample, including the final one.

```typescript
import { ChangeNowTimeoutError, isTerminalExchangeStatus } from "changenow-client";

try {
  const done = await client.waitForExchange(created.id, {
    timeoutMs: 600_000,
    intervalMs: 5_000,
    onStatus: (status, row) => {
      console.log(status, row.amountFrom);
    },
  });
  console.log(isTerminalExchangeStatus(done.status));
} catch (error) {
  if (error instanceof ChangeNowTimeoutError) {
    console.error(error.message, error.responseBody);
  }
}
```

Override the stop set when you only care about one outcome:

```typescript
await client.waitForExchange(created.id, {
  timeoutMs: 120_000,
  intervalMs: 2_000,
  terminalStatuses: ["finished", "failed"],
});
```

`waitForPublicTransaction` is the same loop for an anonymous version-3 id. Pass `subId` when the order has one. Defaults are 10 minutes and 5 seconds.

---

## Anonymous catalogue and version 3

Host `https://vip-api.changenow.io`. These calls do not attribute partner revenue. The shared client still attaches `x-changenow-api-key` when a key is configured; the public host ignores that header.

Asset ids look like `btc` or `usdt.trx`. `splitAssetId("usdt.trx")` returns `{ currency: "usdt", network: "trx" }`. A value with no dot uses the ticker for both fields.

### `listAssets` and `listAllAssets`

`GET /v1/assets`.

```typescript
const page = await client.listAssets({
  q: "usd",
  network: "trx",
  kind: "crypto",
  fixed_rate: true,
  popular: true,
  limit: 50,
});
console.log(page.has_more, page.next_cursor, page.assets);

const next = await client.listAssets({ cursor: page.next_cursor ?? undefined, limit: 50 });

const csv = await client.listAssets({ format: "csv", network: "btc" });
const manual = await client.getAssetManual();

const everything = await client.listAllAssets({ kind: "fiat", limit: 100 }, { maxPages: 5 });
```

`format: "csv"` and `help: true` return plain text. `listAllAssets` follows `next_cursor` and stops after `maxPages` (default 100).

### `getAsset`

`GET /v1/assets/{asset}` accepts a canonical id, a legacy ticker, or a page slug.

```typescript
const btc = await client.getAsset("btc");
console.log(btc.address_regex, btc.networks);
```

### Version-3 quote — `getPublicEstimate`

`GET /v3/exchange/estimate`. Amounts in the response are decimal strings under `quote`.

```typescript
const quote = await client.getPublicEstimate({
  fromCurrency: "btc",
  fromNetwork: "btc",
  toCurrency: "eth",
  toNetwork: "eth",
  fromAmount: "0.1",
  flow: "standard",
  type: "direct",
});

const lockedPublic = await client.getPublicEstimate({
  fromCurrency: "btc",
  fromNetwork: "btc",
  toCurrency: "eth",
  toNetwork: "eth",
  fromAmount: "0.1",
  flow: "fixed-rate",
  useRateId: true,
});

const reversePublic = await client.getPublicEstimate({
  fromCurrency: "btc",
  fromNetwork: "btc",
  toCurrency: "eth",
  toNetwork: "eth",
  toAmount: "1",
  flow: "fixed-rate",
  type: "reverse",
});

const withPromo = await client.getPublicEstimate({
  fromCurrency: "btc",
  fromNetwork: "btc",
  toCurrency: "eth",
  toNetwork: "eth",
  fromAmount: "0.1",
  promoCode: "PROMO",
});

const estimateManual = await client.getPublicManual();
```

`help: true` on `getPublicEstimate` returns the same plain-text manual.

### Version-3 order — `createPublicTransaction`, `getPublicTransaction`

`POST /v3/transactions` and `GET /v3/transactions/{id}`. Creating an order returns a deposit address and moves no funds until the deposit is sent. `source` and `linkId` are sent only when you set them.

```typescript
const order = await client.createPublicTransaction({
  fromCurrency: "btc",
  fromNetwork: "btc",
  toCurrency: "eth",
  toNetwork: "eth",
  fromAmount: "0.01",
  address: "0xReceiver",
  extraId: undefined,
  refundAddress: "bc1qrefund",
  refundExtraId: undefined,
  contactEmail: "desk@example.com",
  flow: "standard",
  type: "direct",
  rateId: undefined,
  promoCode: undefined,
});

const fixedOrder = await client.createPublicTransaction({
  fromCurrency: "btc",
  fromNetwork: "btc",
  toCurrency: "eth",
  toNetwork: "eth",
  fromAmount: "0.01",
  address: "0xReceiver",
  flow: "fixed-rate",
  rateId: "rate-from-estimate",
});

const row = await client.getPublicTransaction(order.id);
const child = await client.getPublicTransaction(order.id, { subId: "sub-id" });

const finished = await client.waitForPublicTransaction(order.id, {
  timeoutMs: 600_000,
  intervalMs: 5_000,
  onStatus: (status) => console.log(status),
});
```

`help: true` returns the manual as text instead of creating or reading an order.

Version-3 refusals are field-keyed: `{ status, errors: { field: { code, message, min, max, unit, expected, allowed } }, help }`. Catalogue string errors look like `{ errors: { field: "reason" } }`. Both shapes become `ChangeNowError.field`, `fieldErrors`, `code`, and `help`.

---

## Legacy API v1

Base URL `https://api.changenow.io/v1`. Pair paths use `btc_eth` style tickers. When a key is configured, read methods add the `api_key` query parameter.

```typescript
const currencies = await client.getCurrenciesV1({ active: true, fixedRate: false });
const targets = await client.getCurrenciesToV1("btc", { fixedRate: true });
const info = await client.getCurrencyInfoV1("btc");

const min = await client.getMinAmountV1("btc", "eth");
const floating = await client.getExchangeAmountV1("0.1", "btc", "eth");
const range = await client.getExchangeRangeV1("btc", "eth");

const fixed = await client.getFixedRateAmountV1({
  amount: "0.1",
  from: "btc",
  to: "eth",
  useRateId: true,
});

const pairs = await client.getMarketPairsV1();
const valid = await client.validateAddressV1("btc", "bc1qexample");
// The current api.changenow.io host returns 404 for this legacy route.
// validateAddress on v2 returns the check.
```

Transactions embed the key in the path:

```typescript
const tx = await client.createTransactionV1({
  from: "btc",
  to: "eth",
  address: "0xReceiver",
  amount: "0.01",
  extraId: undefined,
  refundAddress: "bc1qrefund",
  refundExtraId: undefined,
  contactEmail: "desk@example.com",
  flow: "standard",
});

const fixedTx = await client.createFixedRateTransactionV1({
  from: "btc",
  to: "eth",
  address: "0xReceiver",
  amount: "0.1",
  rateId: fixed.rateId,
});

const one = await client.getTransactionV1(tx.id);
const list = await client.listTransactionsV1({
  from: "btc",
  to: "eth",
  status: "finished",
  limit: 10,
  offset: 0,
  dateFrom: "2024-01-01",
  dateTo: "2024-12-31",
});
```

Optional v1 create fields `userId` and `payload` follow the same special-partner-fields rule as v2.

---

## Exchange links and webhooks

`buildExchangeLink` creates a prefilled `https://changenow.io/exchange` URL. The link does not create an order. Only documented query keys are set: `from`, `to`, `amount`, `amountTo`, `fixedRate`, `fiatMode`, `recipientAddress`, `recipientExtraId`, `backupAddress`, and the `utm_*` keys you pass. Extra keys make the site drop the query. English uses no language prefix. Other documented languages (`ar`, `de`, `es`, `fa`, `fr`, `id`, `it`, `ja`, `ko`, `pt`, `tr`, `vi`, `zh`) prefix the path.

```typescript
import { buildExchangeLink, parseExchangeWebhook, splitAssetId } from "changenow-client";

const { currency, network } = splitAssetId("usdt.trx");

const url = buildExchangeLink({
  from: "btc",
  to: "eth",
  amount: "0.1",
  fixedRate: true,
  recipientAddress: "0xReceiver",
  recipientExtraId: undefined,
  backupAddress: "bc1qrefund",
  lang: "de",
  utmSource: "docs",
  utmMedium: "app",
  utmCampaign: "spring",
  utmContent: "hero",
  utmTerm: "swap",
});

const fiatUrl = buildExchangeLink({
  from: "usd",
  to: "btc",
  amount: "100",
  fiatMode: true,
});

const receiveUrl = buildExchangeLink({
  from: "btc",
  to: "eth",
  amountTo: "1",
});
```

`parseExchangeWebhook` accepts a JSON object with `id`, or `exchangeId`, or `requestId`. `status`, when present, must be a string. ChangeNOW does not sign this public body; verify the caller on your side before trusting it.

```typescript
const event = parseExchangeWebhook({
  id: "81cc9c3a9157a6",
  status: "finished",
  payoutHash: "0xabc",
});
```

`EXCHANGE_STATUSES`, `TERMINAL_EXCHANGE_STATUSES`, and `isTerminalExchangeStatus` are exported next to the client.

---

## Error handling

Every failed response throws `ChangeNowError` or a subclass. Subclasses remain `instanceof ChangeNowError`. `statusCode`, `code`, `responseBody`, `field`, `fieldErrors`, `help`, and `retryAfter` are set when the response provides them.

```typescript
import {
  ChangeNowAddressError,
  ChangeNowAmountError,
  ChangeNowAuthError,
  ChangeNowError,
  ChangeNowNetworkError,
  ChangeNowRateLimitError,
  ChangeNowTimeoutError,
} from "changenow-client";

try {
  await client.getMinAmount({ fromCurrency: "btc", toCurrency: "eth" });
} catch (error) {
  if (error instanceof ChangeNowAmountError) {
    console.error(error.message, error.fieldErrors);
  } else if (error instanceof ChangeNowRateLimitError) {
    console.error("retry after", error.retryAfter);
  } else if (error instanceof ChangeNowNetworkError) {
    console.error("no HTTP response", error.message);
  } else if (error instanceof ChangeNowAuthError) {
    console.error(error.statusCode);
  } else if (error instanceof ChangeNowTimeoutError) {
    console.error(error.responseBody);
  } else if (error instanceof ChangeNowError) {
    console.error(error.name, error.code, error.statusCode, error.help);
  }
}
```

| Code | Class |
| --- | --- |
| `MISSING_PARAMETER` | `ChangeNowValidationError` |
| `INVALID_PARAMETER` | `ChangeNowValidationError` |
| `UNKNOWN_PARAMETER` | `ChangeNowValidationError` |
| `METHOD_NOT_ALLOWED` | `ChangeNowValidationError` |
| `UNSUPPORTED_MEDIA_TYPE` | `ChangeNowValidationError` |
| `AMOUNT_OUT_OF_RANGE` | `ChangeNowAmountError` |
| `INVALID_ADDRESS` | `ChangeNowAddressError` |
| `UNKNOWN_ASSET` | `ChangeNowAssetError` |
| `UNKNOWN_NETWORK` | `ChangeNowAssetError` |
| `AMBIGUOUS_ASSET` | `ChangeNowAssetError` |
| `PAIR_NOT_AVAILABLE` | `ChangeNowPairError` |
| `RATE_UNAVAILABLE` | `ChangeNowRateError` |
| `AUTHENTICATION_REQUIRED` | `ChangeNowAuthError` |
| `NOT_ALLOWED` | `ChangeNowForbiddenError` |
| `NOT_FOUND` | `ChangeNowNotFoundError` |
| `RATE_LIMITED` | `ChangeNowRateLimitError` |
| `UPSTREAM_UNAVAILABLE` | `ChangeNowServerError` |
| `INTERNAL_ERROR` | `ChangeNowServerError` |

HTTP mapping when the body has no machine code: 400 and 422 validation, 401 auth, 403 forbidden, 404 not found, 429 rate limit, 5xx server. A missing response (DNS, reset, timeout) is `ChangeNowNetworkError`. `CHANGENOW_ERROR_CODES` lists the machine codes.

Partner v2 errors often use `{ error, message }` or a message string. The same classes apply via the HTTP status.

---

## Retries, proxies, and timeouts

Idempotent requests (GET) retry on network failure, HTTP 408, 429, 5xx, and codes `RATE_LIMITED`, `UPSTREAM_UNAVAILABLE`, and `INTERNAL_ERROR`. POST is not retried unless `retryUnsafe` is true, so a create cannot be duplicated by the client. `retries: 2` means three attempts total. Delay starts at `retryDelayMs` and doubles. A `Retry-After` value in seconds or as an HTTP date replaces that delay.

```typescript
const client = new ChangeNow({
  apiKey: process.env.CHANGENOW_API_KEY,
  timeoutMs: 10_000,
  retries: 3,
  retryDelayMs: 250,
  proxy: "http://user:pass@proxy.example:8080",
});
```

`retries: 0` disables retries. Invalid proxy URLs (missing host, or a scheme other than `http` or `https`) throw `ChangeNowError` from the constructor.

---

## TypeScript

The package ships declarations from `dist/index.d.ts`. `strict` is on. Public types include `ChangeNowClientOptions`, `CreateExchangeParams`, `ExchangeStatus`, `EstimatedAmount`, `PublicEstimate`, `PublicAsset`, `V1CreateTransactionParams`, `WaitForExchangeOptions`, and the error classes. `ExchangeFlow` is `"standard" | "fixed-rate"`. `ExchangeType` is `"direct" | "reverse"`.

```typescript
import type { ExchangeStatus, PublicEstimate } from "changenow-client";

const quote: PublicEstimate = await client.getPublicEstimate({
  fromCurrency: "btc",
  fromNetwork: "btc",
  toCurrency: "eth",
  toNetwork: "eth",
  fromAmount: "0.1",
});

const row: ExchangeStatus = await client.getExchange("id");
```

`listAssets({ format: "csv" })` is typed as `Promise<string>`. `listAssets()` without `format` is `Promise<AssetListEnvelope>`.

---

## Examples

| File | What it calls |
| --- | --- |
| `examples/quickstart.ts` | Partner currency, minimum, estimate, and address check. Requires `CHANGENOW_API_KEY`. |
| `examples/public.ts` | Catalogue, v3 quote, v1 reads, links, and webhook parsing. No key. |
| `examples/partner.ts` | Every partner read. Writes run only with `CHANGENOW_RUN_WRITES=1`. |

```bash
npx tsx examples/public.ts
CHANGENOW_API_KEY=your-key npx tsx examples/partner.ts
```

---

## Comparison

| Capability | changenow-client | `changenow` 1.0.2 | `changenow-sdk` 1.0.8 | `changenow-io-sdk` | `@mymonero/changenow-exchange-integration` 3.0.3 | ChangeNOW-api-python (GitHub v1) |
| --- | --- | --- | --- | --- | --- | --- |
| Partner v2 currencies, estimates, create, status | yes | no | partial | generated subset | exchange flow | no |
| Fixed-rate `rateId` | yes | no | partial | partial | partial | no |
| Network fee, market estimate, names | yes | no | partial | partial | no | no |
| Partner list, push, refund | yes | no | partial | partial | no | no |
| Private transfers | yes | no | no | partial | no | no |
| Legacy v1 | yes | thin wrapper | yes | no | no | yes |
| Anonymous catalogue and v3 | yes | no | no | no | no | no |
| Python asyncio client | n/a (Node) | n/a | n/a | n/a | n/a | no |
| Retries and `Retry-After` | yes | no | yes | no | no | no |
| Proxy | yes | no | yes | no | no | no |
| Typed errors per v3 code | yes | no | subclasses | no | no | no |
| Wait with timeout and callback | yes | no | partial | no | no | no |
| Exchange link builder | yes | no | no | no | no | no |
| Partner header `x-changenow-api-key` | yes | query key | varies | varies | varies | `api_key` query |

`changenow` on npm is the claretnnamocha v1 wrapper. `changenow-sdk` is an unofficial client that also documents fiat paths this package does not call, because those paths are not in the current public docs. `changenow-io-sdk` is a generated v2 subset. The MyMonero, bdxi, and mylozzax packages are exchange-widget integrations. On PyPI, `changenow-client` is this library. Older GitHub and GitLab trees named `changenow-api-python` wrap v1 only and are not the current PyPI release.

---

## FAQ

**Which host should I call for partner revenue?**  
`getEstimatedAmount` and `createExchange` on `https://api.changenow.io/v2`. Anonymous v3 quotes are public and do not attribute revenue.

**Does the client add a second API header?**  
It sends `x-changenow-api-key` only. Legacy v1 also sends the documented `api_key` query.

**Will `createExchange` be retried after a timeout?**  
Only when you set `retryUnsafe: true`. The default keeps create, refund, continue, and v1 transaction posts single-shot.

**What does a failed address check look like?**  
HTTP 200 and `result: false`. A version-3 `INVALID_ADDRESS` code throws `ChangeNowAddressError`.

**How do I express USDT on Tron?**  
Partner v2 uses `fromCurrency: "usdt"` and `fromNetwork: "trx"`. The catalogue id is `usdt.trx`. Legacy v1 often uses a combined ticker such as `usdttrc20`; read it from `getCurrenciesV1`.

**Can I list every asset?**  
`listAllAssets` follows cursors. Pass `limit` and `maxPages` when you want a bounded read.

**Where is fiat?**  
`getMarketEstimate` accepts fiat tickers. Catalogue `kind: "fiat"` lists fiat assets. `buildExchangeLink({ fiatMode: true })` opens the card or bank flow. There is no separate unverified fiat REST namespace in this client.

**How do I test without a key?**  
`npx tsx examples/public.ts` and `npm test`. Live tests in `test/live` run only when `CHANGENOW_API_KEY` is set and stay read-only.

---

## Contributing

The package lives in the [api-kit](https://github.com/TysikGG/api-kit) monorepo at `changenow/js`.

```bash
npm install
npm test          # Jest, mocked HTTP, coverage gate at 95% lines and statements
npm run typecheck
npm run build
npm run test:live # requires CHANGENOW_API_KEY
```

Keep `CHANGENOW_API_KEY_HEADER` as `x-changenow-api-key`. Keep create's default flow `"standard"`. Add a method alias if a public name has to change.

---

## License

ISC. See the repository [LICENSE](https://github.com/TysikGG/api-kit/blob/main/LICENSE).
