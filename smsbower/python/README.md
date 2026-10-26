# smsbower

Python client for the [SMSBower API](https://smsbower.app/api?page=client).

## Features

- Full support for SMSBower activation APIs (v1 and v2)
- Balance inquiries, real-time SMS status checks, and lifecycle management
- Complete catalogs for supported services, countries, and live price tiers
- Built with `httpx` with synchronous request handling, strict types, and Google-style docstrings

## Installation

```bash
pip install smsbower
```

## Quick Start

```python
import os
from smsbower import SmsBowerClient

client = SmsBowerClient(api_key=os.environ["SMSBOWER_API_KEY"])

# Check account balance
balance = client.get_balance()
print(f"Current balance: ${balance:.2f}")

# Fetch available services
services = client.get_services_list()
print(f"Available services: {len(services)}")

# Fetch available countries
countries = client.get_countries()
print(f"Available countries: {len(countries)}")
```

## Ordering a Virtual Number

```python
from smsbower import SmsBowerClient

client = SmsBowerClient(api_key="YOUR_API_KEY")

# Order a virtual number for Telegram in India
activation = client.get_number(service="tg", country="22")
print(f"Order ID: {activation.id}")
print(f"Phone Number: {activation.number}")

# Poll for incoming SMS code
status = client.get_status(activation.id)
if status.status == "STATUS_OK":
    print(f"Received SMS code: {status.code}")
    # Mark activation completed
    client.set_status(activation.id, 6)
```

## API Methods

- `get_balance() -> float` — Returns the current balance.
- `get_number(...) -> ActivationNumber` — Orders a virtual phone number.
- `get_number_v2(...) -> dict` — Orders a number with extended activation metadata.
- `get_status(activation_id) -> ActivationStatus` — Checks current status and retrieves SMS code.
- `set_status(activation_id, status) -> str` — Updates activation status (1: ready, 3: retry, 6: complete, 8: cancel).
- `get_prices(service?, country?) -> dict` — Retrieves standard price catalog.
- `get_prices_v2(service?, country?) -> dict` — Retrieves detailed price points.
- `get_prices_v3(service?, country?) -> dict` — Retrieves provider-specific pricing.
- `get_services_list() -> list[ServiceItem]` — Retrieves all supported services.
- `get_countries() -> dict[str, CountryItem]` — Retrieves all supported countries.
- `get_top_countries_by_service(service) -> dict` — Retrieves top countries and gold partners.
- `get_actual_wallet_address(coin, network) -> str` — Generates deposit address.

## License

ISC
