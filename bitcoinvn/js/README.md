# bitcoinvn

[![npm version](https://img.shields.io/npm/v/bitcoinvn.svg)](https://www.npmjs.com/package/bitcoinvn)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/node/v/bitcoinvn.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](https://www.typescriptlang.org/)

Typed TypeScript client for the [BitcoinVN Exchange API](https://bitcoinvn.io/api/doc.json). BitcoinVN is an instant cryptocurrency exchange: public rates, quotes, orders, internal balances, staking preferences, and signed order webhooks.

Official references:

- OpenAPI specification: <https://bitcoinvn.io/api/doc.json>
- Interactive docs: <https://bitcoinvn.io/api/doc>
- Integration guide: <https://support.bitcoinvn.io/help/en-us/11-developers/38-bitcoinvn-api-integration-guide-use-cases>
- API keys: <https://bitcoinvn.io/api-keys>

The production base URL is `https://bitcoinvn.io`. There is no public sandbox. A quote does not move funds. Creating an order creates a production order. Funding it, or spending an internal balance, moves real funds.

## Table of contents

- [Features](#features)
- [Comparison](#comparison)
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick start](#quick-start)
- [Authentication](#authentication)
- [Market data](#market-data)
- [Addresses](#addresses)
- [Quotes](#quotes)
- [Orders](#orders)
- [Polling](#polling)
- [Pagination](#pagination)
- [Balances](#balances)
- [Staking](#staking)
- [Guarantees](#guarantees)
- [Webhooks](#webhooks)
- [Swap links](#swap-links)
- [Errors](#errors)
- [Retries, proxies, and timeouts](#retries-proxies-and-timeouts)
- [TypeScript](#typescript)
- [Examples](#examples)
- [FAQ](#faq)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Features

- Every public operation in the BitcoinVN OpenAPI document: health, info, pairs, ticker, address validation, quotes, orders, deposit hash submission, settle-data correction, balances, ledger history, staking offers and preferences, ENS resolution, and guarantee letters.
- Quote and order helpers aligned with the official PHP SDK: `quote`, `fixedSwap`, `variableSwap`, `info`, `pair`, `order`, `orders`, and `balances`.
- `waitForOrder` with a timeout, a poll interval, and a caller-selected set of statuses.
- Page walkers for orders (10 per page) and ledger history (25 per page).
- HMAC-SHA256 verification of account-order webhooks (`X-Signature`).
- Typed errors for HTTP 400, 401, 403, 404, 409, 422, 429, 500, and 503, plus transport and wait timeouts.
- Optional retries for idempotent GET calls on transport failures, HTTP 429, and HTTP 5xx. `Retry-After` is capped by `maxRetryDelayMs`. POST and PUT are not retried unless you opt in.
- HTTP and HTTPS proxy support, custom base URL, timeout, and extra headers.
- `referrer` is always sent on `POST /api/orders` and cannot be replaced by the caller.
- Unit tests mock HTTP. Live tests stay read-only and run only when `BITCOINVN_API_KEY` is set.

## Comparison

Searches of the npm registry (`bitcoinvn`) and PyPI (`bitcoinvn`) on 29 October 2026 return this package and no other JavaScript or Python client. The official community SDKs are PHP.

| Capability | bitcoinvn (this package) | bitcoinvn/bitcoinvn-php and bitcoinvn-php-v2 | Legacy bitcoinvietnam/bitcoinvn-php |
| --- | --- | --- | --- |
| Current host `https://bitcoinvn.io` | Yes | Yes (v2) | No (`api.bitcoinvn.io`) |
| Full current OpenAPI surface, including staking, ENS, and guarantees | Yes | Partial: info, pair, balances, orders, quote, fixed and variable swaps | Legacy client |
| Order pagination query | `page` | Older `p` parameter | Legacy |
| Webhook HMAC verification | Yes | No | No |
| Poll with timeout | Yes | No | No |
| Retries and proxy | Yes | Caller configures Guzzle | No |
| Typed error classes | Yes | Generic HTTP errors | No |
| Pinned partner `referrer` on order create | Yes, always | Caller must send it | No |

## Installation

```bash
npm install bitcoinvn
```

Node.js 18 or newer is required.

```ts
import { BitcoinVn } from "bitcoinvn";
```

```js
const { BitcoinVn } = require("bitcoinvn");
```

## Configuration

```ts
const client = new BitcoinVn({
  apiKey: process.env.BITCOINVN_API_KEY,
  baseUrl: "https://bitcoinvn.io",
  timeoutMs: 30_000,
  proxy: "http://user:pass@127.0.0.1:8080",
  retries: 2,
  retryDelayMs: 200,
  maxRetryDelayMs: 5_000,
  retryMutations: false,
  headers: { "X-Trace": "checkout" },
});
```

`new BitcoinVn("your-key")` is the same as `new BitcoinVn({ apiKey: "your-key" })`. A blank key sends no `X-API-KEY` header.

| Option | Default | Description |
| --- | --- | --- |
| `apiKey` | none | Sent as `X-API-KEY`. Public reads, quotes, and guest order creation work without it. |
| `baseUrl` | `https://bitcoinvn.io` | Trailing slashes are removed. |
| `timeoutMs` | `30000` | Per-request timeout in milliseconds. |
| `axios` | built-in client | When set, `baseUrl`, `timeoutMs`, and `proxy` are ignored. You own this instance. |
| `proxy` | none | `http://` or `https://` URL, or an Axios proxy object. SOCKS is not built in. |
| `retries` | `0` | Extra GET attempts after a transport error, HTTP 429, or HTTP 5xx. |
| `retryDelayMs` | `200` | Base delay. It doubles on each later attempt. |
| `maxRetryDelayMs` | `5000` | Cap, including `X-RateLimit-Retry-After`. |
| `retryMutations` | `false` | Also retry POST and PUT. Leave this false for order creation. |
| `headers` | none | Extra headers. `User-Agent` and `X-API-KEY` are set by the client. |
| `now` | `Date.now` | Clock used by `waitForOrder`. |
| `sleep` | `setTimeout` | Sleep used by retries and polling. |

`client.lastRateLimit` is the latest `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Retry-After` snapshot, when the API sent any of those headers.

The client sends `User-Agent: bitcoinvn/0.1.0`.

## Quick start

This check reads the public BTC/USDT ticker. It does not create an order.

```ts
import { BitcoinVn } from "bitcoinvn";

const client = new BitcoinVn();
const ticker = await client.getTicker("BTC", "USDT");
console.log(ticker.rate, ticker.volume24h);
```

The same script is `examples/check.ts`.

## Authentication

Send the key on account calls. A read-only key can list orders and balances. A read-and-write key can create orders and change staking preferences. A read-and-write key can spend an internal balance, so keep it on a server.

```ts
const client = new BitcoinVn({ apiKey: process.env.BITCOINVN_API_KEY });
const balances = await client.getBalances();
```

HTTP 401 means the key is missing, disabled, suspended, or the caller IP is outside the key allowlist. HTTP 403 means the key is read-only, or it does not own the order.

## Market data

### `getHealth`

`GET /api/health`. The documented body is `{ status: "ok" }`.

```ts
const health = await client.getHealth();
console.log(health.status);
```

### `getInfo` and `info`

`GET /api/info`. Use transfer-method ids exactly as returned. `enabled` does not by itself open a direction. Check `depositEnabled` or `settleEnabled`. External methods include `settleDataFields`.

```ts
const info = await client.getInfo();
const btc = info.transferMethods.btc;
console.log(btc.depositEnabled, btc.settleEnabled, btc.settleDataFields);

const same = await client.info();
```

### `getPair` and `pair`

`GET /api/pairs/{depositMethodId}/{settleMethodId}`. A 200 response does not reserve liquidity. If `max` is less than `min`, the pair has no valid deposit range. An API key applies the account minimum to `min`.

```ts
const pair = await client.getPair("btc", "xmr");
console.log(pair.rate, pair.min, pair.max);

const alias = await client.pair("btc", "usdt");
```

### `getTicker`

`GET /api/ticker/{baseAssetId}/{quoteAssetId}`. Asset ids are case-sensitive. `rate` is quote units per one base unit, including fees.

```ts
const ticker = await client.getTicker("BTC", "USDT");
console.log(ticker.rate, ticker.volume24h);
```

### `swapUrl`

Builds `https://bitcoinvn.io/?deposit=btc&settle=xmr` from the origin of `baseUrl`. The link does not reserve a quote.

```ts
console.log(client.swapUrl("btc", "xmr"));
console.log(client.swapUrl());
```

## Addresses

### `validateAddress`

`GET /api/addresses/validate`. For Lightning, pass the BOLT11 invoice as `address` and set `invoiceAmount` when it must match the order amount.

```ts
const result = await client.validateAddress({
  transferMethod: "btc",
  address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
});
console.log(result.valid, result.error);
```

```ts
const invoice = await client.validateAddress({
  transferMethod: "btcln",
  address: "lnbc1example",
  invoiceAmount: 0.01,
});
```

### `resolveAddress`

`GET /api/addresses/resolve`. Resolves an ASCII ENS name. `ensResolutionToken` expires 15 minutes after `resolvedAt` and is sent as `settleData.ensResolutionToken`.

```ts
const resolved = await client.resolveAddress({
  transferMethod: "eth",
  name: "alice.eth",
});
console.log(resolved.address, resolved.ensResolutionToken, resolved.expiresAt);
```

## Quotes

### `createQuote` and `quote`

`POST /api/quotes`. Send `depositAmount`, `settleAmount`, or neither, but not both. This creates a production quote and does not move funds. Asset-conversion quotes last 15 minutes. Same-asset quotes last one day. Use `expiresAt`. Creating an order does not extend the quote.

`markupRate` must be greater than 0 and at most 0.10. The markup reduces the settlement rate. The client does not send `referrer` on quotes.

```ts
const fixedDeposit = await client.createQuote({
  depositMethod: "btc",
  settleMethod: "xmr",
  depositAmount: 0.01,
});

const fixedSettle = await client.quote({
  depositMethod: "btc",
  settleMethod: "usdt",
  settleAmount: 100,
});

const variable = await client.createQuote({
  depositMethod: "btc",
  settleMethod: "xmr",
});

const markedUp = await client.createQuote({
  depositMethod: "btc",
  settleMethod: "xmr",
  depositAmount: 0.01,
  markupRate: 0.01,
});

console.log(fixedDeposit.settleAmount, fixedSettle.depositAmount, variable.id, markedUp.rate);
```

## Orders

`POST /api/orders` always includes `referrer`. The value is the exported constant `REFERRER` (`35b2eec68a1741ac`). A caller-supplied `referrer` is deleted and replaced. Do not remove that field.

An API key is optional. If you send one, the order is linked to that account and webhooks are signed with that key.

### `createOrder`

Four request shapes:

```ts
const fromQuote = await client.createOrder({
  quote: fixedDeposit.id!,
  settleData: { address: "4example" },
  customOrderId: "rent-october",
  webhookUrl: "https://merchant.example/hooks/bitcoinvn",
});

const variableOrder = await client.createOrder({
  depositMethod: "btc",
  settleMethod: "xmr",
  settleData: { address: "4example" },
});

const spendBalance = await client.createOrder({
  quote: amountlessInternalQuoteId,
  depositAmount: 0.01,
  settleData: { address: "4example" },
});

const receiveBalance = await client.createOrder({
  quote: amountlessInternalSettleQuoteId,
});

console.log(fromQuote.shortId, fromQuote.depositData);
console.log(variableOrder.depositAmount, spendBalance.status, receiveBalance.settleMethod);
```

Payout objects match the method's `settleDataFields`:

```ts
const lightning = { invoice: "lnbc1..." };
const tagged = { address: "rExample", destinationTag: "12345" };
const memo = { address: "cosmos1example", memo: "hello" };
const bank = { accountNumber: "0123456789", bank: "Vietcombank", accountHolder: "Satoshi" };
const internal = { user: "alice@example.com", note: "invoice 17" };
const cash = { phone: "+84901234567" };
const ens = { address: "alice.eth", ensResolutionToken: resolved.ensResolutionToken };
```

Send a destination tag or a memo, not both. Omit `settleData` when the method needs no destination, including a credit to your own internal balance.

`depositData` on the response is where the customer sends funds. There is no `depositAddress` shortcut: read the fields the API returned, such as `address`.

### `fixedSwap`

PHP-style helper. A string destination becomes `{ address }`. Omit it for an internal-balance credit.

```ts
const order = await client.fixedSwap(fixedDeposit.id!, "4example", {
  webhookUrl: "https://merchant.example/hooks/bitcoinvn",
  customOrderId: "rent-october",
});
```

```ts
const invoiceOrder = await client.fixedSwap(quoteId, { invoice: "lnbc1..." });
const ownBalance = await client.fixedSwap(quoteId, null);
```

### `variableSwap`

Variable-amount order without a quote. The settlement amount is set when the deposit is confirmed.

```ts
const open = await client.variableSwap("btc", "vnd", {
  accountNumber: "0123456789",
  bank: "Vietcombank",
  accountHolder: "Satoshi Nakamoto",
});
console.log(open.depositData);
```

### `getOrder` and `order`

`GET /api/orders/{id}`. `id` is the 8-character `shortId`, for example `BV2MTZAF`. A key is optional. Another account's key returns 403 for an account order.

```ts
const order = await client.getOrder("BV2MTZAF");
const same = await client.order("BV2MTZAF");
console.log(order.status, same.settleAmount, order.quote?.accepted);
```

| Status | Meaning |
| --- | --- |
| `new` | Waiting for a deposit. Follow `depositData`. |
| `pending` | Deposit seen, not confirmed yet. |
| `processing` | Deposit confirmed. Settlement is in progress. |
| `settle_data_error` | Payout details must be corrected. |
| `on_hold` | Manual review. Read `adminMessage`. |
| `completed` | Payout is complete. |
| `canceled` | Expired or canceled. A refund is issued when it applies. |

`depositConfsRequired: null` means the count is unknown, not zero.

### `listOrders` and `orders`

`GET /api/orders`. Requires a key. Each page has 10 orders, newest first.

```ts
const page = await client.listOrders({ page: 1, customOrderId: "rent-october" });
const same = await client.orders({ page: 2 });
console.log(page.length, same[0]?.shortId);
```

`customOrderId` is an exact, case-sensitive reference of at most 64 characters. It is unique per user. It is not a general idempotency key. After an uncertain create response, look the reference up before creating another order.

### `submitDeposit`

`POST /api/orders/{id}/deposit`. Optional fast path after you broadcast a supported on-chain deposit while the order is `new`. Fiat, Lightning, internal-balance, and manual deposits do not use this call. The response is the current order.

```ts
const pending = await client.submitDeposit("BV2MTZAF", {
  txid: "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
});
console.log(pending.status);
```

### `updateSettleData`

`PUT /api/orders/{id}/settle-data`. Requires a write key. The order must be `settle_data_error`.

```ts
const corrected = await client.updateSettleData("BV2MTZAF", {
  address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
});
console.log(corrected.status);
```

Lightning, tagged-address, and VND bank corrections use the same payout shapes as order creation.

## Polling

`waitForOrder` calls `getOrder` until `status` is one of `statuses`, or the timeout elapses. The default stop statuses are `completed`, `canceled`, and `settle_data_error`. `on_hold` keeps polling unless you include it.

```ts
const done = await client.waitForOrder("BV2MTZAF", {
  timeoutMs: 120_000,
  intervalMs: 3_000,
  statuses: ["completed", "canceled"],
});
console.log(done.status, done.settleTxns);
```

A timeout throws `BitcoinVnTimeoutError`. `error.order` is the last order. Pass `signal` to abort. An abort throws `BitcoinVnError` with status 0.

`GET` retries apply to each poll when `retries` is greater than 0.

## Pagination

Orders use 10 rows per page. Ledger history uses 25. Walking stops on a short page or after `maxPages` (default 100).

```ts
const orders = await client.listAllOrders({ customOrderId: "rent-october" });
for await (const order of client.iterateOrders({ maxPages: 5 })) {
  console.log(order.shortId, order.status);
}

const rows = await client.listAllBalanceHistory({ assetId: "BTC", maxPages: 3 });
for await (const row of client.iterateBalanceHistory({ assetId: "BTC" })) {
  console.log(row.createdAt, row.value, row.asset);
}
```

## Balances

### `getBalances` and `balances`

`GET /api/balances`. Requires a key. Values are available amounts keyed by asset id. A completed funding order can include funds that are not spendable yet. Use this map, not the order's settle amount, before you spend a balance.

```ts
const balances = await client.getBalances();
const same = await client.balances();
console.log(balances.BTC, same.USDT);
```

There is no separate withdraw endpoint. Fund a balance by settling into an internal-balance method. Spend it by depositing from that method.

### `listBalanceHistory`

`GET /api/balances/history`. Requires a key. Positive `value` is a credit. Negative `value` is a debit.

```ts
const history = await client.listBalanceHistory({ assetId: "BTC", page: 1 });
for (const row of history) {
  console.log(row.createdAt, row.value, row.asset, row.note);
}
```

## Staking

### `listStakingOffers`

`GET /api/staking`. Lists offers that have an active supply target. A key is not required to list offers.

```ts
const offers = await client.listStakingOffers();
for (const offer of offers) {
  console.log(offer.id, offer.asset, offer.latestApr, offer.staked, offer.supplyTarget);
}
```

### `setAutoStake`

`PUT /api/staking/{id}/auto-stake`. Requires a write key. `id` is the offer UUID.

```ts
const auto = await client.setAutoStake(offers[0].id, true);
console.log(auto.value);
```

### `setStakingNotifications`

`PUT /api/staking/{id}/notifications`. Requires a write key.

```ts
const alerts = await client.setStakingNotifications(offers[0].id, false);
console.log(alerts.value);
```

## Guarantees

### `getGuaranteePublicKey`

`GET /api/guarantee/public-key`. Returns armored OpenPGP certificates as text.

```ts
const certificates = await client.getGuaranteePublicKey();
console.log(certificates.slice(0, 36));
```

### `getOrderGuarantee`

`GET /api/orders/{id}/guarantee`. Returns the stored clear-signed letter. Access matches `getOrder`. Older orders and some deposit types have no letter. HTTP 503 during order creation can mean guarantee signing failed and the order was rolled back.

```ts
const letter = await client.getOrderGuarantee("BV2MTZAF");
console.log(letter.includes("BEGIN PGP SIGNED MESSAGE"));
```

## Webhooks

Set `webhookUrl` on `createOrder`, `fixedSwap`, or `variableSwap`. Production accepts HTTPS on port 443 or with no port, a public host, and no credentials or fragment.

Deliveries are queued for `pending`, `on_hold`, `processing`, `completed`, and `canceled`. A move to `settle_data_error`, reprocessing a completed order, or a receipt-only change does not currently send a webhook. Deliveries can repeat or arrive out of order. The body is the order at send time. Fetch `getOrder` before you credit a customer.

For an order created with an API key, require `X-Signature`. It is the lowercase hex HMAC-SHA256 of the exact raw body, using that API key. Guest orders are unsigned. Treat an unsigned body as a hint to fetch the known order, not as authorization.

A `2xx` response accepts delivery. `3xx` and `5xx` can be retried. `4xx` and transport errors are not retried.

```ts
import { createHmac, timingSafeEqual } from "node:crypto";
import { readWebhook, verifyWebhookSignature, webhookSignature, BitcoinVn } from "bitcoinvn";

const client = new BitcoinVn({ apiKey: process.env.BITCOINVN_API_KEY });

function handle(rawBody: string, signature: string | undefined): void {
  const { order, verified } = readWebhook(rawBody, signature, process.env.BITCOINVN_API_KEY, {
    requireSignature: true,
  });
  console.log(verified, order.shortId, order.status);
}

const raw = JSON.stringify({ shortId: "BV2MTZAF", status: "completed" });
const signature = webhookSignature(raw, process.env.BITCOINVN_API_KEY!);
console.log(client.verifyWebhook(raw, signature));
console.log(verifyWebhookSignature(raw, signature, process.env.BITCOINVN_API_KEY!));
handle(raw, signature);
```

`examples/webhook.ts` runs this check offline.

Compare signatures with `timingSafeEqual` if you build the HMAC yourself. `verifyWebhookSignature` already does that.

## Errors

Failures throw `BitcoinVnError`. Subclasses keep `instanceof BitcoinVnError` working.

| Class | Status | When |
| --- | --- | --- |
| `BitcoinVnBadRequestError` | 400 | Invalid method, amount, markup, or body. `details` may name the field. |
| `BitcoinVnUnauthorizedError` | 401 | Missing, disabled, or suspended key, or an IP outside the allowlist. |
| `BitcoinVnForbiddenError` | 403 | Read-only key, or the key does not own the order. |
| `BitcoinVnNotFoundError` | 404 | Unknown order, asset, pair, or certificate. |
| `BitcoinVnConflictError` | 409 | The order state does not allow the action, for example deposit submit when the order is not `new`. |
| `BitcoinVnUnprocessableEntityError` | 422 | ENS or address resolution failed. |
| `BitcoinVnRateLimitError` | 429 | The client IP exceeded the endpoint budget. Read `retryAfter`. |
| `BitcoinVnServerError` | other 5xx | Unexpected server failure. |
| `BitcoinVnMaintenanceError` | 503 | Maintenance, or order creation rolled back because a guarantee could not be stored. |
| `BitcoinVnTransportError` | 0 | DNS, connection, or timeout before an HTTP response. |
| `BitcoinVnTimeoutError` | 0 | `waitForOrder` reached its deadline. `order` is the last snapshot. |

`code` matches the API `error.code`, which equals the HTTP status. `raw` is the response body. `limit` and `remaining` are copied from rate-limit headers when present.

```ts
import { BitcoinVn, BitcoinVnError, BitcoinVnRateLimitError, BitcoinVnTimeoutError } from "bitcoinvn";

const client = new BitcoinVn({ retries: 2, maxRetryDelayMs: 2_000 });

try {
  await client.getTicker("NOPE", "USDT");
} catch (error) {
  if (error instanceof BitcoinVnRateLimitError) {
    console.error(error.message, error.retryAfter, client.lastRateLimit);
  } else if (error instanceof BitcoinVnTimeoutError) {
    console.error(error.message, error.order?.status);
  } else if (error instanceof BitcoinVnError) {
    console.error(error.status, error.code, error.details);
  } else {
    throw error;
  }
}
```

## Retries, proxies, and timeouts

GET requests are idempotent and may be retried. Order creation is not, unless `retryMutations` is true. A retried POST can create two orders.

```ts
const client = new BitcoinVn({
  retries: 2,
  retryDelayMs: 200,
  maxRetryDelayMs: 2_000,
  timeoutMs: 10_000,
  proxy: "http://127.0.0.1:8080",
});
```

The delay for attempt `n` (starting at 0) is `min(max(retryDelayMs * 2^n, retryAfterSeconds * 1000), maxRetryDelayMs)`. HTTP 400, 401, 403, 404, 409, and 422 are not retried.

Pass an Axios instance when you already have agents, interceptors, or a test double:

```ts
import axios from "axios";

const http = axios.create({ baseURL: "https://bitcoinvn.io" });
const client = new BitcoinVn({ apiKey: process.env.BITCOINVN_API_KEY, axios: http });
```

## TypeScript

The package ships `dist/index.d.ts`. Strict mode is on. Response fields use the JSON names from the OpenAPI document (`settleAmount`, not `settle_amount`).

Exported types include `Order`, `Quote`, `Pair`, `Ticker`, `Info`, `TransferMethod`, `Asset`, `Vault`, `LedgerItem`, `EnsResolution`, `OrderStatus`, `CreateOrderParams`, `CreateQuoteParams`, `OrderSettleData`, `BitcoinVnOptions`, `RateLimit`, `WaitForOrderParams`, and `WebhookRead`.

`CreateOrderParams` is a union of the four legal bodies, so a quote id combined with both method ids does not type-check. `ORDER_STATUSES` and `DEFAULT_WAIT_STATUSES` are runtime arrays.

## Examples

| File | What it does |
| --- | --- |
| `examples/check.ts` | Public BTC/USDT ticker. |
| `examples/market.ts` | Health, info, ticker, pair, staking list, swap URL. |
| `examples/quote.ts` | One production quote. Does not move funds. |
| `examples/addresses.ts` | Address validation and optional ENS resolution. |
| `examples/account.ts` | Balances, order page, ledger page, guarantee key. Needs `BITCOINVN_API_KEY`. |
| `examples/order.ts` | Creates an order only when `BITCOINVN_ALLOW_WRITES=1`. |
| `examples/wait.ts` | Polls `BITCOINVN_ORDER_ID`. Read-only. |
| `examples/staking.ts` | Lists offers. Writes preferences only when writes are enabled. |
| `examples/webhook.ts` | Offline HMAC check. |

```bash
npx tsx examples/market.ts
```

## FAQ

**Does a quote lock funds?** No. It creates a production quote and uses rate-limit budget. The order locks the rate only under the quote rules in the OpenAPI description.

**Why is `referrer` always the same?** Order attribution for this client is fixed. The API key owner and the referrer are different. The client ignores any other `referrer`.

**Can I refund through the API?** No. The public API has no refund-address or refund endpoint. Contact BitcoinVN support with the `shortId`.

**Are webhooks enough?** No. Poll `getOrder` as well. `settle_data_error` does not send a webhook.

**What page size should I assume?** Orders return 10. Ledger history returns 25. `listAllOrders` stops when a page is shorter than that, or after `maxPages`.

## Development

```bash
npm install
npm test          # Jest unit tests and coverage
npm run typecheck
npm run build
npm run test:live # skipped unless BITCOINVN_API_KEY is set; read-only
```

Unit tests mock Axios. Coverage thresholds are 95% lines, statements, functions, and branches. The current unit run reports 100% lines and functions, 99.71% statements, and 96.27% branches.

## Contributing

Issues and pull requests go to <https://github.com/TysikGG/api-kit>. Keep changes inside `bitcoinvn/` unless the root service table needs a description update. Do not change the default `REFERRER` value. Add a mocked test for every new public method and error path.

## License

[ISC](LICENSE) © api-kit contributors
