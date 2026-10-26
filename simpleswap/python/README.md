# simpleswap-client

[![PyPI version](https://img.shields.io/pypi/v/simpleswap-client.svg)](https://pypi.org/project/simpleswap-client/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/pypi/pyversions/simpleswap-client.svg)](https://pypi.org/project/simpleswap-client/)

Modern, fully typed Python client library for the [SimpleSwap](https://simpleswap.io) instant cryptocurrency exchange REST API (v3).

Official API documentation: <https://api.simpleswap.io>

---

## Features

- ⚡ **Fixed & Floating Exchange Rates** — Execute exchanges at floating market rates or lock in a guaranteed fixed rate.
- 🪙 **1000+ Cryptocurrencies** — Trade Bitcoin, Ethereum, Solana, Monero, and hundreds of tokens across various blockchains.
- 🐍 **Modern Pythonic Design** — Type annotations, dataclass models (`ExchangeOrder`, `EstimateResult`, `SimpleSwapCurrency`, `RangesResult`), context manager support (`with SimpleSwap(...) as client:`), and custom exceptions.
- 🔄 **Full Swap Lifecycle** — Calculate rate estimates, verify limits with `get_ranges()`, validate addresses with `check_exchange()`, create swaps, and track transactions.

---

## Installation

```bash
pip install simpleswap-client
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only queries supported currencies and exchange estimates. It does not create orders:

```python
import os
from simpleswap import SimpleSwap

with SimpleSwap(api_key=os.environ["SIMPLESWAP_API_KEY"]) as client:
    # 1. Fetch available currencies
    currencies = client.get_currencies()
    print(f"Available currencies: {len(currencies)}")

    # 2. Get floating rate estimate for 0.1 BTC to ETH
    estimate = client.get_estimate(
        ticker_from="btc",
        network_from="btc",
        ticker_to="eth",
        network_to="eth",
        amount=0.1,
        fixed=False,
    )
    print(f"0.1 BTC -> {estimate.amount_to} ETH (Rate: {estimate.rate})")
```

---

## Usage Guide

### 1. Creating a Floating Rate Swap

Full lifecycle: check minimum/maximum limits, validate address, create order, and track status:

```python
from simpleswap import SimpleSwap, SimpleSwapError

with SimpleSwap(api_key="your_api_key") as client:
    # 1. Check minimum and maximum deposit limits
    ranges = client.get_ranges(
        ticker_from="btc",
        network_from="btc",
        ticker_to="eth",
        network_to="eth",
        fixed=False,
    )
    print(f"Min: {ranges.min} BTC, Max: {ranges.max or 'No limit'} BTC")

    # 2. Validate destination address
    check = client.check_exchange(
        address_receive="0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        ticker="eth",
        network="eth",
    )
    if not check.valid:
        raise ValueError("Invalid destination address!")

    # 3. Create exchange order
    order = client.create_exchange(
        ticker_from="btc",
        network_from="btc",
        ticker_to="eth",
        network_to="eth",
        amount=0.1,
        address_receive="0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        user_refund_address="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",  # optional
        fixed=False,
    )

    print(f"Exchange created! ID: {order.id}")
    print(f"Send 0.1 BTC to: {order.address_deposit}")
    print(f"Status: {order.status}")
```

### 2. Creating a Fixed Rate Swap

Lock in a guaranteed exchange amount:

```python
fixed_order = client.create_exchange(
    ticker_from="eth",
    network_from="eth",
    ticker_to="btc",
    network_to="btc",
    amount=2.0,
    address_receive="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    fixed=True,
)

print(f"Fixed Order ID: {fixed_order.id}")
print(f"Guaranteed Receive Amount: {fixed_order.amount_to} BTC")
print(f"Send ETH to: {fixed_order.address_deposit}")
```

### 3. Tracking Exchange Status

Monitor exchange progress until funds are delivered:

```python
current = client.get_exchange(order.id)
print(f"Current Status: {current.status}")

if current.status == "finished":
    print(f"Payout Tx Hash: {current.tx_to}")
```

---

## API Reference

### `SimpleSwap` Class

#### Constructor

```python
SimpleSwap(
    api_key: str,
    base_url: str = "https://api.simpleswap.io/v3",
    timeout: float = 30.0,
)
```

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `api_key` | `str` | **Required** | Your SimpleSwap API key. |
| `base_url` | `str` | `"https://api.simpleswap.io/v3"` | SimpleSwap API base URL. |
| `timeout` | `float` | `30.0` | HTTP request timeout in seconds. |

#### Methods

- **`get_currencies() -> list[SimpleSwapCurrency]`** — Retrieves all supported currencies and networks.
- **`get_currency(ticker: str, network: str) -> SimpleSwapCurrency`** — Gets metadata for a single currency.
- **`get_estimate(ticker_from, network_from, ticker_to, network_to, amount, fixed=False) -> EstimateResult`** — Calculates exchange amount estimate.
- **`get_ranges(ticker_from, network_from, ticker_to, network_to, fixed=False) -> RangesResult`** — Retrieves min/max deposit limits.
- **`check_exchange(address_receive, ticker, network) -> CheckExchangeResult`** — Validates destination wallet address.
- **`create_exchange(ticker_from, network_from, ticker_to, network_to, amount, address_receive, ...) -> ExchangeOrder`** — Creates a new swap order.
- **`get_exchange(exchange_id: str) -> ExchangeOrder`** — Retrieves status and transactions of an exchange.
- **`get_exchanges(status=None, page=None, limit=None) -> list[ExchangeOrder]`** — Lists past exchanges.

---

## Error Handling

When the API returns an error, `SimpleSwapError` is raised:

```python
from simpleswap import SimpleSwap, SimpleSwapError

try:
    with SimpleSwap(api_key="invalid_key") as client:
        client.get_currencies()
except SimpleSwapError as exc:
    print(f"SimpleSwap Error: {exc.message} (Status: {exc.status})")
```

Common HTTP status codes:
- `400 Bad Request` — Amount outside limits or invalid address.
- `401 Unauthorized` — Invalid or missing API key.
- `404 Not Found` — Exchange ID not found.

---

## License

ISC
