# OnlineSIM — Python

The `onlinesim` package provides a Python client for the [OnlineSIM API](https://onlinesim.io/docs/api/en).

```sh
pip install onlinesim
```

## Quick Check

Check account balance and browse supported countries:

```python
import os
from onlinesim import OnlineSim

api_key = os.environ["ONLINESIM_API_KEY"]

with OnlineSim(api_key=api_key) as client:
    balance = client.get_balance()
    print(f"Balance: {balance}")

    countries = client.get_countries()
    print("Countries received:", bool(countries))
```

Source: `onlinesim/python/examples/check.py`.

The generated method reference is in [.github/docs/onlinesim/python/onlinesim.md](python/onlinesim.md).
