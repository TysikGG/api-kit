# VAK-SMS — Python

The `vak-sms-client` package provides a Python client for the [VAK-SMS API](https://vak-sms.com/en/api/).

```sh
pip install vak-sms-client
```

## Quick Check

Check account balance and browse supported countries without purchasing any numbers:

```python
import os
from vak_sms import VakSmsClient

api_key = os.environ["VAK_SMS_API_KEY"]

with VakSmsClient(api_key=api_key) as client:
    balance = client.get_balance()
    print(f"Balance: {balance:.2f} RUB")

    countries = client.get_country_list()
    print(f"Available countries: {len(countries)}")
```

Source: `vak-sms/python/examples/quickstart.py`.

The generated method reference is in [docs/vak-sms/python/vak_sms.md](python/vak_sms.md).
