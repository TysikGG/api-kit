<a id="stealthex.client"></a>

# stealthex.client

<a id="stealthex.client.StealthEX"></a>

## StealthEX Objects

```python
class StealthEX()
```

Client for the StealthEX cryptocurrency exchange API.

**Attributes**:

- `api_key` - StealthEX API key.
- `base_url` - Base URL of the API.

<a id="stealthex.client.StealthEX.__init__"></a>

#### \_\_init\_\_

```python
def __init__(api_key: str | None = None,
             base_url: str | None = None,
             timeout: float = 30.0,
             user_agent: str | None = None) -> None
```

Initializes the StealthEX client.

**Arguments**:

- `api_key` - StealthEX API key. Defaults to STEALTHEX_API_KEY environment variable.
- `base_url` - Base URL for the StealthEX API. Defaults to https://api.stealthex.io.
- `timeout` - Timeout in seconds for HTTP requests. Defaults to 30.0.
- `user_agent` - Custom User-Agent header string.
  

**Examples**:

  >>> from stealthex import StealthEX
  >>> client = StealthEX(api_key="your-api-key")
  >>> currencies = client.get_currencies()
  >>> print(len(currencies))

<a id="stealthex.client.StealthEX.close"></a>

#### close

```python
def close() -> None
```

Closes the underlying HTTP client session.

<a id="stealthex.client.StealthEX.get_currencies"></a>

#### get\_currencies

```python
def get_currencies(fixed: bool | None = None) -> list[StealthEXCurrency]
```

Retrieves all supported cryptocurrencies and networks.

**Arguments**:

- `fixed` - Optional filter for fixed-rate availability.
  

**Returns**:

  List of supported currencies.
  

**Examples**:

  >>> currencies = client.get_currencies()
  >>> print(currencies[0]["symbol"])

<a id="stealthex.client.StealthEX.get_currency"></a>

#### get\_currency

```python
def get_currency(symbol: str) -> StealthEXCurrency
```

Retrieves details for a single currency.

**Arguments**:

- `symbol` - Currency ticker symbol (e.g. 'btc').
  

**Returns**:

  Currency details.
  

**Examples**:

  >>> btc = client.get_currency("btc")
  >>> print(btc["name"])

<a id="stealthex.client.StealthEX.get_pairs"></a>

#### get\_pairs

```python
def get_pairs(symbol: str | None = None) -> list[str]
```

Retrieves available exchange pairs.

**Arguments**:

- `symbol` - Optional source currency ticker to filter available pairs.
  

**Returns**:

  List of available pair symbols.
  

**Examples**:

  >>> pairs = client.get_pairs("btc")
  >>> print(pairs[:5])

<a id="stealthex.client.StealthEX.get_range"></a>

#### get\_range

```python
def get_range(from_currency: str,
              to_currency: str,
              fixed: bool | None = None) -> RangeResult
```

Retrieves minimum and maximum deposit range for a pair.

**Arguments**:

- `from_currency` - Deposit asset ticker.
- `to_currency` - Receiving asset ticker.
- `fixed` - Fixed exchange rate flag.
  

**Returns**:

  Dictionary with min_amount and max_amount.
  

**Examples**:

  >>> r = client.get_range("btc", "eth")
  >>> print(r["min_amount"])

<a id="stealthex.client.StealthEX.get_min_amount"></a>

#### get\_min\_amount

```python
def get_min_amount(from_currency: str,
                   to_currency: str,
                   fixed: bool | None = None) -> MinAmountResult
```

Retrieves minimal deposit amount required for a pair.

**Arguments**:

- `from_currency` - Deposit asset ticker.
- `to_currency` - Receiving asset ticker.
- `fixed` - Fixed exchange rate flag.
  

**Returns**:

  Dictionary with min_amount.
  

**Examples**:

  >>> m = client.get_min_amount("btc", "eth")
  >>> print(m["min_amount"])

<a id="stealthex.client.StealthEX.get_estimate"></a>

#### get\_estimate

```python
def get_estimate(from_currency: str,
                 to_currency: str,
                 amount: float | str,
                 fixed: bool | None = None) -> EstimateResult
```

Retrieves estimated return amount for an exchange.

**Arguments**:

- `from_currency` - Deposit asset ticker.
- `to_currency` - Receiving asset ticker.
- `amount` - Deposit amount.
- `fixed` - Fixed exchange rate flag.
  

**Returns**:

  Dictionary with estimated_amount.
  

**Examples**:

  >>> est = client.get_estimate("btc", "eth", "0.1")
  >>> print(est["estimated_amount"])

<a id="stealthex.client.StealthEX.create_exchange"></a>

#### create\_exchange

```python
def create_exchange(currency_from: str,
                    currency_to: str,
                    amount_from: float | str,
                    address_to: str,
                    amount_to: float | str | None = None,
                    extra_id_to: str | None = None,
                    refund_address: str | None = None,
                    refund_extra_id: str | None = None,
                    rate_id: str | None = None,
                    fixed: bool | None = None,
                    referral: str | None = None) -> ExchangeDetails
```

Creates a cryptocurrency exchange order.

**Arguments**:

- `currency_from` - Deposit asset symbol.
- `currency_to` - Receiving asset symbol.
- `amount_from` - Deposit amount.
- `address_to` - Recipient wallet address.
- `amount_to` - Receiving amount (optional).
- `extra_id_to` - Destination memo / extra ID (optional).
- `refund_address` - Refund wallet address (optional).
- `refund_extra_id` - Refund memo / extra ID (optional).
- `rate_id` - Rate ID for fixed rates.
- `fixed` - Fixed exchange rate flag.
- `referral` - Optional referral identifier.
  

**Returns**:

  Order details containing deposit address.
  

**Examples**:

  >>> order = client.create_exchange(
  ...     currency_from="btc",
  ...     currency_to="eth",
  ...     amount_from="0.1",
  ...     address_to="0xYourAddress...",
  ... )
  >>> print(order["address_from"])

<a id="stealthex.client.StealthEX.get_exchange"></a>

#### get\_exchange

```python
def get_exchange(exchange_id: str) -> ExchangeDetails
```

Retrieves details and status of an exchange by ID.

**Arguments**:

- `exchange_id` - StealthEX exchange ID.
  

**Returns**:

  Exchange details.
  

**Examples**:

  >>> order = client.get_exchange("exchange-id")
  >>> print(order["status"])

<a id="stealthex.client.StealthEX.get_exchanges"></a>

#### get\_exchanges

```python
def get_exchanges(limit: int | None = None) -> list[ExchangeDetails]
```

Lists previous transactions.

**Arguments**:

- `limit` - Maximum items to return.
  

**Returns**:

  List of exchange details.
  

**Examples**:

  >>> txs = client.get_exchanges(limit=10)
  >>> print(len(txs))

<a id="stealthex.errors"></a>

# stealthex.errors

<a id="stealthex.errors.StealthEXError"></a>

## StealthEXError Objects

```python
class StealthEXError(Exception)
```

Exception raised when a StealthEX API operation fails.

