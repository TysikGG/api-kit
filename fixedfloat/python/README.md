# fixedfloat-client

[![PyPI version](https://img.shields.io/pypi/v/fixedfloat-client.svg)](https://pypi.org/project/fixedfloat-client/)
[![Python versions](https://img.shields.io/pypi/pyversions/fixedfloat-client.svg)](https://pypi.org/project/fixedfloat-client/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Typed Python client for the [FixedFloat](https://ff.io/api) API v2. Sync and async clients cover currencies, fixed and float quotes, the public XML rate file, orders, polling, emergency choices, email notifications, and deposit QR codes.

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
- [Async client](#async-client)
- [Error handling](#error-handling)
- [Order and quote codes](#order-and-quote-codes)
- [Advanced usage](#advanced-usage)
- [Type hints](#type-hints)
- [Examples](#examples)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

## Features

- Every public v2 method: `ccies`, `price`, `create`, `order`, `emergency`, `setEmail`, `qr`, plus `GET /rates/{fixed|float}.xml`.
- HMAC-SHA256 `X-API-SIGN` over the compact JSON body.
- Fixed and float rates, both directions, `ccies` and `usd` quote flags, and `afftax`.
- Shorthand quotes (`"0.1 ETH", "BTC"` and `"ETH", "0.1 BTC"`).
- Parsed XML rates with pair filters.
- `wait_for_order` with timeout, interval, target statuses, and a stop callback.
- Retries with exponential backoff for network errors, timeouts, HTTP 429 and 5xx. `POST /create` is not retried.
- Proxy URL, custom API base URL, custom rates origin, timeout, and extra headers.
- Dataclasses for orders, including the refund side, emergency block, and transaction confirmations.
- `FixedFloat` (sync, `httpx.Client`) and `AsyncFixedFloat` (`httpx.AsyncClient`) with the same methods.
- Error subclasses for API, HTTP, auth, rate limit, network, and timeout failures.

## Comparison

| Capability | fixedfloat-client | FixedFloatApi | fixedfloat-py | fixedfloat 0.2 |
| :--- | :---: | :---: | :---: | :---: |
| Currencies, price, create, order, emergency | yes | yes | yes | partial |
| Email and QR | yes | yes | no | no |
| Parsed XML rates | yes | no | no | no |
| `ccies` / `usd` quote flags | yes | no | no | no |
| Order polling | yes | no | no | no |
| Retries and proxy | yes | no | no | no |
| Async client | yes | no | no | no |
| Typed models and error classes | yes | no | no | no |

The JavaScript package of the same name is in [`fixedfloat/js`](../js). npm libraries `ff-io`, `fixedfloat`, and `fixedfloat-api` wrap a subset of the POST methods. `ff-io` also downloads the XML file as a string and can set an email. None of them poll, retry, or parse the rate file into rows.

## Installation

```bash
pip install fixedfloat-client
```

Python 3.10 or newer. The only runtime dependency is `httpx`.

Create an API key and secret in the FixedFloat account under API management. The secret is the HMAC key.

## Configuration

```python
from fixedfloat import FixedFloat

ff = FixedFloat(
    api_key="your-key",
    api_secret="your-secret",
    base_url="https://ff.io/api/v2",
    rates_base_url="https://ff.io",
    timeout=15.0,
    retries=2,
    retry_delay=0.2,
    proxy="http://user:pass@127.0.0.1:8080",
    headers={"X-Request-Id": "checkout-1"},
)
```

| Argument | Default | Description |
| :--- | :--- | :--- |
| `api_key` | `None` | Sent as `X-API-KEY`. |
| `api_secret` | `None` | HMAC-SHA256 key for `X-API-SIGN`. The message is the raw JSON body. |
| `base_url` | `https://ff.io/api/v2` | JSON API origin and prefix. |
| `rates_base_url` | `https://ff.io` | Origin for `/rates/float.xml` and `/rates/fixed.xml`. |
| `timeout` | `15` | Per-request timeout in seconds. |
| `retries` | `2` | Extra attempts after a transient failure. Business errors are not retried. `POST /create` is never retried. |
| `retry_delay` | `0.2` | Base backoff in seconds. Attempt n waits `retry_delay * 2**n`. |
| `proxy` | `None` | Proxy URL passed to httpx. |
| `headers` | `None` | Extra headers on signed JSON calls. Auth headers overwrite collisions. |

Use the client as a context manager so the connection pool closes. `close()` does the same thing.

Price and create requests always include the package referral code. `afftax` is optional and only changes the affiliate percentage when you pass it.

`AsyncFixedFloat` takes the same arguments. Close it with `async with` or `await client.aclose()`.

## Quick start

```python
from fixedfloat import FixedFloat

with FixedFloat(api_key="key", api_secret="secret") as ff:
    currencies = ff.get_currencies()
    print(len(currencies))

    price = ff.get_price("BTC", "ETH", 0.01, direction="from", order_type="float")
    print(price.from_side.amount, "->", price.to_side.amount, price.to_side.code)
```

This does not create an order.

## Currencies

`POST /ccies`. No body.

```python
currencies = ff.get_currencies()
# alias: ff.ccies()

from fixedfloat import find_currency

usdt = find_currency(currencies, "USDTTRC")
if usdt and usdt.tag:
    print("Destination field:", usdt.tag)
print(usdt.recv, usdt.send, usdt.contract, usdt.priority)
```

`recv` and `send` are `1` or `0`. Booleans from the API are normalized with `int`.

## Quotes

`POST /price`.

| Argument | Meaning |
| :--- | :--- |
| `from_ccy`, `to_ccy` | FixedFloat codes such as `BTC`, `ETH`, `USDTTRC`. |
| `amount` | Coins to send or to receive, depending on `direction`. |
| `direction` | `"from"` (send this amount) or `"to"` (receive this amount). Default `"from"`. |
| `order_type` | `"fixed"` or `"float"`. Default `"float"`. |
| `ccies` | When true, `PriceResult.ccies` lists send/receive availability. |
| `usd` | When true, out-of-limit amounts are adjusted using the USD equivalent. |
| `afftax` | Optional affiliate percentage. |

```python
quote = ff.get_price(
    "BTC",
    "USDTTRC",
    0.05,
    direction="from",
    order_type="float",
    ccies=True,
    usd=True,
    afftax=0.1,
)
print(quote.from_side.min, quote.from_side.max, quote.from_side.usd, quote.from_side.btc)
print(quote.to_side.amount, quote.to_side.rate, quote.to_side.precision)
print(quote.errors)  # [] when an order can be created
print(quote.exchangeable)
print(quote.ccies[0].code if quote.ccies else None)

ff.price("ETH", "BTC", 0.2, direction="to", order_type="fixed")
```

Shorthand:

```python
sent = ff.get_price_shorthand("0.1 ETH", "BTC")  # direction "from"
wanted = ff.get_price_shorthand("ETH", "0.01 BTC", "fixed")  # direction "to"
```

`get_price` returns the quote even when `errors` is non-empty. `get_price_or_raise` calls `assert_quote_ok` and raises `FixedFloatError` with code `0`.

```python
from fixedfloat import assert_quote_ok

quote = ff.get_price("BTC", "ETH", 0.01)
assert_quote_ok(quote)
# or
ff.get_price_or_raise("BTC", "ETH", 0.01)
```

Download the whole board with the XML export, not with one quote per pair.

## XML rates

`GET https://ff.io/rates/float.xml` and `GET https://ff.io/rates/fixed.xml`. No API key.

```python
xml = ff.get_rates_xml("float")
board = ff.get_rates(order_type="float")
pair = ff.get_rates(order_type="fixed", from_ccy="BTC", to_ccy="ETH")
row = pair[0]
print(row.in_amount, row.from_ccy, "->", row.out_amount, row.to_ccy)
print(row.to_fee, row.min_amount, row.max_amount, row.amount)
```

| Attribute | XML tag | Meaning |
| :--- | :--- | :--- |
| `from_ccy`, `to_ccy` | `from`, `to` | Currency codes. |
| `in_amount`, `out_amount` | `in`, `out` | Rate base and the amount received for that base. |
| `amount` | `amount` | Reserve indicator. Not the maximum exchange size. |
| `to_fee` | `tofee` | Network fee excluded from the rate. |
| `min_amount`, `max_amount` | `minamount`, `maxamount` | Limits, with the coin code in the string. |

`parse_rates_xml` and `filter_rates` work on a document you already have.

## Create an order

`POST /create`. Costs **50** weight units. Not retried.

```python
order = ff.create_order(
    "BTC",
    "USDTTRC",
    0.02,
    "TAzsQ9Gx8eqFNFSKbeXrbi45CuVPHzA8wr",
    direction="from",
    order_type="float",
    tag="12345",
    afftax=0.1,
)

ff.create(
    "ETH",
    "BTC",
    0.001,
    "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    direction="to",
    order_type="fixed",
)
```

`tag` is the official memo field. `extra_id` is still accepted and is sent as `tag` and as `extraId`. `refund_address` and `refund_extra_id` are forwarded when set. A memo can also be appended as `address:memo`.

Store `order.id` and `order.token`. The id is 6 characters. Later calls need both. There is no order-list method.

```python
print(order.id, order.token, order.type, order.status, order.status_text)
print(order.from_side.address, order.from_side.tag, order.from_side.address_mix)
print(order.from_side.req_confirmations, order.time.expiration, order.time.left)
print(order.to_side.amount, order.back, order.emergency)
```

The deposit side is `from_side` and the payout side is `to_side` (`from` is a Python keyword).

## Read an order

```python
current = ff.get_order(order.id, order.token)
# alias: ff.order(order.id, order.token)

print(current.status, current.status_text)
print(ff.status_text(current.status))
tx = current.from_side.tx
if tx:
    print(tx.id, tx.confirmations, tx.time_block, tx.fee, tx.ccyfee)
```

| Status | `status_text` |
| :--- | :--- |
| `NEW` | New order |
| `PENDING` | Transaction received, pending confirmation |
| `EXCHANGE` | Transaction confirmed, exchange in progress |
| `WITHDRAW` | Sending funds |
| `DONE` | Order completed |
| `EXPIRED` | Order expired |
| `EMERGENCY` | Emergency, customer choice required |

## Wait for an order

```python
done = ff.wait_for_order(
    order.id,
    order.token,
    statuses=["DONE", "EXPIRED", "EMERGENCY"],  # default
    timeout=30 * 60,  # seconds, default
    interval=5,  # seconds, default
    should_stop=lambda: False,
)
```

`EMERGENCY` is in the default set so you can submit a choice and wait again for `DONE`. A deadline raises `FixedFloatTimeoutError` with `retryable` false. If `should_stop()` becomes true, the error message is `The order wait was aborted`.

## Emergency choice

`POST /emergency`, for orders already in `EMERGENCY`.

| `choice` | Meaning |
| :--- | :--- |
| `EXCHANGE` | Continue at the market rate when the choice is made or the order is corrected. |
| `REFUND` | Refund minus the miner fee. `address` is required. `tag` is the memo when the network needs one. |

`order.emergency.status` may include `EXPIRED`, `LESS`, `MORE`, and `LIMIT`. `choice` is `NONE`, `EXCHANGE`, or `REFUND`. `repeat` is true when a second deposit arrived.

```python
ff.set_emergency(order.id, order.token, "EXCHANGE")

ff.emergency(
    order.id,
    order.token,
    "REFUND",
    address="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    tag="optional-memo",
)
```

`extra_id` is still accepted. Success data is `True`.

## Email notifications

```python
ff.set_email(order.id, order.token, "user@example.com")
ff.set_email_notification(order.id, order.token, "user@example.com")
ff.subscribe(order.id, order.token, "user@example.com")
```

`POST /setEmail`. Success data is `True`. This is the only notification channel. FixedFloat does not document webhooks.

## QR codes

```python
qr = ff.get_qr(order.id, order.token)
# aliases: ff.qr, ff.get_qr_codes

print(qr.title, qr.src[:32], qr.checked)
for code in qr.codes:
    print(code.title, code.checked, len(code.src))
```

`src` is the checked image, or the first image. Each `QrCode` has `title`, `src` (`data:image/png;base64,...`), and `checked`.

## Raw requests

```python
data = ff.raw_request("/order", {"id": order.id, "token": order.token})
ff.raw_request("future", {"a": 1}, idempotent=False)
```

Returns the envelope `data` field. Paths other than `/create` are retried unless `idempotent` is false.

## Async client

```python
import asyncio
from fixedfloat import AsyncFixedFloat


async def main() -> None:
    async with AsyncFixedFloat(api_key="key", api_secret="secret") as ff:
        price = await ff.get_price("BTC", "ETH", 0.01)
        rates = await ff.get_rates(from_ccy="BTC", to_ccy="ETH")
        order = await ff.wait_for_order("ABCDEF", "token", timeout=60, interval=5)
        print(price.to_side.amount, rates[0].out_amount, order.status)


asyncio.run(main())
```

Every sync method exists as a coroutine with the same arguments, including `ccies`, `price`, `create`, `order`, `emergency`, `subscribe`, `qr`, `get_rates_xml`, and `raw_request`. `status_text` stays synchronous.

## Error handling

```python
from fixedfloat import (
    FixedFloatApiError,
    FixedFloatAuthError,
    FixedFloatError,
    FixedFloatHttpError,
    FixedFloatNetworkError,
    FixedFloatRateLimitError,
    FixedFloatTimeoutError,
)

try:
    ff.get_order("ABCDEF", "token")
except FixedFloatRateLimitError as exc:
    # HTTP 429. create costs 50 weight, everything else costs 1. Cap is 250/minute.
    print(exc.code, exc.status, exc)
except FixedFloatAuthError as exc:
    # HTTP 401 or 403.
    print(exc)
except FixedFloatApiError as exc:
    # Envelope code != 0. exc.code, exc.message, exc.data.
    print(exc.code, exc.data)
except FixedFloatTimeoutError as exc:
    print(exc.retryable)
except FixedFloatNetworkError as exc:
    print(exc)
except FixedFloatHttpError as exc:
    print(exc.status, exc.retryable)
except FixedFloatError as exc:
    print(exc.code, exc)
```

`str(exc)` is `[code] message` when a code is present.

FixedFloat does not publish a stable numeric catalog. `code == 0` is success. Any other `code` is a failure and `msg` is the reason. Match on the message and on the quote error strings below, not on invented numbers.

## Order and quote codes

Quote `errors` (the HTTP call still succeeds):

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

`PRICE_ERROR_TEXT` has those sentences. `TERMINAL_ORDER_STATUSES` is `DONE`, `EXPIRED`, `EMERGENCY`. `ORDER_STATUS_TEXT` is the status label map.

| HTTP status | Class | Retried |
| :--- | :--- | :--- |
| 401, 403 | `FixedFloatAuthError` | no |
| 429 | `FixedFloatRateLimitError` | yes |
| 500 and above | `FixedFloatApiError` or `FixedFloatHttpError` | yes |
| other 4xx | `FixedFloatHttpError` | no |

A key that keeps passing the weight cap stays blocked longer each time.

## Advanced usage

### Proxy and timeouts

```python
with FixedFloat(
    api_key="key",
    api_secret="secret",
    timeout=20,
    proxy="http://127.0.0.1:8888",
    retries=4,
    retry_delay=0.1,
    base_url="https://ff.io/api/v2",
) as ff:
    ff.get_currencies()
```

### Retries

Network errors, HTTP timeouts, 429, and 5xx use exponential backoff. Set `retries=0` to disable. `create_order` ignores retries so a failed response cannot be sent twice.

### Sync and async together

Do not share one `httpx` client across threads. Construct a `FixedFloat` per thread, or use `AsyncFixedFloat` inside a single event loop. There are no callbacks. Poll, or subscribe an email with `set_email`.

## Type hints

The package is typed for Python 3.10+. Models are dataclasses: `Currency`, `PriceResult`, `PriceSide`, `PriceCurrency`, `Order`, `OrderSide`, `OrderTx`, `OrderTime`, `OrderEmergency`, `QrResult`, `QrCode`, `RateItem`. Literals: `OrderType`, `ExchangeDirection`, `EmergencyChoice`, `OrderStatus`, `PriceErrorCode`.

## Examples

| File | What it does |
| :--- | :--- |
| `examples/check.py` | Currencies, one quote, one XML pair. Needs API keys. |
| `examples/price.py` | Fixed quote, shorthand, `get_price_or_raise`. Needs API keys. |
| `examples/rates.py` | Downloads the XML board. No API key. |
| `examples/parse_rates.py` | Parses a sample document offline. |
| `examples/async_quote.py` | Async quote and fixed XML pair. |
| `examples/create_order.py` | Opens an order only when `FIXEDFLOAT_CREATE=1`. |
| `examples/manage_order.py` | Reads an order, optional email, QR, emergency, and wait. |

```bash
uv run python examples/parse_rates.py
uv run python examples/rates.py
FIXEDFLOAT_API_KEY=... FIXEDFLOAT_API_SECRET=... uv run python examples/check.py
```

## FAQ

**Do I need a key for rates?** No. `get_rates` is public. `/api/v2` needs a key and a secret.

**Why is there no order list?** The API returns an order only when you send its id and token.

**Fixed or float?** Fixed locks the rate (about 1% before affiliate adjustments). Float follows the market at execution (about 0.5%). Orders usually expire after 30 minutes (`time.left`).

**Can I change the referral code?** Price and create always send this package's referral code. Pass `afftax` when you want a different affiliate percentage on top of that.

**Wrong deposit size?** The order becomes `EMERGENCY`. Read `order.emergency.status`, then `set_emergency` with `EXCHANGE` or `REFUND`.

## Contributing

```bash
cd fixedfloat/python
uv sync
uv run ruff check .
uv run pytest -m "not live"   # coverage gate is 95% lines
```

Live tests are skipped unless `FIXEDFLOAT_API_KEY` and `FIXEDFLOAT_API_SECRET` are set. They only call `get_currencies`, `get_price`, and `get_rates`.

```bash
FIXEDFLOAT_API_KEY=... FIXEDFLOAT_API_SECRET=... uv run pytest -m live
```

## License

[MIT](LICENSE)
