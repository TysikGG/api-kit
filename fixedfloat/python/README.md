# fixedfloat-client

[![PyPI version](https://img.shields.io/pypi/v/fixedfloat-client.svg)](https://pypi.org/project/fixedfloat-client/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/pypi/pyversions/fixedfloat-client.svg)](https://pypi.org/project/fixedfloat-client/)

Modern, fully typed Python client library for the [FixedFloat](https://fixedfloat.com/api) cryptocurrency exchange REST API v2.

Official API documentation: <https://fixedfloat.com/api>

---

## Features

- ⚡ **Fixed & Float Exchange Rates** — Choose between guaranteed fixed rates (1% fee) and floating market rates (0.5% fee).
- 🔐 **Automatic Request Signing** — Cryptographic HMAC-SHA256 signature generation (`X-API-KEY` & `X-API-SIGN`) built-in.
- 🪙 **Multi-Currency Support** — Trade Bitcoin, Ethereum, USDT, Solana, Monero, and dozens of other coins across multiple blockchains.
- 🐍 **Modern Pythonic Design** — Type annotations, dataclass models (`Order`, `PriceResult`, `Currency`), context manager support (`with FixedFloat(...) as client:`), and custom exceptions.
- 🚨 **Emergency Handling** — Support for emergency resolution actions (`EXCHANGE` or `REFUND`) on interrupted orders.

---

## Installation

```bash
pip install fixedfloat-client
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects supported currencies and price quotes. It does not create orders or spend funds:

```python
import os
from fixedfloat import FixedFloat

with FixedFloat(
    api_key=os.environ.get("FIXEDFLOAT_API_KEY"),
    api_secret=os.environ.get("FIXEDFLOAT_API_SECRET"),
) as client:
    # 1. Fetch available currencies
    currencies = client.get_currencies()
    print(f"Available currencies: {len(currencies)}")

    # 2. Query price calculation for 0.1 BTC to ETH
    price = client.get_price(
        from_ccy="BTC",
        to_ccy="ETH",
        amount=0.1,
        direction="from",
        order_type="float",
    )
    print(f"0.1 BTC -> {price.to_side.amount} ETH (Rate: {price.to_side.rate})")
```

---

## Usage Guide

### 1. Creating a Floating Rate Order

Create an exchange order with a floating rate, deposit instructions, and receive destination address:

```python
from fixedfloat import FixedFloat, FixedFloatError

with FixedFloat(
    api_key="your_api_key",
    api_secret="your_api_secret",
) as client:
    # Create float order
    order = client.create_order(
        from_ccy="BTC",
        to_ccy="ETH",
        amount=0.1,
        direction="from",
        order_type="float",
        to_address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        refund_address="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",  # optional
    )

    print(f"Order Created! ID: {order.id}")
    print(f"Security Token: {order.token}")
    print(f"Send BTC to: {order.from_side.address}")
    print(f"Order Status: {order.status}")
```

### 2. Creating a Fixed Rate Order

Lock in a guaranteed rate for 10 minutes:

```python
fixed_order = client.create_order(
    from_ccy="ETH",
    to_ccy="BTC",
    amount=2.5,
    direction="from",
    order_type="fixed",
    to_address="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
)

print(f"Fixed Order ID: {fixed_order.id}")
print(f"Expected Payout: {fixed_order.to_side.amount} BTC")
print(f"Send ETH to: {fixed_order.from_side.address}")
```

### 3. Tracking Order Status & QR Codes

Check order execution, transaction confirmations, and fetch QR codes:

```python
# Query status using order ID and secret token
current = client.get_order(order.id, order.token)
print(f"Status: {current.status}")

if current.from_side.tx:
    print(f"Deposit confirmations: {current.from_side.tx.confirmations}")

# Fetch QR code for deposit address
qr = client.get_qr(order.id, order.token)
print(f"Deposit QR code: {qr.src}")

# Attach email address for status notifications
client.set_email(order.id, order.token, "user@example.com")
```

### 4. Setting Emergency Action Choice

If an order requires user decision (e.g. rate shifted or deposit was delayed):

```python
# Choose to execute exchange at current market rate or refund
client.set_emergency(
    id=order.id,
    token=order.token,
    choice="REFUND",
    address="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
)
print("Emergency action submitted.")
```

---

## API Reference

### `FixedFloat` Class

#### Constructor

```python
FixedFloat(
    api_key: Optional[str] = None,
    api_secret: Optional[str] = None,
    base_url: str = "https://ff.io/api/v2",
    timeout: float = 15.0,
)
```

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `api_key` | `str` | `None` | Your FixedFloat API key. |
| `api_secret` | `str` | `None` | Your FixedFloat API secret for HMAC signatures. |
| `base_url` | `str` | `"https://ff.io/api/v2"` | FixedFloat API v2 base URL. |
| `timeout` | `float` | `15.0` | HTTP request timeout in seconds. |

#### Methods

- **`get_currencies() -> list[Currency]`** — Retrieves all supported cryptocurrencies and networks.
- **`get_price(from_ccy, to_ccy, amount, direction="from", order_type="float", ...) -> PriceResult`** — Price estimates, rates, limits.
- **`create_order(from_ccy, to_ccy, amount, to_address, direction="from", order_type="float", ...) -> Order`** — Creates a new order.
- **`get_order(id: str, token: str) -> Order`** — Retrieves order status and transaction info.
- **`set_emergency(id, token, choice, address=None, extra_id=None) -> Any`** — Sets emergency choice (`EXCHANGE` or `REFUND`).
- **`set_email(id, token, email) -> Any`** — Sets email address for order notifications.
- **`get_qr(id, token) -> QrResult`** — Retrieves deposit address QR code.

---

## Error Handling

When the FixedFloat API returns an error or non-zero status code, a `FixedFloatError` is raised:

```python
from fixedfloat import FixedFloat, FixedFloatError

try:
    with FixedFloat() as client:
        client.get_order("INVALID_ID", "INVALID_TOKEN")
except FixedFloatError as exc:
    print(f"FixedFloat Error: {exc.message} (Code: {exc.code})")
```

Common error codes:
- `101` — Invalid currency pair or amount out of limits.
- `102` — Missing required parameter.
- `103` — Invalid destination wallet address.
- `401` — Unauthorized: invalid API key or signature.

---

## License

MIT
