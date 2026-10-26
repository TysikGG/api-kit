# stealthex-client

Python client for the [StealthEX](https://stealthex.io) cryptocurrency exchange API.

API Documentation: [https://documenter.getpostman.com/view/24333719/2s9YJZ54yN](https://documenter.getpostman.com/view/24333719/2s9YJZ54yN)

## Features

- **Full Typing**: Comprehensive TypedDict annotations for currencies, rates, ranges, and orders.
- **Limitless Swaps**: Instant exchange across 1,000+ crypto assets without custodial accounts.
- **Context Manager**: Supports `with StealthEX(...) as client:` for clean resource management.
- **Environment Auto-discovery**: Automatically reads `STEALTHEX_API_KEY`.

## Installation

```bash
pip install stealthex-client
```

## Quick Start

```python
import os
from stealthex import StealthEX

client = StealthEX(api_key=os.environ.get("STEALTHEX_API_KEY"))

# List supported cryptocurrencies
currencies = client.get_currencies()
print(f"Supported currencies: {len(currencies)}")

# Calculate estimated return
estimate = client.get_estimate("btc", "eth", "0.1")
print(f"Estimated ETH: {estimate['estimated_amount']}")

# Create an exchange order
order = client.create_exchange(
    currency_from="btc",
    currency_to="eth",
    amount_from="0.1",
    address_to="0xYourEthereumAddress...",
)
print(f"Send BTC deposit to: {order['address_from']}")
```

## API Overview

### Market & Currencies

- `client.get_currencies(fixed=None)`: List all supported currencies and networks.
- `client.get_currency(symbol)`: Get details for a single asset.
- `client.get_pairs(symbol=None)`: List available exchange pairs.
- `client.get_range(from_currency, to_currency, fixed=None)`: Query minimum and maximum exchange amounts.
- `client.get_min_amount(from_currency, to_currency, fixed=None)`: Get minimal deposit threshold.
- `client.get_estimate(from_currency, to_currency, amount, fixed=None)`: Calculate expected return for a swap.

### Orders

- `client.create_exchange(...)`: Create an exchange order and generate deposit instructions.
- `client.get_exchange(exchange_id)`: Query exchange status and blockchain transaction hashes.
- `client.get_exchanges(limit=None)`: List previous transactions.

## License

ISC
