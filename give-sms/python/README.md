# give-sms

[![PyPI version](https://img.shields.io/pypi/v/give-sms.svg)](https://pypi.org/project/give-sms/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/pypi/pyversions/give-sms.svg)](https://pypi.org/project/give-sms/)

Modern, fully typed Python client library for the [Give-SMS](https://give-sms.com/api.html) virtual phone numbers and SMS OTP verification service.

Official API documentation: <https://give-sms.com/api.html>

---

## Features

- 📱 **Dual Protocol Support** — Support for both the native JSON REST API (`/api/v1/`) and the SMS-Activate compatible handler protocol (`/stubs/handler_api.php`).
- 🌍 **Worldwide Numbers** — Rent disposable virtual numbers across multiple countries for Telegram, WhatsApp, Google, and 100+ other services.
- 🐍 **Modern Pythonic Design** — Type annotations, dataclass models, context manager support (`with GiveSms(...) as client:`), and custom exceptions.
- 🔄 **Full Activation Lifecycle** — Order numbers, fetch codes, request repeated SMS, cancel, or report dead numbers.

---

## Installation

```bash
pip install give-sms
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance. It does not order numbers or consume funds.

```python
import os
from give_sms import GiveSms

with GiveSms(api_key=os.environ["GIVE_SMS_KEY"]) as client:
    balance = client.get_balance()
    print(f"Current balance: ${balance:.2f} USD")
```

---

## Usage Guide

### 1. Renting a Number and Receiving an SMS Code (REST API)

Full activation workflow using the `/api/v1/` native JSON API:

```python
import time
from give_sms import GiveSms

with GiveSms(api_key="your_api_key") as client:
    # 1. Order a number for Telegram in USA
    order = client.get_number(service="tg", country=0)
    print(f"Received number: +{order.number} (Order ID: {order.id})")

    # 2. Poll for incoming verification code
    code = None
    for _ in range(30):
        time.sleep(3)
        res = client.get_code(order.id)
        if res.status == "SUCCESS" and res.code:
            code = res.code
            break

    if code:
        print(f"Verification code: {code}")
    else:
        print("Timeout reached. Cancelling number to refund balance...")
        client.cancel_number(order.id)
```

### 2. Querying Available Number Stock & Prices

Check available number counts before placing an order:

```python
counts = client.get_count(service="tg", country=0)
print("Available numbers:", counts)
```

### 3. Using the SMS-Activate Protocol (`handler_api.php`)

If your existing infrastructure is built around `handler_api.php`:

```python
# 1. Check balance
balance = client.handler_get_balance()
print(f"Handler balance: {balance}")

# 2. Order number
activation = client.handler_get_number(service="tg", country=0)
print(f"Order ID: {activation.id}, Phone: {activation.number}")

# 3. Mark ready (status 1)
client.handler_set_status(activation.id, 1)

# 4. Check status
status = client.handler_get_status(activation.id)
print(f"Status: {status.status}, Code: {status.code}")

# 5. Mark finished (status 6) or cancel (status 8)
client.handler_set_status(activation.id, 6)
```

---

## API Reference

### `GiveSms` Class

#### Constructor

```python
GiveSms(
    api_key: str,
    base_url: str = "https://give-sms.com",
    timeout: float = 30.0,
)
```

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `api_key` | `str` | **Required** | Your Give-SMS API key. |
| `base_url` | `str` | `"https://give-sms.com"` | Base URL of Give-SMS API. |
| `timeout` | `float` | `30.0` | Request timeout in seconds. |

#### Native REST API Methods (`/api/v1/`)

- **`get_balance() -> float`** — Returns current account balance.
- **`get_count(service=None, country=None) -> dict`** — Retrieves number stock.
- **`get_number(service, country=None) -> ActivationNumber`** — Orders a phone number.
- **`get_code(order_id: str | int) -> CodeResult`** — Checks for incoming SMS code.
- **`repeat_code(order_id: str | int) -> bool`** — Requests an additional SMS on the same number.
- **`cancel_number(order_id: str | int) -> bool`** — Cancels activation and refunds balance.
- **`ban_number(order_id: str | int) -> bool`** — Reports number as dead / blocked.
- **`reactivate(order_id: str | int) -> Any`** — Reactivates a previously used number.

#### Handler API Methods (`/stubs/handler_api.php`)

- **`handler_get_balance() -> float`** — Returns balance via handler API.
- **`handler_get_number(service, country=None) -> HandlerNumberResult`** — Orders number (`ACCESS_NUMBER`).
- **`handler_get_status(order_id: str | int) -> HandlerStatusResult`** — Retrieves status and code.
- **`handler_set_status(order_id: str | int, status: int) -> str`** — Updates activation status (1 = ready, 6 = complete, 8 = cancel).
- **`handler_get_prices(service=None, country=None) -> dict`** — Retrieves pricing catalog.

---

## Error Handling

When an API request fails, `GiveSmsError` is raised:

```python
from give_sms import GiveSms, GiveSmsError

try:
    with GiveSms(api_key="invalid_key") as client:
        client.get_balance()
except GiveSmsError as exc:
    print(f"Give-SMS Error: {exc.message} (Code: {exc.code})")
```

Common error codes:
- `NO_NUMBERS` — No available phone numbers for selected service/country.
- `NO_BALANCE` — Insufficient funds on account.
- `BAD_KEY` — Invalid API key.
- `BAD_ACTION` — Invalid action parameter.
- `WRONG_ACTIVATION_ID` — Activation ID not found or expired.

---

## License

ISC
