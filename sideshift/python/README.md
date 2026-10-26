# sideshift

[![PyPI version](https://img.shields.io/pypi/v/sideshift.svg)](https://pypi.org/project/sideshift/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/pypi/pyversions/sideshift.svg)](https://pypi.org/project/sideshift/)

Modern, fully typed Python client library for the [SideShift.ai](https://docs.sideshift.ai) instant cross-chain crypto swap and exchange REST API (v2).

Official API documentation: <https://docs.sideshift.ai>

---

## Features

- 🔄 **Fixed & Variable Rate Swaps** — Lock in guaranteed rates with fixed quotes, or create flexible variable-rate shifts.
- 🪙 **DEX & Cross-Chain Aggregator** — Support for 100+ cryptocurrencies across Bitcoin, Ethereum, Solana, Arbitrum, BSC, Tron, and more.
- 🐍 **Modern Pythonic Design** — Type annotations, dataclass models (`Shift`, `Quote`, `PairRate`, `Coin`, `Permissions`), context manager support (`with SideShift(...) as client:`), and custom exceptions.
- ⚡ **Non-Custodial** — Direct wallet-to-wallet automated exchanges with real-time on-chain tracking.

---

## Installation

```bash
pip install sideshift
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only queries public exchange permissions and pair exchange rates. It does not create orders:

```python
from sideshift import SideShift

with SideShift() as client:
    # Check if shifts are enabled
    permissions = client.get_permissions()
    print(f"Shifts enabled: {permissions.create_shift}")

    # Inspect exchange rate for ETH to BTC
    pair = client.get_pair(
        deposit_coin="eth",
        deposit_network="ethereum",
        settle_coin="btc",
        settle_network="bitcoin",
    )
    print(f"ETH/BTC Rate: {pair.rate} (Min: {pair.min}, Max: {pair.max})")
```

---

## Usage Guide

### 1. Creating a Fixed Rate Shift (Guaranteed Rate)

Get a guaranteed price quote and create a fixed-rate shift with deposit and settlement addresses:

```python
from sideshift import SideShift, SideShiftError

with SideShift() as client:
    # 1. Request a 15-minute guaranteed quote
    quote = client.request_quote(
        deposit_coin="eth",
        deposit_network="ethereum",
        settle_coin="btc",
        settle_network="bitcoin",
        deposit_amount="0.5",
    )
    print(f"Quote ID: {quote.id}")
    print(f"You send: {quote.deposit_amount} ETH -> You receive: {quote.settle_amount} BTC")
    print(f"Rate: {quote.rate}, Valid until: {quote.expires_at}")

    # 2. Create the fixed shift using the quote ID
    shift = client.create_fixed_shift(
        quote_id=quote.id,
        settle_address="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        refund_address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e",  # optional
    )

    print(f"Shift Created! ID: {shift.id}")
    print(f"Deposit Address: {shift.deposit_address}")
    print(f"Status: {shift.status}")
```

### 2. Creating a Variable Rate Shift (Floating Rate)

Create a variable shift where the final exchange rate is determined when your deposit confirms:

```python
var_shift = client.create_variable_shift(
    deposit_coin="usdt",
    deposit_network="ethereum",
    settle_coin="sol",
    settle_network="solana",
    settle_address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    refund_address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
)

print(f"Variable Shift ID: {var_shift.id}")
print(f"Send USDT to: {var_shift.deposit_address}")
```

### 3. Tracking Shift Status

Check real-time deposit confirmations and settlement transaction hashes:

```python
status = client.get_shift(shift.id)
print(f"Status: {status.status}")

if status.status == "settled":
    print(f"Settlement Tx: {status.settle_tx.hash if status.settle_tx else 'None'}")
    print(f"Delivered Amount: {status.settle_amount}")
```

### 4. Querying Supported Coins and Assets

List all supported cryptocurrencies and networks:

```python
coins = client.get_coins()
print(f"Supported coins count: {len(coins)}")

usdt = next((c for c in coins if c.coin == "USDT"), None)
if usdt:
    print("USDT supported networks:", usdt.networks)
```

---

## API Reference

### `SideShift` Class

#### Constructor

```python
SideShift(
    secret: Optional[str] = None,
    base_url: str = "https://sideshift.ai/api/v2",
    timeout: float = 30.0,
)
```

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `secret` | `str` | `None` | Optional SideShift account API secret. |
| `base_url` | `str` | `"https://sideshift.ai/api/v2"` | SideShift API v2 base URL. |
| `timeout` | `float` | `30.0` | Request timeout in seconds. |

#### Methods

- **`get_permissions() -> Permissions`** — Checks API permissions and platform status.
- **`get_coins() -> list[Coin]`** — Retrieves all supported coins and their networks.
- **`get_pair(deposit_coin, deposit_network, settle_coin, settle_network) -> PairRate`** — Returns rate and limits.
- **`get_pairs(pairs: list[str]) -> list[PairRate]`** — Batch queries rates for multiple pairs.
- **`request_quote(deposit_coin, deposit_network, settle_coin, settle_network, ...) -> Quote`** — Requests a guaranteed quote.
- **`create_fixed_shift(quote_id, settle_address, refund_address=None, ...) -> Shift`** — Creates a fixed-rate shift.
- **`create_variable_shift(deposit_coin, deposit_network, settle_coin, settle_network, settle_address, ...) -> Shift`** — Creates a variable-rate shift.
- **`get_shift(shift_id: str) -> Shift`** — Retrieves status and transactions of a shift.
- **`get_shifts(shift_ids: list[str]) -> list[Shift]`** — Batch status for multiple shifts.
- **`get_recent_shifts(limit=None) -> list[Shift]`** — Returns user's recent shifts.
- **`set_refund_address(shift_id: str, refund_address: str) -> Any`** — Sets refund address for pending shift.
- **`cancel_order(order_id: str) -> Any`** — Cancels order.
- **`get_xai_stats() -> XaiStats`** — Retrieves staking and token statistics.
- **`get_account() -> dict[str, Any]`** — Returns account information.

---

## Error Handling

When the API returns an error, `SideShiftError` is raised:

```python
from sideshift import SideShift, SideShiftError

try:
    with SideShift() as client:
        client.get_shift("invalid_id")
except SideShiftError as exc:
    print(f"SideShift Error: {exc.message} (Status: {exc.status_code})")
```

Common HTTP status codes:
- `400 Bad Request` — Invalid address format or pair parameters.
- `404 Not Found` — Shift or quote expired/not found.
- `429 Too Many Requests` — Rate limit exceeded.

---

## License

ISC
