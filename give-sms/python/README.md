# give-sms

[![PyPI version](https://img.shields.io/pypi/v/give-sms.svg)](https://pypi.org/project/give-sms/)
[![Python Version](https://img.shields.io/pypi/pyversions/give-sms.svg)](https://pypi.org/project/give-sms/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

Typed Python client for [Give-SMS](https://give-sms.com/): short activations, the SMS-Activate compatible handler, and week/month number rentals. Sync (`GiveSms`) and async (`AsyncGiveSms`) clients share the same methods.

Official API reference: <https://give-sms.com/api.html>

| Surface | Path | Client methods |
| --- | --- | --- |
| Native JSON | `/api/v1/` | `get_balance`, `get_count`, `get_all_count`, `get_number`, `get_code`, `wrong_code`, `cancel_number`, `ban_number`, reactivation |
| Handler | `/stubs/handler_api.php` | `handler_*` |
| Rent | `/api/v2/rent/rent_number.php` | `rent_*` |

Every request sends `partner_key`. Leave that default alone.

---

## Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick start](#quick-start)
- [Async](#async)
- [Native API](#native-api)
- [Waiting for an SMS](#waiting-for-an-sms)
- [Handler API](#handler-api)
- [Rent API](#rent-api)
- [Countries and services](#countries-and-services)
- [Errors](#errors)
- [Retries, proxies, and timeouts](#retries-proxies-and-timeouts)
- [Type hints](#type-hints)
- [Comparison](#comparison)
- [FAQ](#faq)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- The native calls use the documented names: `getcode` with `order_id`, `wrongcode` with `last_id`, `refusenumber`, `bannumber`, `reactivationoptions`, `reactivation`, `getallcount`.
- Status `400` on code fetches is a wait (`CodeResult.status == "WAIT"`), not an exception.
- Handler coverage includes `maxPrice`, price `tiers`, reactivation, and the extra error tokens (`WRONG_MAX_PRICE`, `PRICE_CHANGED`, `TOO_MANY_ACTIVE_ORDERS`, …).
- Full rent API: countries, per-country catalog, create, inbox, prolong, list orders.
- Poll helpers with a timeout and a `cancel` callable.
- An error subclass per handler symbol and per numeric status.
- `httpx` timeout, retries, proxy URL, and extra headers.
- `COUNTRIES` and `SERVICES` copied from the public country and service tables.

---

## Installation

```bash
pip install give-sms
```

Python 3.10+.

```bash
uv add give-sms
```

---

## Configuration

```python
from give_sms import GiveSms

with GiveSms(
    api_key="YOUR_API_KEY",
    base_url="https://give-sms.com",
    timeout=30.0,          # seconds
    retries=2,
    retry_delay=1.0,       # seconds; attempt n waits n * retry_delay
    retry_on=(502, "ERROR_SQL"),
    proxy="http://user:pass@127.0.0.1:8080",
    headers={"X-Debug": "1"},
) as client:
    print(client.get_balance())
```

| Argument | Default | Meaning |
| --- | --- | --- |
| `api_key` | required | `userkey` on JSON routes, `api_key` on the handler. |
| `base_url` | `https://give-sms.com` | Origin. A trailing slash is removed. |
| `timeout` | `30` | Seconds, passed to httpx. |
| `retries` | `0` | Extra attempts after a retryable failure. |
| `retry_delay` | `1` | Linear backoff in seconds. `0` skips the sleep. |
| `retry_on` | `(502, "ERROR_SQL")` | Plus network errors and timeouts. |
| `proxy` | `None` | URL handed to httpx. |
| `headers` | `Accept`, `User-Agent` | Merged over the defaults. |

`retries`, `retry_delay`, `retry_on`, `proxy`, and `headers` are keyword-only, so `GiveSms(api_key, base_url, timeout)` from 0.1.0 still works.

`call_api` and `call_handler` are the escape hatches. They still attach `partner_key`.

Close the client with the context manager or `client.close()`. The async client uses `async with` or `await client.close()`.

---

## Quick start

```python
import os
from give_sms import GiveSms

with GiveSms(os.environ["GIVE_SMS_API_KEY"]) as client:
    print(client.get_balance())
    stock = client.get_count(country="kazakhstan", operator="ANY")
    print(stock["ANY"])
```

That path does not order a number.

```python
order = client.get_number("tg", country="kazakhstan")
print(order.id, order.number, order.start_time)

sms = client.wait_for_code(order.id, timeout=180, interval=5)
print(sms.code, sms.full_sms)

client.cancel_number(order.id)
```

An order holds funds for about 15 minutes. Cancel it, or let it expire with no SMS, to release the hold. Reactivation and rent charges are not refunded.

---

## Async

`AsyncGiveSms` mirrors every public method with `async def`.

```python
import asyncio
import os
from give_sms import AsyncGiveSms

async def main() -> None:
    async with AsyncGiveSms(os.environ["GIVE_SMS_API_KEY"]) as client:
        print(await client.get_balance())
        counts = await client.get_count(country="kazakhstan")
        print(len(counts))

asyncio.run(main())
```

`purchase` returns `AsyncActivation`, whose `get_code`, `wait_for_code`, `wrong_code`, `repeat_code`, `cancel`, and `ban` are coroutines.

---

## Native API

`get_number` returns `ActivationNumber`. `id` is `order_id` when the service sends that field. `number` is `phone`. Older payloads that used `id` / `number` still parse.

### `get_balance()`

```python
balance = client.get_balance()  # data["balance"], data["user_balance"], or a bare number
```

A zero balance stays `0.0`. Missing or non-numeric values raise `GiveSmsError`.

### `get_count(country=None, operator=None)`

```python
counts = client.get_count(country="kazakhstan", operator="ANY")
vk = counts["ANY"]["vk"]  # {"count": 0, "price": "5"}
```

### `get_all_count(service=None)` and `get_all(service=None)`

```python
all_countries = client.get_all_count()
telegram = client.get_all(service="tg")  # alias; each country is price + count_all
```

The success body is not wrapped in `status` / `data`. Errors still use the status envelope.

### `get_number(service, country=None, operator=None, max_price=None)`

```python
ordered = client.get_number("vk", country="kazakhstan", operator="ANY", max_price=25)
print(ordered.id, ordered.number, ordered.start_time)
```

`country=0` is sent. Empty `service` raises before the request. Status `500` on this method is “no number” (`ApiStatus500Error`).

### `purchase(...)` and `Activation`

```python
activation = client.purchase("wa", country="kazakhstan")
sms = activation.wait_for_code(timeout=120, interval=5)
activation.wrong_code(sms.sms_id)
activation.repeat_code(sms.sms_id)  # True if the call was accepted, including a wait
activation.cancel()
activation.ban()
```

### `get_code(order_id)`

```python
result = client.get_code(ordered.id)
if result.status == "WAIT":
    print(result.message, result.advice)
else:
    print(result.code, result.full_sms, result.sender, result.sms_id, result.phone_pass)
```

`code` can be `None` when the SMS arrived but no digits were extracted. `full_sms` is the body. `sms_id` is the next `last_id`.

### `wrong_code(order_id, last_id=None)` and `repeat_code(order_id, last_id=None)`

```python
nxt = client.wrong_code(order.id, result.sms_id)
ok = client.repeat_code(order.id)  # last_id defaults to the order id
```

This is `method=wrongcode`. The 0.1 method name `repeat_code` is still there.

### `cancel_number` and `refuse_number`

```python
client.cancel_number(order.id)
client.refuse_number(order.id)  # alias, method=refusenumber
```

Both return `True` after a 200 response.

### `ban_number(order_id)`

```python
client.ban_number(order.id)  # method=bannumber
```

### `get_reactivation_options` and `reactivation_options`

```python
quote = client.get_reactivation_options(finished_id)
for option in quote["options"]:
    print(option["duration"], option["price"])
```

Status `507` sets `GiveSmsError.reason` to `sim_offline`, `no_code`, `expired`, `already_active`, `no_available`, or `price_changed`.

### `reactivate(order_id, duration=None, price=None)`

```python
again = client.reactivate(finished_id, duration=20, price=12.6)
print(again["order_id"], again["phone"], again["end_time"])
sms = client.wait_for_code(again["order_id"])
```

The new id is a new order. The price is taken immediately and is not returned. Pass `price` to fail closed when the quote changed.

---

## Waiting for an SMS

```python
sms = client.wait_for_code(order.id, timeout=180, interval=5, cancel=lambda: False)
following = client.wait_for_next_code(order.id, sms.sms_id, timeout=60, interval=5)
```

The loop stops on any status other than `WAIT`, on `GiveSmsTimeoutError` when `timeout` seconds have passed, or on `GiveSmsAbortError` when `cancel()` is true. Timeouts are in seconds, matching the client timeout. A hard API error such as “order expired” propagates at once.

---

## Handler API

Give-SMS marks this protocol as compatible and not actively maintained. New integrations should use the native methods.

### Balance, counts, prices

```python
balance = client.handler_get_balance()
counts = client.handler_get_numbers_status(country=2, operator="any")
prices = client.handler_get_prices(country=2, service="vk", tiers=1)
```

`tiers=1` returns every price level. Use those prices as `max_price`.

### Number lifecycle

```python
ordered = client.handler_get_number("vk", country=2, operator="mts", max_price=25)
client.handler_ready(ordered.id)                  # status 1, ACCESS_READY
client.handler_request_another_sms(ordered.id)    # status 3
client.handler_complete(ordered.id)               # status 6
client.handler_cancel(ordered.id)                 # status 8
client.handler_set_status(ordered.id, 1)

status = client.handler_get_status(ordered.id)
# STATUS_WAIT_CODE, STATUS_WAIT_RETRY:<code>, STATUS_WAIT_RESEND,
# STATUS_CANCEL, STATUS_OK:<code>

done = client.handler_wait_for_code(ordered.id, timeout=180, interval=5)
print(done.code)
```

The waiter treats `STATUS_WAIT_CODE` and `STATUS_WAIT_RETRY` as pending. `STATUS_CANCEL` raises `GiveSmsError` with `code="STATUS_CANCEL"`. `STATUS_WAIT_RESEND` raises `ResendRequiredError`.

A number in `ACCESS_NUMBER` may contain colons; only the first colon separates the id.

### Handler reactivation

```python
options = client.handler_get_reactivation_options(finished_id)  # {"20": 12.6}
fresh = client.handler_reactivate(finished_id, duration=20, price=12.6)
```

`PriceChangedError` means the quote moved and the account was not charged.

---

## Rent API

Creating or extending a rental charges the account and is not refundable.

```python
countries = client.rent_countries()
catalog = client.rent_get_data_country("KZ")
orders = client.rent_all_orders()

rented = client.rent_create_order(
    type="week",          # or "month"
    period=1,
    services=[82, 1, 4],  # or "82,1,4"
    country="KZ",
    operator="ANY",
)
print(rented.order_id, rented.phone, rented.end_time, rented.end_time_timestamp)

inbox = client.rent_get_sms(rented.order_id)
for message in inbox.messages:
    print(message.date, message.text, message.timestamp)

extended = client.rent_prolong(rented.order_id, type="week", period=1)
print(extended.days, extended.price, extended.rent_at_formatted)

arrived = client.rent_wait_for_sms(rented.order_id, timeout=120, interval=5, since=0)
```

`since` drops messages whose `timestamp` is less than or equal to that unix time. Omit it to accept any message already in the inbox. `rent_all_orders` includes finished rentals (`status_rent` 1 active, 0 expired).

---

## Countries and services

```python
from give_sms import COUNTRIES, SERVICES, find_country

find_country("kazakhstan")  # ("kazakhstan", {"name": "...", "handler_id": 2})
find_country(16)            # England
SERVICES["tg"]
SERVICES["wa"]
SERVICES["call"]
```

Native `country` is the slug. Handler `country` is `handler_id`. Rent countries come from `rent_countries()` and look like `KZ`.

---

## Errors

```python
from give_sms import ApiStatus401Error, GiveSmsError, NoNumbersError, WrongMaxPriceError

try:
    client.handler_get_number("vk", country=2, max_price=0.01)
except WrongMaxPriceError as exc:
    print(exc.response_data)  # minimum price after the colon
except NoNumbersError as exc:
    print(exc.code)           # "NO_NUMBERS"
except ApiStatus401Error as exc:
    print(exc.message)
except GiveSmsError as exc:
    print(exc.code, exc.reason, exc.response_data)
```

`str(exc)` and `exc.message` are the same text. `code` is the handler symbol or the integer status. `reason` is the native `reason` field. `response_data` is the parsed body, or the suffix after `CODE:`.

### Native statuses

| Status | Class | Usual meaning |
| --- | --- | --- |
| 400 | `ApiStatus400Error` | Not raised for `get_code` / `wrong_code` (that is a wait). |
| 401 | `ApiStatus401Error` | Bad or missing API key. |
| 402 | `ApiStatus402Error` | Rent: bad country parameter. |
| 404 | `ApiStatus404Error` | Unknown method, or rent country/order missing. |
| 500 | `ApiStatus500Error` | Processing error, no numbers, or the order expired. |
| 501 | `ApiStatus501Error` | `wrongcode` rejected. |
| 502 | `ApiStatus502Error` | Unknown service, or a retryable internal error. |
| 503 | `ApiStatus503Error` | Unknown operator, or rent server error. |
| 504 | `ApiStatus504Error` | Not enough balance, or a bad rent period type. |
| 505 | `ApiStatus505Error` | Unknown country, or unknown order. |
| 506 | `ApiStatus506Error` | Missing `order_id`, or a bad rent length. |
| 507 | `ApiStatus507Error` | Reactivation refused, ban, or maintenance. See `reason`. |
| 508 | `ApiStatus508Error` | Bad `duration`. |
| 509 | `ApiStatus509Error` | Too many active orders. |

Import the rest from `give_sms.errors` (`ApiStatus500Error`, …) or use `API_STATUS_ERRORS[status]`.

### Handler symbols

| Token | Class |
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

`HANDLER_ERROR_CLASSES` maps the symbol to the class. `STATUS_WAIT_RESEND` raises `ResendRequiredError` from the waiter only.

`NetworkError` is a transport failure. `GiveSmsTimeoutError` is an HTTP timeout or a poll deadline. `GiveSmsAbortError` is a cancelled wait.

Normal handler text is not an error: `ACCESS_BALANCE`, `ACCESS_NUMBER`, `ACCESS_READY`, `ACCESS_RETRY_GET`, `ACCESS_ACTIVATION`, `ACCESS_CANCEL`, `STATUS_WAIT_CODE`, `STATUS_WAIT_RETRY`, `STATUS_OK`, `STATUS_CANCEL`.

---

## Retries, proxies, and timeouts

```python
client = GiveSms(
    api_key,
    timeout=15,
    retries=3,
    retry_delay=0.4,
    retry_on=(502, 503, "ERROR_SQL"),
    proxy=os.environ.get("HTTPS_PROXY"),
)
```

Network errors, httpx timeouts, and codes in `retry_on` are retried. `401`, `NO_NUMBERS`, and `NO_BALANCE` are not. Poll helpers do not convert those into a timeout.

The proxy is the HTTP proxy used to reach Give-SMS. It is not an SMS upstream proxy.

Give-SMS does not document webhooks. Poll, or call `get_code` / `handler_get_status` / `rent_get_sms` on your own schedule.

---

## Type hints

Public models are dataclasses: `ActivationNumber`, `CodeResult`, `HandlerStatusResult`, `RentOrder`, `RentSmsMessage`, `RentSmsList`, `RentProlongResult`.

```python
from give_sms import ActivationNumber, CodeResult, GiveSms, RentOrder

client = GiveSms(api_key)
ordered: ActivationNumber = client.get_number("tg", country="kazakhstan")
sms: CodeResult = client.get_code(ordered.id)
rented: RentOrder = client.rent_create_order(
    type="week", period=1, services="82", country="KZ"
)
```

`get_all_count` and the handler price tree stay `Any`, because the JSON shape depends on whether you passed `service` or `tiers`.

---

## Comparison

PyPI’s `give-sms` project and the npm package of the same name are this client. The other rows are SMS-Activate-family SDKs, or a different product that search engines mix up with Give-SMS.

| Capability | give-sms | sms-activate / sms-activate-org (npm) | sms-activate-ts | hero-sms | herosms | aiosmsactivate | smsactivate | get-sms-online |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Native `/api/v1/` | yes | no | no | no | no | no | no | no |
| Handler protocol | yes | yes | yes | yes | yes | yes | yes | no |
| Give-SMS rent API | yes | no | no | their own rent routes | their own rent routes | no | no | no |
| Reactivation | native + handler | no | no | no | no | no | no | no |
| `getallcount` | yes | no | no | no | no | no | no | no |
| Wait with timeout | yes | number.getCode | same | manual status | `wait_for_sms` | `wait_sms_code` | no | `wait_for_sms` |
| Sync and async | both | n/a | n/a | n/a | both | async | sync | sync |
| Error class per code | yes | enums | enums | status enum | hierarchy | status enum | strings | one type |
| Proxy option | yes | no | env vars | no | yes | no | no | no |
| Webhooks | not published by Give-SMS | no | no | no | their host | no | no | yes |
| Built-in country/service tables | yes | lookups | lookups | list calls | list calls | lookups | no | names |

---

## FAQ

**Is status 400 a failure?**  
On `get_code` and `wrong_code`, no. You get `status="WAIT"`. Other methods still raise `ApiStatus400Error` if the server sends 400.

**Why did `repeat_code` change its HTTP method?**  
The documented call is `wrongcode`, with `order_id` and `last_id`. The Python method name from 0.1.0 is unchanged.

**Will `cancel_number` refund a reactivation or a rental?**  
No. It calls `refusenumber` for a short activation. Reactivation and rent are charged up front.

**Which id is the USA?**  
Slug `ssha`, handler id `187`. Virtual USA is `usavirt` / `12`. Kazakhstan is `kazakhstan` / `2`. Rent uses `KZ`.

**Can I use a staging host?**  
Pass `base_url`. The paths stay the same.

**What currency is the balance?**  
The handler documentation describes rubles. The client returns the number the API sends and does not convert it.

---

## Examples

| File | Behavior |
| --- | --- |
| [`examples/catalog.py`](examples/catalog.py) | Offline lookup. |
| [`examples/check.py`](examples/check.py) | Balance and stock. |
| [`examples/async_check.py`](examples/async_check.py) | Same check with `AsyncGiveSms`. |
| [`examples/native_activation.py`](examples/native_activation.py) | Order, wait, next SMS, cancel. |
| [`examples/handler_activation.py`](examples/handler_activation.py) | Handler prices, order, ready, wait, complete. |
| [`examples/rent.py`](examples/rent.py) | Rent catalog and an optional rental. |

```bash
uv run python examples/catalog.py
GIVE_SMS_API_KEY=... uv run python examples/check.py
GIVE_SMS_API_KEY=... GIVE_SMS_ALLOW_PAID=1 uv run python examples/native_activation.py
```

Examples that would spend money return before ordering unless `GIVE_SMS_ALLOW_PAID=1`.

---

## Contributing

Source is `give-sms/python` in [api-kit](https://github.com/TysikGG/api-kit).

```bash
cd give-sms/python
uv sync
uv run ruff check .
uv run pytest -m "not live"   # coverage is part of the pytest addopts
```

`GIVE_SMS_API_KEY` enables the live test, which only reads balance, Kazakhstan stock, one price row, and rent countries:

```bash
GIVE_SMS_API_KEY=... uv run pytest -m live
```

---

## License

[ISC](LICENSE) © api-kit contributors.
