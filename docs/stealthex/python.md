# StealthEX — Python

The `stealthex-client` package provides a Python client for the [StealthEX](https://stealthex.io) non-custodial cryptocurrency exchange API.

```sh
pip install stealthex-client
```

## Quick Check

Read supported currencies and query exchange rate estimates without creating orders:

```python
import os
from stealthex import StealthEX

client = StealthEX(api_key=os.environ["STEALTHEX_API_KEY"])

currencies = client.get_currencies()
print(f"Currencies available: {len(currencies)}")

est = client.get_estimate("btc", "eth", "0.1")
print(f"0.1 BTC -> {est['estimated_amount']} ETH")
```

Source: `stealthex/python/examples/quickstart.py`.

The generated method reference is in [docs/stealthex/python/stealthex.md](python/stealthex.md).
