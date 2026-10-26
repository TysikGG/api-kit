# sms-man

Python client for the [SMS-MAN](https://sms-man.com/site/api) virtual number and SMS activation API.

## Installation

```bash
pip install sms-man
```

## Quick Start

```python
import os
from sms_man import SmsMan

token = os.getenv("SMSMAN_API_KEY", "your-api-token")

with SmsMan(token=token) as client:
    # Check balance
    balance = client.get_balance()
    print(f"Balance: {balance}")

    # Fetch supported countries
    countries = client.get_countries()
    print("Countries received:", bool(countries))
```

## Features

- Full coverage of SMS-MAN native control API (`/control/`):
  - `get_balance()`: Query account balance.
  - `get_limits(country_id, application_id)`: Available stock limits.
  - `get_prices(country_id)`: Service pricing catalog.
  - `get_countries()`: List of supported countries.
  - `get_applications()`: List of supported applications.
  - `get_number(country_id, application_id)`: Order disposable virtual number.
  - `get_sms(request_id)`: Receive verification SMS code.
  - `set_status(request_id, status)`: Confirm or cancel number.
- Full coverage of SMS-Activate compatible handler endpoint (`/stubs/handler_api.php`):
  - `handler_get_balance()`
  - `handler_get_number(country, service)`
  - `handler_get_status(id)`
  - `handler_set_status(id, status)`
  - `handler_get_prices(country)`
- Synchronous client with context manager support.
- Fully typed data classes.

## License

ISC
