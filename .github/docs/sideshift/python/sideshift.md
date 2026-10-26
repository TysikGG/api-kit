<a id="sideshift.client"></a>

# sideshift.client

<a id="sideshift.client.SideShift"></a>

## SideShift Objects

```python
class SideShift()
```

Client for the SideShift.ai crypto swap REST API (v2).

**Arguments**:

- `secret` - Optional account secret for private endpoints (e.g. /account).
- `user_ip` - Optional end-user IP forwarded in `x-user-ip` header.
- `base_url` - SideShift API v2 base URL. Defaults to "https://sideshift.ai/api/v2".
- `timeout` - Request timeout in seconds. Defaults to 30.0.
  

**Examples**:

  >>> from sideshift import SideShift
  >>> client = SideShift()
  >>> coins = client.get_coins()

<a id="sideshift.client.SideShift.close"></a>

#### close

```python
def close() -> None
```

Closes the underlying HTTP client session.

<a id="sideshift.client.SideShift.get_coins"></a>

#### get\_coins

```python
def get_coins() -> list[Coin]
```

Retrieves list of all supported coins, tokens, and networks.

**Returns**:

  List of supported Coin objects.
  

**Examples**:

  >>> coins = client.get_coins()
  >>> print(len(coins))

<a id="sideshift.client.SideShift.get_pair"></a>

#### get\_pair

```python
def get_pair(deposit_coin: str, deposit_network: str, settle_coin: str,
             settle_network: str) -> PairRate
```

Retrieves exchange rate and deposit limits for a trading pair.

**Arguments**:

- `deposit_coin` - Source currency code (e.g. "eth").
- `deposit_network` - Source network (e.g. "ethereum").
- `settle_coin` - Target currency code (e.g. "btc").
- `settle_network` - Target network (e.g. "bitcoin").
  

**Returns**:

  PairRate with exchange rate, minimum, and maximum limits.
  

**Examples**:

  >>> pair = client.get_pair("eth", "ethereum", "btc", "bitcoin")
  >>> print(pair.rate)

<a id="sideshift.client.SideShift.get_pairs"></a>

#### get\_pairs

```python
def get_pairs(pairs: list[str]) -> list[PairRate]
```

Retrieves exchange rates and limits for multiple pairs in bulk.

**Arguments**:

- `pairs` - List of pair identifiers (e.g. ["eth-ethereum/btc-bitcoin"]).
  

**Returns**:

  List of PairRate objects.
  

**Examples**:

  >>> rates = client.get_pairs(["eth-ethereum/btc-bitcoin"])

<a id="sideshift.client.SideShift.request_quote"></a>

#### request\_quote

```python
def request_quote(deposit_coin: str,
                  deposit_network: str,
                  settle_coin: str,
                  settle_network: str,
                  deposit_amount: str | float | None = None,
                  settle_amount: str | float | None = None,
                  commission_rate: str | float | None = None) -> Quote
```

Requests a fixed rate quote.

**Arguments**:

- `deposit_coin` - Source currency code.
- `deposit_network` - Source network.
- `settle_coin` - Target currency code.
- `settle_network` - Target network.
- `deposit_amount` - Amount of deposit currency (optional if settle_amount given).
- `settle_amount` - Desired amount of settle currency (optional if deposit_amount given).
- `commission_rate` - Optional commission percentage (0 to 2).
  

**Returns**:

  Quote object.
  

**Examples**:

  >>> quote = client.request_quote(
  ...     "eth", "ethereum", "btc", "bitcoin", deposit_amount="1"
  ... )
  >>> print(quote.id, quote.rate)

<a id="sideshift.client.SideShift.create_fixed_shift"></a>

#### create\_fixed\_shift

```python
def create_fixed_shift(quote_id: str,
                       settle_address: str,
                       refund_address: str | None = None,
                       commission_rate: str | float | None = None) -> Shift
```

Creates a fixed-rate shift using a quote.

**Arguments**:

- `quote_id` - Quote ID.
- `settle_address` - Payout address.
- `refund_address` - Optional emergency refund address.
- `commission_rate` - Optional commission rate.
  

**Returns**:

  Shift object with deposit address.
  

**Examples**:

  >>> shift = client.create_fixed_shift(quote.id, "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")
  >>> print(shift.deposit_address)

<a id="sideshift.client.SideShift.create_variable_shift"></a>

#### create\_variable\_shift

```python
def create_variable_shift(deposit_coin: str,
                          deposit_network: str,
                          settle_coin: str,
                          settle_network: str,
                          settle_address: str,
                          refund_address: str | None = None,
                          commission_rate: str | float | None = None) -> Shift
```

Creates a variable-rate shift.

**Arguments**:

- `deposit_coin` - Source currency code.
- `deposit_network` - Source network.
- `settle_coin` - Target currency code.
- `settle_network` - Target network.
- `settle_address` - Payout address.
- `refund_address` - Optional refund address.
- `commission_rate` - Optional commission rate.
  

**Returns**:

  Shift object with deposit address.
  

**Examples**:

  >>> shift = client.create_variable_shift(
  ...     "eth", "ethereum", "btc", "bitcoin", "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
  ... )

<a id="sideshift.client.SideShift.get_shift"></a>

#### get\_shift

```python
def get_shift(shift_id: str) -> Shift
```

Retrieves status and details for an existing shift.

**Arguments**:

- `shift_id` - Shift order ID.
  

**Returns**:

  Shift details.
  

**Examples**:

  >>> shift = client.get_shift("shift_123")
  >>> print(shift.status)

<a id="sideshift.client.SideShift.get_shifts"></a>

#### get\_shifts

```python
def get_shifts(shift_ids: list[str]) -> list[Shift]
```

