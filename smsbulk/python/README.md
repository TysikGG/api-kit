# smsbulk

[![PyPI version](https://img.shields.io/pypi/v/smsbulk.svg)](https://pypi.org/project/smsbulk/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/pypi/pyversions/smsbulk.svg)](https://pypi.org/project/smsbulk/)

Modern, fully typed Python client library for the [SMSBulk](https://smsbulk.net) virtual phone number and disposable email OTP verification API.

Official API documentation: <https://smsbulk.net/en/docs>

---

## Features

- 📱 **Virtual Phone Numbers** — Rent numbers across hundreds of countries for Telegram, WhatsApp, Google, OpenAI, and more.
- 📧 **Disposable Email Verification** — Purchase temporary email addresses and read incoming email OTP codes with real-time polling.
- 🐍 **Modern Pythonic Design** — Type annotations, dataclass models, context manager support (`with SMSBulk(...) as client:`), and custom exceptions.
- 📊 **Catalogs & Real-time Rates** — Query countries, services, and live pricing with availability counts.
- ⚡ **Zero Setup** — Automatically resolves `SMSBULK_API_KEY` from environment variables if not passed explicitly.

---

## Installation

```bash
pip install smsbulk
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance and retrieves available services without consuming funds:

```python
import os
from smsbulk import SMSBulk

with SMSBulk(api_key=os.environ.get("SMSBULK_API_KEY")) as client:
    balance = client.get_balance()
    print(f"Balance: {balance.balance} {balance.currency}")

    services = client.get_services()
    print(f"Available services: {len(services.data)}")
```

---

## Usage Guide

### 1. Renting a Phone Number and Receiving SMS

Order a virtual phone number, poll for incoming SMS verification codes, and complete the activation:

```python
import time
from smsbulk import SMSBulk, SMSBulkError

with SMSBulk() as client:
    # 1. Create phone activation for Telegram in United States (US)
    activation = client.create_activation(
        service="telegram",
        country="US",
    )
    print(f"Assigned Number: {activation.phone} (ID: {activation.id})")

    # 2. Poll for incoming SMS code
    code = None
    for _ in range(30):
        time.sleep(3)
        current = client.get_activation(activation.id)
        if current.sms:
            code = current.sms[0].code
            break

    if code:
        print(f"Verification code received: {code}")
        # 3. Mark activation completed
        client.complete_activation(activation.id)
    else:
        print("No SMS arrived. Cancelling activation to refund balance...")
        client.cancel_activation(activation.id)
```

### 2. Disposable Email Verification

Purchase a temporary email address, receive email verification codes, and complete:

```python
with SMSBulk() as client:
    # 1. Get available domains for target service (e.g. 'google')
    domains = client.get_email_domains("google")
    print("Supported domains:", domains)

    # 2. Create email activation
    domain = domains[0].domain if domains else None
    email_order = client.create_email_activation(site="google", domain=domain)
    print(f"Temporary Email: {email_order.email} (ID: {email_order.id})")

    # 3. Poll for incoming email OTP code
    email_code = None
    for _ in range(30):
        time.sleep(3)
        current = client.get_email_activation(email_order.id)
        if current.code:
            email_code = current.code
            break

    if email_code:
        print(f"Email OTP code: {email_code}")
    else:
        client.cancel_email_activation(email_order.id)
```

### 3. Querying Countries and Pricing

Check available numbers, prices, and countries before purchasing:

```python
with SMSBulk() as client:
    countries = client.get_countries()
    print(f"Found {len(countries.data)} countries")

    tg_countries = client.get_service_countries("telegram")
    for c in tg_countries.data:
        print(f"{c.country_name} ({c.country_code}): price {c.cost}, available {c.count}")
```

---

## API Reference

### `SMSBulk` Class

#### Constructor

```python
SMSBulk(
    api_key: Optional[str] = None,
    base_url: str = "https://smsbulk.net",
    timeout: float = 30.0,
)
```

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `api_key` | `str` | `os.environ.get("SMSBULK_API_KEY")` | Your SMSBulk API key. |
| `base_url` | `str` | `"https://smsbulk.net"` | Custom API base URL. |
| `timeout` | `float` | `30.0` | Request timeout in seconds. |

#### Methods

- **`get_balance() -> BalanceResponse`** — Retrieves wallet balance and currency.
- **`get_transactions(page=None, limit=None) -> TransactionsResponse`** — Lists billing transactions.
- **`get_services() -> ServicesResponse`** — Lists supported services.
- **`get_service(slug: str) -> ServiceCatalogItem`** — Details of a specific service.
- **`get_countries() -> CountriesResponse`** — Lists all supported countries.
- **`get_service_countries(slug: str) -> ServiceCountriesResponse`** — Countries and prices for a service.
- **`create_activation(service, country, ...) -> Activation`** — Reserves a phone number.
- **`get_activations(status=None, page=None, limit=None) -> ActivationsResponse`** — Lists activations.
- **`get_activation(activation_id: str) -> Activation`** — Checks status and incoming SMS for an activation.
- **`cancel_activation(activation_id: str) -> Activation`** — Cancels order and refunds balance.
- **`complete_activation(activation_id: str) -> Activation`** — Marks activation as successfully finished.
- **`resend_activation(activation_id: str) -> Activation`** — Requests an additional SMS on the number.
- **`get_email_domains(site: str) -> list[EmailDomainItem]`** — Returns available domains for an email service.
- **`create_email_activation(site: str, domain=None) -> EmailActivation`** — Reserves a temporary email address.
- **`get_email_activations(...) -> EmailActivationsResponse`** — Lists active email activations.
- **`get_email_activation(activation_id: str) -> EmailActivation`** — Checks status and code of email activation.
- **`cancel_email_activation(activation_id: str) -> EmailActivation`** — Cancels email activation.
- **`reorder_email_activation(activation_id: str) -> EmailActivation`** — Re-orders verification on the same email.

---

## Error Handling

If an API error occurs, `SMSBulkError` is raised:

```python
from smsbulk import SMSBulk, SMSBulkError

try:
    with SMSBulk(api_key="invalid_key") as client:
        client.get_balance()
except SMSBulkError as exc:
    print(f"Status: {exc.status}")
    print(f"Message: {exc.message}")
```

Common HTTP error statuses:
- `401 Unauthorized` — Invalid or missing API key.
- `402 Payment Required` — Insufficient wallet balance.
- `404 Not Found` — Activation ID or service slug not found.
- `422 Unprocessable Entity` — No numbers available or invalid parameters.

---

## License

ISC
