# stealthex

[![PyPI version](https://img.shields.io/pypi/v/stealthex.svg)](https://pypi.org/project/stealthex/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/pypi/pyversions/stealthex.svg)](https://pypi.org/project/stealthex/)

Modern, fully typed Python client library for the [StealthEX](https://stealthex.io) instant non-custodial cryptocurrency exchange API.

Official API documentation: <https://documenter.getpostman.com/view/24333719/2s9YJZ54yN>

---

## Features

- ⚡ **Fixed & Floating Swaps** — Exchange at real-time floating market rates or lock in a fixed rate for 20 minutes.
- 🪙 **1400+ Coins & Tokens** — Wide asset selection across Bitcoin, Ethereum, Monero, Ripple, Solana, and more.
- 🐍 **Modern Pythonic Design** — Type annotations, dataclass models (`ExchangeDetails`, `StealthEXCurrency`, `RangeResult`), context manager support (`with StealthEX(...) as client:`), and custom exceptions.
- 🔒 **Non-Custodial & Private** — Direct wallet-to-wallet transactions with no mandatory account registration.

---

## Installation

```bash
pip install stealthex
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects supported currencies and price estimates. It does not create orders:

```python
import os
from stealthex import StealthEX

with StealthEX(api_key=os.environ["STEALTHEX_API_KEY"]) as client:
    # 1. Fetch available currencies
    currencies = client.get_currencies()
    print(f"Available currencies: {len(currencies)}")

    # 2. Query floating rate estimate for 0.1 BTC to ETH
    estimate = client.get_estimate(symbol_from="btc", symbol_to="eth", amount=0.1, fixed=False)
    print(f"Estimated receive amount: {estimate.estimated_amount} ETH")
```

---

## Usage Guide

### 1. Creating a Floating Rate Swap

Check exchange limits, get estimate, create swap order, and monitor progress:

```python
from stealthex import StealthEX, StealthEXError

with StealthEX(api_key="your_api_key") as client:
    # 1. Check deposit range (min and max limits)
    range_info = client.get_range(symbol_from="btc", symbol_to="eth", fixed=False)
    print(f"Min: {range_info.min_amount} BTC, Max: {range_info.max_amount or 'No limit'}")

    # 2. Create the exchange order
    order = client.create_exchange(
        currency_from="btc",
        currency_to="eth",
        amount=0.1,
        address_to="0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        refund_address="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",  # optional
        fixed=False,
    )

    print(f"Exchange Created! ID: {order.id}")
    print(f"Send 0.1 BTC to: {order.address_from}")
    print(f"Current Status: {order.status}")
```

### 2. Creating a Fixed Rate Swap

Lock in an exact payout amount for 20 minutes:

```python
fixed_order = client.create_exchange(
    currency_from="eth",
    currency_to="btc",
    amount=2.0,
    address_to="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    fixed=True,
)

print(f"Fixed Exchange ID: {fixed_order.id}")
print(f"Guaranteed Payout: {fixed_order.amount_to} BTC")
print(f"Deposit Address: {fixed_order.address_from}")
```

### 3. Tracking Exchange Status

Check deposit confirmations and outbound transaction hashes:

```python
status = client.get_exchange(order.id)
print(f"Status: {status.status}")

if status.status == "finished":
    print(f"Payout Tx Hash: {status.tx_to}")
```

---

## API Reference

### `StealthEX` Class

#### Constructor

```python
StealthEX(
    api_key: str,
    base_url: str = "https://api.stealthex.io/v2",
    timeout: float = 30.0,
)
```

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `api_key` | `str` | **Required** | Your StealthEX API key. |
| `base_url` | `str` | `"https://api.stealthex.io/v2"` | StealthEX API base URL. |
| `timeout` | `float` | `30.0` | HTTP request timeout in seconds. |

#### Methods

- **`get_currencies(fixed=None) -> list[StealthEXCurrency]`** — Retrieves all supported coins.
- **`get_currency(symbol: str) -> StealthEXCurrency`** — Gets metadata for a specific coin.
- **`get_pairs(symbol=None) -> list[str]`** — Returns available trading pairs for an asset.
- **`get_range(symbol_from, symbol_to, fixed=False) -> RangeResult`** — Retrieves min/max limits.
- **`get_min_amount(symbol_from, symbol_to, fixed=False) -> float`** — Minimum deposit limit.
- **`get_estimate(symbol_from, symbol_to, amount, fixed=False) -> EstimateResult`** — Returns estimated receive amount.
- **`create_exchange(currency_from, currency_to, amount, address_to, fixed=False, ...) -> ExchangeDetails`** — Creates order.
- **`get_exchange(exchange_id: str) -> ExchangeDetails`** — Retrieves status of an exchange.
- **`get_exchanges(limit=None) -> list[ExchangeDetails]`** — Lists past exchanges.

---

## Error Handling

When the API returns an error, `StealthEXError` is raised:

```python
from stealthex import StealthEX, StealthEXError

try:
    with StealthEX(api_key="invalid_key") as client:
        client.get_currencies()
except StealthEXError as exc:
    print(f"StealthEX Error: {exc.message} (Status: {exc.status})")
```

Common HTTP status codes:
- `400 Bad Request` — Amount outside limits or invalid address.
- `401 Unauthorized` — Invalid API key.
- `404 Not Found` — Exchange ID not found.

---

## License

ISC
