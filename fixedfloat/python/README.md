# fixedfloat-client

Python client library for the [FixedFloat](https://fixedfloat.com/api) cryptocurrency exchange API v2.

## Installation

```bash
pip install fixedfloat-client
```

## Quick Start

```python
from fixedfloat import FixedFloat

client = FixedFloat(
    api_key="your_api_key",
    api_secret="your_api_secret",
)

# Fetch supported cryptocurrencies
currencies = client.get_currencies()
print(f"Available currencies: {len(currencies)}")

# Check rate estimate
price = client.get_price(
    from_ccy="BTC",
    to_ccy="ETH",
    amount=0.1,
    direction="from",
    order_type="float",
)
print(f"Estimated receive amount: {price.to_side.amount} ETH")
```

## Features

- Fully typed with Python dataclasses and type hints
- Automatic HMAC-SHA256 request signing
- Supports all FixedFloat API v2 endpoints:
  - Currencies list (`get_currencies`)
  - Price and rate calculations (`get_price`)
  - Order creation (`create_order`)
  - Order status tracking (`get_order`)
  - Emergency resolutions (`set_emergency`)
  - Email notification updates (`set_email`)
  - QR codes (`get_qr`)

## Documentation

Full API documentation and reference are available in the [FixedFloat Documentation](https://tysikgg.github.io/api-kit/fixedfloat/python/).
Official API documentation: [https://fixedfloat.com/api](https://fixedfloat.com/api).

## License

MIT
