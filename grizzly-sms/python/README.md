# grizzly-sms-client

[![PyPI version](https://img.shields.io/pypi/v/grizzly-sms-client.svg)](https://pypi.org/project/grizzly-sms-client/)
[![Python versions](https://img.shields.io/pypi/pyversions/grizzly-sms-client.svg)](https://pypi.org/project/grizzly-sms-client/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Modern, typed Python client for the [Grizzly SMS](https://grizzlysms.com) API (compatible with the `sms-activate` protocol) and the Grizzly SMS Partner Push API. Built on [HTTPX](https://www.python-httpx.org).

Official API documentation:
- Activation protocol: <https://grizzlysms.com/docs>
- Partner push protocol: <https://grizzlysms.com/docs/partner>
- Utility & wallet endpoints: <https://grizzlysms.com/docs/utility>

---

## Features

- 📱 **Virtual Number Rental** — Rent temporary SMS numbers across 100+ countries for any supported service.
- ⏳ **Automated Polling** — `wait_for_code()` polls the activation status until an OTP arrives or timeout expires.
- 🏷️ **Price Catalog & Search** — Query rates across V1, V2, and V3 pricing structures or use `find_prices()` for flat search.
- 🤝 **Partner Push Client** — Dedicated `GrizzlyPartner` client for pushing SMS, phone calls, and call recordings.
- 🛡️ **Typed & Robust** — Google-style docstrings, type annotations, context manager support (`with GrizzlySms(...) as sms:`), and clear exceptions.

---

## Installation

```bash
pip install grizzly-sms-client
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only reads your current account balance and fetches the country catalog. It does not spend money or order numbers.

```python
import os
from grizzly_sms import GrizzlySms

api_key = os.environ["GRIZZLY_API_KEY"]

with GrizzlySms(api_key) as sms:
    balance = sms.get_balance()
    countries = sms.get_countries()

    print(f"Balance: {balance} RUB")
    print(f"Available countries: {len(countries)}")
```

---

## Usage Guide

### 1. Renting a Number and Receiving an SMS Code

The full activation lifecycle consists of renting a number, waiting for the verification code, and confirming completion:

```python
import os
from grizzly_sms import GrizzlySms, GrizzlySmsError

api_key = os.environ["GRIZZLY_API_KEY"]

with GrizzlySms(api_key) as sms:
    # 1. Rent a phone number for Telegram ('tg') in USA ('187')
    order = sms.get_number(service="tg", country="187")
    print(f"Rented number: +{order.number} (ID: {order.activation_id})")

    # 2. Inform the provider that the application has triggered the SMS
    sms.ready(order.activation_id)

    # 3. Poll for the incoming OTP code
    try:
        code = sms.wait_for_code(order.activation_id, timeout=120.0, interval=3.0)
        print(f"Received code: {code}")

        # 4. Mark activation successfully finished
        sms.complete(order.activation_id)
    except GrizzlySmsError as err:
        if err.code == "TIMEOUT":
            print("Code did not arrive in time, canceling activation...")
            sms.cancel(order.activation_id)
        else:
            raise
```

### 2. Searching Prices and Stock

Search real-time price quotes and number availability:

```python
from grizzly_sms import GrizzlySms

with GrizzlySms(os.environ["GRIZZLY_API_KEY"]) as sms:
    quotes = sms.find_prices(service="tg", country="187")
    for quote in quotes:
        print(f"Country {quote.country}: {quote.count} available at {quote.price} RUB")
```

### 3. Partner Push Client (`GrizzlyPartner`)

If you operate your own SMS gateway / SIM farm integrated with Grizzly SMS as a provider, use `GrizzlyPartner` to push incoming messages and calls:

```python
import os
from datetime import datetime, timezone
from grizzly_sms import GrizzlyPartner

partner_key = os.environ["GRIZZLY_PARTNER_KEY"]

with GrizzlyPartner(partner_key) as partner:
    # Push an inbound SMS
    partner.push_sms(
        port=1,
        phone="79001234567",
        sender="Telegram",
        text="Your code is 12345",
        received_at=datetime.now(timezone.utc),
    )

    # Push a voice call
    partner.push_call(
        port=1,
        phone="79001234567",
        caller_phone="79009876543",
        received_at=datetime.now(timezone.utc),
    )
```

---

## Error Handling

When the API returns an error status (such as `NO_NUMBERS`, `BAD_KEY`, or `NO_BALANCE`), the client raises a `GrizzlySmsError`:

```python
from grizzly_sms import GrizzlySms, GrizzlySmsError

try:
    with GrizzlySms("invalid_key") as sms:
        sms.get_balance()
except GrizzlySmsError as err:
    print(f"API error: {err.code} - {err.message}")
```

Common error codes:
- `BAD_KEY` — Invalid API key.
- `NO_NUMBERS` — No available numbers for the requested service and country.
- `NO_BALANCE` — Insufficient account balance.
- `WRONG_ACTIVATION_ID` — The activation identifier does not exist or has expired.
- `TIMEOUT` — Polling in `wait_for_code()` timed out before an SMS arrived.

---

## Partner Referrer ID

In accordance with the service's partner integration requirements, outgoing requests to `handler_api.php` automatically include the hardcoded partner referrer ID.

---

## License

[ISC](LICENSE) © api-kit contributors
