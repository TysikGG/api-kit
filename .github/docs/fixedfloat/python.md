# FixedFloat — Python

The `fixedfloat-client` package provides a Python client for the [FixedFloat API v2](https://fixedfloat.com/api).

```sh
pip install fixedfloat-client
```

## Quick Check

Retrieve available currencies and calculate exchange rate estimates without creating orders:

```python
import os
from fixedfloat import FixedFloat

with FixedFloat(
    api_key=os.getenv("FIXEDFLOAT_API_KEY"),
    api_secret=os.getenv("FIXEDFLOAT_API_SECRET"),
) as client:
    currencies = client.get_currencies()
    print(f"Available currencies: {len(currencies)}")

    price = client.get_price(
        from_ccy="BTC",
        to_ccy="ETH",
        amount=0.1,
        direction="from",
        order_type="float",
    )
    print(f"0.1 BTC -> {price.to_side.amount} ETH")
```

Source: `fixedfloat/python/examples/check.py`.

The generated method reference is in [.github/docs/fixedfloat/python/fixedfloat.md](python/fixedfloat.md).
