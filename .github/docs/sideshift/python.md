# SideShift — Python

The `sideshift` package provides a Python client for the [SideShift.ai REST API v2](https://docs.sideshift.ai).

```sh
pip install sideshift
```

## Quick Check

Check shift creation permissions and inspect a trading pair's exchange rate without creating orders:

```python
from sideshift import SideShift

with SideShift() as client:
    permissions = client.get_permissions()
    print(f"Can create shift: {permissions.create_shift}")

    pair = client.get_pair("eth", "ethereum", "btc", "bitcoin")
    print(f"ETH/BTC Rate: {pair.rate} (Min: {pair.min}, Max: {pair.max})")
```

Source: `sideshift/python/examples/check.py`.

The generated method reference is in [.github/docs/sideshift/python/sideshift.md](python/sideshift.md).
