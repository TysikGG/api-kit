# Give-SMS — Python

The `give-sms` package provides a Python client for the [Give-SMS API](https://give-sms.com/api.html).

```sh
pip install give-sms
```

## Quick Check

Check account balance and browse available service counts without placing any orders:

```python
import os
from give_sms import GiveSms

api_key = os.environ["GIVE_SMS_API_KEY"]

with GiveSms(api_key=api_key) as client:
    balance = client.get_balance()
    print(f"Balance: {balance}")

    counts = client.get_count(country="kazakhstan")
    print(f"Available services: {len(counts)}")
```

Source: `give-sms/python/examples/check.py`.

The generated method reference is in [.github/docs/give-sms/python/give_sms.md](python/give_sms.md).
