# smsbower

[![PyPI version](https://img.shields.io/pypi/v/smsbower.svg)](https://pypi.org/project/smsbower/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/pypi/pyversions/smsbower.svg)](https://pypi.org/project/smsbower/)

Modern, fully typed Python client library for the [SMSBower](https://smsbower.com) virtual phone numbers and SMS OTP receiving API.

Official API documentation: <https://smsbower.com/api.html>

---

## Features

- 📱 **Virtual Phone Numbers** — Disposable phone numbers across 200+ countries for Telegram, WhatsApp, Discord, Google, and more.
- 🔄 **Full Activation Lifecycle** — Reserve numbers, mark ready, poll for incoming SMS OTP codes, complete, or cancel.
- 🐍 **Modern Pythonic Design** — Type annotations, dataclass models (`ActivationNumber`, `ActivationStatus`), context manager support (`with SmsBowerClient(...) as client:`), and custom exceptions.
- 🏷️ **Comprehensive Pricing** — V1, V2, and V3 pricing queries, service catalogs, top country recommendations, and availability stats.

---

## Installation

```bash
pip install smsbower
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance and supported countries. It does not order numbers or consume funds:

```python
import os
from smsbower import SmsBowerClient

with SmsBowerClient(api_key=os.environ["SMSBOWER_API_KEY"]) as client:
    balance = client.get_balance()
    print(f"Current SMSBower balance: {balance:.2f} RUB")

    countries = client.get_countries()
    print(f"Supported countries count: {len(countries)}")
```

---

## Usage Guide

### 1. Renting a Number and Receiving an SMS Code

Full activation lifecycle: order a number, notify readiness, poll for the incoming verification code, and complete the order:

```python
import time
from smsbower import SmsBowerClient

with SmsBowerClient(api_key="your_api_key") as client:
    # 1. Order a number for Telegram in USA (country '187')
    order = client.get_number(service="tg", country="187")
    print(f"Rented Number: +{order.number} (Activation ID: {order.activation_id})")

    # 2. Notify provider that you are ready to receive the SMS (status 1)
    client.set_status(order.activation_id, 1)

    # 3. Poll for the incoming verification code
    code = None
    for _ in range(30):
        time.sleep(3)
        res = client.get_status(order.activation_id)
        if res.status == "STATUS_OK" and res.code:
            code = res.code
            break

    if code:
        print(f"Received verification code: {code}")
        # 4. Mark activation completed (status 6)
        client.set_status(order.activation_id, 6)
    else:
        print("SMS did not arrive. Cancelling activation to refund balance (status 8)...")
        client.set_status(order.activation_id, 8)
```

### 2. Searching Prices and Stock Availability

Query real-time prices and availability across services and countries:

```python
# Query prices across countries for Telegram
prices = client.get_prices("tg")
print("Prices for Telegram:", prices)

# Inspect top recommended countries for Telegram
top = client.get_top_countries_by_service("tg")
print("Top countries:", top)
```

---

## API Reference

### `SmsBowerClient` Class

#### Constructor

```python
SmsBowerClient(
    api_key: str,
    base_url: str = "https://smsbower.com",
    timeout: float = 30.0,
)
```

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `api_key` | `str` | **Required** | Your SMSBower API key. |
| `base_url` | `str` | `"https://smsbower.com"` | Base URL of SMSBower API. |
| `timeout` | `float` | `30.0` | Request timeout in seconds. |

#### Methods

- **`get_balance() -> float`** — Retrieves account balance in RUB.
- **`get_number(service, country=None, ...) -> ActivationNumber`** — Orders a number (`activation_id`, `number`).
- **`get_number_v2(service, country=None, ...) -> ActivationNumberV2`** — Orders number using extended V2 format.
- **`get_status(activation_id: str | int) -> ActivationStatus`** — Checks activation state and code (`STATUS_WAIT_CODE`, `STATUS_OK`).
- **`set_status(activation_id: str | int, status: int) -> str`** — Sets activation state (1 = ready, 6 = complete, 8 = cancel).
- **`get_prices(service=None, country=None) -> Any`** — Returns V1 prices and availability.
- **`get_prices_v2(service=None, country=None) -> Any`** — Returns V2 prices.
- **`get_prices_v3(service=None, country=None) -> Any`** — Returns V3 prices.
- **`get_services_list() -> list[ServiceItem]`** — Lists all supported services.
- **`get_countries() -> dict[str, CountryItem]`** — Lists all supported countries.
- **`get_top_countries_by_service(service: str) -> dict[str, Any]`** — Recommended countries for service.
- **`get_actual_wallet_address(coin: str, network: str) -> str`** — Returns deposit wallet address for top-up.

---

## Error Handling

When the API returns an error status code, `SmsBowerError` is raised:

```python
from smsbower import SmsBowerClient, SmsBowerError

try:
    with SmsBowerClient(api_key="invalid_key") as client:
        client.get_balance()
except SmsBowerError as exc:
    print(f"SMSBower Error: {exc.message} (Code: {exc.code})")
```

Common error codes:
- `NO_NUMBERS` — No available numbers for selected service/country.
- `NO_BALANCE` — Insufficient funds on account.
- `BAD_KEY` — Invalid API key.
- `BAD_ACTION` — Invalid action requested.
- `WRONG_ACTIVATION_ID` — Activation ID does not exist or expired.

---

## License

ISC
