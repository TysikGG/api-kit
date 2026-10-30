# smsman-client

[![PyPI version](https://img.shields.io/pypi/v/smsman-client.svg)](https://pypi.org/project/smsman-client/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/pypi/pyversions/smsman-client.svg)](https://pypi.org/project/smsman-client/)

Modern, fully typed Python client library for the [SMS-MAN](https://sms-man.com/site/api) virtual phone numbers and SMS verification API.

Official API documentation: <https://sms-man.com/site/api>

---

## Features

- 📱 **Dual Protocol Support** — Support for both the native SMS-MAN Control API (`/control/`) and the SMS-Activate compatible handler protocol (`/stubs/handler_api.php`).
- 🌍 **Global Coverage** — Rent disposable virtual phone numbers across 300+ countries and hundreds of applications.
- 🐍 **Modern Pythonic Design** — Type annotations, dataclass models (`PhoneNumberOrder`, `SmsCodeResult`), context manager support (`with SmsMan(...) as client:`), and custom exceptions.
- 🔄 **Full Activation Lifecycle** — Rent numbers, check status, fetch SMS codes, or reject/cancel.

---

## Installation

```bash
pip install smsman-client
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance. It does not order numbers or consume funds:

```python
import os
from sms_man import SmsMan

with SmsMan(api_key=os.environ["SMSMAN_API_KEY"]) as client:
    balance = client.get_balance()
    print(f"Current SMS-MAN balance: ${balance:.2f} USD")
```

---

## Usage Guide

### 1. Renting a Number and Receiving an SMS Code (Control API)

Full activation lifecycle using the native Control API:

```python
import time
from sms_man import SmsMan, SmsManError

with SmsMan(api_key="your_api_key") as client:
    # 1. Order a number for Telegram (app 1) in USA (country 1)
    order = client.get_number(country_id=1, application_id=1)
    print(f"Received number: +{order.number} (Request ID: {order.request_id})")

    # 2. Poll for the incoming SMS verification code
    code = None
    for _ in range(30):
        time.sleep(3)
        try:
            res = client.get_sms(order.request_id)
            if res.sms_code:
                code = res.sms_code
                break
        except SmsManError as err:
            if err.code == "wait_code":
                continue
            raise err

    if code:
        print(f"Verification code received: {code}")
    else:
        print("Timeout reached. Rejecting number to refund balance...")
        client.set_status(order.request_id, "reject")
```

### 2. Inspecting Limits, Prices & Applications

Check available limits and application IDs before ordering:

```python
countries = client.get_countries()
print("Countries:", countries)

apps = client.get_applications()
print("Applications:", apps)

limits = client.get_limits(country_id=1, application_id=1)
print("Available limits:", limits)
```

### 3. Using the SMS-Activate Protocol (`handler_api.php`)

If your existing workflow uses standard `handler_api.php`:

```python
# 1. Check balance via handler
balance = client.handler_get_balance()
print(f"Handler balance: {balance}")

# 2. Order number via handler
activation = client.handler_get_number(service="tg", country=1)
print(f"Order ID: {activation.id}, Number: {activation.number}")

# 3. Mark ready (status 1)
client.handler_set_status(activation.id, 1)

# 4. Check status
status = client.handler_get_status(activation.id)
print(f"Status: {status.status}, Code: {status.code}")

# 5. Complete activation (status 6) or cancel (status 8)
client.handler_set_status(activation.id, 6)
```

---

## API Reference

### `SmsMan` Class

#### Constructor

```python
SmsMan(
    api_key: str,
    base_url: str = "https://api.sms-man.com",
    timeout: float = 30.0,
)
```

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `api_key` | `str` | **Required** | Your SMS-MAN API key. |
| `base_url` | `str` | `"https://api.sms-man.com"` | Base URL of SMS-MAN API. |
| `timeout` | `float` | `30.0` | Request timeout in seconds. |

#### Control API Methods (`/control/`)

- **`get_balance() -> float`** — Returns current balance in USD.
- **`get_limits(country_id=None, application_id=None) -> Any`** — Checks number availability and limits.
- **`get_prices(country_id=None) -> Any`** — Returns pricing for services and countries.
- **`get_countries() -> Any`** — Lists all supported countries with IDs.
- **`get_applications() -> Any`** — Lists all supported applications with IDs.
- **`get_number(country_id: int, application_id: int) -> PhoneNumberOrder`** — Orders a number for the application.
- **`get_sms(request_id: int) -> SmsCodeResult`** — Checks for received SMS verification code.
- **`set_status(request_id: int, status: str) -> bool`** — Sets status (`'ready'` or `'reject'`).

#### Handler API Methods (`/stubs/handler_api.php`)

- **`handler_get_balance() -> float`** — Returns balance via handler API.
- **`handler_get_number(service, country=None) -> HandlerNumberResult`** — Orders number (`ACCESS_NUMBER`).
- **`handler_get_status(order_id: int | str) -> HandlerStatusResult`** — Retrieves status and code.
- **`handler_set_status(order_id: int | str, status: int) -> str`** — Updates activation state (1 = ready, 6 = complete, 8 = cancel).
- **`handler_get_prices(country=None) -> Any`** — Retrieves prices via handler API.

---

## Error Handling

When an API error occurs, `SmsManError` is raised:

```python
from sms_man import SmsMan, SmsManError

try:
    with SmsMan(api_key="invalid_key") as client:
        client.get_balance()
except SmsManError as exc:
    print(f"SMS-MAN Error: {exc.message} (Code: {exc.code})")
```

Common error codes:
- `no_numbers` — No available phone numbers for selected application/country.
- `balance_empty` — Insufficient funds on account.
- `wrong_token` — Invalid API key.
- `wait_code` — SMS code has not arrived yet.
- `WRONG_ACTIVATION_ID` — Order ID does not exist or expired.

---

## License

ISC
