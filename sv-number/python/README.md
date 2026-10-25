# sv-number

[![PyPI version](https://img.shields.io/pypi/v/sv-number.svg)](https://pypi.org/project/sv-number/)
[![Python versions](https://img.shields.io/pypi/pyversions/sv-number.svg)](https://pypi.org/project/sv-number/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Modern, typed Python client for the [SV Number SMS Verification Service](https://sms-verification-number.com/en/api-sms-activate/). Rent temporary numbers to receive verification SMS across hundreds of platforms. Built on [HTTPX](https://www.python-httpx.org).

Official API documentation: <https://sms-verification-number.com/en/api-sms-activate/>

---

## Features

- 📱 **Virtual Number Rental** — Order temporary phone numbers across global countries and services.
- ⏳ **Automated Polling** — `wait_for_code()` polls the activation status until an OTP arrives or timeout expires.
- 🏷️ **Price Catalog & Services** — Fetch live rates and availability via `get_prices()` and `get_services_and_cost()`.
- 🐍 **Modern Python** — Type-annotated, Google-style docstrings, context manager support (`with SvNumber(...) as client:`).
- 🚨 **Structured Errors** — Clear `SvNumberError` exceptions with API status strings (`NO_NUMBERS`, `BAD_KEY`, `NO_BALANCE`).

---

## Installation

```bash
pip install sv-number
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance and service catalogs. It does not order numbers or spend credits.

```python
import os
from sv_number import SvNumber

api_key = os.environ["SV_NUMBER_API_KEY"]

with SvNumber(api_key) as client:
    balance = client.get_balance()
    services = client.get_services_and_cost(country=0)
    print(f"Balance: ${balance}")
    print(f"Available services in country 0: {len(services)}")
```

---

## Usage Guide

### 1. Renting a Number and Receiving an SMS

```python
import os
from sv_number import SvNumber, SvNumberError

api_key = os.environ["SV_NUMBER_API_KEY"]

with SvNumber(api_key) as client:
    # 1. Order a number for Telegram ('tg') in country 0
    order = client.get_number("tg", country=0)
    print(f"Rented: {order['phone_number']} (ID: {order['activation_id']})")

    # 2. Inform the provider that the application has triggered the SMS
    client.ready(order["activation_id"])

    # 3. Poll for the incoming OTP code
    try:
        code = client.wait_for_code(order["activation_id"], timeout=120.0, interval=3.0)
        print(f"Received SMS code: {code}")

        # 4. Confirm completion
        client.complete(order["activation_id"])
    except SvNumberError as err:
        if err.code == "TIMEOUT":
            print("Code timed out, canceling order...")
            client.cancel(order["activation_id"])
        else:
            raise
```

### 2. Checking Prices

```python
with SvNumber(os.environ["SV_NUMBER_API_KEY"]) as client:
    prices = client.get_prices(country=0)
    print("Prices for country 0:", prices)
```

---

## Error Handling

When the API returns an error, the client raises an `SvNumberError`:

```python
from sv_number import SvNumber, SvNumberError

try:
    with SvNumber("invalid_key") as client:
        client.get_balance()
except SvNumberError as err:
    print(f"SV Number API error: {err.code}")
```

---

## License

[ISC](LICENSE) © api-kit contributors
