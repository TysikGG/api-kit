# onlinesim

Python client for the [OnlineSIM](https://onlinesim.io/docs/api/en) virtual number and SMS activation API.

## Installation

```bash
pip install onlinesim
```

## Quick Start

```python
import os
from onlinesim import OnlineSim

api_key = os.getenv("ONLINESIM_API_KEY", "your-api-key")

with OnlineSim(api_key=api_key) as client:
    # Check balance
    balance = client.get_balance()
    print(f"Balance: {balance}")

    # Fetch available countries
    countries = client.get_countries()
    print("Countries received:", bool(countries))
```

## Features

- Full coverage of OnlineSIM activation and rental endpoints:
  - `get_balance()`: Retrieve user balance.
  - `get_tariffs(country)`: List available activation pricing and stock.
  - `get_service_list(country)`: Service directory.
  - `get_countries()`: All supported countries.
  - `get_num(service, country, ...)`: Order a virtual number for SMS reception.
  - `get_state(tzid)`: Track order state and received SMS code.
  - `set_operation_ok(tzid)`: Confirm order completion.
  - `set_operation_revise(tzid)`: Request repeat SMS message.
  - `get_rent_tariffs()`: Rental tariffs catalog.
  - `get_rent_num(country, days, ...)`: Order a long-term rental number.
  - `get_rent_state(tzid)`: Check rental number status and incoming SMS.
  - `close_rent_num(tzid)`: Release active rental number.
- Fully typed data classes.
- Context manager support (`with OnlineSim(...) as client:`).

## License

ISC
