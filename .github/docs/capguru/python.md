# CapGuru — Python

The `capguru-client` package provides a Python client for the [CapGuru API](https://cap.guru/api-docs/).

```sh
pip install capguru-client
```

## Quick Check

Check account balance and solve a Turnstile challenge:

```python
import os
from capguru import CapGuruClient

api_key = os.environ["CAPGURU_API_KEY"]

with CapGuruClient(api_key=api_key) as client:
    balance = client.get_balance()
    print(f"Balance: ${balance:.2f}")

    token = client.solve_turnstile(
        sitekey="0x4AAAAAAABnOYoqxxxxxx",
        pageurl="https://example.com",
    )
    print(f"Turnstile token: {token}")
```

Source: `capguru/python/examples/check.py`.

The generated method reference is in [.github/docs/capguru/python/capguru.md](python/capguru.md).
