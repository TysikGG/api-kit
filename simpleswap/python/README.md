# simpleswap-client

Python client for the [SimpleSwap](https://simpleswap.io) cryptocurrency exchange API (v3).

API Documentation: [https://simpleswap.io/en/affiliate-program/help-center/article/public-api-guide](https://simpleswap.io/en/affiliate-program/help-center/article/public-api-guide)

## Features

- **Full Typing**: Comprehensive TypedDict annotations for currencies, rates, ranges, and orders.
- **API v3**: Modern endpoints supporting floating/fixed rates, ranges, and custom fee adjustments.
- **Context Manager**: Supports `with SimpleSwap(...) as client:` for automated connection closing.
- **Environment Auto-discovery**: Automatically loads `SIMPLESWAP_API_KEY`.

## Installation

```bash
pip install simpleswap-client
```

## Quick Start

```python
import os
from simpleswap import SimpleSwap

client = SimpleSwap(api_key=os.environ.get("SIMPLESWAP_API_KEY"))

# List supported cryptocurrencies
currencies = client.get_currencies()
print(f"Supported currencies: {len(currencies)}")

# Calculate estimated return
estimate = client.get_estimate(
    ticker_from="btc",
    ticker_to="eth",
    network_from="btc",
    network_to="eth",
    amount="0.1",
)
print(f"Estimated ETH: {estimate['estimatedAmount']}")

# Create an exchange order
order = client.create_exchange(
    ticker_from="btc",
    ticker_to="eth",
    network_from="btc",
    network_to="eth",
    amount="0.1",
    address_to="0xYourEthereumAddress...",
)
print(f"Send BTC deposit to: {order['addressFrom']}")
```

## API Overview

### Market & Currencies

- `client.get_currencies()`: List all supported currencies and networks.
- `client.get_currency(ticker, network)`: Get details for a specific currency and network.
- `client.get_estimate(ticker_from, ticker_to, amount, ...)`: Calculate expected return (supports `custom_fee`).
- `client.get_ranges(ticker_from, ticker_to, ...)`: Query minimum and maximum deposit limits.
- `client.check_exchange(...)`: Verify whether an exchange order can be created.

### Orders

- `client.create_exchange(...)`: Create a new exchange order.
- `client.get_exchange(exchange_id)`: Query status and transaction hashes of an exchange order.
- `client.get_exchanges(...)`: List previous exchange orders created by the account.

## License

ISC
