# bitcoinvn

[![PyPI version](https://img.shields.io/pypi/v/bitcoinvn.svg)](https://pypi.org/project/bitcoinvn/)
[![Python versions](https://img.shields.io/pypi/pyversions/bitcoinvn.svg)](https://pypi.org/project/bitcoinvn/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Modern, typed Python client for the [BitcoinVN Exchange API](https://bitcoinvn.io/api/doc.json) — Vietnam's premier cryptocurrency exchange and instant swap platform. Built on [HTTPX](https://www.python-httpx.org).

Official API documentation:
- OpenAPI specification: <https://bitcoinvn.io/api/doc.json>
- Exchange website: <https://bitcoinvn.io>

---

## Features

- 📊 **Public Market Data** — Tickers, real-time exchange rates, pair metadata, and system status (no API key required).
- 🔄 **Instant Swaps & Quotes** — Calculate competitive quotes for crypto-to-crypto and crypto-to-fiat trades.
- 📦 **Order Management** — Create orders with support for crypto wallets, Lightning Network invoices, destination tags, bank wires, and cash pickups.
- 💰 **Balances & History** — Inspect internal wallet balances, transaction ledgers, and attach deposit transaction IDs.
- 📈 **Staking Vaults** — Discover staking opportunities, toggle auto-staking, and adjust notification alerts.
- 🛡️ **Cryptographic Proofs** — Retrieve and verify BitcoinVN cryptographic guarantee letters and public keys.
- ⚡ **Resilient** — Context manager support (`with BitcoinVn(...) as client:`), type annotations, and rate-limit handling (`retry_after` header).

---

## Installation

```bash
pip install bitcoinvn
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check queries the public market ticker for `BTC/USDT`. It does not require an API key and does not place orders or move funds.

```python
import os
from bitcoinvn import BitcoinVn

# Anonymous client for public market queries (or pass api_key)
api_key = os.environ.get("BITCOINVN_API_KEY")

with BitcoinVn(api_key) as client:
    ticker = client.get_ticker("BTC", "USDT")
    print(f"Rate: {ticker['rate']}, 24h Volume: {ticker['volume24h']}")
```

---

## Usage Guide

### 1. Authentication

Public read operations (health, info, pairs, ticker, address validation) work without a key.

For account-specific operations (viewing balances, order history, internal balance orders, staking), pass your API key:

```python
from bitcoinvn import BitcoinVn

with BitcoinVn(api_key="your_api_key_here") as client:
    balances = client.get_balances()
    print(balances)
```

API keys can be generated in your account dashboard on [bitcoinvn.io](https://bitcoinvn.io).

### 2. Market Pairs and Quotes

Inspect supported trading pairs and request live price quotes:

```python
from bitcoinvn import BitcoinVn

with BitcoinVn() as client:
    # Fetch trading pair specifications and limits
    pair = client.get_pair("btc", "usdt")
    print(f"Min: {pair['minDeposit']}, Max: {pair['maxDeposit']}")

    # Request an instant quote
    quote = client.create_quote(
        deposit_method="btc",
        settle_method="usdt",
        deposit_amount=0.05,
    )
    print(f"Expected settle amount: {quote['settleAmount']}")
```

### 3. Creating and Managing Orders

Create an exchange order with specific settlement details:

```python
from bitcoinvn import BitcoinVn

with BitcoinVn(api_key=os.environ.get("BITCOINVN_API_KEY")) as client:
    # Create an order swapping BTC for USDT
    order = client.create_order(
        deposit_method="btc",
        settle_method="usdt",
        settle_amount=1000,
        settle_data={"address": "0xYourUsdtAddressHere..."},
    )
    print(f"Order created: {order['shortId']}")
    print(f"Send BTC deposit to: {order['depositAddress']}")

    # Check order status
    status = client.get_order(order["shortId"])
    print(f"Order status: {status['status']}")
```

### 4. Account Balances and History

Inspect your account's internal wallet balances and ledger transactions:

```python
with BitcoinVn(api_key=os.environ["BITCOINVN_API_KEY"]) as client:
    # List balances
    balances = client.get_balances()
    print(balances)

    # List ledger history
    history = client.list_balance_history(limit=10)
    for entry in history:
        print(f"{entry['createdAt']}: {entry['amount']} {entry['asset']}")
```

---

## Error Handling

When the API returns a `4xx` or `5xx` error, the client raises a `BitcoinVnError` containing HTTP status code, API error message, and rate-limit backoff details:

```python
from bitcoinvn import BitcoinVn, BitcoinVnError

with BitcoinVn() as client:
    try:
        client.get_ticker("INVALID", "PAIR")
    except BitcoinVnError as err:
        print(f"BitcoinVN error [{err.status_code}]: {err.message}")
        if err.status_code == 429 and err.retry_after:
            print(f"Rate limited. Retry after {err.retry_after} seconds.")
```

---

## License

[ISC](LICENSE) © api-kit contributors
