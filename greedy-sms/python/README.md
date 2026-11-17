# greedy-sms

Python client library for the [Greedy SMS](https://api.greedy-sms.com/docs) activation, rental, and disposable email API.

## Features

- Synchronous HTTP client using `httpx`
- Context manager support (`with GreedySMS(...) as client:`)
- Comprehensive error hierarchy (`AuthenticationError`, `RateLimitError`, `ValidationError`, etc.)
- Virtual phone activations, long-term rentals, and disposable email verification
- Strictly typed with `py.typed` and type annotations

## Installation

```bash
pip install greedy-sms
```

## Quick Start

```python
import os
from greedy_sms import GreedySMS

# Initialize client using environment variable or explicit key
client = GreedySMS(api_key=os.environ["GREEDY_SMS_API_KEY"])

# Check account balance and profile
me = client.get_me()
print(f"Balance: {me['balance']} RUB")

# List supported countries
countries_res = client.get_countries(page=1, page_size=5)
for country in countries_res["countries"]:
    print(f"[{country['id']}] {country['title']['eng']}")
```

## SMS Activation Workflow

```python
from greedy_sms import GreedySMS

with GreedySMS(api_key="your-api-key") as client:
    # 1. Order a number for Telegram in Kazakhstan (country: 2)
    order = client.get_number(service="tg", country=2)
    print(f"Phone: {order['phone']}, Activation ID: {order['activationId']}")

    # 2. Check activation status
    status = client.get_status(order["activationId"])
    if status["status"].startswith("STATUS_OK:"):
        code = status["status"].split(":")[1]
        print(f"Received SMS code: {code}")

        # 3. Complete activation
        client.finish_activation(order["activationId"])
    elif status["status"] == "STATUS_WAIT_CODE":
        print("Waiting for incoming SMS...")
```

## API Reference

### Client Configuration

```python
from greedy_sms import GreedySMS

client = GreedySMS(
    api_key="your-api-key",  # Or reads GREEDY_SMS_API_KEY env var
    base_url=None,  # Optional custom URL (default: https://api.greedy-sms.com)
    timeout=30.0,  # Request timeout in seconds
    user_agent=None,  # Optional custom User-Agent
)
```

### System & User
- `check_health() -> HealthResponse` - Check if API service is online.
- `get_me() -> UserInfo` - Retrieve user profile, balance, purchases, and discount.
- `get_balance() -> float` - Convenience method returning account balance in rubles.

### Activations
- `get_operators(country=None) -> list[OperatorCountryInfo]` - List mobile operators by country.
- `get_countries(page=None, page_size=None) -> GetCountriesResponse` - List countries with pagination.
- `get_services(...) -> GetServicesResponse` - List available services.
- `get_prices(...) -> GetPricesResponse` - Query prices and available stock.
- `get_numbers_status(service, page=1, page_size=None) -> GetNumbersStatusResponse` - Available count for service.
- `get_list_of_top_countries_by_service(service) -> list[TopCountryPriceItem]` - Top 10 countries by service.
- `get_top_countries_by_service(service, page=1, page_size=None) -> GetTopCountriesResponse` - Top countries with pagination.
- `get_number(service, country, ...) -> OrderedNumber` - Purchase a phone number.
- `get_status(activation_id) -> ActivationStatusResponse` - Check activation status and code.
- `get_status_alternative(activation_id) -> ActivationStatusResponse` - Check local activation status.
- `set_status(activation_id, status) -> ActivationStatusResponse` - Set status ('Cancel', 'Finish', 'NewCode').
- `cancel_activation(activation_id) -> ActivationStatusResponse` - Cancel order and refund balance.
- `finish_activation(activation_id) -> ActivationStatusResponse` - Complete activation.
- `request_new_code(activation_id) -> ActivationStatusResponse` - Request another SMS code.
- `get_history(...) -> GetHistoryResponse` - Retrieve activation history.

### Long-term Rental
- `get_rent_prices(...) -> dict[str, Any]` - List rental prices.
- `get_rent_list(...) -> GetRentListResponse` - List user rentals.
- `get_rent_status(...) -> GetRentStatusResponse` - Retrieve rental status and SMS messages.
- `get_continue_rent_price_number(...) -> dict[str, Any]` - Check extension price.
- `get_rent_number(...) -> OrderedRentNumber` - Order a number for rent.
- `set_rent_status(...) -> dict[str, Any]` - Update rental status.
- `continue_rent_number(...) -> ContinuedRentNumber` - Extend active rental.
- `continue_rent_number_v2(...) -> ContinuedRentNumber` - Idempotent extension.

### Disposable Email Verification
- `get_mail_domains(url) -> list[MailDomainItem]` - Get available mail domains for website.
- `get_mail_price(url, domain) -> MailPriceQuote` - Get price quote for email address.
- `buy_mail_domain(url, domain) -> OrderedMailDomain` - Buy temporary email address.
- `reorder_mail_domain(id) -> OrderedMailDomain` - Reorder/reactivate existing email address.
- `get_mail_status(id) -> MailStatusResponse` - Check received email and verification code.
- `cancel_mail_order(id) -> CancelMailOrderResponse` - Cancel email order.
- `get_mail_orders(...) -> GetMailOrdersResponse` - List email orders.

### Legacy Compatibility
- `handler_api(action, params=None) -> str` - Direct call to `/stubs/handler_api.php`.

## Error Handling

All client errors inherit from `GreedySMSError`:

```python
from greedy_sms import (
    AuthenticationError,
    GreedySMS,
    GreedySMSError,
    RateLimitError,
    ValidationError,
)

try:
    with GreedySMS(api_key="your-api-key") as client:
        order = client.get_number(service="tg", country=2)
except RateLimitError as err:
    print(f"Rate limit exceeded. Retry after {err.retry_after_seconds}s.")
except ValidationError as err:
    print(f"Validation failed: {err.fields}")
except GreedySMSError as err:
    print(f"Greedy SMS error [{err.code}]: {err.message}")
```

## Official Documentation

- API Reference: [https://api.greedy-sms.com/docs](https://api.greedy-sms.com/docs)

## License

ISC
