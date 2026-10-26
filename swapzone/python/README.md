# swapzone

[![PyPI version](https://img.shields.io/pypi/v/swapzone.svg)](https://pypi.org/project/swapzone/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/pypi/pyversions/swapzone.svg)](https://pypi.org/project/swapzone/)

Modern, fully typed Python client library for the [Swapzone](https://swapzone.io) instant cryptocurrency exchange & DEX cross-chain aggregator REST API.

Official API documentation: <https://documenter.getpostman.com/view/16362858/UVXokDS6>

---

## Features

- 🔄 **15+ Exchange Providers Aggregated** — Compares rates in real time across top instant swap platforms (SimpleSwap, StealthEX, ChangeNOW, Changelly, etc.).
- 🪙 **1000+ Cryptocurrencies** — Full support for fixed and floating cross-chain swaps.
- 🐍 **Modern Pythonic Design** — Type annotations, dataclass models (`RateOffer`, `TransactionResult`, `SupportedCurrency`, `TransactionStatus`), context manager support (`with Swapzone(...) as client:`), and custom exceptions.
- ⚡ **DEX Aggregation** — DEX blockchain routes, token catalogs, and quote comparisons.
- 🛡️ **Address Validation** — Built-in `validate_address()` helper to verify destination wallet addresses.

---

## Installation

```bash
pip install swapzone
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects supported currencies and compares live provider exchange rates. It does not create orders:

```python
import os
from swapzone import Swapzone

with Swapzone(api_key=os.environ["SWAPZONE_API_KEY"]) as client:
    # 1. Fetch supported currencies
    currencies = client.get_currencies()
    print(f"Available currencies: {len(currencies)}")

    # 2. Query best rate offer for 0.1 BTC to ETH
    rate = client.get_rate(
        from_currency="btc",
        to_currency="eth",
        amount=0.1,
        rate_type="all",
    )
    print(f"Best Provider: {rate.best_offer.adapter}")
    print(f"Estimated Receive: {rate.best_offer.amount_to} ETH")
```

---

## Usage Guide

### 1. Finding the Best Rate and Creating a Swap

Full lifecycle: query provider rates, validate destination address, create transaction, and monitor status:

```python
from swapzone import Swapzone, SwapzoneError

with Swapzone(api_key="your_api_key") as client:
    # 1. Get rate offers across all providers
    rate = client.get_rate(
        from_currency="btc",
        to_currency="eth",
        amount=0.1,
        rate_type="all",
    )
    best_offer = rate.best_offer
    print(f"Selected Provider: {best_offer.adapter} (Quota: {best_offer.amount_to} ETH)")

    # 2. Validate destination wallet address
    check = client.validate_address(
        currency="eth",
        address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    )
    if not check.result:
        raise ValueError("Invalid destination wallet address!")

    # 3. Create transaction with the selected provider
    tx = client.create_transaction(
        from_currency="btc",
        to_currency="eth",
        amount_deposit=0.1,
        address_receive="0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        quota_id=best_offer.quota_id,
        refund_address="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",  # optional
    )

    print(f"Transaction Created! ID: {tx.transaction.id}")
    print(f"Send BTC to Deposit Address: {tx.transaction.address_deposit}")
    print(f"Status: {tx.transaction.status}")
```

### 2. Tracking Transaction Progress

Monitor swap progress from deposit to settlement:

```python
current = client.get_transaction(tx.transaction.id)
print(f"Status: {current.status}")

if current.status == "finished":
    print(f"Received: {current.amount_receive} ETH")
```

### 3. Querying DEX Aggregation

Inspect supported DEX blockchains and token pairs:

```python
# List supported DEX blockchains
blockchains = client.get_dex_blockchains()
print("DEX Blockchains:", blockchains)

# Check DEX tokens
dex_tokens = client.get_dex_tokens()
print(f"DEX Tokens count: {len(dex_tokens)}")
```

---

## API Reference

### `Swapzone` Class

#### Constructor

```python
Swapzone(
    api_key: str,
    base_url: str = "https://api.swapzone.io/v1",
    timeout: float = 30.0,
)
```

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `api_key` | `str` | **Required** | Your Swapzone API key. |
| `base_url` | `str` | `"https://api.swapzone.io/v1"` | Swapzone API base URL. |
| `timeout` | `float` | `30.0` | HTTP request timeout in seconds. |

#### Methods

- **`get_currencies() -> list[SupportedCurrency]`** — Returns all supported cryptocurrencies.
- **`get_rate(from_currency, to_currency, amount, rate_type="all") -> RateOffer`** — Returns aggregated quotes.
- **`create_transaction(from_currency, to_currency, amount_deposit, address_receive, quota_id, ...) -> TransactionResult`** — Creates transaction.
- **`get_transaction(transaction_id: str) -> TransactionStatus`** — Checks swap status and execution details.
- **`validate_address(currency, address) -> ValidateAddressResult`** — Validates destination wallet address.
- **`get_markets(rate_type=None) -> list[Any]`** — Retrieves active market pairs.
- **`get_dex_blockchains() -> list[DEXBlockchain]`** — Lists supported DEX blockchains.
- **`get_dex_tokens() -> list[Any]`** — Lists tokens supported on DEX routers.

---

## Error Handling

When the API returns an error, `SwapzoneError` is raised:

```python
from swapzone import Swapzone, SwapzoneError

try:
    with Swapzone(api_key="invalid_key") as client:
        client.get_currencies()
except SwapzoneError as exc:
    print(f"Swapzone Error: {exc.message} (Status: {exc.status})")
```

Common HTTP status codes:
- `400 Bad Request` — Invalid address or amount out of limits.
- `401 Unauthorized` — Invalid API key.
- `404 Not Found` — Transaction ID not found.

---

## License

ISC
