# SMS-MAN — Python

The `sms-man` package provides a Python client for the [SMS-MAN API](https://sms-man.com/site/api).

```sh
pip install sms-man
```

## Quick Check

Check account balance and browse supported countries:

```python
import os
from sms_man import SmsMan

token = os.environ["SMSMAN_API_KEY"]

with SmsMan(token=token) as client:
    balance = client.get_balance()
    print(f"Balance: {balance}")

    countries = client.get_countries()
    print("Countries received:", bool(countries))
```

Source: `sms-man/python/examples/check.py`.

The generated method reference is in [.github/docs/sms-man/python/sms_man.md](python/sms_man.md).
