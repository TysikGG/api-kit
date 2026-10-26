# give-sms

Python client for the [Give-SMS](https://give-sms.com/api.html) virtual number and SMS activation API.

## Installation

```bash
pip install give-sms
```

## Quick Start

```python
import os
from give_sms import GiveSms

api_key = os.getenv("GIVE_SMS_API_KEY", "your-api-key")

with GiveSms(api_key=api_key) as client:
    # Check balance
    balance = client.get_balance()
    print(f"Balance: {balance}")

    # Check services count
    counts = client.get_count(country="kazakhstan")
    print(f"Available services: {counts}")
```

## Features

- Full coverage of Give-SMS native JSON API (`/api/v1/`):
  - `get_balance()`
  - `get_count(country, operator)`
  - `get_number(service, country, operator, max_price)`
  - `get_code(order_id)`
  - `repeat_code(order_id)`
  - `cancel_number(order_id)`
  - `ban_number(order_id)`
  - `get_reactivation_options(order_id)`
  - `reactivate(order_id)`
  - `get_all()`
- Full coverage of SMS-Activate compatible handler endpoint (`/stubs/handler_api.php`):
  - `handler_get_balance()`
  - `handler_get_numbers_status(country, operator)`
  - `handler_get_number(service, country, operator, max_price)`
  - `handler_set_status(order_id, status)`
  - `handler_get_status(order_id)`
  - `handler_get_prices(country, service, tiers)`
- Synchronous client with context manager support (`with GiveSms(...) as client:`).
- Type hints and structured dataclasses.

## License

ISC
