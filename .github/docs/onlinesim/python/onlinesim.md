<a id="onlinesim.client"></a>

# onlinesim.client

<a id="onlinesim.client.OnlineSim"></a>

## OnlineSim Objects

```python
class OnlineSim()
```

Client for the OnlineSIM virtual numbers and SMS verification API.

**Arguments**:

- `api_key` - User API key for OnlineSIM.
- `base_url` - Base URL for OnlineSIM API. Defaults to "https://onlinesim.io/api".
- `timeout` - HTTP request timeout in seconds. Defaults to 30.0.
  

**Examples**:

  >>> from onlinesim import OnlineSim
  >>> client = OnlineSim(api_key="your_api_key")
  >>> balance = client.get_balance()

<a id="onlinesim.client.OnlineSim.close"></a>

#### close

```python
def close() -> None
```

Closes the underlying HTTP client session.

<a id="onlinesim.client.OnlineSim.get_balance"></a>

#### get\_balance

```python
def get_balance() -> float
```

Retrieves user account balance.

**Returns**:

  Current balance as a float.
  

**Examples**:

  >>> balance = client.get_balance()
  >>> print(balance)
  100.50

<a id="onlinesim.client.OnlineSim.get_tariffs"></a>

#### get\_tariffs

```python
def get_tariffs(country: int | str | None = None) -> Any
```

Retrieves price tariffs and available numbers catalog.

**Arguments**:

- `country` - Optional country ID.
  

**Returns**:

  Tariffs dictionary.
  

**Examples**:

  >>> tariffs = client.get_tariffs(7)

<a id="onlinesim.client.OnlineSim.get_service_list"></a>

#### get\_service\_list

```python
def get_service_list(country: int | str | None = None) -> Any
```

Retrieves service list and counts for a country.

**Arguments**:

- `country` - Optional country code.
  

**Returns**:

  Service list payload.
  

**Examples**:

  >>> services = client.get_service_list(7)

<a id="onlinesim.client.OnlineSim.get_countries"></a>

#### get\_countries

```python
def get_countries() -> Any
```

Retrieves list of supported countries.

**Returns**:

  Countries payload dictionary.
  

**Examples**:

  >>> countries = client.get_countries()

<a id="onlinesim.client.OnlineSim.get_num"></a>

#### get\_num

```python
def get_num(service: str,
            country: int | str | None = None,
            reject: str | None = None,
            number: str | None = None,
            clean: bool = False) -> OrderResult
```

Orders a disposable phone number for SMS activation.

**Arguments**:

- `service` - Target service identifier (e.g. "telegram", "vk", "whatsapp").
- `country` - Country code.
- `reject` - Prefixes to reject.
- `number` - Specific desired number.
- `clean` - Whether to request clean session.
  

**Returns**:

  OrderResult with assigned tzid.
  

**Examples**:

  >>> order = client.get_num("telegram", country=7)
  >>> print(order.tzid)

<a id="onlinesim.client.OnlineSim.get_state"></a>

#### get\_state

```python
def get_state(tzid: int | str | None = None,
              message_to_code: int | None = None,
              msg_list: int | None = None) -> list[ActivationState]
```

Retrieves state and SMS content for activations.

**Arguments**:

- `tzid` - Optional activation order ID.
- `message_to_code` - Optional flag to extract code from message.
- `msg_list` - Optional flag to return complete list of messages.
  

**Returns**:

  List of ActivationState objects.
  

**Examples**:

  >>> states = client.get_state(12345)
  >>> print(states[0].msg)

<a id="onlinesim.client.OnlineSim.set_operation_ok"></a>

#### set\_operation\_ok

```python
def set_operation_ok(tzid: int | str) -> bool
```

Confirms successful receipt and closes the order.

**Arguments**:

- `tzid` - Activation order ID.
  

**Returns**:

  True if operation was confirmed.
  

**Examples**:

  >>> client.set_operation_ok(12345)

<a id="onlinesim.client.OnlineSim.set_operation_revise"></a>

#### set\_operation\_revise

```python
def set_operation_revise(tzid: int | str) -> bool
```

Requests repeat SMS code for the active number.

**Arguments**:

- `tzid` - Activation order ID.
  

**Returns**:

  True if repeat code was requested.
  

**Examples**:

  >>> client.set_operation_revise(12345)

<a id="onlinesim.client.OnlineSim.get_rent_tariffs"></a>

#### get\_rent\_tariffs

```python
def get_rent_tariffs() -> Any
```

Retrieves rental tariffs directory.

**Returns**:

  Rent tariffs payload.
  

**Examples**:

  >>> tariffs = client.get_rent_tariffs()

<a id="onlinesim.client.OnlineSim.get_rent_num"></a>

#### get\_rent\_num

```python
def get_rent_num(country: int | str,
                 days: int,
                 extension: bool = False) -> Any
```

Orders a rental phone number.

**Arguments**:

- `country` - Country code.
- `days` - Rental duration in days.
- `extension` - Whether to extend existing rent.
  

**Returns**:

  Rent order result dictionary.
  

**Examples**:

  >>> rent = client.get_rent_num(7, days=1)

<a id="onlinesim.client.OnlineSim.get_rent_state"></a>

#### get\_rent\_state

```python
def get_rent_state(tzid: int | str | None = None) -> Any
```

Checks status of rental numbers.

**Arguments**:

- `tzid` - Optional rental order ID.
  

**Returns**:

  Rent state payload.
  

**Examples**:

  >>> state = client.get_rent_state(12345)

<a id="onlinesim.client.OnlineSim.close_rent_num"></a>

#### close\_rent\_num

```python
def close_rent_num(tzid: int | str) -> bool
```

Releases and closes an active rental number.

**Arguments**:

- `tzid` - Rental order ID.
  

**Returns**:

  True if rental number was released.
  

**Examples**:

  >>> client.close_rent_num(12345)

<a id="onlinesim.types"></a>

# onlinesim.types

<a id="onlinesim.types.OrderResult"></a>

## OrderResult Objects

```python
@dataclass
class OrderResult()
```

Result of ordering a phone number.

**Attributes**:

- `tzid` - Order ID assigned by OnlineSIM.
- `response` - Response status string or number.

<a id="onlinesim.types.ActivationState"></a>

## ActivationState Objects

```python
@dataclass
class ActivationState()
```

State of an ordered number activation.

**Attributes**:

- `tzid` - Order ID.
- `response` - Status code (e.g. TZ_NUM_WAIT, TZ_NUM_ANSWER, TZ_OVER_EMPTY).
- `number` - Assigned phone number.
- `msg` - Received SMS message code or text.
- `service` - Service name.
- `time` - Remaining time in seconds.
- `raw_data` - Complete dictionary returned by API.

<a id="onlinesim.errors"></a>

# onlinesim.errors

<a id="onlinesim.errors.OnlineSimError"></a>

## OnlineSimError Objects

```python
class OnlineSimError(Exception)
```

Exception raised by the OnlineSIM API client.

**Attributes**:

- `code` - Error response string or status code (e.g. ERROR_WRONG_KEY, NO_NUMBER).
- `response_data` - Raw response payload.

