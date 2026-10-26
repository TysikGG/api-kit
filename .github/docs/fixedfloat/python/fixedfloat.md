<a id="fixedfloat.client"></a>

# fixedfloat.client

FixedFloat API v2 client implementation.

<a id="fixedfloat.client.FixedFloat"></a>

## FixedFloat Objects

```python
class FixedFloat()
```

Client for the FixedFloat cryptocurrency exchange REST API v2.

**Arguments**:

- `api_key` - Your FixedFloat API key.
- `api_secret` - Your FixedFloat API secret for HMAC-SHA256 signatures.
- `base_url` - Base URL for FixedFloat API. Defaults to 'https://ff.io/api/v2'.
- `timeout` - Request timeout in seconds. Defaults to 15.0.
  

**Examples**:

  >>> from fixedfloat import FixedFloat
  >>> client = FixedFloat(api_key="key", api_secret="secret")
  >>> currencies = client.get_currencies()

<a id="fixedfloat.client.FixedFloat.close"></a>

#### close

```python
def close() -> None
```

Close the underlying HTTP client.

<a id="fixedfloat.client.FixedFloat.get_currencies"></a>

#### get\_currencies

```python
def get_currencies() -> list[Currency]
```

Retrieve list of available cryptocurrencies and blockchain networks.

**Returns**:

  List of Currency objects supported by FixedFloat.
  

**Examples**:

  >>> currencies = client.get_currencies()
  >>> print(currencies[0].code)
  'BTC'

<a id="fixedfloat.client.FixedFloat.get_price"></a>

#### get\_price

```python
def get_price(from_ccy: str,
              to_ccy: str,
              amount: float,
              direction: ExchangeDirection = "from",
              order_type: OrderType = "float",
              afftax: float | None = None) -> PriceResult
```

Calculate exchange price estimate for a currency pair.

**Arguments**:

- `from_ccy` - Source cryptocurrency code (e.g. 'BTC').
- `to_ccy` - Destination cryptocurrency code (e.g. 'ETH').
- `amount` - Exchange amount.
- `direction` - Direction of exchange ('from' or 'to').
- `order_type` - Rate type ('fixed' or 'float').
- `afftax` - Optional affiliate tax percentage.
  

**Returns**:

  PriceResult containing from and to conversion amounts and limits.
  

**Examples**:

  >>> price = client.get_price(
  ...     from_ccy="BTC", to_ccy="ETH", amount=0.1, direction="from", order_type="float"
  ... )
  >>> print(price.to_side.amount)

<a id="fixedfloat.client.FixedFloat.create_order"></a>

#### create\_order

```python
def create_order(from_ccy: str,
                 to_ccy: str,
                 amount: float,
                 to_address: str,
                 direction: ExchangeDirection = "from",
                 order_type: OrderType = "float",
                 extra_id: str | None = None,
                 refund_address: str | None = None,
                 refund_extra_id: str | None = None,
                 afftax: float | None = None) -> Order
```

Create a new cryptocurrency exchange order.

**Arguments**:

- `from_ccy` - Source cryptocurrency code (e.g. 'BTC').
- `to_ccy` - Destination cryptocurrency code (e.g. 'ETH').
- `amount` - Amount to exchange.
- `to_address` - Destination wallet address to receive funds.
- `direction` - Direction of exchange ('from' or 'to').
- `order_type` - Rate type ('fixed' or 'float').
- `extra_id` - Optional destination tag or memo.
- `refund_address` - Optional refund address.
- `refund_extra_id` - Optional refund tag or memo.
- `afftax` - Optional affiliate tax percentage.
  

**Returns**:

  Order object containing order ID and secret security token.
  

**Examples**:

  >>> order = client.create_order(
  ...     from_ccy="BTC",
  ...     to_ccy="ETH",
  ...     amount=0.1,
  ...     to_address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  ... )
  >>> print(order.id, order.token)

<a id="fixedfloat.client.FixedFloat.get_order"></a>

#### get\_order

```python
def get_order(id: str, token: str) -> Order
```

Retrieve the status and details of an exchange order.

**Arguments**:

- `id` - Unique order ID.
- `token` - Order security token.
  

**Returns**:

  Order details.
  

**Examples**:

  >>> order = client.get_order("ORD123", "TOKEN_ABC")
  >>> print(order.status)

<a id="fixedfloat.client.FixedFloat.set_emergency"></a>

#### set\_emergency

```python
def set_emergency(id: str,
                  token: str,
                  choice: EmergencyChoice,
                  address: str | None = None,
                  extra_id: str | None = None) -> Any
```

Set emergency resolution choice (EXCHANGE or REFUND) on an order.

**Arguments**:

- `id` - Unique order ID.
- `token` - Order security token.
- `choice` - Resolution action ('EXCHANGE' or 'REFUND').
- `address` - Optional refund address.
- `extra_id` - Optional refund destination tag or memo.
  

**Returns**:

  API response data.
  

**Examples**:

  >>> client.set_emergency("ORD123", "TOKEN_ABC", choice="REFUND")

<a id="fixedfloat.client.FixedFloat.set_email"></a>

#### set\_email

```python
def set_email(id: str, token: str, email: str) -> Any
```

Set notification email address on an active order.

**Arguments**:

- `id` - Unique order ID.
- `token` - Order security token.
- `email` - Email address.
  

**Returns**:

  API response data.
  

**Examples**:

  >>> client.set_email("ORD123", "TOKEN_ABC", "user@example.com")

<a id="fixedfloat.client.FixedFloat.get_qr"></a>

#### get\_qr

```python
def get_qr(id: str, token: str) -> QrResult
```

Retrieve QR code for order deposit address.

**Arguments**:

- `id` - Unique order ID.
- `token` - Order security token.
  

**Returns**:

  QrResult containing image source data.
  

**Examples**:

  >>> qr = client.get_qr("ORD123", "TOKEN_ABC")
  >>> print(qr.src)

<a id="fixedfloat.types"></a>

# fixedfloat.types

Data models and type definitions for FixedFloat API.

<a id="fixedfloat.types.Currency"></a>

## Currency Objects

```python
@dataclass
class Currency()
```

Represents a cryptocurrency supported by FixedFloat.

<a id="fixedfloat.types.PriceSide"></a>

## PriceSide Objects

```python
@dataclass
class PriceSide()
```

Details of one side (from or to) in a price quote.

<a id="fixedfloat.types.PriceResult"></a>

## PriceResult Objects

```python
@dataclass
class PriceResult()
```

Calculated exchange price result.

<a id="fixedfloat.types.OrderTx"></a>

## OrderTx Objects

```python
@dataclass
class OrderTx()
```

Transaction details for an order deposit or payout.

<a id="fixedfloat.types.OrderSide"></a>

## OrderSide Objects

```python
@dataclass
class OrderSide()
```

Deposit or receive side information in an order.

<a id="fixedfloat.types.OrderTime"></a>

## OrderTime Objects

```python
@dataclass
class OrderTime()
```

Timestamps associated with an order.

<a id="fixedfloat.types.Order"></a>

## Order Objects

```python
@dataclass
class Order()
```

Exchange order details.

<a id="fixedfloat.types.QrResult"></a>

## QrResult Objects

```python
@dataclass
class QrResult()
```

QR code result for deposit address.

<a id="fixedfloat.errors"></a>

# fixedfloat.errors

Error classes for the FixedFloat API client.

<a id="fixedfloat.errors.FixedFloatError"></a>

## FixedFloatError Objects

```python
class FixedFloatError(Exception)
```

Exception raised when a FixedFloat API request fails or returns an error.

