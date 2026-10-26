<a id="sv_number.client"></a>

# sv\_number.client

Client for the SV Number SMS verification API.

<a id="sv_number.client.SvNumber"></a>

## SvNumber Objects

```python
class SvNumber()
```

Client for the SV Number SMS verification service.

**Arguments**:

- `api_key` - SV Number API key.
- `base_url` - Custom API base URL (defaults to `https://sms-verification-number.com`).
- `timeout` - Request timeout in seconds (defaults to 30.0).
- `lang` - Language preference (e.g. `en`, `ru`).
  

**Examples**:

  >>> from sv_number import SvNumber
  >>> with SvNumber("your_api_key") as client:
  ...     balance = client.get_balance()

<a id="sv_number.client.SvNumber.close"></a>

#### close

```python
def close() -> None
```

Close the underlying HTTP client.

<a id="sv_number.client.SvNumber.call"></a>

#### call

```python
def call(action: str, params: Mapping[str, Any] | None = None) -> Any
```

Execute a low-level call to /stubs/handler_api.

Automatically attaches ``api_key``, ``ref_key``, and ``lang``.

<a id="sv_number.client.SvNumber.get_balance"></a>

#### get\_balance

```python
def get_balance() -> float
```

Retrieve current balance in USD.

**Returns**:

  Balance amount.
  

**Examples**:

  >>> with SvNumber("key") as client:
  ...     print(client.get_balance())

<a id="sv_number.client.SvNumber.get_number"></a>

#### get\_number

```python
def get_number(service: str,
               *,
               country: str | int = 0,
               operator: str | None = None) -> OrderedNumber
```

Rent a temporary phone number.

**Arguments**:

- `service` - Service identifier (e.g. ``wa``, ``tg``).
- `country` - Country code or ID (defaults to 0).
- `operator` - Specific mobile operator name.
  

**Returns**:

  Dictionary with ``activation_id`` and ``phone_number``.
  

**Examples**:

  >>> with SvNumber("key") as client:
  ...     order = client.get_number("wa", country=0)
  ...     print(order["phone_number"])

<a id="sv_number.client.SvNumber.get_status"></a>

#### get\_status

```python
def get_status(activation_id: str | int) -> ActivationStatus
```

Check current status of an activation.

**Arguments**:

- `activation_id` - Activation ID.
  

**Returns**:

  Dictionary with ``status`` (and optional ``code``).
  

**Examples**:

  >>> with SvNumber("key") as client:
  ...     status = client.get_status(activation_id)

<a id="sv_number.client.SvNumber.set_status"></a>

#### set\_status

```python
def set_status(activation_id: str | int, status: int) -> str
```

Update activation status.

**Arguments**:

- `activation_id` - Activation ID.
- `status` - Status integer (1 = ready, 6 = complete, 8 = cancel).

<a id="sv_number.client.SvNumber.ready"></a>

#### ready

```python
def ready(activation_id: str | int) -> str
```

Signal that the SMS has been requested (status=1).

<a id="sv_number.client.SvNumber.complete"></a>

#### complete

```python
def complete(activation_id: str | int) -> str
```

Finish the activation successfully (status=6).

<a id="sv_number.client.SvNumber.cancel"></a>

#### cancel

```python
def cancel(activation_id: str | int) -> str
```

Cancel the activation (status=8).

<a id="sv_number.client.SvNumber.wait_for_code"></a>

#### wait\_for\_code

```python
def wait_for_code(activation_id: str | int,
                  *,
                  timeout: float = 120.0,
                  interval: float = 3.0) -> str
```

Poll get_status until an SMS code arrives or timeout expires.

**Arguments**:

- `activation_id` - Activation ID.
- `timeout` - Maximum wait time in seconds (defaults to 120.0).
- `interval` - Delay between checks in seconds (defaults to 3.0).
  

**Returns**:

  Extracted verification code string.

<a id="sv_number.client.SvNumber.get_prices"></a>

#### get\_prices

```python
def get_prices(country: str | int | None = None) -> dict[str, Any]
```

Fetch price matrix grouped by country and service.

<a id="sv_number.client.SvNumber.get_services_and_cost"></a>

#### get\_services\_and\_cost

```python
def get_services_and_cost(*,
                          country: str | int = 0,
                          operator: str | None = None,
                          service: str | None = None) -> list[ServiceCostItem]
```

Get services with price and quantity for a country.

<a id="sv_number.types"></a>

# sv\_number.types

Type definitions for the SV Number API client.

<a id="sv_number.types.OrderedNumber"></a>

## OrderedNumber Objects

```python
class OrderedNumber(TypedDict)
```

Details of an ordered virtual number.

<a id="sv_number.types.ActivationStatus"></a>

## ActivationStatus Objects

```python
class ActivationStatus(TypedDict)
```

Status of an activation.

<a id="sv_number.types.ServiceCostItem"></a>

## ServiceCostItem Objects

```python
class ServiceCostItem(TypedDict)
```

Service pricing and availability item.

<a id="sv_number.errors"></a>

# sv\_number.errors

Error types for the SV Number API client.

<a id="sv_number.errors.SvNumberError"></a>

## SvNumberError Objects

```python
class SvNumberError(Exception)
```

Exception raised for SV Number API errors.

**Arguments**:

- `code` - Error code string (e.g. `BAD_KEY`, `NO_NUMBERS`).
- `raw` - Raw response body, if available.

<a id="sv_number.errors.assert_not_api_error"></a>

#### assert\_not\_api\_error

```python
def assert_not_api_error(data: Any) -> None
```

Check text data for known error codes.

<a id="sv_number.parse"></a>

# sv\_number.parse

Response parsers for SV Number.

<a id="sv_number.parse.parse_balance"></a>

#### parse\_balance

```python
def parse_balance(raw: Any) -> float
```

Parse balance from raw number or string.

<a id="sv_number.parse.parse_access_number"></a>

#### parse\_access\_number

```python
def parse_access_number(raw: str) -> OrderedNumber
```

Parse ACCESS_NUMBER response.

<a id="sv_number.parse.parse_status"></a>

#### parse\_status

```python
def parse_status(raw: str) -> ActivationStatus
```

Parse STATUS_ response.

