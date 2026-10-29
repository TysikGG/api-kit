# simpleswap-client

[![PyPI version](https://img.shields.io/pypi/v/simpleswap-client.svg)](https://pypi.org/project/simpleswap-client/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/pypi/pyversions/simpleswap-client.svg)](https://pypi.org/project/simpleswap-client/)

Typed Python client for the [SimpleSwap](https://simpleswap.io) instant cryptocurrency exchange REST API (v3).

SimpleSwap is a non-custodial swap aggregator. A partner API key lets your product quote a pair, open an exchange, and track it until SimpleSwap sends the payout. Partner revenue is attributed by the `x-api-key` header this client sends. An optional `custom_fee` (documented by SimpleSwap as 0.4–5 percent) overrides the reward configured on that key. Fiat keys are separate, and their fee cannot be customized.

Official reference: [Swagger UI](https://api.simpleswap.io/v3) and the [public API guide](https://simpleswap.io/en/affiliate-program/help-center/article/public-api-guide).

The public API allows 50 requests per 10 seconds. A burst past that limit can block the caller IP for one minute.

Sync (`SimpleSwap`) and async (`AsyncSimpleSwap`) clients expose the same methods. Async methods are coroutines. Use the client as a context manager so the HTTP session closes.

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
- [Async client](#async-client)
- [Error handling](#error-handling)
- [Advanced usage](#advanced-usage)
- [Type hints](#type-hints)
- [Comparison](#comparison)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- Currencies, per-currency metadata, all pairs, and pairs for one ticker and network.
- Floating and fixed estimates, including reverse quotes and the partner `custom_fee`.
- Deposit ranges and a `get_min()` helper for the legacy minimum-only call.
- Exchange pre-check, create, fetch, list, and status polling with a timeout.
- Provider deposit confirmation (`PUT /v3/exchanges`).
- Fixed-rate market rows (min, max, rate, miner fee, reserve, `rateId`).
- Local address checks against the currency validation regex.
- Error subclasses for HTTP 400, 401, 403, 404, 422, 429, and 5xx, plus network and polling timeouts.
- Retries for safe reads. Creates and confirms are repeated only on HTTP 429.
- Custom base URL, timeout, proxy, trust-env switch, and client IP header.
- Sync and async clients.
- The default User-Agent stays `simpleswap-client/0.1.0`, and the API key stays in `x-api-key`.

Runnable scripts for every method live in [`examples/`](examples).

---

## Installation

```bash
pip install simpleswap-client
```

Python 3.10 or newer. The wheel includes `py.typed`.

```python
from simpleswap import AsyncSimpleSwap, SimpleSwap, SimpleSwapError
```

---

## Configuration

```python
from simpleswap import SimpleSwap

with SimpleSwap(
    api_key=None,                              # or SIMPLESWAP_API_KEY
    base_url="https://api.simpleswap.io",
    timeout=30.0,
    user_agent="simpleswap-client/0.1.0",      # also sent as x-user-agent
    client_ip="203.0.113.10",                  # x-client-ip
    proxy="http://user:pass@127.0.0.1:8888",
    max_retries=2,
    retry_delay=0.2,
    polling_interval=5.0,
    polling_timeout=600.0,
    trust_env=True,
) as client:
    ...
```

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `api_key` | `str \| None` | `SIMPLESWAP_API_KEY` | Partner key. Sent as `x-api-key`. An empty string does not fall through to the environment. |
| `base_url` | `str \| None` | `https://api.simpleswap.io` | API origin. Trailing slashes are removed. Paths already include `/v3`. |
| `timeout` | `float` | `30.0` | Per-request timeout in seconds. |
| `user_agent` | `str \| None` | `simpleswap-client/0.1.0` | `User-Agent` and `x-user-agent`. An empty string keeps the default. |
| `client_ip` | `str \| None` | `None` | Forwarded as `x-client-ip` when set. |
| `proxy` | `str \| None` | `None` | Proxy URL passed to httpx. |
| `max_retries` | `int` | `2` | Extra attempts after the first try. `0` disables retries. |
| `retry_delay` | `float` | `0.2` | Base backoff in seconds. It doubles each attempt and is capped at 60 seconds. `Retry-After` replaces it. |
| `polling_interval` | `float` | `5.0` | Default delay between `wait_for_exchange` polls. |
| `polling_timeout` | `float` | `600.0` | Default `wait_for_exchange` deadline (10 minutes). |
| `trust_env` | `bool` | `True` | When false, ignore proxy environment variables. |

`AsyncSimpleSwap` takes the same keyword arguments.

Create a key in the SimpleSwap affiliate dashboard under API / DeFi API. Crypto and fiat keys are not interchangeable.

---

## Quick start

This only lists currencies and asks for a quote. It does not create an exchange.

```python
import os
from simpleswap import SimpleSwap

with SimpleSwap(api_key=os.environ["SIMPLESWAP_API_KEY"]) as client:
    currencies = client.get_currencies()
    print(len(currencies))

    estimate = client.get_estimate(
        ticker_from="btc",
        ticker_to="eth",
        amount="0.1",
        network_from="btc",
        network_to="eth",
        fixed=False,
    )
    print(f"0.1 BTC -> {estimate['estimatedAmount']} ETH")
```

[`examples/quickstart.py`](examples/quickstart.py)

---

## Currencies

`GET /v3/currencies` and `GET /v3/currencies/{ticker}/{network}`.

```python
all_currencies = client.get_currencies()
same = client.get_all_currencies()  # alias

btc = client.get_currency("btc", "btc")
print(btc["name"], btc.get("precision"), btc.get("hasExtraId"))
print(btc.get("validationAddress"), btc.get("isAvailableFloat"), btc.get("isFiat"))
```

Tickers and networks are lowercase. The same symbol can exist on more than one network, so pass both.

[`examples/currencies.py`](examples/currencies.py)

---

## Pairs

`GET /v3/pairs` and `GET /v3/pairs/{ticker}/{network}`.

Keys and values look like `btc:btc` and `eth:bsc`.

```python
from_btc = client.get_pairs("btc", "btc", fixed=False)
print(from_btc.get("btc:btc", [])[:5])

fixed_only = client.get_pairs("btc", "btc", fixed=True)
all_pairs = client.get_all_pairs(fixed=False)  # large payload
```

Calling `get_pairs` with only a ticker raises `SimpleSwapError`. Pass both arguments, or neither.

[`examples/pairs.py`](examples/pairs.py)

---

## Estimates

`GET /v3/estimates`.

```python
quote = client.get_estimate(
    ticker_from="btc",
    ticker_to="eth",
    amount="0.2",
    network_from="btc",
    network_to="eth",
    fixed=False,
    reverse=False,
    custom_fee="0.4",
)
print(quote["estimatedAmount"], quote.get("rateId"), quote.get("validUntil"))
```

`get_estimated()` is an alias with the same positional signature, so existing calls keep working:

```python
client.get_estimate("btc", "eth", 0.1, custom_fee=0.5)
```

Boolean query flags are sent as `true` and `false`. Amounts are strings. `custom_fee=None` is omitted so the key's dashboard fee stays in place. On create, a numeric custom fee stays a JSON number.

[`examples/estimate.py`](examples/estimate.py)

---

## Ranges and minimums

`GET /v3/ranges`.

```python
ranges = client.get_ranges(
    "btc", "eth", network_from="btc", network_to="eth", fixed=False, reverse=False
)
print(ranges["min"], ranges.get("max"))

minimum = client.get_min("btc", "eth", network_from="btc", network_to="eth")
```

`get_min()` returns the minimum string (or `None`) and exists because the legacy API exposed `get_min`. `max` is null when the floating pair has no upper bound.

[`examples/ranges.py`](examples/ranges.py)

---

## Check an exchange

`GET /v3/exchanges/check` answers whether SimpleSwap can open an exchange for the pair, direction, and amount. It does not take a payout address. Check the address with `is_valid_address`, then create the exchange.

```python
check = client.check_exchange(
    "btc", "eth", "0.1", network_from="btc", network_to="eth", fixed=False
)
if not check["canCreate"]:
    print("Pair or amount is not exchangeable right now.")
```

A bare boolean from the API is normalized to `{"canCreate": ...}`.

[`examples/check_exchange.py`](examples/check_exchange.py)

---

## Create an exchange

`POST /v3/exchanges`. The response includes the deposit address and the public id.

```python
order = client.create_exchange(
    ticker_from="btc",
    ticker_to="eth",
    amount="0.1",
    address_to="0xYourEthereumAddress",
    network_from="btc",
    network_to="eth",
    fixed=False,
    reverse=False,
    user_refund_address="bc1qYourBitcoinRefundAddress",
)
print(order.get("publicId") or order.get("id"))
print(order["addressFrom"], order["amountFrom"])
```

`reverse` is the last parameter so older positional calls that passed `extra_id_to` stay valid. `exchange_public_id(order)` reads `publicId` or `id`.

This call opens a real exchange. [`examples/create_exchange.py`](examples/create_exchange.py) does not POST unless `SIMPLESWAP_EXAMPLE_CREATE=1`.

---

## Fixed-rate exchanges

Set `fixed=True`. Take `rateId` from a fixed estimate and pass it to `create_exchange` before `validUntil`.

```python
quote = client.get_estimate(
    "btc", "eth", "0.1", network_from="btc", network_to="eth", fixed=True
)
order = client.create_exchange(
    "btc",
    "eth",
    "0.1",
    "0xYourEthereumAddress",
    network_from="btc",
    network_to="eth",
    fixed=True,
    rate_id=quote.get("rateId"),
)
```

---

## Reverse quotes

`reverse=True` means `amount` is what the user wants to receive.

```python
needed = client.get_estimate(
    "btc", "eth", "1", network_from="btc", network_to="eth", reverse=True
)
print(f"Deposit about {needed['estimatedAmount']} BTC to receive 1 ETH")
```

Use the same flag on `get_ranges`, `check_exchange`, and `create_exchange`.

---

## Memos and refunds

Currencies with `hasExtraId` need a memo or destination tag.

```python
xrp = client.get_currency("xrp", "xrp")
order = client.create_exchange(
    ticker_from="btc",
    ticker_to="xrp",
    amount="0.02",
    address_to="rYourXrpAddress",
    network_from="btc",
    network_to="xrp",
    extra_id_to="123456",
    user_refund_address="bc1qYourRefund",
    user_refund_extra_id=None,
)
```

An empty string for `extra_id_to` is sent, matching the previous Python client. `None` omits the field.

---

## Confirm a provider deposit

`PUT /v3/exchanges` is for the case where your service already accepted the deposit and must hand SimpleSwap the transaction id. A normal wallet-to-deposit-address swap does not need it.

```python
confirmed = client.confirm_exchange(
    public_id="exchange-public-id",
    tx_from="deposit-transaction-id",
    provider_user_deposit_address="address-that-received-the-deposit",
    target_address="0xUserPayoutAddress",
)
print(confirmed.get("status"))
```

[`examples/confirm_exchange.py`](examples/confirm_exchange.py) sends the PUT only when `SIMPLESWAP_EXAMPLE_CONFIRM=1`.

---

## Read one exchange

`GET /v3/exchanges/{publicId}`.

```python
order = client.get_exchange("exchange-public-id")
print(order.get("status"), order.get("txFrom"), order.get("txTo"))
```

`ExchangeStatus` lists the known strings: `waiting`, `confirming`, `exchanging`, `sending`, `finished`, `failed`, `refunded`, `expired`, and `verifying`. `TERMINAL_EXCHANGE_STATUSES` is `finished`, `failed`, `refunded`, and `expired`. Other values are still in progress.

[`examples/exchanges.py`](examples/exchanges.py)

---

## List exchanges

`GET /v3/exchanges`.

```python
page = client.get_exchanges(
    limit=100,
    offset=0,
    start_date="2025-03-19T00:00:00.000Z",
    finish_date="2025-03-26T00:00:00.000Z",
)
```

There is no status filter on this endpoint. Filter the list yourself.

---

## Wait until a status

```python
from simpleswap import ExchangeStatus, SimpleSwapTimeoutError

try:
    done = client.wait_for_exchange(
        "exchange-public-id",
        timeout=600,
        interval=5,
        statuses={ExchangeStatus.FINISHED},
        on_update=lambda order: print(order.get("status")),
    )
except SimpleSwapTimeoutError as exc:
    print(exc, exc.response_body)
```

The default stop set is the terminal statuses. The first poll is immediate. `on_update` receives every payload, including the last one. Each poll is a GET, so read retries apply.

To wait for several terminals:

```python
from simpleswap import TERMINAL_EXCHANGE_STATUSES

client.wait_for_exchange("exchange-public-id", statuses=TERMINAL_EXCHANGE_STATUSES)
```

[`examples/wait_for_exchange.py`](examples/wait_for_exchange.py)

---

## Market table

`GET /v3/market`. `get_market_info()` is the legacy alias.

```python
for row in client.get_market()[:3]:
    print(row["tickerFrom"], row["tickerTo"], row.get("rate"), row.get("min"), row.get("rateId"))
```

The full table is large. Cache it.

[`examples/market.py`](examples/market.py)

---

## Address validation

`is_valid_address` does not call the network. The pattern must match the whole address (`re.fullmatch`).

```python
eth = client.get_currency("eth", "eth")
ok = client.is_valid_address("0x" + "ab" * 20, currency=eth)
no_rule = client.is_valid_address("anything-non-empty", None)  # True
```

An empty address is invalid. A missing pattern accepts any non-empty address. A broken regular expression raises `SimpleSwapError`.

[`examples/validate_address.py`](examples/validate_address.py) runs the local check with no API key.

---

## Async client

```python
import asyncio
from simpleswap import AsyncSimpleSwap

async def main() -> None:
    async with AsyncSimpleSwap(api_key="your-api-key", max_retries=2) as client:
        currencies = await client.get_currencies()
        estimate = await client.get_estimate(
            "btc", "eth", "0.1", network_from="btc", network_to="eth"
        )
        print(len(currencies), estimate["estimatedAmount"])

asyncio.run(main())
```

Every synchronous method has an async twin with the same arguments: `get_currency`, `get_pairs`, `get_all_pairs`, `get_estimate`, `get_estimated`, `get_ranges`, `get_min`, `check_exchange`, `create_exchange`, `confirm_exchange`, `get_exchange`, `wait_for_exchange`, `get_exchanges`, `get_market`, and `get_market_info`. `is_valid_address` stays synchronous.

[`examples/async_client.py`](examples/async_client.py)

---

## Error handling

```python
from simpleswap import (
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
)

try:
    client.get_currency("nope", "nope")
except SimpleSwapNotFoundError as exc:
    print(exc.status_code, exc.message, exc.trace_id, exc.response_body)
```

| Class | When |
| :--- | :--- |
| `SimpleSwapBadRequestError` | HTTP 400. Amount, pair, or address was rejected. |
| `SimpleSwapAuthError` | HTTP 401. Missing or unknown API key. |
| `SimpleSwapForbiddenError` | HTTP 403. The key cannot call this operation. |
| `SimpleSwapNotFoundError` | HTTP 404. Unknown currency, pair, or exchange id. |
| `SimpleSwapValidationError` | HTTP 422. Body or query failed validation. |
| `SimpleSwapRateLimitError` | HTTP 429. More than 50 requests in 10 seconds, or a one-minute IP block. |
| `SimpleSwapServerError` | HTTP 5xx. |
| `SimpleSwapNetworkError` | DNS, connection, or timeout before a response. `retryable` is true. |
| `SimpleSwapTimeoutError` | `wait_for_exchange` reached its deadline. `response_body` is the last order. |
| `SimpleSwapError` | Other failures, including HTTP 200 bodies with `error: true` and a bad address regex. |

`str(exc)` is `[status] message` when a status exists, otherwise the message. That matches the previous client.

Application bodies look like:

```json
{ "code": 400, "error": "Bad Request", "message": "string", "traceId": "..." }
```

or `{ "error": true, "message": "...", "traceId": "..." }`. A string `error` beside `result` is ignored. A string `error` without `result` is raised. Plain-text bodies become the message. Invalid JSON raises `SimpleSwapError`.

[`examples/errors.py`](examples/errors.py)

---

## Advanced usage

### Retries

GET requests retry network errors, HTTP 408, HTTP 429, and HTTP 5xx. POST and PUT retry only HTTP 429. A create or confirm is not sent again after a timeout or a 5xx response, because the exchange may already exist.

```python
client = SimpleSwap(api_key="key", max_retries=2, retry_delay=0.2)
```

Backoff is `retry_delay * 2^attempt` seconds, capped at 60. A numeric `Retry-After` header is a delay in seconds and replaces the backoff. Set `max_retries=0` to fail on the first attempt.

### Proxies, timeouts, and base URL

```python
with SimpleSwap(
    api_key=os.environ["SIMPLESWAP_API_KEY"],
    base_url="https://api.simpleswap.io",
    timeout=15,
    proxy=os.environ.get("HTTPS_PROXY"),
    trust_env=True,
    client_ip=user_ip,
) as client:
    client.get_ranges("btc", "eth", network_from="btc", network_to="eth")
```

[`examples/retries_and_proxy.py`](examples/retries_and_proxy.py)

### Callbacks

SimpleSwap's public v3 API does not publish a webhook. Poll with `wait_for_exchange` and pass `on_update`.

### What this client does not call

The Swagger components include `PartnerProfitDto`, and the dashboard has a separate DeFi API. The published v3 operations implemented here are currencies, pairs, estimates, ranges, exchanges (check, get, list, create, confirm), and market. Partner profit for a crypto exchange is `custom_fee`, or the fee stored on the API key. This client does not add a second referral parameter.

---

## Type hints

Responses are `TypedDict`s (`total=False`), so every documented field is optional at the type level and the runtime dict can carry extra keys.

```python
from simpleswap import (
    CheckExchangeResult,
    EstimateResult,
    ExchangeOrder,
    ExchangeStatus,
    MarketRate,
    RangesResult,
    SimpleSwapCurrency,
    exchange_public_id,
)

def show(order: ExchangeOrder) -> str:
    return exchange_public_id(order)
```

The package ships a `py.typed` marker.

---

## Comparison

Reviewed on 2026-10-29.

| Capability | simpleswap-client | PyPI `simpleswap` 1.0.0 | npm search for "simpleswap" |
| :--- | :---: | :---: | :---: |
| API generation | v3 (`/v3/...`, `x-api-key`) | Legacy query API (`/get_estimated`, `api_key` query) | No other `api.simpleswap.io` client |
| Networks on every call | Yes | No | — |
| Pairs and full pair map | Yes | Yes (legacy paths) | — |
| Fixed and floating quotes | Yes | `fixed` flag only | — |
| Reverse quotes | Yes | No | — |
| Partner `custom_fee` | Yes | No | — |
| Ranges and minimum | Yes | Yes | — |
| Create, fetch, list | Yes | Yes | — |
| Provider confirm (`PUT /v3/exchanges`) | Yes | No | — |
| Market table | Yes | `get_market_info` (legacy) | — |
| Typed errors per HTTP status | Yes | One exception class | — |
| Retries, proxy, timeout, base URL | Yes | No | — |
| Status polling | Yes | No | — |
| Address regex helper | Yes | No | — |
| Sync and async | Both | Sync `requests` only | — |
| Type hints | `TypedDict` plus `py.typed` | No | — |

`github.com/core01/simpleswap` is an archived front-end exercise, not an SDK. Its legacy `get_all_currencies`, `get_min`, and `get_estimated` calls map to `get_currencies`, `get_min`, and `get_estimate`.

The JavaScript package in this monorepo (`simpleswap-client` on npm) covers the same v3 surface.

---

## FAQ

**Where does the API key go?**
In the `x-api-key` header. Pass `api_key` or set `SIMPLESWAP_API_KEY`. The legacy v1 client put `api_key` in the query string. This client does not.

**Does a quick start create an order?**
No. `get_currencies` and `get_estimate` are read-only. `create_exchange` and `confirm_exchange` change state.

**Why is `custom_fee` sometimes omitted?**
`None` leaves the key's dashboard reward unchanged. SimpleSwap documents a partner fee from 0.4 to 5 percent. This client does not clamp the value.

**Fixed or floating?**
Floating follows the market when the deposit confirms. Fixed locks `rateId` until `validUntil`. Pass `fixed` on the estimate, the range, the check, and the create call.

**How do I get the minimum?**
`get_ranges(...).get("min")`, or `get_min(...)`.

**How do I know an exchange finished?**
Poll `get_exchange`, or call `wait_for_exchange`. v3 has no public webhook.

**What if a POST times out?**
The client does not retry it, except for HTTP 429. List exchanges before creating another one.

**Can I point the client at a mock?**
Yes. Set `base_url` to the mock origin. Paths stay `/v3/...`.

---

## Contributing

The library lives in the [api-kit](https://github.com/TysikGG/api-kit) monorepo under `simpleswap/python`.

```bash
uv sync
uv run ruff check .
uv run pytest -m "not live"   # unit tests and line coverage
uv run pytest -m live         # skipped unless SIMPLESWAP_API_KEY is set
```

Unit tests mock HTTP. Live tests only call read-only endpoints (currency list, one currency, one pair list, one range, one estimate). Issues and pull requests go to the monorepo.

---

## License

ISC. See [LICENSE](LICENSE).
