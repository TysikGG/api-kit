# sideshift

Python client for the [SideShift.ai](https://docs.sideshift.ai) crypto swap and exchange REST API (v2).

## Installation

```bash
pip install sideshift
```

## Quick Start

```python
from sideshift import SideShift

with SideShift() as client:
    # Check shift creation permissions
    perms = client.get_permissions()
    print(f"Can create shift: {perms.create_shift}")

    # Query live trading pair exchange rate
    pair = client.get_pair("eth", "ethereum", "btc", "bitcoin")
    print(f"ETH/BTC Rate: {pair.rate} (Min: {pair.min}, Max: {pair.max})")
```

## Features

- Full coverage of SideShift.ai REST API v2:
  - `get_coins()`: List all supported cryptocurrencies and networks.
  - `get_pair(deposit_coin, deposit_network, settle_coin, settle_network)`: Exchange rates and limits.
  - `get_pairs(pairs)`: Bulk pair rates query.
  - `request_quote(...)`: Request fixed-rate quotes.
  - `create_fixed_shift(...)`: Create fixed-rate shift using quote.
  - `create_variable_shift(...)`: Create market-rate variable shift.
  - `get_shift(shift_id)`: Check status of an existing shift.
  - `get_shifts(shift_ids)`: Bulk shifts status check.
  - `get_recent_shifts(limit)`: List recent public completed shifts.
  - `get_permissions()`: Check regional permissions.
  - `get_xai_stats()`: Retrieve XAI token statistics.
  - `get_account()`: Account details (requires secret).
  - `set_refund_address(shift_id, refund_address)`: Set refund address.
  - `cancel_order(order_id)`: Cancel order after timeout.
- Fully typed data classes.
- Context manager support (`with SideShift() as client:`).

## License

ISC
