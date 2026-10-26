<a id="simpleswap.client"></a>

# simpleswap.client

<a id="simpleswap.client.SimpleSwap"></a>

## SimpleSwap Objects

```python
class SimpleSwap()
```

Client for the SimpleSwap cryptocurrency exchange API (v3).

**Attributes**:

- `api_key` - SimpleSwap API key.
- `base_url` - Base URL of the API.

<a id="simpleswap.client.SimpleSwap.__init__"></a>

#### \_\_init\_\_

```python
def __init__(api_key: str | None = None,
             base_url: str | None = None,
             timeout: float = 30.0,
             user_agent: str | None = None) -> None
```

Initializes the SimpleSwap client.

**Arguments**:

- `api_key` - SimpleSwap API key. Defaults to SIMPLESWAP_API_KEY environment variable.
- `base_url` - Base URL for the SimpleSwap API. Defaults to https://api.simpleswap.io.
- `timeout` - Timeout in seconds for HTTP requests. Defaults to 30.0.
- `user_agent` - Custom User-Agent header string.
  

**Examples**:

  >>> from simpleswap import SimpleSwap
  >>> client = SimpleSwap(api_key="your-api-key")
  >>> currencies = client.get_currencies()
  >>> print(len(currencies))

<a id="simpleswap.client.SimpleSwap.close"></a>

#### close

```python
def close() -> None
```

Closes the underlying HTTP client session.

<a id="simpleswap.client.SimpleSwap.get_currencies"></a>

#### get\_currencies

```python
def get_currencies() -> list[SimpleSwapCurrency]
```

Retrieves all supported cryptocurrencies and fiat currencies.

**Returns**:

  List of supported currencies and networks.
  

**Examples**:

  >>> currencies = client.get_currencies()
  >>> print(currencies[0]["ticker"])

<a id="simpleswap.client.SimpleSwap.get_currency"></a>

#### get\_currency

```python
def get_currency(ticker: str, network: str) -> SimpleSwapCurrency
```

Retrieves details for a specific currency and network.

**Arguments**:

- `ticker` - Currency ticker (e.g. 'btc').
- `network` - Blockchain network (e.g. 'btc').
  

**Returns**:

  Currency details.
  

**Examples**:

  >>> btc = client.get_currency("btc", "btc")
  >>> print(btc["name"])

<a id="simpleswap.client.SimpleSwap.get_estimate"></a>

#### get\_estimate

```python
def get_estimate(ticker_from: str,
                 ticker_to: str,
                 amount: float | str,
                 network_from: str | None = None,
                 network_to: str | None = None,
                 fixed: bool | None = None,
                 reverse: bool | None = None,
                 custom_fee: float | str | None = None) -> EstimateResult
```

Retrieves estimated receiving amount for an exchange.

**Arguments**:

- `ticker_from` - Deposit currency ticker.
- `ticker_to` - Receiving currency ticker.
- `amount` - Deposit amount.
- `network_from` - Deposit network.
- `network_to` - Receiving network.
- `fixed` - Fixed exchange rate flag.
- `reverse` - Reverse calculation flag.
- `custom_fee` - Customizable affiliate commission percentage.
  

**Returns**:

  Estimated return amount and rate identification.
  

**Examples**:

  >>> est = client.get_estimate("btc", "eth", amount="0.1")
  >>> print(est["estimatedAmount"])

<a id="simpleswap.client.SimpleSwap.get_ranges"></a>

#### get\_ranges

```python
def get_ranges(ticker_from: str,
               ticker_to: str,
               network_from: str | None = None,
               network_to: str | None = None,
               fixed: bool | None = None,
               reverse: bool | None = None) -> RangesResult
```

Retrieves deposit bounds (minimum and maximum amounts).

**Arguments**:

- `ticker_from` - Deposit currency ticker.
- `ticker_to` - Receiving currency ticker.
- `network_from` - Deposit network.
- `network_to` - Receiving network.
- `fixed` - Fixed exchange rate flag.
- `reverse` - Reverse range flag.
  

