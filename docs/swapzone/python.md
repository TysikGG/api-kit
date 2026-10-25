# Swapzone — Python

The `swapzone-client` package provides a Python client for the [Swapzone](https://swapzone.io) instant cryptocurrency exchange and DEX aggregator API.

```sh
pip install swapzone-client
```

## Quick Check

Retrieve supported currencies and query live exchange rates without creating transactions:

```python
import os
from swapzone import Swapzone

client = Swapzone(api_key=os.environ["SWAPZONE_API_KEY"])

currencies = client.get_currencies()
print(f"Currencies available: {len(currencies)}")

rate = client.get_rate("btc", "eth", "0.1")
print(f"0.1 BTC -> {rate['amountTo']} ETH via {rate['adapter']}")
```

Source: `swapzone/python/examples/quickstart.py`.

The generated method reference is in [docs/swapzone/python/swapzone.md](python/swapzone.md).
