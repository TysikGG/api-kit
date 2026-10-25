# smsbulk-client

Python client for the [SMSBulk](https://smsbulk.net) virtual phone number and email verification API.

API Documentation: [https://smsbulk.net/en/docs](https://smsbulk.net/en/docs)

## Features

- **Full Typing**: Comprehensive TypedDict models for responses and parameters.
- **Virtual Numbers**: Reserve phone numbers, poll for SMS verification codes, request resends, and cancel activations.
- **Email Activations**: Purchase disposable email addresses and read verification OTP codes.
- **Catalog & Pricing**: Query real-time availability and prices across hundreds of countries and services.
- **Context Manager**: Supports `with SMSBulk(...) as client:` for automatic cleanup.
- **Environment Auto-discovery**: Automatically uses `SMSBULK_API_KEY` from environment variables.

## Installation

```bash
pip install smsbulk-client
```

## Quick Start

```python
import os
from smsbulk import SMSBulk

client = SMSBulk(api_key=os.environ.get("SMSBULK_API_KEY"))

# Check wallet balance
balance = client.get_balance()
print(f"Balance: {balance['balance']} {balance['currency']}")

# List available services
services = client.get_services()
print(f"Services found: {services['count']}")

# Reserve a virtual number for WhatsApp in the US
activation = client.create_activation(
    service_code="wa",
    country_iso="US",
)
print(f"Reserved phone number: {activation['phoneNumber']}")

# Retrieve received SMS code
act = client.get_activation(activation["id"])
if act["status"] == "RECEIVED":
    print(f"Received code: {act['smsCode']}")
```

## API Overview

### Wallet & Account

- `client.get_balance()`: Get current balance and currency.
- `client.get_transactions(limit=None, cursor=None)`: List wallet transaction history.

### Services & Countries

- `client.get_services()`: List all supported services with stock and pricing.
- `client.get_service(slug)`: Get detailed information for a single service.
- `client.get_countries()`: List all supported countries.
- `client.get_service_countries(slug)`: List in-stock countries and prices for a service.

### SMS Activations

- `client.create_activation(service_code, country_iso, operator=None, max_price=None)`: Reserve a phone number.
- `client.get_activations(limit=None, cursor=None)`: List user's activations.
- `client.get_activation(activation_id)`: Get activation status and SMS code.
- `client.cancel_activation(activation_id)`: Cancel reservation and refund balance.
- `client.complete_activation(activation_id)`: Mark activation as finished.
- `client.resend_activation(activation_id)`: Request an additional SMS code.

### Email Activations

- `client.get_email_domains(site)`: List available email provider domains and prices for a site.
- `client.create_email_activation(site, domain)`: Purchase temporary email address.
- `client.get_email_activations(limit=None, cursor=None)`: List user's email activations.
- `client.get_email_activation(activation_id)`: Get email activation status and parsed OTP code.
- `client.cancel_email_activation(activation_id)`: Cancel email activation.
- `client.reorder_email_activation(activation_id)`: Reopen email address for further codes.

## License

ISC
