# grizzly-sms-client

[![PyPI version](https://img.shields.io/pypi/v/grizzly-sms-client.svg)](https://pypi.org/project/grizzly-sms-client/)
[![Python versions](https://img.shields.io/pypi/pyversions/grizzly-sms-client.svg)](https://pypi.org/project/grizzly-sms-client/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Python client for the [Grizzly SMS](https://grizzlysms.com) activation API, the documented rent API, the crypto deposit wallet, and the partner push protocol. Sync and async clients share one surface. HTTP is [HTTPX](https://www.python-httpx.org/).

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
- [Async client](#async-client)
- [Webhooks](#webhooks)
- [Partner push](#partner-push)
- [Error handling](#error-handling)
- [Advanced usage](#advanced-usage)
- [Type hints](#type-hints)
- [Comparison](#comparison)
- [FAQ](#faq)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Features

- Sync `GrizzlySms` and async `AsyncGrizzlySms` for the same activation, rent, price, and wallet methods.
- Documented handler actions: balance (including `version=2`), `getNumber`, `getNumberV2`, `setStatus`, `getStatus`, `getStatusV2`, prices V1/V2/V3, services, countries, active activations, and `getNumbersStatus`.
- Number filters: `max_price`, `min_price`, `provider_ids`, `except_provider_ids`, `phone_exception`, `operator`, `forward`, and `activation_type`.
- Rent API: `getRentNumber`, `continueRentNumber`, `getRentStatus`, `setRentStatus`, `getRentHistory`, `getRentPrices`.
- `wait_for_code`, `wait_for_message`, and `activate`, with timeouts, status callbacks, and an abort flag.
- Retries for transport errors, HTTP 408/429/5xx, and `ERROR_SQL` / `SQL_ERROR` / `SERVER_ERROR`. Purchases and status changes stay single-shot unless you opt in.
- Proxy URL, custom base URL, timeout, and an injectable `httpx` client.
- One exception subclass per known API code.
- Profile webhook parser and partner push plus inbound reply helpers, sync and async.

## Installation

```bash
pip install grizzly-sms-client
```

Python 3.10 or newer.

## Configuration

```python
from grizzly_sms import GrizzlySms

sms = GrizzlySms(
    api_key,
    base_url="https://api.grizzlysms.com",
    timeout_ms=30_000,
    retries=2,
    retry_delay_ms=1_000,
    retry_mutations=False,
    proxy="http://127.0.0.1:8080",
)
```

| Argument | Default | Meaning |
| --- | --- | --- |
| `api_key` | required | Profile API key. Blank keys raise `BAD_KEY`. |
| `base_url` | `https://api.grizzlysms.com` | API origin. Trailing slashes are removed. |
| `timeout_ms` | `30000` | HTTP timeout in milliseconds. |
| `retries` | `0` | Extra attempts after the first request. |
| `retry_delay_ms` | `1000` | Pause between attempts. |
| `retry_mutations` | `False` | Also retry purchases and status changes. |
| `proxy` | `None` | Proxy URL passed to HTTPX. Ignored when `client` is set. |
| `client` | `None` | Injected `httpx.Client` (or `httpx.AsyncClient` on the async class). It is not closed. |

Use the client as a context manager so the owned HTTP connection closes:

```python
with GrizzlySms(api_key) as sms:
    print(sms.get_balance())
```

Every handler call sends `ref_id=tysik`. That partner attribution is fixed. The crypto wallet request does not send `ref_id`. The User-Agent is `grizzly-sms/2.0.0`.

`get_number`, `get_number_v2`, `set_status`, `get_rent_number`, `continue_rent`, and `set_rent_status` are mutating. With the default `retry_mutations=False` they run once.

## Quick start

This path only reads the balance and the country catalog.

```python
import os

from grizzly_sms import GrizzlySms

with GrizzlySms(os.environ["GRIZZLY_API_KEY"]) as sms:
    balance = sms.get_balance()
    countries = sms.get_countries()
    print(balance, len(countries))
```

Runnable file: [`examples/check.py`](examples/check.py).

## Activation methods

### `get_balance(version=None)`

```python
balance = sms.get_balance()
reserve_aware = sms.get_balance(version=2)
```

`version=2` requests the reserve-aware balance. The returned float is the first amount in `ACCESS_BALANCE`.

### `get_number(...)`

Orders a number. This spends balance. Returns `OrderedNumber(activation_id, phone_number)`.

```python
ordered = sms.get_number(
    "tg",
    country="any",
    max_price=1,
    min_price=0.1,
    provider_ids=[1, 7],
    except_provider_ids="3,4",
    phone_exception=["1628", "147220"],
    operator="any",
    forward=True,
    activation_type=0,
)
print(ordered.activation_id, ordered.phone_number)
```

`country` may be an id, `"any"`, `"*"`, or omitted. `forward=True` is sent as `1` and `False` as `0`. Lists are joined with commas.

### `get_number_v2(...)`

Same query, plus price, currency, and timestamps (`OrderedNumberV2`).

```python
ordered = sms.get_number_v2("wa", country=16, max_price=0.5)
print(ordered.activation_cost, ordered.currency, ordered.can_get_another_sms)
print(ordered.activation_time, ordered.activation_end)
```

### `set_status(activation_id, status, forward=None)`

```python
from grizzly_sms import ActivationAction

sms.set_status(ordered.activation_id, ActivationAction.READY)
sms.set_status(ordered.activation_id, ActivationAction.RETRY)
sms.set_status(ordered.activation_id, ActivationAction.COMPLETE)
sms.set_status(ordered.activation_id, ActivationAction.CANCEL)
sms.set_status(ordered.activation_id, ActivationAction.CANCEL_ALT)
sms.set_status(ordered.activation_id, 6, "447911000000")
```

| Status | Result text | Meaning |
| --- | --- | --- |
| `1` | `ACCESS_READY` | The SMS was requested. |
| `3` | `ACCESS_RETRY_GET` | Another code was requested. |
| `6` | `ACCESS_ACTIVATION` | The activation is finished. |
| `8` or `-1` | `ACCESS_CANCEL` | The activation was cancelled. |

### `ready` / `request_another_code` / `complete` / `cancel`

```python
sms.ready(ordered.activation_id)
sms.request_another_code(ordered.activation_id)
sms.complete(ordered.activation_id)
sms.cancel(ordered.activation_id)
sms.cancel(ordered.activation_id, -1)
```

`cancel` defaults to status `8`.

### `get_status(activation_id)`

```python
status = sms.get_status(ordered.activation_id)
if status.status == "STATUS_OK":
    print(status.code)
```

`STATUS_WAIT_CODE` means the code has not arrived. `STATUS_WAIT_RETRY` keeps the previous code. `STATUS_WAIT_RESEND` means another SMS can be requested. `STATUS_CANCEL` means the activation is closed.

### `get_status_v2(activation_id)`

JSON object with `sms`, `call`, and `verificationType` when the API sends them.

```python
status = sms.get_status_v2(ordered.activation_id)
print(status.get("verificationType"), (status.get("sms") or {}).get("text"))
```

### `call(action, params=None)`

Escape hatch. Known error strings still raise. `ref_id` stays `tysik`.

```python
raw = sms.call("getBalance")
```

## Prices, catalogs, and stock

### `get_prices` / `get_prices_v2` / `get_prices_v3`

```python
prices = sms.get_prices(service="tg")
quote = prices.get("16", {}).get("tg")
print(quote)

buckets = sms.get_prices_v2(service="tg", country=0)
offers = sms.get_prices_v3(service="tg", country=0)
```

`get_prices` maps country to service to `{cost, count}`. `get_prices_v2` maps a price string to a count. `get_prices_v3` adds per-provider offers. A host that answers `BAD_ACTION` raises `BadActionError`.

### `find_prices(...)`

Flattens `get_prices` and sorts by cost, then by count descending.

```python
quotes = sms.find_prices(service="tg", country=16, min_count=10, max_price=1)
cheapest = quotes[0]
print(cheapest.country, cheapest.cost, cheapest.count)
```

`flatten_prices` is public if you already have the table:

```python
from grizzly_sms import flatten_prices

rows = flatten_prices(prices)
```

### `get_services` / `get_countries` / `get_active_activations`

```python
services = sms.get_services()
telegram = next(service for service in services if service.code == "tg")

countries = sms.get_countries()
ukraine = next(country for country in countries if country.id == 1)
print(ukraine.eng, ukraine.visible, ukraine.retry)

active = sms.get_active_activations()
```

`get_active_activations` returns `[]` when the API answers JSON `null`.

### `get_numbers_status(country=None, operator=None)`

```python
stock = sms.get_numbers_status(country=0, operator="any")
telegram_stock = next(row for row in stock if row.service == "tg")
print(telegram_stock.count, telegram_stock.suffix)
```

Keys look like `tg_0`. The suffix after the underscore is `suffix`.

## Rentals

Rent actions follow the service's previously published rent documentation. They spend balance when a number is rented.

### `get_rent_number` / `continue_rent`

```python
from grizzly_sms import RentAction

rented = sms.get_rent_number("tg", 0, 4)
print(rented.id, rented.number, rented.end_date)

extended = sms.continue_rent(rented.id, 4)
```

The third argument is hours.

### `get_rent_status` / `set_rent_status` / `finish_rent` / `cancel_rent`

```python
rent = sms.get_rent_status(rented.id)
print(rent.quantity)
for message in rent.messages:
    print(message.phone_from, message.text, message.date)

sms.finish_rent(rented.id)
sms.set_rent_status(rented.id, RentAction.CANCEL)
sms.cancel_rent(rented.id)
```

`RentAction.FINISH` is `1`. `RentAction.CANCEL` is `2`.

### `get_rent_history` / `get_rent_prices`

```python
history = sms.get_rent_history(rented.id)
for entry in history.entries:
    print(entry.date, entry.price, entry.hours)

rent_prices = sms.get_rent_prices(service="tg", country=0, rent_time=4)
```

## Wallet

`GET /public/crypto/wallet`. Defaults are USDT on Tron. This request does not include `ref_id`.

```python
wallet = sms.get_wallet()
usdt = sms.get_wallet(coin="usdt", network="tron")
print(usdt.wallet_address)
```

Documented top-up amounts start at 50 USD. The client only reads the address.

## Polling helpers

### `wait_for_code(...)`

Polls `get_status` until `STATUS_OK`. `STATUS_CANCEL` raises code `STATUS_CANCEL`. A deadline raises code `TIMEOUT` (`GrizzlyTimeoutError`).

```python
received = sms.wait_for_code(
    ordered.activation_id,
    interval_ms=3_000,
    timeout_ms=120_000,
    on_status=lambda status: print(status.status),
)
print(received.code)
```

`signal` is any object with an `aborted` attribute:

```python
class Cancel:
    aborted = False

signal = Cancel()
received = sms.wait_for_code(ordered.activation_id, signal=signal, timeout_ms=120_000)
```

### `wait_for_message(...)`

Polls `get_status_v2` until `sms.code` or `call.code` is non-empty. SMS wins when both are present. Returns `ReceivedMessage(code, source, text, verification_type)`.

```python
message = sms.wait_for_message(
    ordered.activation_id,
    timeout_ms=120_000,
    on_status=lambda status: print(status.get("sms")),
)
print(message.source, message.code, message.text)
```

### `activate(...)`

`get_number_v2`, then `ready` (unless `ready=False`), then `wait_for_code`. Returns `(OrderedNumberV2, ReceivedCode)`.

```python
order, received = sms.activate(
    "tg",
    country=12,
    max_price=1,
    timeout_ms=120_000,
    cancel_on_timeout=True,
    cancel_on_error=True,
)
print(order.phone_number, received.code)
sms.complete(order.activation_id)
```

`cancel_on_timeout` cancels on `TIMEOUT`. `cancel_on_error` cancels on any other error except `STATUS_CANCEL`. A failed cancel is swallowed and the original error is raised. `activate` spends balance.

## Async client

`AsyncGrizzlySms` mirrors the sync methods with `async`/`await`. Inject an `httpx.AsyncClient` or let the object own one and close it with `aclose()` or `async with`.

```python
import asyncio
import os

from grizzly_sms import AsyncGrizzlySms


async def main() -> None:
    async with AsyncGrizzlySms(os.environ["GRIZZLY_API_KEY"]) as sms:
        balance = await sms.get_balance()
        countries = await sms.get_countries()
        print(balance, len(countries))

        order, received = await sms.activate(
            "tg",
            country=12,
            timeout_ms=120_000,
            cancel_on_timeout=True,
        )
        print(order.phone_number, received.code)
        await sms.complete(order.activation_id)


asyncio.run(main())
```

Keyword names match the sync client (`max_price`, `retry_delay_ms`, `on_status`). `get_number` and `get_number_v2` take the same extra keywords.

## Webhooks

Profile settings accept up to three webhook URLs. Grizzly does not publish a separate webhook schema. `parse_activation_webhook` accepts `{activationId, service, text, code, country, receivedAt}` and the snake_case aliases `activation_id` and `received_at`.

```python
from grizzly_sms import parse_activation_webhook

event = parse_activation_webhook(
    {
        "activationId": 15,
        "service": "tg",
        "text": "code 5015",
        "code": "5015",
        "country": "16",
        "receivedAt": "2026-01-01 00:00:00",
    }
)
print(event.activation_id, event.code, event.received_at)
```

Register the URL in the Grizzly profile. The handler API does not create webhook subscriptions.

## Partner push

`GrizzlyPartner` and `AsyncGrizzlyPartner` post to `/agent/api/sms`. A status other than `SUCCESS` is retried only when `retries` is set. The protocol pause defaults to 10 seconds.

```python
from grizzly_sms import GrizzlyPartner

with GrizzlyPartner(partner_key) as partner:
    sms_push = partner.push_sms(
        sms_id=1,
        phone=447472190082,
        phone_from="Microsoft",
        text="code 5015",
        retries=2,
        retry_delay_ms=10_000,
    )
    call_push = partner.push_call(call_id=10, phone=447472190082, phone_from="100")
    record_push = partner.push_call_record(
        call_id=10,
        phone=447472190082,
        phone_from="100",
        text="your code is 5015",
    )
    file_push = partner.push_call_record(
        call_id=11,
        phone=447472190082,
        phone_from="100",
        file=b"audio",
        filename="call.wav",
    )
```

`push_call_record` requires `text` or `file`. The upload is `multipart/form-data`. A missing `filename` is sent as `record`. Protocol file types are wav, amr, mp3, and ogg.

```python
import asyncio

from grizzly_sms import AsyncGrizzlyPartner


async def push() -> None:
    async with AsyncGrizzlyPartner(partner_key) as partner:
        status = await partner.push_sms(
            sms_id=1,
            phone=447472190082,
            phone_from="Microsoft",
            text="code 5015",
        )
        print(status.status)


asyncio.run(push())
```

Inbound requests are calls Grizzly makes to your server.

```python
from grizzly_sms import (
    parse_partner_request,
    partner_finish_response,
    partner_number_response,
    partner_services_response,
)

inbound = parse_partner_request(body)
if inbound["action"] == "GET_SERVICES":
    reply = partner_services_response([{"country": 0, "operatorMap": {"any": {"tg": 10}}}])
elif inbound["action"] == "GET_NUMBER":
    reply = partner_number_response(number=79990001122, activationId=15)
elif inbound["action"] == "FINISH_ACTIVATION":
    reply = partner_finish_response()
```

`FINISH_ACTIVATION` status `1` means forbidden, `3` sold, `4` cancelled, and `5` returned. Any other status raises `BAD_STATUS`. Pass `status="NO_NUMBERS"` to `partner_number_response` when you have no number.

## Error handling

Methods raise `GrizzlySmsError`. Subclasses still match `isinstance(..., GrizzlySmsError)`. The timeout class is `GrizzlyTimeoutError` so it does not shadow the builtin `TimeoutError`. Its `code` is `TIMEOUT`.

```python
from grizzly_sms import GrizzlySmsError
from grizzly_sms.errors import GrizzlyTimeoutError, NoNumbersError

try:
    sms.get_number("tg", country=0)
except NoNumbersError as exc:
    print(exc.code, exc.raw)
except GrizzlyTimeoutError:
    print("poll deadline")
except GrizzlySmsError as exc:
    print(exc.code)
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
| `WRONG_MAX_PRICE` | `WrongMaxPriceError` |
| `USERS_IP_IS_NOT_ALLOWED` | `UsersIpNotAllowedError` |
| `SERVICE_PROHIBITED` | `ServiceProhibitedError` |
| `EMPTY_RESPONSE` | `EmptyResponseError` |
| `NETWORK` | `NetworkError` |
| `TIMEOUT` | `GrizzlyTimeoutError` |
| `ABORTED` | `AbortedError` |
| `STATUS_CANCEL` | `AbortedError` |
| `UNEXPECTED_RESPONSE` | `UnexpectedResponseError` |
| `INVALID_TIME` | `InvalidTimeError` |
| `NO_ID_RENT` | `NoIdRentError` |
| `RENT_DIE` | `RentDieError` |
| `CANT_CANCEL` | `CantCancelError` |
| `ALREADY_FINISH` | `AlreadyFinishError` |
| `ALREADY_CANCEL` | `AlreadyCancelError` |
| `INCORECT_STATUS` | `IncorrectStatusError` (`INCORRECT_STATUS` maps here too) |
| `INVALID_PHONE` | `InvalidPhoneError` |
| `OPERATORS_NOT_FOUND` | `OperatorsNotFoundError` |
| `OUT_OF_STOCK` | `OutOfStockError` |
| `ORDER_ALREADY_EXISTS` | `OrderAlreadyExistsError` |
| `HTTP_<status>` | `HttpStatusError` (`.status` is the numeric code) |

Import subclasses from `grizzly_sms.errors`. JSON `{"status": "error", "error": "NO_BALANCE"}` raises the same class as the plain-text code. A sentence containing "prohibited for sale" becomes `SERVICE_PROHIBITED`.

## Advanced usage

### Proxies

```python
sms = GrizzlySms(api_key, proxy="http://user:pass@127.0.0.1:8080")
```

An invalid proxy URL raises `BAD_ACTION` before any request. A passed-in `client` ignores `proxy`, `base_url`, and `timeout_ms`.

### Timeouts and retries

```python
sms = GrizzlySms(api_key, timeout_ms=15_000, retries=3, retry_delay_ms=500)
```

Retried HTTP statuses are 408, 429, 500, 502, 503, and 504.

```python
aggressive = GrizzlySms(api_key, retries=2, retry_mutations=True)
```

`retry_mutations=True` can buy or cancel twice. Leave it off unless the operation is idempotent for your account.

### Injected HTTP client

```python
import httpx

from grizzly_sms import GrizzlySms

http = httpx.Client(base_url="https://api.grizzlysms.com", timeout=10)
sms = GrizzlySms(api_key, client=http)
```

Close `http` yourself. `sms.close()` does not close an injected client.

## Type hints

Public responses are frozen dataclasses (`OrderedNumber`, `OrderedNumberV2`, `ActivationStatus`, `PriceQuote`, `CountryInfo`, `ServiceInfo`, `ActiveActivation`, `NumberStock`, `RentPhone`, `RentStatus`, `RentHistory`, `RentPrice`, `CryptoWallet`, `ReceivedCode`, `ReceivedMessage`, `ActivationWebhook`, `PartnerStatus`).

```python
from grizzly_sms import GrizzlySms, OrderedNumberV2, PriceQuote
```

`get_status_v2`, `get_prices`, `get_prices_v2`, and `get_prices_v3` return plain dicts because those payloads are open maps.

## Comparison

| Capability | grizzly-sms-client | grizzly-sms 1.1.1 (npm) | Official MCP client | giwih/grizzlysms | kurosaki-sol bot |
| --- | --- | --- | --- | --- | --- |
| Sync and async Python | yes | Node only, older API | TypeScript subset | sync Python | Python bot |
| `getNumberV2`, prices V1–V3 | yes | no | prices, countries, services | cost and count | no |
| `operator`, `forward`, `activationType`, balance version | yes | no | yes | no | no |
| Rent API and `getNumbersStatus` | yes | no | no | no rental | no |
| Wait helpers, cancel on timeout | yes | no | no | `get_code` loop | polling |
| Per-code errors, retries, proxy | yes | no | string match | no | fatal code set |
| Partner push and inbound parsers | yes | no | no | no | no |
| Webhook body parser | yes | no | no | no | no |

PyPI search found no other Grizzly SMS client. The Node package in this repository (`grizzly-sms`) covers the same API. npm `grizzly-sms` 1.1.1 is the previous, smaller release. `@iflow-mcp/grizzlysms-git-grizzly-sms-mcp` republishes the official MCP server.

## FAQ

**Does `get_number` spend money?** Yes. `get_number`, `get_number_v2`, `activate`, and `get_rent_number` debit the balance. Balance, catalogs, prices, and status reads do not.

**Why is `ref_id` always `tysik`?** It is the partner attribution baked into this client. It is not a constructor argument.

**Can I point the client at a test host?** Pass `base_url`. Paths stay `/stubs/handler_api.php`, `/public/crypto/wallet`, and `/agent/api/sms`.

**What if prices return `BAD_ACTION`?** The action is still documented, so the client sends it and raises `BadActionError`. Try `get_prices_v2` or `get_prices_v3`.

**How do I receive a code without polling?** Add a URL in the Grizzly profile and parse the body with `parse_activation_webhook`.

**Which cancel code should I send?** `8` (`ActivationAction.CANCEL`) is the default. `-1` is the documented alternate.

## Examples

| File | What it does |
| --- | --- |
| [`examples/check.py`](examples/check.py) | Balance and country count. Read-only. |
| [`examples/activation.py`](examples/activation.py) | Order, wait, complete. Spends balance. |
| [`examples/catalog.py`](examples/catalog.py) | Prices, stock, services, activations, wallet. Read-only. |
| [`examples/rent.py`](examples/rent.py) | Rent, read messages, finish. Spends balance. |
| [`examples/async_check.py`](examples/async_check.py) | Async balance and countries. Read-only. |
| [`examples/partner.py`](examples/partner.py) | Partner pushes and inbound reply builders. |
| [`examples/webhook.py`](examples/webhook.py) | Parse a webhook body. No network. |

```bash
GRIZZLY_API_KEY=... python examples/check.py
```

## Contributing

Issues and patches belong on the [api-kit](https://github.com/TysikGG/api-kit) repository, directory `grizzly-sms/python`.

```bash
uv sync
uv run ruff check .
uv run pytest -m "not live"
```

Live tests stay skipped unless `GRIZZLY_API_KEY` is set, and they only read the balance:

```bash
GRIZZLY_API_KEY=... uv run pytest -m live
```

Keep `ref_id` as `tysik` and the User-Agent as `grizzly-sms/2.0.0`.

## License

ISC. See [LICENSE](LICENSE).
