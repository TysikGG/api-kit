<a id="give_sms.client"></a>

# give\_sms.client

<a id="give_sms.client.GiveSms"></a>

## GiveSms Objects

```python
class GiveSms()
```

Client for the Give-SMS API.

Supports both the native JSON API (/api/v1/) and the SMS-Activate compatible
handler endpoint (/stubs/handler_api.php).

**Arguments**:

- `api_key` - User API key for Give-SMS.
- `base_url` - Base URL for requests. Defaults to "https://give-sms.com".
- `timeout` - Request timeout in seconds. Defaults to 30.0.
  

**Examples**:

  >>> from give_sms import GiveSms
  >>> client = GiveSms(api_key="your_api_key")
  >>> balance = client.get_balance()

<a id="give_sms.client.GiveSms.close"></a>

#### close

```python
def close() -> None
```

Closes the underlying HTTP client session.

<a id="give_sms.client.GiveSms.get_balance"></a>

#### get\_balance

```python
def get_balance() -> float
```

Retrieves account balance via the native JSON API (/api/v1/).

**Returns**:

  Current balance as a float.
  

**Examples**:

  >>> balance = client.get_balance()
  >>> print(balance)
  150.0

<a id="give_sms.client.GiveSms.get_count"></a>

#### get\_count

```python
def get_count(country: str | None = None,
              operator: str | None = None) -> dict[str, Any]
```

Retrieves available number counts for services via /api/v1/.

**Arguments**:

- `country` - Optional country identifier (e.g. "kazakhstan").
- `operator` - Optional telecom operator.
  

**Returns**:

  Dictionary mapping service keys to available number counts.
  

**Examples**:

  >>> counts = client.get_count(country="kazakhstan")
  >>> print(counts)

<a id="give_sms.client.GiveSms.get_number"></a>

#### get\_number

```python
def get_number(service: str,
               country: str | int | None = None,
               operator: str | None = None,
               max_price: float | int | None = None) -> ActivationNumber
```

Orders a phone number for the specified service via /api/v1/.

**Arguments**:

- `service` - Target service identifier (e.g. "vk", "tg", "wa").
- `country` - Optional country name or ID.
- `operator` - Optional operator name.
- `max_price` - Optional maximum acceptable price.
  

**Returns**:

  ActivationNumber with order ID and allocated phone number.
  

**Examples**:

  >>> order = client.get_number(service="vk", country="kazakhstan")
  >>> print(order.id, order.number)

<a id="give_sms.client.GiveSms.get_code"></a>

#### get\_code

```python
def get_code(order_id: str | int) -> CodeResult
```

Retrieves received SMS code or order status via /api/v1/.

**Arguments**:

- `order_id` - Activation order ID.
  

**Returns**:

  CodeResult with verification code, status string, and extra data.
  

**Examples**:

  >>> res = client.get_code(12345)
  >>> print(res.code, res.status)

<a id="give_sms.client.GiveSms.repeat_code"></a>

#### repeat\_code

```python
def repeat_code(order_id: str | int) -> bool
```

Requests a repeat SMS code for an order via /api/v1/.

**Arguments**:

- `order_id` - Activation order ID.
  

**Returns**:

  True if repeat request was sent successfully.
  

**Examples**:

  >>> client.repeat_code(12345)
  True

<a id="give_sms.client.GiveSms.cancel_number"></a>

#### cancel\_number

```python
def cancel_number(order_id: str | int) -> bool
```

Cancels an active phone number order via /api/v1/.

**Arguments**:

- `order_id` - Activation order ID.
  

**Returns**:

  True if cancelled successfully.
  

**Examples**:

  >>> client.cancel_number(12345)
  True

<a id="give_sms.client.GiveSms.ban_number"></a>

#### ban\_number

```python
def ban_number(order_id: str | int) -> bool
```

Marks a phone number as banned / blacklisted via /api/v1/.

**Arguments**:

- `order_id` - Activation order ID.
  

**Returns**:

  True if marked successfully.
  

**Examples**:

  >>> client.ban_number(12345)
  True

<a id="give_sms.client.GiveSms.get_reactivation_options"></a>

#### get\_reactivation\_options

```python
def get_reactivation_options(order_id: str | int) -> Any
```

Retrieves reactivation options for an order via /api/v1/.

**Arguments**:

- `order_id` - Activation order ID.
  

**Returns**:

  Reactivation options payload.
  

**Examples**:

  >>> options = client.get_reactivation_options(12345)

<a id="give_sms.client.GiveSms.reactivate"></a>

#### reactivate

```python
def reactivate(order_id: str | int) -> Any
```

Reactivates a previously ordered number via /api/v1/.

**Arguments**:

- `order_id` - Activation order ID.
  

