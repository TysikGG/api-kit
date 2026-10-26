# vak-sms

[![PyPI version](https://img.shields.io/pypi/v/vak-sms.svg)](https://pypi.org/project/vak-sms/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/pypi/pyversions/vak-sms.svg)](https://pypi.org/project/vak-sms/)

Modern, fully typed Python client library for the [VAK-SMS](https://vak-sms.com/api/) virtual phone numbers and SMS OTP receiving service.

Official API documentation: <https://vak-sms.com/api/vak/>

---

## Features

- 📱 **Virtual Phone Numbers** — Disposable phone numbers across dozens of countries for Telegram, WhatsApp, Discord, Google, and 100+ services.
- 🔁 **Number Prolongation** — Re-rent or prolong previously used numbers for secondary SMS verification.
- ⏳ **Built-in Auto Polling** — `wait_for_code()` automatically polls until the SMS verification code is received or timeout is reached.
- 🐍 **Modern Pythonic Design** — Type annotations, dataclass models (`VakNumber`, `CountryOperator`), context manager support (`with VakSmsClient(...) as client:`), and custom exceptions.

---

## Installation

```bash
pip install vak-sms
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance and supported countries. It does not order numbers or consume funds:

```python
import os
from vak_sms import VakSmsClient

with VakSmsClient(api_key=os.environ["VAK_SMS_API_KEY"]) as client:
    balance = client.get_balance()
    print(f"Current VAK-SMS balance: {balance:.2f} RUB")

    countries = client.get_country_list()
    print(f"Supported countries count: {len(countries)}")
```

---

## Usage Guide

### 1. Renting a Number and Receiving an SMS Code

Full activation lifecycle: order a number, wait for the incoming SMS verification code, and finish the activation:

```python
from vak_sms import VakSmsClient, VakSmsError

with VakSmsClient(api_key="your_api_key") as client:
    # 1. Order a number for Telegram in United States ('us')
    order = client.get_number(service="tg", country="us")
    print(f"Rented Number: +{order.tel} (ID: {order.id_num})")

    # 2. Poll for the incoming verification code using built-in helper
    try:
        code = client.wait_for_code(order.id_num, timeout_ms=120_000, interval_ms=3_000)
        print(f"Received verification code: {code}")

        # 3. Mark activation successfully finished ('end')
        client.set_status(order.id_num, "end")
    except VakSmsError as err:
        if err.code == "TIMEOUT":
            print("SMS did not arrive in time. Marking as bad number ('bad')...")
            client.set_status(order.id_num, "bad")
        else:
            raise err
```

### 2. Requesting Repeat / Second SMS ('send')

If you need a second SMS message on the same rented number:

```python
# Notify provider that you want to receive another SMS code
client.set_status(order.id_num, "send")

# Wait for the second code
second_code = client.wait_for_code(order.id_num)
print(f"Second code: {second_code}")

# Finish
client.set_status(order.id_num, "end")
```

### 3. Number Prolongation (Re-using Previous Number)

Prolong an existing number for a service if it is still available on the SIM farm:

```python
prolonged = client.prolong_number("tg", order.id_num)
print(f"Prolonged number: +{prolonged.tel}")
```

### 4. Inspecting Stock Availability

Check available numbers for a service:

```python
# Count available numbers for Telegram in USA
count = client.get_count_number("tg", "us")
print(f"Available numbers: {count}")

# All service counts in a country
numbers_list = client.get_count_numbers_list("us")
print("USA counts by service:", numbers_list)
```

---

## API Reference

### `VakSmsClient` Class

#### Constructor

```python
VakSmsClient(
    api_key: str,
    base_url: str = "https://vak-sms.com",
    timeout: float = 30.0,
)
```

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `api_key` | `str` | **Required** | Your VAK-SMS API key. |
| `base_url` | `str` | `"https://vak-sms.com"` | Base URL of VAK-SMS API. |
| `timeout` | `float` | `30.0` | Request timeout in seconds. |

#### Methods

- **`get_balance() -> float`** — Returns account balance in RUB.
- **`get_number(service, country=None, operator=None) -> VakNumber`** — Orders a phone number (`tel`, `id_num`).
- **`prolong_number(service, id_num, operator=None) -> VakNumber`** — Re-activates a previous number.
- **`get_sms_code(id_num, all=False) -> str | list[str] | None`** — Checks for incoming SMS code (`None` if waiting).
- **`wait_for_code(id_num, timeout_ms=120000, interval_ms=3000) -> str`** — Automatically polls until code arrives.
- **`set_status(id_num: str, status: str) -> str`** — Sets activation state (`'send'`, `'end'`, `'bad'`).
- **`get_count_number(service, country=None, operator=None) -> int`** — Available numbers for a service.
- **`get_country_list() -> list[CountryOperator]`** — Lists supported countries and operators.
- **`get_count_numbers_list(country=None, operator=None) -> dict[str, int]`** — Map of service counts.

---

## Error Handling

When the API returns an error response, `VakSmsError` is raised:

```python
from vak_sms import VakSmsClient, VakSmsError

try:
    with VakSmsClient(api_key="invalid_key") as client:
        client.get_balance()
except VakSmsError as exc:
    print(f"VAK-SMS Error: {exc.message} (Code: {exc.code})")
```

Common error codes:
- `noNumber` — No numbers currently available for the service/country.
- `noMoney` — Insufficient balance on account.
- `apiKeyNotFound` — Invalid API key.
- `badStatus` — Invalid status passed.
- `TIMEOUT` — Polling timeout exceeded in `wait_for_code()`.

---

## License

ISC
