# changenow-client

[![PyPI version](https://img.shields.io/pypi/v/changenow-client.svg)](https://pypi.org/project/changenow-client/)
[![CI Tests](https://github.com/TysikGG/api-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/TysikGG/api-kit/actions/workflows/ci.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://github.com/TysikGG/api-kit/blob/main/LICENSE)
[![Python Version](https://img.shields.io/pypi/pyversions/changenow-client.svg)](https://pypi.org/project/changenow-client/)

Typed Python client for the [ChangeNOW](https://changenow.io) cryptocurrency exchange. `ChangeNow` is the synchronous client. `AsyncChangeNow` exposes the same methods as coroutines. Both cover partner API v2, legacy v1, and the anonymous catalogue plus version-3 quotes.

Install `changenow-client` from PyPI and import it as `changenow`.

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
- [Async client](#async-client)
- [Error handling](#error-handling)
- [Retries, proxies, and timeouts](#retries-proxies-and-timeouts)
- [Type hints](#type-hints)
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
- `wait_for_exchange` and `wait_for_public_transaction` with timeout, interval, terminal-status override, and an `on_status` callback.
- Sync client and `AsyncChangeNow` (asyncio). Async methods reuse the sync implementations and await the HTTP call.
- Retries for idempotent calls (network errors, HTTP 408, 429, and 5xx) with exponential delay and `Retry-After`. POST stays single-shot unless `retry_unsafe` is set.
- HTTP and HTTPS proxy, custom base URLs, extra headers, and end-user `x-forwarded-for`.
- Error subclasses for the version-3 machine codes and for HTTP 400, 401, 403, 404, 429, and 5xx.
- Exchange-link builder and a webhook body parser. The public webhook payload is unsigned; the parser checks the shape only.
- Version stays `0.1.0`. Requires Python 3.10+.

Partner revenue is attributed by the API key on `api.changenow.io`. The anonymous host does not attribute partner revenue. Use the v2 methods when the exchange should count toward the partner account.

---

## Installation

```bash
pip install changenow-client
```

The HTTP stack is `httpx`. From this repository, `uv sync` installs the package and the test tools.

---

## Configuration

```python
from changenow import ChangeNow

with ChangeNow(
    api_key=None,                                 # default: CHANGENOW_API_KEY
    base_url="https://api.changenow.io/v2",
    v1_base_url="https://api.changenow.io/v1",
    public_base_url="https://vip-api.changenow.io",
    timeout=30.0,
    user_agent="changenow-client/0.1.0",
    user_ip="203.0.113.10",                       # x-forwarded-for
    retries=2,
    retry_delay=0.2,
    retry_unsafe=False,
    proxy="http://127.0.0.1:8888",
    headers={"X-Request-Id": "demo"},
) as client:
    currencies = client.get_currencies(active=True)
```

`api_key`, `base_url`, `timeout`, `user_agent`, and `user_ip` can be passed positionally, in that order, so existing callers stay valid. Newer options are keyword-only.

| Option | Default | Purpose |
| --- | --- | --- |
| `api_key` | `CHANGENOW_API_KEY` | Partner key. Sent as `x-changenow-api-key`. |
| `base_url` | `https://api.changenow.io/v2` | Partner v2 origin. |
| `v1_base_url` | `https://api.changenow.io/v1` | Legacy v1 origin. |
| `public_base_url` | `https://vip-api.changenow.io` | Anonymous catalogue and v3. |
| `timeout` | `30.0` | Per-request timeout in seconds. |
| `user_agent` | `changenow-client/0.1.0` | `User-Agent` header. |
| `user_ip` | unset | End-user IP as `x-forwarded-for`. |
| `retries` | `2` | Extra attempts for idempotent calls. |
| `retry_delay` | `0.2` | Base backoff in seconds. |
| `retry_unsafe` | `False` | Retry POST, including create, refund, and continue. |
| `proxy` | unset | `http://` or `https://` proxy URL passed to httpx. |
| `headers` | unset | Extra headers. The API key header is applied after this map. |

`flow` on `create_exchange` defaults to `"standard"`. Close the client with `close()` or a `with` block. `AsyncChangeNow` supports `async with` and `aclose()`.

---

## Authentication and partner attribution

The only partner header is `x-changenow-api-key` (`CHANGENOW_API_KEY_HEADER`). A second partner header is not sent. On legacy v1, the same key is also the documented `api_key` query parameter, except on paths that already embed the key.

Optional create fields:

| Field | When to send it |
| --- | --- |
| `user_id` | After ChangeNOW enables "Special partner fields". |
| `payload` | Same feature. Up to five fields, each up to 64 characters. |
| `contact_email` | Optional contact stored with the exchange. |
| `source` | Optional partner source label from the public create example. |

Leave `user_id` and `payload` unset until that feature is enabled. Leave `source` unset on anonymous v3 and leave `utm_source` unset on exchange links unless you intend to set them. The client does not default those values to `llms`.

Catalogue reads, v1 currency reads, floating v1 quotes, and v3 estimates work without a key. Creating or listing v1 transactions requires a key and raises `ChangeNowAuthError` with code `AUTHENTICATION_REQUIRED` when it is missing. `get_exchanges` requires a private API key from ChangeNOW.

---

## Quick start

```python
import os
from changenow import ChangeNow

with ChangeNow(api_key=os.environ["CHANGENOW_API_KEY"]) as client:
    currencies = client.get_currencies(active=True, flow="standard")
    print(len(currencies))

    minimum = client.get_min_amount("btc", "eth", "btc", "eth", flow="standard")
    print(minimum["minAmount"])

    estimate = client.get_estimated_amount(
        "btc",
        "eth",
        from_amount="0.1",
        from_network="btc",
        to_network="eth",
        flow="standard",
    )
    print(estimate["toAmount"])

    check = client.validate_address("eth", "0x57f31ad4b64095347F87eDB1675566DAfF5EC886")
    print(check["result"])
```

From this repository:

```bash
cd changenow/python
uv sync
CHANGENOW_API_KEY=your-key uv run python examples/quickstart.py
uv run python examples/public_api.py
```

`examples/partner_api.py` exits when `CHANGENOW_API_KEY` is unset. Order-creating calls run only when `CHANGENOW_RUN_WRITES=1`.

---

## Partner API v2

Base URL `https://api.changenow.io/v2`. Amounts may be numbers or decimal strings.

### Currencies — `get_currencies`

`GET /exchange/currencies`.

```python
all_rows = client.get_currencies()
active = client.get_currencies(active=True, flow="standard", buy=True)
sellable = client.get_currencies(sell=True, flow="fixed-rate")
```

### Pairs — `get_available_pairs`

`GET /exchange/available-pairs`.

```python
pairs = client.get_available_pairs(from_currency="btc", from_network="btc", flow="standard")
one = client.get_available_pairs(
    from_currency="usdt",
    to_currency="usdt",
    from_network="eth",
    to_network="trx",
    flow="fixed-rate",
)
```

### Minimum and range

`GET /exchange/min-amount` and `GET /exchange/range`. `maxAmount` is null when the pair is uncapped.

```python
minimum = client.get_min_amount("btc", "eth", "btc", "eth", flow="standard")
bounds = client.get_range("btc", "eth", "btc", "eth", flow="fixed-rate")
```

### Estimate — `get_estimated_amount`

`GET /exchange/estimated-amount`.

```python
floating = client.get_estimated_amount(
    "btc", "eth",
    from_amount="0.1",
    from_network="btc",
    to_network="eth",
    flow="standard",
    type="direct",
)

locked = client.get_estimated_amount(
    "btc", "eth",
    from_amount="0.1",
    from_network="btc",
    to_network="eth",
    flow="fixed-rate",
    use_rate_id=True,
)

reverse = client.get_estimated_amount(
    "btc", "eth",
    to_amount="1",
    from_network="btc",
    to_network="eth",
    type="reverse",
    flow="standard",
)

top_up = client.get_estimated_amount(
    "btc", "eth",
    from_amount="0.1",
    from_network="btc",
    to_network="eth",
    is_top_up=True,
)
```

### Create — `create_exchange`

`POST /exchange`. Default `flow` is `"standard"`.

```python
created = client.create_exchange(
    "btc",
    "eth",
    "0xReceiver",
    from_network="btc",
    to_network="eth",
    from_amount="0.1",
    extra_id=None,
    refund_address="bc1qrefund",
    contact_email="desk@example.com",
    flow="standard",
    type="direct",
)
print(created["id"], created["payinAddress"])

fixed = client.create_exchange(
    "btc",
    "eth",
    "0xReceiver",
    from_network="btc",
    to_network="eth",
    from_amount="0.1",
    flow="fixed-rate",
    rate_id=locked["rateId"],
)

client.create_exchange(
    "btc",
    "eth",
    "0xReceiver",
    from_network="btc",
    to_network="eth",
    to_amount="1",
    type="reverse",
    user_id="user-42",
    payload={"order": "1001"},
    source="checkout",
)
```

### Status

`GET /exchange/by-id`. `get_transaction` and `get_transaction_status` are aliases.

```python
status = client.get_exchange(created["id"])
client.get_transaction(created["id"])
client.get_transaction_status(created["id"])
```

Known statuses (the set is open): `new`, `waiting`, `confirming`, `exchanging`, `sending`, `finished`, `failed`, `refunded`, `verifying`, `expired`, `refunding`, `rejected`.

Terminal statuses: `finished`, `failed`, `refunded`, `expired`, `rejected`.

### Address check and names

```python
check = client.validate_address("eth", "0x57f31ad4b64095347F87eDB1675566DAfF5EC886")
named = client.get_user_addresses("example.crypto")
```

An invalid checksum is HTTP 200 with `result: false`. Unknown names return `success: false`.

### Network fee and market estimate

```python
fees = client.get_network_fee(
    "usdt", "usdt", "100",
    from_network="eth",
    to_network="trx",
    flow="standard",
    converted_currency="usd",
    converted_network="usd",
)

market = client.get_market_estimate("usd", "btc", from_amount="1000", type="direct")
reverse_market = client.get_market_estimate("btc", "eur", to_amount="100", type="reverse")
```

`get_market_estimate` is informational. Fees are excluded. Fiat tickers are valid here. Catalogue rows with `kind="fiat"` and exchange links with `fiat_mode=True` cover the rest of the fiat surface.

### Partner exchange list

`GET /exchanges`. Requires a private API key. `limit` must be greater than 0 and less than 100. `statuses` may be a string or a list of strings.

```python
page = client.get_exchanges(
    limit=10,
    offset=0,
    sort_direction="DESC",
    sort_field="createdAt",
    date_field="createdAt",
    date_from="2024-01-01T00:00:00.000Z",
    date_to="2024-12-31T23:59:59.000Z",
    request_id=created["id"],
    payout_address="0xReceiver",
    statuses=["finished", "waiting"],
)
```

### Actions, push, and refund

```python
actions = client.get_exchange_actions(created["id"])
if actions.get("continue"):
    client.continue_exchange(created["id"])
if actions.get("refund"):
    client.refund_exchange(created["id"], address="bc1qrefund")
```

The push block in the JSON body uses the key `continue`.

### Private transfers

Status stays on `get_exchange` / `wait_for_exchange`.

```python
quote = client.get_private_transfer_estimate("eth", "eth", "0.05")
transfer = client.create_private_transfer(
    "eth",
    "eth",
    "0.05",
    "0xReceiver",
    refund_address="0xRefund",
    rate_id=quote["rateId"],
)
client.get_exchange(transfer["id"])
```

`user_id` on the estimate is optional and uses the special-partner-fields rule.

---

## Polling

```python
from changenow import ChangeNowTimeoutError, is_terminal_exchange_status

try:
    done = client.wait_for_exchange(
        created["id"],
        timeout=600,
        interval=5,
        on_status=lambda status, row: print(status, row.get("amountFrom")),
    )
    print(is_terminal_exchange_status(done["status"]))
except ChangeNowTimeoutError as exc:
    print(exc, exc.response_body)
```

```python
client.wait_for_exchange(
    created["id"],
    timeout=120,
    interval=2,
    terminal_statuses=("finished", "failed"),
)
```

`wait_for_public_transaction` is the same loop for an anonymous version-3 id. Pass `sub_id` when the order has one. Defaults are 600 seconds and 5 seconds. The async client awaits `asyncio.sleep` inside the loop.

---

## Anonymous catalogue and version 3

Host `https://vip-api.changenow.io`. These calls do not attribute partner revenue.

```python
from changenow import split_asset_id

split_asset_id("usdt.trx")  # {"currency": "usdt", "network": "trx"}
split_asset_id("btc")       # {"currency": "btc", "network": "btc"}
```

### Catalogue

```python
page = client.list_assets(q="usd", network="trx", kind="crypto", fixed_rate=True, popular=True, limit=50)
client.list_assets(cursor=page["next_cursor"], limit=50)
csv_text = client.list_assets(format="csv", network="btc")
manual = client.get_asset_manual()
fiat = client.list_all_assets(kind="fiat", limit=100, max_pages=5)
btc = client.get_asset("btc")
```

`format="csv"` and `help=True` return text. `list_all_assets` follows `next_cursor` and stops after `max_pages` (default 100).

### Version-3 quote and order

```python
quote = client.get_public_estimate("btc", "btc", "eth", "eth", from_amount="0.1", flow="standard", type="direct")
locked = client.get_public_estimate(
    "btc", "btc", "eth", "eth", from_amount="0.1", flow="fixed-rate", use_rate_id=True
)
reverse = client.get_public_estimate(
    "btc", "btc", "eth", "eth", to_amount="1", flow="fixed-rate", type="reverse"
)
promo = client.get_public_estimate("btc", "btc", "eth", "eth", from_amount="0.1", promo_code="PROMO")
manual = client.get_public_manual()

order = client.create_public_transaction(
    "btc", "btc", "eth", "eth", "0xReceiver",
    from_amount="0.01",
    refund_address="bc1qrefund",
    contact_email="desk@example.com",
    flow="standard",
    type="direct",
)
fixed_order = client.create_public_transaction(
    "btc", "btc", "eth", "eth", "0xReceiver",
    from_amount="0.01",
    flow="fixed-rate",
    rate_id="rate-from-estimate",
)
row = client.get_public_transaction(order["id"])
child = client.get_public_transaction(order["id"], sub_id="sub-id")
finished = client.wait_for_public_transaction(order["id"], timeout=600, interval=5)
```

`help=True` on the estimate, create, or status call returns the plain-text manual and does not create an order when you pass it to `create_public_transaction`. `source` and `link_id` are sent only when you set them.

Version-3 refusals are field-keyed. The error object exposes `field`, `field_errors`, `code`, and `help`.

---

## Legacy API v1

```python
currencies = client.get_currencies_v1(active=True, fixed_rate=False)
targets = client.get_currencies_to_v1("btc", fixed_rate=True)
info = client.get_currency_info_v1("btc")
minimum = client.get_min_amount_v1("btc", "eth")
floating = client.get_exchange_amount_v1("0.1", "btc", "eth")
bounds = client.get_exchange_range_v1("btc", "eth")
fixed = client.get_fixed_rate_amount_v1("0.1", "btc", "eth", use_rate_id=True)
pairs = client.get_market_pairs_v1()
valid = client.validate_address_v1("btc", "bc1qexample")
# The current api.changenow.io host returns 404 for this legacy route.
# validate_address on v2 returns the check.

tx = client.create_transaction_v1(
    from_ticker="btc",
    to_ticker="eth",
    address="0xReceiver",
    amount="0.01",
    refund_address="bc1qrefund",
    contact_email="desk@example.com",
)
fixed_tx = client.create_fixed_rate_transaction_v1(
    from_ticker="btc",
    to_ticker="eth",
    address="0xReceiver",
    amount="0.1",
    rate_id=fixed.get("rateId"),
)
one = client.get_transaction_v1(tx["id"])
listed = client.list_transactions_v1(
    from_ticker="btc",
    to_ticker="eth",
    status="finished",
    limit=10,
    offset=0,
    date_from="2024-01-01",
    date_to="2024-12-31",
)
```

Optional v1 create fields `user_id` and `payload` follow the same special-partner-fields rule as v2. `get_fixed_rate_amount_v1` sends `api_key` when a key is configured. Transaction paths embed the key and do not also send that query parameter.

---

## Exchange links and webhooks

`build_exchange_link` creates a prefilled `https://changenow.io/exchange` URL. The link does not create an order. Only documented query keys are set. English uses no language prefix. Documented languages (`ar`, `de`, `es`, `fa`, `fr`, `id`, `it`, `ja`, `ko`, `pt`, `tr`, `vi`, `zh`) prefix the path.

```python
from changenow import build_exchange_link, parse_exchange_webhook

url = build_exchange_link(
    "btc",
    "eth",
    amount="0.1",
    fixed_rate=True,
    recipient_address="0xReceiver",
    backup_address="bc1qrefund",
    lang="de",
    utm_source="docs",
    utm_medium="app",
    utm_campaign="spring",
    utm_content="hero",
    utm_term="swap",
)
fiat_url = build_exchange_link("usd", "btc", amount="100", fiat_mode=True)
receive_url = build_exchange_link("btc", "eth", amount_to="1")

event = parse_exchange_webhook({
    "id": "81cc9c3a9157a6",
    "status": "finished",
    "payoutHash": "0xabc",
})
```

The same helpers are methods on the client: `client.build_exchange_link`, `client.split_asset_id`, `client.parse_exchange_webhook`, and `client.is_terminal_exchange_status`. `parse_exchange_webhook` accepts `id`, `exchangeId`, or `requestId`. `status`, when present, must be a string. ChangeNOW does not sign this public body.

`EXCHANGE_STATUSES` and `TERMINAL_EXCHANGE_STATUSES` are exported from the package.

---

## Async client

`AsyncChangeNow` takes the same constructor arguments. Every public `ChangeNow` method is awaitable. `wait_for_exchange`, `wait_for_public_transaction`, and `list_all_assets` are native coroutines.

```python
import asyncio
from changenow import AsyncChangeNow

async def main() -> None:
    async with AsyncChangeNow() as client:
        page = await client.list_assets(limit=2, network="btc")
        quote = await client.get_public_estimate(
            "btc", "btc", "eth", "eth", from_amount="0.1"
        )
        print(page["assets"][0]["ticker"], quote["quote"])
        await client.aclose()

asyncio.run(main())
```

Calling a name that exists on neither class raises `AttributeError`.

---

## Error handling

Failed responses raise `ChangeNowError` or a subclass. Subclasses remain subclasses of `ChangeNowError`. Attributes: `status_code`, `code`, `response_body`, `field`, `field_errors`, `help`, `retry_after`.

```python
from changenow import (
    ChangeNowAmountError,
    ChangeNowAuthError,
    ChangeNowError,
    ChangeNowNetworkError,
    ChangeNowRateLimitError,
    ChangeNowTimeoutError,
)

try:
    client.get_min_amount("btc", "eth")
except ChangeNowAmountError as exc:
    print(exc, exc.field_errors)
except ChangeNowRateLimitError as exc:
    print("retry after", exc.retry_after)
except ChangeNowNetworkError as exc:
    print("no HTTP response", exc)
except ChangeNowAuthError as exc:
    print(exc.status_code)
except ChangeNowTimeoutError as exc:
    print(exc.response_body)
except ChangeNowError as exc:
    print(exc.__class__.__name__, exc.code, exc.status_code, exc.help)
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

HTTP mapping when the body has no machine code: 400 and 422 validation, 401 auth, 403 forbidden, 404 not found, 429 rate limit, 5xx server. A missing response is `ChangeNowNetworkError`. `CHANGENOW_ERROR_CODES` lists the machine codes.

---

## Retries, proxies, and timeouts

GET requests retry on network failure, HTTP 408, 429, 5xx, and codes `RATE_LIMITED`, `UPSTREAM_UNAVAILABLE`, and `INTERNAL_ERROR`. POST is not retried unless `retry_unsafe=True`. `retries=2` means three attempts. Delay starts at `retry_delay` and doubles. A `Retry-After` value in seconds or as an HTTP date replaces that delay.

```python
client = ChangeNow(
    timeout=10,
    retries=3,
    retry_delay=0.25,
    proxy="http://user:pass@proxy.example:8080",
)
```

`retries=0` disables retries. A proxy whose scheme is not `http` or `https`, or whose host is empty, raises `ChangeNowError` from the constructor.

---

## Type hints

Public models are `TypedDict`s: `ChangeNowCurrency`, `AvailablePair`, `MinAmountResult`, `RangeResult`, `EstimatedAmount`, `CreatedExchange`, `ExchangeStatus`, `AddressValidation`, `MarketEstimate`, and `ExchangesPage`. Methods that return anonymous or legacy payloads are typed as `dict[str, Any]` or `list[dict[str, Any]]`.

```python
from changenow import ChangeNow, ExchangeStatus

client = ChangeNow()
row: ExchangeStatus = client.get_exchange("id")
```

---

## Examples

| File | What it calls |
| --- | --- |
| `examples/quickstart.py` | Partner currency, minimum, estimate, and address check. Requires `CHANGENOW_API_KEY`. |
| `examples/public_api.py` | Catalogue, v3 quote, v1 reads, links, and webhook parsing. No key. |
| `examples/partner_api.py` | Every partner read. Writes run only with `CHANGENOW_RUN_WRITES=1`. |
| `examples/async_public.py` | The same public reads through `AsyncChangeNow`. |

```bash
uv run python examples/public_api.py
uv run python examples/async_public.py
CHANGENOW_API_KEY=your-key uv run python examples/partner_api.py
```

---

## Comparison

| Capability | changenow-client | `changenow` 1.0.2 (npm) | `changenow-sdk` 1.0.8 | `changenow-io-sdk` | ChangeNOW-api-python (GitHub v1) |
| --- | --- | --- | --- | --- | --- |
| Partner v2 currencies, estimates, create, status | yes | no | partial | generated subset | no |
| Fixed-rate `rateId` | yes | no | partial | partial | no |
| Network fee, market estimate, names | yes | no | partial | partial | no |
| Partner list, push, refund | yes | no | partial | partial | no |
| Private transfers | yes | no | no | partial | no |
| Legacy v1 | yes | thin wrapper | yes | no | yes |
| Anonymous catalogue and v3 | yes | no | no | no | no |
| Sync and asyncio clients | yes | n/a | n/a | n/a | sync only |
| Retries and `Retry-After` | yes | no | yes | no | no |
| Proxy | yes | no | yes | no | no |
| Typed errors per v3 code | yes | no | subclasses | no | no |
| Wait with timeout and callback | yes | no | partial | no | no |
| Exchange link builder | yes | no | no | no | no |
| Partner header `x-changenow-api-key` | yes | query key | varies | varies | `api_key` query |

`changenow` on npm is the claretnnamocha v1 wrapper. `changenow-sdk` is an unofficial client that also documents fiat paths this package does not call, because those paths are not in the current public docs. On PyPI, `changenow-client` is this library. Older GitHub and GitLab trees named `changenow-api-python` wrap v1 only.

---

## FAQ

**Which host should I call for partner revenue?**  
`get_estimated_amount` and `create_exchange` on `https://api.changenow.io/v2`. Anonymous v3 quotes are public and do not attribute revenue.

**Does the client add a second API header?**  
It sends `x-changenow-api-key` only. Legacy v1 also sends the documented `api_key` query.

**Will `create_exchange` be retried after a timeout?**  
Only when you set `retry_unsafe=True`. The default keeps create, refund, continue, and v1 transaction posts single-shot.

**What does a failed address check look like?**  
HTTP 200 and `result: false`. A version-3 `INVALID_ADDRESS` code raises `ChangeNowAddressError`.

**How do I express USDT on Tron?**  
Partner v2 uses `from_currency="usdt"` and `from_network="trx"`. The catalogue id is `usdt.trx`. Legacy v1 often uses a combined ticker such as `usdttrc20`; read it from `get_currencies_v1`.

**Can I list every asset?**  
`list_all_assets` follows cursors. Pass `limit` and `max_pages` when you want a bounded read.

**Where is fiat?**  
`get_market_estimate` accepts fiat tickers. Catalogue `kind="fiat"` lists fiat assets. `build_exchange_link(..., fiat_mode=True)` opens the card or bank flow.

**How do I test without a key?**  
`uv run python examples/public_api.py` and `uv run pytest -m "not live"`. Live tests run only when `CHANGENOW_API_KEY` is set and stay read-only.

---

## Contributing

The package lives in the [api-kit](https://github.com/TysikGG/api-kit) monorepo at `changenow/python`.

```bash
uv sync
uv run ruff check .
uv run pytest -m "not live"   # coverage gate at 95%
uv run pytest -m live         # requires CHANGENOW_API_KEY
```

Keep `CHANGENOW_API_KEY_HEADER` as `x-changenow-api-key`. Keep `create_exchange`'s default flow `"standard"`. Add a method alias if a public name has to change.

---

## License

ISC. See the repository [LICENSE](https://github.com/TysikGG/api-kit/blob/main/LICENSE).
