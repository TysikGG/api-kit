<a id="sms_man.client"></a>

# sms\_man.client

<a id="sms_man.client.SmsMan"></a>

## SmsMan Objects

```python
class SmsMan()
```

Client for the SMS-MAN virtual number and SMS activation API.

**Arguments**:

- `token` - User API token for SMS-MAN.
- `base_url` - Base URL for SMS-MAN API. Defaults to "https://api.sms-man.com".
- `timeout` - HTTP request timeout in seconds. Defaults to 30.0.
  

**Examples**:

  >>> from sms_man import SmsMan
  >>> client = SmsMan(token="your_api_token")
  >>> balance = client.get_balance()

<a id="sms_man.client.SmsMan.close"></a>

#### close

```python
def close() -> None
```

Closes the underlying HTTP client session.

<a id="sms_man.client.SmsMan.get_balance"></a>

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
  120.0

<a id="sms_man.client.SmsMan.get_limits"></a>

#### get\_limits

```python
def get_limits(country_id: int | None = None,
               application_id: int | None = None) -> Any
```

Retrieves available number limits and counts.

**Arguments**:

- `country_id` - Optional country identifier.
- `application_id` - Optional service identifier.
  

**Returns**:

  Limits response dictionary.
  

**Examples**:

  >>> limits = client.get_limits(country_id=1, application_id=1)

<a id="sms_man.client.SmsMan.get_prices"></a>

#### get\_prices

```python
def get_prices(country_id: int | None = None) -> Any
```

Retrieves service pricing catalog.

**Arguments**:

- `country_id` - Optional country identifier.
  

**Returns**:

  Pricing dictionary.
  

**Examples**:

  >>> prices = client.get_prices(country_id=1)

<a id="sms_man.client.SmsMan.get_countries"></a>

#### get\_countries

```python
def get_countries() -> Any
```

Retrieves list of supported countries.

**Returns**:

  Countries dictionary.
  

**Examples**:

  >>> countries = client.get_countries()

<a id="sms_man.client.SmsMan.get_applications"></a>

#### get\_applications

```python
def get_applications() -> Any
```

Retrieves list of supported applications and services.

**Returns**:

  Applications dictionary.
  

**Examples**:

  >>> apps = client.get_applications()

<a id="sms_man.client.SmsMan.get_number"></a>

#### get\_number

```python
def get_number(country_id: int, application_id: int) -> PhoneNumberOrder
```

Orders a disposable virtual phone number.

**Arguments**:

- `country_id` - Country identifier (or 0 for random).
- `application_id` - Service identifier.
  

**Returns**:

  PhoneNumberOrder with requestId and number string.
  

**Examples**:

  >>> order = client.get_number(country_id=1, application_id=1)
  >>> print(order.number)

<a id="sms_man.client.SmsMan.get_sms"></a>

#### get\_sms

```python
def get_sms(request_id: int) -> SmsCodeResult
```

Retrieves the received SMS code for an active order.

**Arguments**:

- `request_id` - Order request ID.
  

**Returns**:

  SmsCodeResult object.
  

**Examples**:

  >>> res = client.get_sms(12345)
  >>> print(res.sms_code)

<a id="sms_man.client.SmsMan.set_status"></a>

#### set\_status

```python
def set_status(request_id: int, status: str) -> bool
```

Sets status of an active number order (e.g. 'ready', 'reject').

**Arguments**:

- `request_id` - Order request ID.
- `status` - Target status string.
  

**Returns**:

  True if status updated.
  

**Examples**:

  >>> client.set_status(12345, "reject")

<a id="sms_man.client.SmsMan.handler_get_balance"></a>

#### handler\_get\_balance

```python
def handler_get_balance() -> float
```

Retrieves account balance via SMS-Activate compatible handler endpoint.

**Returns**:

  Account balance.
  

**Examples**:

  >>> balance = client.handler_get_balance()

<a id="sms_man.client.SmsMan.handler_get_number"></a>

#### handler\_get\_number

```python
def handler_get_number(country: int | str, service: str) -> PhoneNumberOrder
```

Orders a number via the handler endpoint.

**Arguments**:

- `country` - Country identifier.
- `service` - Service code (e.g. 'tg', 'vk').
  

**Returns**:

  PhoneNumberOrder with request ID and phone number.
  

**Examples**:

  >>> order = client.handler_get_number(1, "tg")

<a id="sms_man.client.SmsMan.handler_get_status"></a>

#### handler\_get\_status

```python
def handler_get_status(order_id: int | str) -> HandlerStatusResult
```

Checks status and verification code via the handler endpoint.

**Arguments**:

- `order_id` - Order ID.
  

**Returns**:

  HandlerStatusResult object.
  

**Examples**:

  >>> status = client.handler_get_status(12345)

<a id="sms_man.client.SmsMan.handler_set_status"></a>

#### handler\_set\_status

```python
def handler_set_status(order_id: int | str, status: int) -> str
```

Sets status via the handler endpoint.

**Arguments**:

- `order_id` - Order ID.
- `status` - Status code.
  

**Returns**:

  Status text.
  

**Examples**:

  >>> client.handler_set_status(12345, 1)

<a id="sms_man.client.SmsMan.handler_get_prices"></a>

#### handler\_get\_prices

```python
def handler_get_prices(country: int | str | None = None) -> Any
```

Retrieves price catalog via the handler endpoint.

**Arguments**:

- `country` - Optional country ID.
  

**Returns**:

  Prices dictionary or response text.
  

**Examples**:

  >>> prices = client.handler_get_prices(1)

<a id="sms_man.types"></a>

# sms\_man.types

<a id="sms_man.types.PhoneNumberOrder"></a>

## PhoneNumberOrder Objects

```python
@dataclass
class PhoneNumberOrder()
```

Ordered virtual phone number details.

**Attributes**:

- `request_id` - Order request ID.
- `number` - Assigned phone number string.

<a id="sms_man.types.SmsCodeResult"></a>

## SmsCodeResult Objects

```python
@dataclass
class SmsCodeResult()
```

SMS verification code result.

**Attributes**:

- `sms_code` - Verification code if received.
- `error` - Error message string if code not yet arrived.

<a id="sms_man.types.HandlerStatusResult"></a>

## HandlerStatusResult Objects

```python
@dataclass
class HandlerStatusResult()
```

Compatible handler status response.

**Attributes**:

- `status` - Status code string (e.g. STATUS_OK, STATUS_WAIT_CODE).
- `code` - Verification code if status is STATUS_OK.

<a id="sms_man.errors"></a>

# sms\_man.errors

<a id="sms_man.errors.SmsManError"></a>

## SmsManError Objects

```python
class SmsManError(Exception)
```

Exception raised by the SMS-MAN API client.

**Attributes**:

- `code` - Error code string (e.g. wrong_token, no_numbers, BAD_KEY).
- `response_data` - Raw response payload.

