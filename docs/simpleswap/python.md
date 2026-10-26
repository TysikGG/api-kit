# SimpleSwap — Python

The `simpleswap-client` package provides a Python client for the [SimpleSwap](https://simpleswap.io/en/affiliate-program/help-center/article/public-api-guide) cryptocurrency exchange API (v3).

```sh
pip install simpleswap-client
```

## Quick Check

Read supported currencies and calculate estimated exchange rate without creating orders:

```python
import os
from simpleswap import SimpleSwap

client = SimpleSwap(api_key=os.environ["SIMPLESWAP_API_KEY"])

currencies = client.get_currencies()
print(f"Currencies available: {len(currencies)}")

est = client.get_estimate(
    ticker_from="btc",
    ticker_to="eth",
    network_from="btc",
    network_to="eth",
    amount="0.1",
)
print(f"0.1 BTC -> {est['estimatedAmount']} ETH")
```

Source: `simpleswap/python/examples/quickstart.py`.

The generated method reference is in [docs/simpleswap/python/simpleswap.md](python/simpleswap.md).
