# vak-sms-client

Python client for the [VAK-SMS API](https://vak-sms.com/en/api/).

## Features

- Virtual phone numbers and SMS OTP reception across international countries and operators
- Complete activation lifecycle management (`send`, `end`, `bad`, and automatic polling)
- Real-time stock counts and prices per service
- Built with `httpx` with synchronous request handling, strict types, and Google-style docstrings

## Installation

```bash
pip install vak-sms-client
```

## Quick Start

```python
import os
from vak_sms import VakSmsClient

client = VakSmsClient(api_key=os.environ["VAK_SMS_API_KEY"])

# Check balance
balance = client.get_balance()
print(f"Current balance: {balance:.2f} RUB")

# List supported countries
countries = client.get_country_list()
print(f"Supported countries: {len(countries)}")
```

## Ordering a Virtual Number and Receiving SMS

```python
from vak_sms import VakSmsClient

client = VakSmsClient(api_key="YOUR_API_KEY")

# Order a number for Telegram in Russia
order = client.get_number("tg", country="ru")
print(f"Phone Number: {order.tel}")
print(f"Operation ID: {order.id_num}")

# Wait for incoming SMS code (polls every 3 seconds up to 2 minutes)
code = client.wait_for_code(order.id_num, timeout=120.0)
if code:
    print(f"Received SMS code: {code}")
    # Complete activation
    client.set_status(order.id_num, "end")
else:
    # Release number if no code arrived
    client.set_status(order.id_num, "bad")
```

## API Methods

- `get_balance() -> float` — Returns current balance in RUB.
- `get_number(...) -> VakNumber` — Orders a temporary phone number.
- `prolong_number(...) -> VakNumber` — Extends duration for an existing number.
- `get_sms_code(id_num, all_codes?) -> str | list[str] | None` — Retrieves received SMS code(s).
- `wait_for_code(id_num, timeout?, interval?) -> str | None` — Polls until code arrives or times out.
- `set_status(id_num, status) -> str` — Updates activation status (`send`, `end`, `bad`).
- `get_count_number(service, country?, operator?) -> CountNumber` — Queries stock and pricing.
- `get_country_list() -> list[CountryOperator]` — Retrieves supported countries and operators.
- `get_count_numbers_list(country?, operator?, rent?) -> dict` — Retrieves full inventory catalog.

## License

ISC
