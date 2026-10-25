# swapzone-client

Python client for the [Swapzone](https://swapzone.io) cryptocurrency exchange and DEX aggregator API.

API Documentation: [https://documenter.getpostman.com/view/16362858/UVXokDS6](https://documenter.getpostman.com/view/16362858/UVXokDS6)

## Features

- **Full Typing**: Comprehensive TypedDict annotations for exchange rates, orders, and statuses.
- **Instant Exchanges**: Compare rates across 15+ instant exchange partners, fetch quotes, create orders, and track transactions.
- **DEX & Cross-chain**: Access decentralized swaps, liquidity quotes, and supported blockchain networks.
- **Context Manager**: Supports `with Swapzone(...) as client:` for automated session management.
- **Address Validation**: Check address validity across supported blockchains and asset networks.
- **Environment Auto-discovery**: Automatically picks up `SWAPZONE_API_KEY`.

## Installation

```bash
pip install swapzone-client
```

## Quick Start

```python
import os
from swapzone import Swapzone

client = Swapzone(api_key=os.environ.get("SWAPZONE_API_KEY"))

# List supported cryptocurrencies
currencies = client.get_currencies()
print(f"Supported currencies: {len(currencies)}")

# Get best exchange rate for 0.1 BTC to ETH
rate = client.get_rate(
    from_currency="btc",
    to_currency="eth",
    amount="0.1",
)
print(f"Estimated ETH: {rate['amountTo']} (via {rate['adapter']})")

# Create an exchange transaction
order = client.create_transaction(
    from_currency="btc",
    to_currency="eth",
    amount_deposit="0.1",
    address_receive="0xYourEthereumAddress...",
    quota_id=rate["quotaId"],
)
print(f"Send BTC deposit to: {order['addressDeposit']}")
```

## API Overview

### Instant Exchange

- `client.get_currencies()`: List all supported currencies and networks.
- `client.get_rate(from_currency, to_currency, amount, ...)`: Fetch rate estimates from exchange partners.
- `client.create_transaction(...)`: Create an exchange order and obtain a deposit address.
- `client.get_transaction(transaction_id)`: Check status and blockchain hashes for an exchange transaction.
- `client.validate_address(currency, address, network=None)`: Verify recipient address format.
- `client.get_markets(rate_type=None)`: Retrieve bulk market rates.

### Decentralized Exchange (DEX)

- `client.get_dex_blockchains()`: List supported blockchain networks for on-chain/cross-chain swaps.
- `client.get_dex_tokens()`: List supported tokens for DEX routes.

## License

ISC
