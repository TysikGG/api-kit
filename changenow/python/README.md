# changenow-client

[![PyPI version](https://img.shields.io/pypi/v/changenow-client.svg)](https://pypi.org/project/changenow-client/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/pypi/pyversions/changenow-client.svg)](https://pypi.org/project/changenow-client/)

Modern, fully typed Python client library for the [ChangeNOW](https://changenow.io) cryptocurrency exchange API (v2).

Official API documentation: <https://documenter.getpostman.com/view/8180765/SVfTPnM8>

The PyPI package is `changenow-client`. Import it as `changenow`.

---

## Features

- ⚡ **Standard & Fixed-Rate Swaps** — Floating estimates and fixed-rate locks via `rateId`.
- 🪙 **Multi-Network Assets** — Currencies, pairs, limits, and fees include the network (BTC, ERC-20, TRC-20, and the rest of the v2 catalog).
- 🐍 **Modern Pythonic Design** — Type annotations, context manager support (`with ChangeNow(...) as client:`), and a dedicated `ChangeNowError`.
- 🔒 **Non-Custodial** — Create an exchange, then poll status until ChangeNOW pays the payout address.

---

## Installation

```bash
pip install changenow-client
```

Requires Python 3.10 or higher.

---

## Authentication

Partner attribution is the partner API key. The client sends it in one header:

```python
from changenow import CHANGENOW_API_KEY_HEADER

print(CHANGENOW_API_KEY_HEADER)  # "x-changenow-api-key"
```

TODO: the partner header name is pending confirmation from ChangeNOW. The published v2 docs and 401 text use `x-changenow-api-key`. The available-pairs sample uses `x-api-key`. Change `CHANGENOW_API_KEY_HEADER` in `src/changenow/client.py` if ChangeNOW confirms a different name. Do not add a second partner header until they confirm one.

`user_id` and `payload` on create are optional and stay disabled until ChangeNOW enables "Special partner fields". `contact_email` and `source` are optional create fields from the public examples. Pass the end-user IP as `user_ip` to send the documented `x-forwarded-for` header.

---

## Quick Start (Safe Check)

The quick check only reads currencies, the minimum, an estimate, and an address check. It does not create an exchange:

```python
import os
from changenow import ChangeNow

with ChangeNow(api_key=os.environ["CHANGENOW_API_KEY"]) as client:
    currencies = client.get_currencies(active=True, flow="standard")
    print(f"Available currencies: {len(currencies)}")

    minimum = client.get_min_amount("btc", "eth", "btc", "eth", flow="standard")
    print(f"Minimum: {minimum['minAmount']} BTC")

    estimate = client.get_estimated_amount(
        "btc",
        "eth",
        from_amount="0.1",
        from_network="btc",
        to_network="eth",
        flow="standard",
    )
    print(f"Estimated receive amount: {estimate['toAmount']} ETH")
```

---

## Usage Guide

### 1. Creating a Standard (Floating) Exchange

```python
from changenow import ChangeNow, ChangeNowError

with ChangeNow(api_key="your_api_key") as client:
    order = client.create_exchange(
        "btc",
        "eth",
        "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        from_network="btc",
        to_network="eth",
        from_amount="0.1",
        refund_address="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        flow="standard",
        user_id="user-42",  # optional, requires Special partner fields
        contact_email="trader@example.com",
        source="wallet",
    )
    print(f"Send BTC to: {order['payinAddress']}")
    print(f"Exchange id: {order['id']}")
```

### 2. Creating a Fixed-Rate Exchange

```python
quote = client.get_estimated_amount(
    "btc",
    "eth",
    from_amount="0.1",
    from_network="btc",
    to_network="eth",
    flow="fixed-rate",
    use_rate_id=True,
)
fixed_order = client.create_exchange(
    "btc",
    "eth",
    "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    from_network="btc",
    to_network="eth",
    from_amount="0.1",
    flow="fixed-rate",
    rate_id=quote["rateId"],
)
print(f"Locked until {quote['validUntil']}")
print(f"Payout: {fixed_order['toAmount']} ETH")
```

### 3. Tracking Status

```python
status = client.get_exchange(order["id"])
print(status["status"])  # waiting, confirming, exchanging, sending, finished, ...

if status["status"] == "finished":
    print(f"Payout hash: {status.get('payoutHash')}")
```

---

## API Reference

### `ChangeNow` Class

#### Constructor

```python
ChangeNow(
    api_key: str | None = None,
    base_url: str | None = None,
    timeout: float = 30.0,
    user_agent: str | None = None,
    user_ip: str | None = None,
)
```

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `api_key` | `str` | `CHANGENOW_API_KEY` | Partner API key. |
| `base_url` | `str` | `"https://api.changenow.io/v2"` | API base URL. |
| `timeout` | `float` | `30.0` | Request timeout in seconds. |
| `user_agent` | `str` | `"changenow-client/0.1.0"` | User-Agent header. |
| `user_ip` | `str` | unset | Sent as `x-forwarded-for`. |

#### Methods

- **`get_currencies(...)`** — `GET /exchange/currencies`
- **`get_available_pairs(...)`** — `GET /exchange/available-pairs`
- **`get_min_amount(...)`** — `GET /exchange/min-amount`
- **`get_range(...)`** — `GET /exchange/range`
- **`get_estimated_amount(...)`** — `GET /exchange/estimated-amount` (standard and fixed-rate)
- **`create_exchange(...)`** — `POST /exchange`
- **`get_exchange(exchange_id)`** — `GET /exchange/by-id`
- **`validate_address(currency, address)`** — `GET /validate/address`
- **`get_user_addresses(name)`** — `GET /addresses-by-name`
- **`get_network_fee(...)`** — `GET /exchange/network-fee`
- **`get_market_estimate(...)`** — `GET /markets/estimate` (crypto and fiat, informational, fees excluded)
- **`get_exchanges(...)`** — `GET /exchanges` (private API key)
- **`get_exchange_actions(exchange_id)`** — `GET /exchange/actions`
- **`continue_exchange(exchange_id)`** — `POST /exchange/continue`
- **`refund_exchange(...)`** — `POST /exchange/refund`
- **`get_private_transfer_estimate(...)`** — `GET /private-transfer/estimated-amount`
- **`create_private_transfer(...)`** — `POST /private-transfer`

Several of these routes are enabled per partner key. A `403` means the endpoint is not activated for that key.

---

## Error Handling

```python
from changenow import ChangeNow, ChangeNowError

try:
    with ChangeNow(api_key="invalid_key") as client:
        client.get_currencies()
except ChangeNowError as exc:
    print(f"{exc.code}: {exc.message} (HTTP {exc.status_code})")
```

Address validation does not raise for a bad address. The response is HTTP 200 with `result: false`.

---

## Live Tests

Unit tests mock HTTP and always run. The live suite calls the real API and runs only when `CHANGENOW_API_KEY` is set. It is read-only: currencies, minimum amount, a standard-flow estimate, and address validation. It never creates an exchange.

```bash
uv run pytest -m "not live"
CHANGENOW_API_KEY=your_key uv run pytest -m live
```

---

## License

ISC
