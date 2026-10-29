# bitcoinvn

[![PyPI version](https://img.shields.io/pypi/v/bitcoinvn.svg)](https://pypi.org/project/bitcoinvn/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Python](https://img.shields.io/pypi/pyversions/bitcoinvn.svg)](https://pypi.org/project/bitcoinvn/)

Typed Python client for the [BitcoinVN Exchange API](https://bitcoinvn.io/api/doc.json). BitcoinVN is an instant cryptocurrency exchange: public rates, quotes, orders, internal balances, staking preferences, and signed order webhooks.

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
- [Async client](#async-client)
- [Errors](#errors)
- [Retries, proxies, and timeouts](#retries-proxies-and-timeouts)
- [Type hints](#type-hints)
- [Examples](#examples)
- [FAQ](#faq)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Features

- Every public operation in the BitcoinVN OpenAPI document: health, info, pairs, ticker, address validation, quotes, orders, deposit hash submission, settle-data correction, balances, ledger history, staking offers and preferences, ENS resolution, and guarantee letters.
- Quote and order helpers aligned with the official PHP SDK: `quote`, `fixed_swap`, `variable_swap`, `info`, `pair`, `order`, `orders`, and `balances`.
- `wait_for_order` with a timeout, a poll interval, and a caller-selected set of statuses.
- Page walkers for orders (10 per page) and ledger history (25 per page).
- HMAC-SHA256 verification of account-order webhooks (`X-Signature`).
- Typed errors for HTTP 400, 401, 403, 404, 409, 422, 429, 500, and 503, plus transport and wait timeouts.
- Optional retries for idempotent GET calls on transport failures, HTTP 429, and HTTP 5xx. `X-RateLimit-Retry-After` is capped by `max_retry_delay_ms`. POST and PUT are not retried unless you opt in.
- HTTP and HTTPS proxy support, custom base URL, timeout, and extra headers.
- `referrer` is always sent on `POST /api/orders` and cannot be replaced by the caller.
- `AsyncBitcoinVn` wraps the same methods with `httpx.AsyncClient`.
- Unit tests mock HTTP. Live tests stay read-only and run only when `BITCOINVN_API_KEY` is set.

## Comparison

Searches of the npm registry (`bitcoinvn`) and PyPI (`bitcoinvn`) on 29 October 2026 return this package and no other JavaScript or Python client. The official community SDKs are PHP.

| Capability | bitcoinvn (this package) | bitcoinvn/bitcoinvn-php and bitcoinvn-php-v2 | Legacy bitcoinvietnam/bitcoinvn-php |
| --- | --- | --- | --- |
| Current host `https://bitcoinvn.io` | Yes | Yes (v2) | No (`api.bitcoinvn.io`) |
| Full current OpenAPI surface, including staking, ENS, and guarantees | Yes | Partial: info, pair, balances, orders, quote, fixed and variable swaps | Legacy client |
| Sync and async clients | Yes | Sync Guzzle | Legacy |
| Order pagination query | `page` | Older `p` parameter | Legacy |
| Webhook HMAC verification | Yes | No | No |
| Poll with timeout | Yes | No | No |
| Retries and proxy | Yes | Caller configures Guzzle | No |
| Typed error classes | Yes | Generic HTTP errors | No |
| Pinned partner `referrer` on order create | Yes, always | Caller must send it | No |

## Installation

```bash
pip install bitcoinvn
```

Python 3.10 or newer is required. The only runtime dependency is `httpx`.

```python
from bitcoinvn import BitcoinVn
```

## Configuration

```python
import os

from bitcoinvn import BitcoinVn

client = BitcoinVn(
    os.environ.get("BITCOINVN_API_KEY"),
    base_url="https://bitcoinvn.io",
    timeout_ms=30_000,
    proxy="http://user:pass@127.0.0.1:8080",
    retries=2,
    retry_delay_ms=200,
    max_retry_delay_ms=5_000,
    retry_mutations=False,
    headers={"X-Trace": "checkout"},
)
```

`BitcoinVn("your-key")` is the same as passing `api_key`. A blank key sends no `X-API-KEY` header. Use the client as a context manager so the underlying `httpx.Client` is closed:

```python
with BitcoinVn() as client:
    ticker = client.get_ticker("BTC", "USDT")
```

| Option | Default | Description |
| --- | --- | --- |
| `api_key` | none | Sent as `X-API-KEY`. Public reads, quotes, and guest order creation work without it. |
| `base_url` | `https://bitcoinvn.io` | Trailing slashes are removed. |
| `timeout_ms` | `30000` | Per-request timeout in milliseconds. |
| `client` | built-in `httpx.Client` | When set, `base_url`, `timeout_ms`, and `proxy` are ignored. You own this instance; it is not closed. |
| `proxy` | none | `http://` or `https://` URL. SOCKS is not built in. |
| `retries` | `0` | Extra GET attempts after a transport error, HTTP 429, or HTTP 5xx. |
| `retry_delay_ms` | `200` | Base delay. It doubles on each later attempt. |
| `max_retry_delay_ms` | `5000` | Cap, including `X-RateLimit-Retry-After`. |
| `retry_mutations` | `False` | Also retry POST and PUT. Leave this false for order creation. |
| `headers` | none | Extra headers. `User-Agent` and `X-API-KEY` are set by the client. |
| `sleep` | `time.sleep` | Sleep used by retries and polling. |
| `monotonic` | `time.monotonic` | Clock used by `wait_for_order`. |

`client.last_rate_limit` is the latest `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Retry-After` snapshot, when the API sent any of those headers. Keys are `limit`, `remaining`, and `retry_after`.

The client sends `User-Agent: bitcoinvn/0.1.0`.

## Quick start

This check reads the public BTC/USDT ticker. It does not create an order.

```python
from bitcoinvn import BitcoinVn

with BitcoinVn() as client:
    ticker = client.get_ticker("BTC", "USDT")
    print(ticker["rate"], ticker["volume24h"])
```

The same script is `examples/check.py`.

## Authentication

Send the key on account calls. A read-only key can list orders and balances. A read-and-write key can create orders and change staking preferences. A read-and-write key can spend an internal balance, so keep it on a server.

```python
import os

from bitcoinvn import BitcoinVn

with BitcoinVn(os.environ["BITCOINVN_API_KEY"]) as client:
    balances = client.get_balances()
```

HTTP 401 means the key is missing, disabled, suspended, or the caller IP is outside the key allowlist. HTTP 403 means the key is read-only, or it does not own the order.

## Market data

### `get_health`

`GET /api/health`. The documented body is `{"status": "ok"}`.

```python
health = client.get_health()
print(health["status"])
```

### `get_info` and `info`

`GET /api/info`. Use transfer-method ids exactly as returned. `enabled` does not by itself open a direction. Check `depositEnabled` or `settleEnabled`. External methods include `settleDataFields`.

```python
info = client.get_info()
btc = info["transferMethods"]["btc"]
print(btc["depositEnabled"], btc["settleEnabled"], btc.get("settleDataFields"))

same = client.info()
```

### `get_pair` and `pair`

`GET /api/pairs/{depositMethodId}/{settleMethodId}`. A 200 response does not reserve liquidity. If `max` is less than `min`, the pair has no valid deposit range. An API key applies the account minimum to `min`.

```python
pair = client.get_pair("btc", "xmr")
print(pair["rate"], pair["min"], pair.get("max"))

alias = client.pair("btc", "usdt")
```

### `get_ticker`

`GET /api/ticker/{baseAssetId}/{quoteAssetId}`. Asset ids are case-sensitive. `rate` is quote units per one base unit, including fees.

```python
ticker = client.get_ticker("BTC", "USDT")
print(ticker["rate"], ticker["volume24h"])
```

### `swap_url`

Builds `https://bitcoinvn.io/?deposit=btc&settle=xmr` from the origin of `base_url`. The link does not reserve a quote.

```python
print(client.swap_url("btc", "xmr"))
print(client.swap_url())
```

## Addresses

### `validate_address`

`GET /api/addresses/validate`. For Lightning, pass the BOLT11 invoice as `address` and set `invoice_amount` when it must match the order amount.

```python
result = client.validate_address(
    "btc",
    "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
)
print(result["valid"], result.get("error"))
```

```python
invoice = client.validate_address(
    "btcln",
    "lnbc1example",
    invoice_amount=0.01,
)
```

### `resolve_address`

`GET /api/addresses/resolve`. Resolves an ASCII ENS name. `ensResolutionToken` expires 15 minutes after `resolvedAt` and is sent as `settleData.ensResolutionToken`.

```python
resolved = client.resolve_address("eth", "alice.eth")
print(resolved["address"], resolved["ensResolutionToken"], resolved["expiresAt"])
```

## Quotes

### `create_quote` and `quote`

`POST /api/quotes`. Send `deposit_amount`, `settle_amount`, or neither, but not both. This creates a production quote and does not move funds. Asset-conversion quotes last 15 minutes. Same-asset quotes last one day. Use `expiresAt`. Creating an order does not extend the quote.

`markup_rate` must be greater than 0 and at most 0.10. The markup reduces the settlement rate. The client does not send `referrer` on quotes.

`quote` accepts the amounts as positional arguments so it matches the PHP SDK. `create_quote` takes those amounts as keywords.

```python
fixed_deposit = client.create_quote("btc", "xmr", deposit_amount=0.01)

fixed_settle = client.quote("btc", "usdt", None, 100)

variable = client.create_quote("btc", "xmr")

marked_up = client.create_quote("btc", "xmr", deposit_amount=0.01, markup_rate=0.01)

print(
    fixed_deposit["settleAmount"],
    fixed_settle["depositAmount"],
    variable["id"],
    marked_up["rate"],
)
```

## Orders

`POST /api/orders` always includes `referrer`. The value is the exported constant `REFERRER` (`35b2eec68a1741ac`). The method has no `referrer` parameter. Passing one raises `TypeError`. Do not remove that field from the request.

An API key is optional. If you send one, the order is linked to that account and webhooks are signed with that key.

### `create_order`

Four request shapes:

```python
from_quote = client.create_order(
    quote=fixed_deposit["id"],
    settle_data={"address": "4example"},
    custom_order_id="rent-october",
    webhook_url="https://merchant.example/hooks/bitcoinvn",
)

variable_order = client.create_order(
    deposit_method="btc",
    settle_method="xmr",
    settle_data={"address": "4example"},
)

spend_balance = client.create_order(
    quote=amountless_internal_quote_id,
    deposit_amount=0.01,
    settle_data={"address": "4example"},
)

receive_balance = client.create_order(quote=amountless_internal_settle_quote_id)

print(from_quote["shortId"], from_quote["depositData"])
print(variable_order["depositAmount"], spend_balance["status"], receive_balance["settleMethod"])
```

Payout objects match the method's `settleDataFields`:

```python
lightning = {"invoice": "lnbc1..."}
tagged = {"address": "rExample", "destinationTag": "12345"}
memo = {"address": "cosmos1example", "memo": "hello"}
bank = {"accountNumber": "0123456789", "bank": "Vietcombank", "accountHolder": "Satoshi"}
internal = {"user": "alice@example.com", "note": "invoice 17"}
cash = {"phone": "+84901234567"}
ens = {"address": "alice.eth", "ensResolutionToken": resolved["ensResolutionToken"]}
```

Send a destination tag or a memo, not both. Omit `settle_data` when the method needs no destination, including a credit to your own internal balance.

`depositData` on the response is where the customer sends funds. There is no `depositAddress` shortcut: read the fields the API returned, such as `address`.

### `fixed_swap`

PHP-style helper. A string destination becomes `{"address": destination}`. Omit it, or pass `None`, for an internal-balance credit.

```python
order = client.fixed_swap(
    fixed_deposit["id"],
    "4example",
    webhook_url="https://merchant.example/hooks/bitcoinvn",
    custom_order_id="rent-october",
)
```

```python
invoice_order = client.fixed_swap(quote_id, {"invoice": "lnbc1..."})
own_balance = client.fixed_swap(quote_id, None)
```

### `variable_swap`

Variable-amount order without a quote. The settlement amount is set when the deposit is confirmed.

```python
open_order = client.variable_swap(
    "btc",
    "vnd",
    {
        "accountNumber": "0123456789",
        "bank": "Vietcombank",
        "accountHolder": "Satoshi Nakamoto",
    },
)
print(open_order["depositData"])
```

### `get_order` and `order`

`GET /api/orders/{id}`. `order_id` is the 8-character `shortId`, for example `BV2MTZAF`. A key is optional. Another account's key returns 403 for an account order.

```python
order = client.get_order("BV2MTZAF")
same = client.order("BV2MTZAF")
print(order["status"], same.get("settleAmount"), order.get("quote", {}).get("accepted"))
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

### `list_orders` and `orders`

`GET /api/orders`. Requires a key. Each page has 10 orders, newest first.

```python
page = client.list_orders(page=1, custom_order_id="rent-october")
same = client.orders(page=2)
print(len(page), same[0]["shortId"] if same else None)
```

`customOrderId` is an exact, case-sensitive reference of at most 64 characters. It is unique per user. It is not a general idempotency key. After an uncertain create response, look the reference up before creating another order.

### `submit_deposit`

`POST /api/orders/{id}/deposit`. Optional fast path after you broadcast a supported on-chain deposit while the order is `new`. Fiat, Lightning, internal-balance, and manual deposits do not use this call. The response is the current order.

```python
pending = client.submit_deposit(
    "BV2MTZAF",
    "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
)
print(pending["status"])
```

### `update_settle_data`

`PUT /api/orders/{id}/settle-data`. Requires a write key. The order must be `settle_data_error`.

```python
corrected = client.update_settle_data(
    "BV2MTZAF",
    {"address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"},
)
print(corrected["status"])
```

Lightning, tagged-address, and VND bank corrections use the same payout shapes as order creation.

## Polling

`wait_for_order` calls `get_order` until `status` is one of `statuses`, or the timeout elapses. The default stop statuses are `completed`, `canceled`, and `settle_data_error`. `on_hold` keeps polling unless you include it.

```python
done = client.wait_for_order(
    "BV2MTZAF",
    timeout_ms=120_000,
    interval_ms=3_000,
    statuses=["completed", "canceled"],
)
print(done["status"], done.get("settleTxns"))
```

A timeout raises `BitcoinVnTimeoutError`. `error.order` is the last order.

GET retries apply to each poll when `retries` is greater than 0.

## Pagination

Orders use 10 rows per page. Ledger history uses 25. Walking stops on a short page or after `max_pages` (default 100).

```python
orders = client.list_all_orders(custom_order_id="rent-october")
for order in client.iter_orders(max_pages=5):
    print(order["shortId"], order["status"])

rows = client.list_all_balance_history(asset_id="BTC", max_pages=3)
for row in client.iter_balance_history(asset_id="BTC"):
    print(row["createdAt"], row["value"], row["asset"])
```

## Balances

### `get_balances` and `balances`

`GET /api/balances`. Requires a key. Values are available amounts keyed by asset id. A completed funding order can include funds that are not spendable yet. Use this map, not the order's settle amount, before you spend a balance.

```python
balances = client.get_balances()
same = client.balances()
print(balances.get("BTC"), same.get("USDT"))
```

There is no separate withdraw endpoint. Fund a balance by settling into an internal-balance method. Spend it by depositing from that method.

### `list_balance_history`

`GET /api/balances/history`. Requires a key. Positive `value` is a credit. Negative `value` is a debit.

```python
history = client.list_balance_history(asset_id="BTC", page=1)
for row in history:
    print(row["createdAt"], row["value"], row["asset"], row.get("note"))
```

## Staking

### `list_staking_offers`

`GET /api/staking`. Lists offers that have an active supply target. A key is not required to list offers.

```python
offers = client.list_staking_offers()
for offer in offers:
    print(offer["id"], offer["asset"], offer.get("latestApr"), offer.get("staked"))
```

### `set_auto_stake`

`PUT /api/staking/{id}/auto-stake`. Requires a write key. `id` is the offer UUID.

```python
auto = client.set_auto_stake(offers[0]["id"], True)
print(auto["value"])
```

### `set_staking_notifications`

`PUT /api/staking/{id}/notifications`. Requires a write key.

```python
alerts = client.set_staking_notifications(offers[0]["id"], False)
print(alerts["value"])
```

## Guarantees

### `get_guarantee_public_key`

`GET /api/guarantee/public-key`. Returns armored OpenPGP certificates as text.

```python
certificates = client.get_guarantee_public_key()
print(certificates[:36])
```

### `get_order_guarantee`

`GET /api/orders/{id}/guarantee`. Returns the stored clear-signed letter. Access matches `get_order`. Older orders and some deposit types have no letter. HTTP 503 during order creation can mean guarantee signing failed and the order was rolled back.

```python
letter = client.get_order_guarantee("BV2MTZAF")
print("BEGIN PGP SIGNED MESSAGE" in letter)
```

## Webhooks

Set `webhook_url` on `create_order`, `fixed_swap`, or `variable_swap`. Production accepts HTTPS on port 443 or with no port, a public host, and no credentials or fragment.

Deliveries are queued for `pending`, `on_hold`, `processing`, `completed`, and `canceled`. A move to `settle_data_error`, reprocessing a completed order, or a receipt-only change does not currently send a webhook. Deliveries can repeat or arrive out of order. The body is the order at send time. Fetch `get_order` before you credit a customer.

For an order created with an API key, require `X-Signature`. It is the lowercase hex HMAC-SHA256 of the exact raw body, using that API key. Guest orders are unsigned. Treat an unsigned body as a hint to fetch the known order, not as authorization.

A `2xx` response accepts delivery. `3xx` and `5xx` can be retried. `4xx` and transport errors are not retried.

```python
import json
import os

from bitcoinvn import BitcoinVn, read_webhook, verify_webhook_signature, webhook_signature

client = BitcoinVn(os.environ["BITCOINVN_API_KEY"])

def handle(raw_body: str, signature: str | None) -> None:
    order, verified = read_webhook(
        raw_body,
        signature,
        os.environ["BITCOINVN_API_KEY"],
        require_signature=True,
    )
    print(verified, order["shortId"], order["status"])

raw = json.dumps({"shortId": "BV2MTZAF", "status": "completed"})
signature = webhook_signature(raw, os.environ["BITCOINVN_API_KEY"])
print(client.verify_webhook(raw, signature))
print(verify_webhook_signature(raw, signature, os.environ["BITCOINVN_API_KEY"]))
handle(raw, signature)
```

`examples/webhook_demo.py` runs this check offline.

`verify_webhook_signature` compares digests with `hmac.compare_digest`.

The instance methods `client.verify_webhook` and `client.read_webhook` use the key passed to the constructor. The module functions take the key as an argument.

## Swap links

`swap_url` is documented under [Market data](#swap_url). It only builds an HTML form URL. It does not call the API and does not send `referrer`.

## Async client

`AsyncBitcoinVn` has the same constructor options and the same HTTP methods. Await each call. `wait_for_order`, `iter_orders`, `list_all_orders`, `iter_balance_history`, and `list_all_balance_history` are async. `swap_url`, `verify_webhook`, and `read_webhook` stay synchronous because they do not use the network.

```python
import asyncio

from bitcoinvn import AsyncBitcoinVn

async def main() -> None:
    async with AsyncBitcoinVn(retries=2) as client:
        ticker = await client.get_ticker("BTC", "USDT")
        print(ticker["rate"], ticker["volume24h"])
        done = await client.wait_for_order("BV2MTZAF", timeout_ms=120_000)
        print(done["status"])
        async for order in client.iter_orders(max_pages=2):
            print(order["shortId"])

asyncio.run(main())
```

`examples/async_ticker.py` is the public-ticker version.

Pass `sleep` as an async function when you inject a test clock. The built-in client uses `asyncio.sleep`.

## Errors

Failures raise `BitcoinVnError`. Subclasses keep `except BitcoinVnError` working.

| Class | Status | When |
| --- | --- | --- |
| `BitcoinVnBadRequestError` | 400 | Invalid method, amount, markup, or body. `details` may name the field. |
| `BitcoinVnUnauthorizedError` | 401 | Missing, disabled, or suspended key, or an IP outside the allowlist. |
| `BitcoinVnForbiddenError` | 403 | Read-only key, or the key does not own the order. |
| `BitcoinVnNotFoundError` | 404 | Unknown order, asset, pair, or certificate. |
| `BitcoinVnConflictError` | 409 | The order state does not allow the action, for example deposit submit when the order is not `new`. |
| `BitcoinVnUnprocessableEntityError` | 422 | ENS or address resolution failed. |
| `BitcoinVnRateLimitError` | 429 | The client IP exceeded the endpoint budget. Read `retry_after`. |
| `BitcoinVnServerError` | other 5xx | Unexpected server failure. |
| `BitcoinVnMaintenanceError` | 503 | Maintenance, or order creation rolled back because a guarantee could not be stored. |
| `BitcoinVnTransportError` | 0 | DNS, connection, or timeout before an HTTP response. |
| `BitcoinVnTimeoutError` | 0 | `wait_for_order` reached its deadline. `order` is the last snapshot. |

`code` matches the API `error.code`, which equals the HTTP status. `raw` is the response body. `limit` and `remaining` are copied from rate-limit headers when present.

```python
from bitcoinvn import (
    BitcoinVn,
    BitcoinVnError,
    BitcoinVnRateLimitError,
    BitcoinVnTimeoutError,
)

client = BitcoinVn(retries=2, max_retry_delay_ms=2_000)

try:
    client.get_ticker("NOPE", "USDT")
except BitcoinVnRateLimitError as error:
    print(error, error.retry_after, client.last_rate_limit)
except BitcoinVnTimeoutError as error:
    status = error.order["status"] if error.order else None
    print(error, status)
except BitcoinVnError as error:
    print(error.status, error.code, error.details)
```

## Retries, proxies, and timeouts

GET requests are idempotent and may be retried. Order creation is not, unless `retry_mutations` is true. A retried POST can create two orders.

```python
client = BitcoinVn(
    retries=2,
    retry_delay_ms=200,
    max_retry_delay_ms=2_000,
    timeout_ms=10_000,
    proxy="http://127.0.0.1:8080",
)
```

The delay for attempt `n` (starting at 0) is `min(max(retry_delay_ms * 2^n, retry_after_seconds * 1000), max_retry_delay_ms)`. HTTP 400, 401, 403, 404, 409, and 422 are not retried.

Pass an `httpx.Client` when you already have transports, event hooks, or a test double:

```python
import httpx

from bitcoinvn import BitcoinVn

http = httpx.Client(base_url="https://bitcoinvn.io")
client = BitcoinVn(api_key, client=http)
```

`AsyncBitcoinVn` accepts an `httpx.AsyncClient` the same way.

## Type hints

Responses are `TypedDict` mappings that use the JSON names from the OpenAPI document (`settleAmount`, not `settle_amount`). Optional fields may be absent, so read them with `.get`.

Exported types include `Order`, `Quote`, `Pair`, `Ticker`, `Info`, `TransferMethod`, `Asset`, `Vault`, `LedgerItem`, `EnsResolution`, `AddressValidation`, `HealthStatus`, `Balances`, `BooleanConfiguration`, and `OrderStatus`.

`ORDER_STATUSES`, `DEFAULT_WAIT_STATUSES`, `ORDERS_PAGE_SIZE`, and `LEDGER_PAGE_SIZE` are runtime constants. `REFERRER` is the partner id sent on every order create.

## Examples

| File | What it does |
| --- | --- |
| `examples/check.py` | Public BTC/USDT ticker. |
| `examples/market.py` | Health, info, ticker, pair, staking list, swap URL. |
| `examples/quote.py` | One production quote. Does not move funds. |
| `examples/addresses.py` | Address validation and optional ENS resolution. |
| `examples/account.py` | Balances, order page, ledger page, guarantee key. Needs `BITCOINVN_API_KEY`. |
| `examples/order.py` | Creates an order only when `BITCOINVN_ALLOW_WRITES=1`. |
| `examples/wait.py` | Polls `BITCOINVN_ORDER_ID`. Read-only. |
| `examples/staking.py` | Lists offers. Writes preferences only when writes are enabled. |
| `examples/webhook_demo.py` | Offline HMAC check. |
| `examples/async_ticker.py` | Async public ticker. |

```bash
python examples/market.py
```

## FAQ

**Does a quote lock funds?** No. It creates a production quote and uses rate-limit budget. The order locks the rate only under the quote rules in the OpenAPI description.

**Why is `referrer` always the same?** Order attribution for this client is fixed. The API key owner and the referrer are different. The client ignores any other `referrer`.

**Can I refund through the API?** No. The public API has no refund-address or refund endpoint. Contact BitcoinVN support with the `shortId`.

**Are webhooks enough?** No. Poll `get_order` as well. `settle_data_error` does not send a webhook.

**What page size should I assume?** Orders return 10. Ledger history returns 25. `list_all_orders` stops when a page is shorter than that, or after `max_pages`.

## Development

```bash
uv sync
uv run ruff check
uv run pytest                 # unit tests and coverage; live tests skip without a key
uv run pytest -m live         # read-only calls; needs BITCOINVN_API_KEY
```

Unit tests mock `httpx`. The coverage gate is 95% statements, with branch coverage enabled. The current unit run reports 99.32% statements.

## Contributing

Issues and pull requests go to <https://github.com/TysikGG/api-kit>. Keep changes inside `bitcoinvn/` unless the root service table needs a description update. Do not change the default `REFERRER` value. Add a mocked test for every new public method and error path.

## License

[ISC](LICENSE) © api-kit contributors
