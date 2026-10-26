# onlinesim

[![PyPI version](https://img.shields.io/pypi/v/onlinesim.svg)](https://pypi.org/project/onlinesim/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/pypi/pyversions/onlinesim.svg)](https://pypi.org/project/onlinesim/)

Modern, fully typed Python client library for the [OnlineSIM](https://onlinesim.io/docs/api/en) virtual number and SMS activation API.

Official API documentation: <https://onlinesim.io/docs/api/en>

---

## Features

- 📱 **One-Time SMS Verification** — Rent disposable virtual phone numbers across 90+ countries for Telegram, WhatsApp, Google, and hundreds of other services.
- ⏳ **Long-Term Rentals** — Full support for long-term number rental (`get_rent_num`, `get_rent_state`, `close_rent_num`).
- 🐍 **Modern Pythonic Design** — Type annotations, dataclass models (`ActivationState`, `OrderResult`), context manager support (`with OnlineSim(...) as client:`), and custom exceptions.
- 📊 **Tariffs & Availability** — Inspect real-time tariffs, service lists, and supported countries.

---

## Installation

```bash
pip install onlinesim
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance. It does not order numbers or consume funds:

```python
import os
from onlinesim import OnlineSim

with OnlineSim(api_key=os.environ["ONLINESIM_API_KEY"]) as client:
    balance = client.get_balance()
    print(f"Current OnlineSIM balance: ${balance:.2f} USD")
```

---

## Usage Guide

### 1. Renting a Number and Receiving an SMS Code

Full activation lifecycle: order a number, poll for the verification code, and mark the order complete:

```python
import time
from onlinesim import OnlineSim

with OnlineSim(api_key="your_api_key") as client:
    # 1. Order a number for Telegram in United States (country 1)
    order = client.get_num(service="telegram", country=1)
    print(f"Order created with TZID: {order.tzid}")

    # 2. Poll for incoming SMS code
    code = None
    for _ in range(30):
        time.sleep(3)
        states = client.get_state(tzid=order.tzid)
        if states:
            current = states[0]
            print(f"Assigned Number: {current.number}, Status: {current.response}")
            if current.msg:
                code = current.msg
                break

    if code:
        print(f"Received SMS code: {code}")
        # 3. Confirm completion
        client.set_operation_ok(order.tzid)
    else:
        print("No SMS received. Cancelling order to refund balance...")
        client.set_operation_revise(order.tzid)
```

### 2. Inspecting Tariffs and Available Countries

Check available numbers and prices before ordering:

```python
countries = client.get_countries()
print("Supported countries:", countries)

tariffs = client.get_tariffs(country=1)
print("USA tariffs:", tariffs)
```

### 3. Long-Term Number Rental

Rent a dedicated number for multiple days:

```python
# Check rent tariffs
rent_tariffs = client.get_rent_tariffs()
print("Rent tariffs:", rent_tariffs)

# Rent number for 1 day
rent_order = client.get_rent_num(country=1, days=1)
print("Rent order:", rent_order)
```

---

## API Reference

### `OnlineSim` Class

#### Constructor

```python
OnlineSim(
    api_key: str,
    base_url: str = "https://onlinesim.io",
    timeout: float = 30.0,
)
```

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `api_key` | `str` | **Required** | Your OnlineSIM API key. |
| `base_url` | `str` | `"https://onlinesim.io"` | Custom API base URL. |
| `timeout` | `float` | `30.0` | Request timeout in seconds. |

#### Methods

- **`get_balance() -> float`** — Retrieves current balance in USD.
- **`get_countries() -> Any`** — Returns list of supported countries.
- **`get_tariffs(country=None) -> Any`** — Returns tariffs for services.
- **`get_service_list(country=None) -> Any`** — Returns services and available numbers.
- **`get_num(service, country=None, reject=None) -> OrderResult`** — Orders a virtual number (`tzid`).
- **`get_state(tzid=None, message_to_code=1, orderby="ASC", msg_list=1, clean=1) -> List[ActivationState]`** — Checks status and incoming messages.
- **`set_operation_ok(tzid) -> bool`** — Confirms code received and completes activation.
- **`set_operation_revise(tzid) -> bool`** — Cancels activation and requests refund.
- **`get_rent_tariffs() -> Any`** — Retrieves tariffs for long-term rentals.
- **`get_rent_num(country, days=1, extension=False) -> Any`** — Orders a long-term rental number.
- **`get_rent_state(tzid=None) -> Any`** — Checks status of rented numbers.
- **`close_rent_num(tzid) -> bool`** — Closes/cancels long-term rental.

---

## Error Handling

When an API error occurs, `OnlineSimError` is raised:

```python
from onlinesim import OnlineSim, OnlineSimError

try:
    with OnlineSim(api_key="invalid_key") as client:
        client.get_balance()
except OnlineSimError as exc:
    print(f"OnlineSIM Error: {exc.message} (Code: {exc.code})")
```

Common error codes:
- `ACCOUNT_BLOCKED` — Account has been blocked.
- `NO_NUMBER` — No numbers currently available for this service.
- `NO_BALANCE` — Insufficient funds.
- `WRONG_SERVICE` — Unsupported or incorrect service identifier.
- `EXCEED_CONCURRENT_OPERATIONS` — Maximum simultaneous orders limit reached.

---

## License

ISC
