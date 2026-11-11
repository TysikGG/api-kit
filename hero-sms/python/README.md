# hero-sms

Python client library for the [HeroSMS](https://hero-sms.com/ru/api) SMS activation and rental API.

## Features

- Synchronous HTTP client using `httpx`
- Context manager support (`with HeroSMS(...) as client:`)
- Comprehensive error hierarchy (`NoNumbersError`, `AuthenticationError`, `EarlyCancelError`, etc.)
- Full support for activations and number rental
- Safe directory and catalog methods for countries, services, operators, and prices
- Strictly typed with `py.typed` and type annotations

## Installation

```bash
pip install hero-sms
```

## Quick Start

```python
import os
from hero_sms import HeroSMS

# Initialize client using environment variable or explicit key
client = HeroSMS(api_key=os.environ["HERO_SMS_API_KEY"])

# Check account balance
balance = client.get_balance()
print(f"Balance: ${balance}")

# Fetch available countries
countries = client.get_countries()
print(f"Supported countries: {len(countries)}")
```

## Receiving SMS Verification

```python
from hero_sms import HeroSMS, ActivationStatusCode

with HeroSMS(api_key="your-api-key") as client:
    # 1. Request a number for Telegram in Kazakhstan (country: 2)
    ordered = client.get_number(service="tg", country=2)
    activation_id = ordered["activation_id"]
    phone_number = ordered["phone_number"]
    print(f"Received number: {phone_number} (ID: {activation_id})")

    # 2. Inform server that you are ready to receive SMS
    client.mark_ready(activation_id)

    # 3. Check status
    status = client.get_status(activation_id)
    if status["status"] == "STATUS_OK":
        print(f"SMS code: {status['code']}")
        # 4. Confirm completion
        client.complete(activation_id)
    elif status["status"] == "STATUS_WAIT_CODE":
        print("Waiting for incoming SMS...")
```

## API Reference

### Client Configuration

```python
from hero_sms import HeroSMS

client = HeroSMS(
    api_key="your-key",  # Or reads HERO_SMS_API_KEY env var
    base_url=None,  # Optional custom URL
    timeout=30.0,  # Request timeout in seconds
    user_agent=None,  # Optional custom User-Agent
)
```

### Account & Balance
- `get_balance() -> float` - Retrieve current balance.

### Numbers & Activations
- `get_number(service, country, ...) -> ParsedNumberResponse` - Order a phone number.
- `get_number_v2(service, country, ...) -> GetNumberV2Response` - Order a number with rich JSON metadata.
- `set_status(id, status) -> str` - Update activation status.
- `mark_ready(id) -> str` - Mark activation ready to receive SMS (status 1).
- `request_resend(id) -> str` - Request another SMS code (status 3).
- `complete(id) -> str` - Confirm activation completion (status 6).
- `cancel(id) -> str` - Cancel activation and release balance (status 8).
- `get_status(id) -> ParsedStatusResponse` - Check activation status and received code.
- `get_status_v2(id) -> ActivationStatusV2` - Retrieve detailed status metadata.
- `get_active_activations(start=None, limit=None) -> ActiveActivationsResponse` - List active activation orders.
- `get_history(...) -> list[ActivationHistoryItem]` - Retrieve activation history.
- `reactivate(id) -> GetNumberV2Response` - Reactivate an existing activation.
- `get_reactivation_price(id) -> ReactivationPriceResponse` - Check reactivation cost.
- `get_all_sms(id, ...) -> GetAllSmsResponse` - Fetch all SMS messages received for an activation.
- `finish_activation(id) -> None` - Finalize activation work.
- `cancel_activation(id) -> None` - Cancel activation purchase.

### Catalogs & Directories
- `get_countries() -> dict[str, Country]` - List available countries.
- `get_services_list(...) -> ServicesListResponse` - List supported services.
- `get_operators(...) -> OperatorsResponse` - List mobile operators.
- `get_prices(...) -> dict[str, dict[str, PriceInfo]]` - Query prices and quantities.
- `get_top_countries_by_service(...) -> list[TopCountryInfo]` - Retrieve top countries for a service.
- `get_top_countries_by_service_rank(...) -> list[TopCountryInfo]` - Retrieve top countries based on user rank.

### Rental
- `get_rent_prices(...) -> dict[str, dict[str, RentPriceCount]]` - Get rental prices and available counts.
- `get_rent_services_and_countries(...) -> GetRentServicesAndCountriesResponse` - List rental options.
- `get_rent_number(...) -> GetNumberV2Response` - Rent a number for a designated duration.

## Error Handling

All client errors inherit from `HeroSMSError`:

```python
from hero_sms import (
    HeroSMS,
    HeroSMSError,
    NoNumbersError,
    NoBalanceError,
    AuthenticationError,
)

try:
    with HeroSMS(api_key="your-api-key") as client:
        result = client.get_number(service="tg", country=2)
except NoNumbersError:
    print("No numbers currently available.")
except NoBalanceError:
    print("Insufficient account balance.")
except HeroSMSError as err:
    print(f"HeroSMS error [{err.code}]: {err.message}")
```

## Official Documentation

- API Docs: [https://hero-sms.com/ru/api](https://hero-sms.com/ru/api)

## License

ISC