**Returns**:

  Reactivation result payload.
  

**Examples**:

  >>> res = client.reactivate(12345)

<a id="give_sms.client.GiveSms.get_all"></a>

#### get\_all

```python
def get_all() -> Any
```

Retrieves all active orders for the account via /api/v1/.

**Returns**:

  Active orders response.
  

**Examples**:

  >>> orders = client.get_all()

<a id="give_sms.client.GiveSms.handler_get_balance"></a>

#### handler\_get\_balance

```python
def handler_get_balance() -> float
```

Retrieves account balance via SMS-Activate compatible handler endpoint.

**Returns**:

  Account balance.
  

**Examples**:

  >>> balance = client.handler_get_balance()

<a id="give_sms.client.GiveSms.handler_get_numbers_status"></a>

#### handler\_get\_numbers\_status

```python
def handler_get_numbers_status(country: str | int | None = None,
                               operator: str | None = None) -> dict[str, Any]
```

Retrieves available number counts via the handler endpoint.

**Arguments**:

- `country` - Optional country ID.
- `operator` - Optional operator name.
  

**Returns**:

  Service count mapping dictionary.
  

**Examples**:

  >>> counts = client.handler_get_numbers_status()

<a id="give_sms.client.GiveSms.handler_get_number"></a>

#### handler\_get\_number

```python
def handler_get_number(
        service: str,
        country: str | int | None = None,
        operator: str | None = None,
        max_price: float | int | None = None) -> ActivationNumber
```

Orders a number via the handler endpoint.

**Arguments**:

- `service` - Target service code (e.g. "vk").
- `country` - Optional country ID.
- `operator` - Optional operator name.
- `max_price` - Optional maximum price.
  

**Returns**:

  ActivationNumber with order ID and phone number.
  

**Examples**:

  >>> num = client.handler_get_number(service="vk", country=2)

<a id="give_sms.client.GiveSms.handler_set_status"></a>

#### handler\_set\_status

```python
def handler_set_status(order_id: str | int, status: int) -> str
```

Sets order status via the handler endpoint.

**Arguments**:

- `order_id` - Activation order ID.
- `status` - Status code (1 = ready, 3 = retry, 6 = finish, 8 = cancel).
  

**Returns**:

  Status text response.
  

**Examples**:

  >>> client.handler_set_status(12345, 1)
  'ACCESS_READY'

<a id="give_sms.client.GiveSms.handler_get_status"></a>

#### handler\_get\_status

```python
def handler_get_status(order_id: str | int) -> HandlerStatusResult
```

Retrieves order status and SMS code via the handler endpoint.

**Arguments**:

- `order_id` - Activation order ID.
  

**Returns**:

  HandlerStatusResult with status and code.
  

**Examples**:

  >>> status = client.handler_get_status(12345)
  >>> print(status.status, status.code)

<a id="give_sms.client.GiveSms.handler_get_prices"></a>

#### handler\_get\_prices

```python
def handler_get_prices(country: str | int | None = None,
                       service: str | None = None,
                       tiers: int | None = None) -> Any
```

Retrieves price catalog via handler endpoint.

**Arguments**:

- `country` - Optional country ID.
- `service` - Optional service name.
- `tiers` - Optional tiers flag (1 for detailed tiers).
  

**Returns**:

  Price catalog response dictionary.
  

**Examples**:

  >>> prices = client.handler_get_prices(country=2)

<a id="give_sms.types"></a>

# give\_sms.types

<a id="give_sms.types.ActivationNumber"></a>

## ActivationNumber Objects

```python
@dataclass
class ActivationNumber()
```

Ordered phone number result.

**Attributes**:

- `id` - Activation order ID.
- `number` - Allocated phone number string.

<a id="give_sms.types.CodeResult"></a>

## CodeResult Objects

```python
@dataclass
class CodeResult()
```

Result of querying SMS code.

**Attributes**:

- `status` - Current activation status.
- `code` - Verification code if received.
- `extra` - Additional payload details.

<a id="give_sms.types.HandlerStatusResult"></a>

## HandlerStatusResult Objects

```python
@dataclass
class HandlerStatusResult()
```

Handler status response.

**Attributes**:

- `status` - Status code string (e.g. STATUS_OK, STATUS_WAIT_CODE).
- `code` - Verification code if status is STATUS_OK or STATUS_WAIT_RETRY.

<a id="give_sms.errors"></a>

# give\_sms.errors

<a id="give_sms.errors.GiveSmsError"></a>

## GiveSmsError Objects

```python
class GiveSmsError(Exception)
```

Exception raised by the Give-SMS API client.

**Attributes**:

- `code` - HTTP status code or API error code.
- `response_data` - Raw response data from the API if available.