Retrieves bulk shift details.

**Arguments**:

- `shift_ids` - List of shift IDs.
  

**Returns**:

  List of Shift objects.
  

**Examples**:

  >>> shifts = client.get_shifts(["s1", "s2"])

<a id="sideshift.client.SideShift.get_recent_shifts"></a>

#### get\_recent\_shifts

```python
def get_recent_shifts(limit: int | None = None) -> list[Shift]
```

Retrieves recent completed shifts.

**Arguments**:

- `limit` - Optional number of shifts to return (1-100).
  

**Returns**:

  List of recent Shift objects.
  

**Examples**:

  >>> recent = client.get_recent_shifts(10)

<a id="sideshift.client.SideShift.get_permissions"></a>

#### get\_permissions

```python
def get_permissions() -> Permissions
```

Checks client permissions.

**Returns**:

  Permissions object.
  

**Examples**:

  >>> perms = client.get_permissions()
  >>> print(perms.create_shift)

<a id="sideshift.client.SideShift.get_xai_stats"></a>

#### get\_xai\_stats

```python
def get_xai_stats() -> XaiStats
```

Retrieves XAI token staking statistics.

**Returns**:

  XaiStats object.
  

**Examples**:

  >>> stats = client.get_xai_stats()
  >>> print(stats.total_supply)

<a id="sideshift.client.SideShift.get_account"></a>

#### get\_account

```python
def get_account() -> dict[str, Any]
```

Retrieves private account information (requires secret).

**Returns**:

  Account payload dictionary.
  

**Examples**:

  >>> acc = client.get_account()

<a id="sideshift.client.SideShift.set_refund_address"></a>

#### set\_refund\_address

```python
def set_refund_address(shift_id: str, refund_address: str) -> Any
```

Sets or updates the refund address for an active shift.

**Arguments**:

- `shift_id` - Shift order ID.
- `refund_address` - Destination address for refunds.
  

**Returns**:

  Response payload.
  

**Examples**:

  >>> client.set_refund_address("shift_123", "0xabc...")

<a id="sideshift.client.SideShift.cancel_order"></a>

#### cancel\_order

```python
def cancel_order(order_id: str) -> Any
```

Cancels an order after timeout.

**Arguments**:

- `order_id` - Order identifier.
  

**Returns**:

  Response payload.
  

**Examples**:

  >>> client.cancel_order("order_123")

<a id="sideshift.types"></a>

# sideshift.types

<a id="sideshift.types.Coin"></a>

## Coin Objects

```python
@dataclass
class Coin()
```

Supported cryptocurrency or token.

**Attributes**:

- `coin` - Coin symbol (e.g. "ETH").
- `name` - Full name.
- `networks` - List of available networks.
- `mainnet` - Primary network name if applicable.
- `has_memo` - Whether deposit address requires memo/tag.

<a id="sideshift.types.PairRate"></a>

## PairRate Objects

```python
@dataclass
class PairRate()
```

Exchange rate and limits for a specific pair.

**Attributes**:

- `deposit_coin` - Source currency code.
- `deposit_network` - Source network.
- `settle_coin` - Target currency code.
- `settle_network` - Target network.
- `rate` - Exchange rate string.
- `min` - Minimum deposit amount string.
- `max` - Maximum deposit amount string.

<a id="sideshift.types.Quote"></a>

## Quote Objects

```python
@dataclass
class Quote()
```

Fixed rate quote result.

**Attributes**:

- `id` - Quote ID.
- `created_at` - ISO timestamp of creation.
- `expires_at` - ISO timestamp of expiration.
- `deposit_coin` - Source currency.
- `deposit_network` - Source network.
- `settle_coin` - Destination currency.
- `settle_network` - Destination network.
- `deposit_amount` - Source amount.
- `settle_amount` - Settled amount.
- `rate` - Fixed exchange rate.

<a id="sideshift.types.Shift"></a>

## Shift Objects

```python
@dataclass
class Shift()
```

Shift order details.

**Attributes**:

- `id` - Shift order ID.
- `created_at` - ISO timestamp of creation.
- `type` - Shift type ("fixed" or "variable").
- `status` - Current status string.
- `deposit_address` - Address where deposit funds should be sent.
- `settle_address` - Destination payout address.
- `deposit_coin` - Source currency.
- `deposit_network` - Source network.
- `settle_coin` - Destination currency.
- `settle_network` - Destination network.
- `deposit_min` - Minimum deposit amount if available.
- `deposit_max` - Maximum deposit amount if available.
- `rate` - Exchange rate if available.
- `deposit_amount` - Actual deposited amount.
- `settle_amount` - Settled amount.
- `raw_data` - Complete dictionary returned by API.

<a id="sideshift.types.Permissions"></a>

## Permissions Objects

```python
@dataclass
class Permissions()
```

Client permissions.

**Attributes**:

- `create_shift` - Whether creating shifts is permitted.

<a id="sideshift.types.XaiStats"></a>

## XaiStats Objects

```python
@dataclass
class XaiStats()
```

XAI token statistics.

**Attributes**:

- `total_supply` - Total supply number.
- `circulating_supply` - Circulating supply.
- `number_of_stakers` - Active stakers count.
- `total_staked` - Total staked amount.
- `xai_price_usd` - Current USD price.

<a id="sideshift.errors"></a>

# sideshift.errors

<a id="sideshift.errors.SideShiftError"></a>

## SideShiftError Objects

```python
class SideShiftError(Exception)
```

Exception raised by the SideShift client when an API call fails.

**Attributes**:

- `code` - Error code returned by SideShift (e.g. BAD_USER_INPUT, NOT_FOUND).
- `status_code` - HTTP status code.
- `response_data` - Raw JSON payload or response text.