**Returns**:

  Dictionary with min and max deposit limits.
  

**Examples**:

  >>> ranges = client.get_ranges("btc", "eth")
  >>> print(f"Min: {ranges['min']}")

<a id="simpleswap.client.SimpleSwap.check_exchange"></a>

#### check\_exchange

```python
def check_exchange(ticker_from: str,
                   ticker_to: str,
                   amount: float | str,
                   network_from: str | None = None,
                   network_to: str | None = None,
                   fixed: bool | None = None,
                   reverse: bool | None = None) -> CheckExchangeResult
```

Checks if an exchange can be created for the pair and amount.

**Arguments**:

- `ticker_from` - Deposit currency ticker.
- `ticker_to` - Receiving currency ticker.
- `amount` - Deposit amount.
- `network_from` - Deposit network.
- `network_to` - Receiving network.
- `fixed` - Fixed exchange rate flag.
- `reverse` - Reverse calculation flag.
  

**Returns**:

  Dictionary with canCreate boolean.
  

**Examples**:

  >>> check = client.check_exchange("btc", "eth", amount="0.1")
  >>> print(check["canCreate"])

<a id="simpleswap.client.SimpleSwap.create_exchange"></a>

#### create\_exchange

```python
def create_exchange(ticker_from: str,
                    ticker_to: str,
                    amount: float | str,
                    address_to: str,
                    network_from: str | None = None,
                    network_to: str | None = None,
                    fixed: bool | None = None,
                    extra_id_to: str | None = None,
                    user_refund_address: str | None = None,
                    user_refund_extra_id: str | None = None,
                    rate_id: str | None = None,
                    custom_fee: float | str | None = None) -> ExchangeOrder
```

Creates a cryptocurrency exchange order.

**Arguments**:

- `ticker_from` - Deposit currency ticker.
- `ticker_to` - Receiving currency ticker.
- `amount` - Deposit amount.
- `address_to` - Destination wallet address.
- `network_from` - Deposit network.
- `network_to` - Receiving network.
- `fixed` - Fixed exchange rate flag.
- `extra_id_to` - Extra ID / memo for destination.
- `user_refund_address` - Refund wallet address.
- `user_refund_extra_id` - Refund extra ID.
- `rate_id` - Fixed rate ID.
- `custom_fee` - Optional customizable fee.
  

**Returns**:

  Created order details containing deposit address.
  

**Examples**:

  >>> order = client.create_exchange(
  ...     ticker_from="btc",
  ...     ticker_to="eth",
  ...     amount="0.1",
  ...     address_to="0xYourAddress...",
  ... )
  >>> print(order["addressFrom"])

<a id="simpleswap.client.SimpleSwap.get_exchange"></a>

#### get\_exchange

```python
def get_exchange(exchange_id: str) -> ExchangeOrder
```

Retrieves details of an exchange order by ID.

**Arguments**:

- `exchange_id` - SimpleSwap exchange ID.
  

**Returns**:

  Exchange order details and status.
  

**Examples**:

  >>> order = client.get_exchange("exchange-id")
  >>> print(order["status"])

<a id="simpleswap.client.SimpleSwap.get_exchanges"></a>

#### get\_exchanges

```python
def get_exchanges(limit: int | None = None,
                  offset: int | None = None,
                  start_date: str | None = None,
                  finish_date: str | None = None) -> list[ExchangeOrder]
```

Lists previous exchange orders.

**Arguments**:

- `limit` - Maximum items to return.
- `offset` - Pagination offset.
- `start_date` - ISO start date filter.
- `finish_date` - ISO end date filter.
  

**Returns**:

  List of exchange orders.
  

**Examples**:

  >>> orders = client.get_exchanges(limit=10)
  >>> print(len(orders))

<a id="simpleswap.errors"></a>

# simpleswap.errors

<a id="simpleswap.errors.SimpleSwapError"></a>

## SimpleSwapError Objects

```python
class SimpleSwapError(Exception)
```

Exception raised when a SimpleSwap API operation fails.

