# exolix-client

[![PyPI version](https://img.shields.io/pypi/v/exolix-client.svg)](https://pypi.org/project/exolix-client/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/pypi/pyversions/exolix-client.svg)](https://pypi.org/project/exolix-client/)

Modern, fully typed Python client library for the [Exolix](https://exolix.com) instant cryptocurrency exchange API (v2).

Official API documentation: <https://exolix.com/developers>

The PyPI package is `exolix-client`. Import it as `exolix`.

---

## Features

- ⚡ **Fixed & Floating Rates** — Quote a swap by deposit `amount` or by desired `withdrawal_amount`, at a floating or fixed rate.
- 🪙 **Currencies & Networks** — List coins, networks for one coin, and the full network catalog.
- 🐍 **Modern Pythonic Design** — Type annotations, context manager support (`with Exolix(...) as client:`), and a custom exception.
- 🔄 **Transactions** — Create a swap, fetch it by id, and list affiliate transaction history.

---

## Installation

```bash
pip install exolix-client
```

Requires Python 3.10 or higher.

---

## Authentication

Partner attribution is the affiliate API key. The default affiliate share is 0.3%. The client sends the key in one header and does not add a referral parameter:

```python
from exolix import EXOLIX_API_KEY_HEADER

print(EXOLIX_API_KEY_HEADER)  # "Authorization"
```

Pass the key to the constructor. The client does not read `EXOLIX_API_KEY` from the environment. Public reads work without a key. Transaction history requires a key that Exolix has enabled for that route.

---

## Quick Start (Safe Check)

The quick check only queries currencies and a rate. It does not create a transaction:

```python
import os
from exolix import Exolix

with Exolix(api_key=os.environ["EXOLIX_API_KEY"]) as client:
    currencies = client.get_currencies(page=1, size=5, with_networks=True)
    print(f"Available currencies: {currencies['count']}")

    quote = client.get_rate(
        "BTC",
        "ETH",
        "float",
        network_from="BTC",
        network_to="ETH",
        amount="0.1",
    )
    print(f"0.1 BTC -> {quote['toAmount']} ETH (rate {quote['rate']})")
```

---

## Usage Guide

### 1. Creating a Floating Rate Swap

```python
from exolix import Exolix, ExolixError

with Exolix(api_key="your_api_key") as client:
    quote = client.get_rate(
        "ETH",
        "USDT",
        "float",
        network_from="ETH",
        network_to="ETH",
        amount="0.5",
    )
    print(f"Min {quote['minAmount']}, you receive {quote['toAmount']} USDT")

    tx = client.create_transaction(
        "ETH",
        "USDT",
        "ETH",
        "ETH",
        "0x0E29D1E501f90649Ad5982E900c455006e4522FC",
        amount=0.5,
        rate_type="float",
    )
    print(f"Send ETH to {tx['depositAddress']} ({tx['id']})")
```

`create_transaction` opens a real swap. Quote with `get_rate` first.

### 2. Fixed Rate by Withdrawal Amount

```python
quote = client.get_rate(
    "ETH",
    "USDT",
    "fixed",
    network_from="ETH",
    network_to="ETH",
    withdrawal_amount="50",
)
print(f"Send {quote['fromAmount']} ETH to receive {quote['toAmount']} USDT")
```

### 3. Tracking Status and History

```python
tx = client.get_transaction("ab93061434dd0s")
print(tx["status"])  # wait, confirmation, confirmed, exchanging, sending, success, ...

history = client.get_transactions(page=1, size=25, order="desc")
print(history["count"])
```

History is authenticated. Exolix enables it per API key.

---

## API Reference

### `Exolix` Class

#### Constructor

```python
Exolix(
    api_key: str | None = None,
    base_url: str | None = None,
    timeout: float = 30.0,
    user_agent: str | None = None,
)
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `api_key` | `str` | unset | Affiliate API key. Sent as `Authorization`. |
| `base_url` | `str` | `"https://exolix.com/api/v2"` | API base URL. |
| `timeout` | `float` | `30.0` | Request timeout in seconds. |
| `user_agent` | `str` | `"exolix-client/0.1.0"` | User-Agent header. |

#### Methods

- **`get_currencies(...)`** — `GET /currencies`
- **`get_currency_networks(code)`** — `GET /currencies/{code}/networks`
- **`get_networks(...)`** — `GET /currencies/networks`
- **`get_rate(...)`** — `GET /rate` (`rate_type` `float` or `fixed`, `amount` or `withdrawal_amount`)
- **`create_transaction(...)`** — `POST /transactions`
- **`get_transaction(transaction_id)`** — `GET /transactions/{id}`
- **`get_transactions(...)`** — `GET /transactions` (authenticated history)

---

## Error Handling

```python
from exolix import Exolix, ExolixError

try:
    with Exolix(api_key="invalid_key") as client:
        client.get_transactions()
except ExolixError as error:
    print(f"{error.code}: {error.message} (HTTP {error.status_code})")
```

---

## Live Tests

Unit tests mock HTTP and always run. The live suite calls the real API and runs only when `EXOLIX_API_KEY` is set. It is read-only: currencies, networks, a floating rate, a fixed rate, and transaction history. It never creates a transaction.

```bash
uv run pytest -m "not live"
EXOLIX_API_KEY=your_key uv run pytest -m live
```

---

## License

ISC
