# SMSBulk — Python

The `smsbulk-client` package provides a Python client for the [SMSBulk](https://smsbulk.net/en/docs) virtual phone number and email verification API.

```sh
pip install smsbulk-client
```

## Quick Check

Read wallet balance and list available services without reserving any numbers:

```python
import os
from smsbulk import SMSBulk

api_key = os.environ["SMSBULK_API_KEY"]

with SMSBulk(api_key=api_key) as client:
    balance = client.get_balance()
    print(f"Balance: {balance['balance']} {balance['currency']}")

    services = client.get_services()
    print(f"Available services: {services['count']}")
```

Source: `smsbulk/python/examples/quickstart.py`.

The generated method reference is in [docs/smsbulk/python/smsbulk.md](python/smsbulk.md).
