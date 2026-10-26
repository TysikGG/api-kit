# SMSBower — Python

The `smsbower-client` package provides a Python client for the [SMSBower API](https://smsbower.app/api?page=client).

```sh
pip install smsbower-client
```

## Quick Check

Check account balance and browse supported services without placing any orders:

```python
import os
from smsbower import SmsBowerClient

api_key = os.environ["SMSBOWER_API_KEY"]

with SmsBowerClient(api_key=api_key) as client:
    balance = client.get_balance()
    print(f"Balance: ${balance:.2f}")

    services = client.get_services_list()
    print(f"Available services: {len(services)}")
```

Source: `smsbower/python/examples/quickstart.py`.

The generated method reference is in [docs/smsbower/python/smsbower.md](python/smsbower.md).
