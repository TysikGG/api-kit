<a id="vak_sms.client"></a>

# vak\_sms.client

VAK-SMS API client implementation.

<a id="vak_sms.client.VakSmsClient"></a>

## VakSmsClient Objects

```python
class VakSmsClient()
```

Client for the VAK-SMS temporary number and SMS OTP reception service.

**Arguments**:

- `api_key` - VAK-SMS API key.
- `base_url` - Base URL of the API. Defaults to https://vak-sms.com.
- `timeout` - HTTP request timeout in seconds. Defaults to 30.0.
- `soft_id` - Optional software/partner identifier.
  

**Examples**:

  >>> from vak_sms import VakSmsClient
  >>> client = VakSmsClient(api_key="your_api_key")
  >>> balance = client.get_balance()
  >>> print(balance)

<a id="vak_sms.client.VakSmsClient.close"></a>

#### close

```python
def close() -> None
```

Closes the underlying HTTP client session.

<a id="vak_sms.client.VakSmsClient.get_balance"></a>

#### get\_balance

```python
def get_balance() -> float
```

Retrieves the current account balance in RUB.

**Returns**:

  The account balance as a float.
  

**Raises**:

- `VakSmsError` - If the server returns an error or unexpected response.
  

**Examples**:

  >>> client = VakSmsClient(api_key="key")
  >>> balance = client.get_balance()
  >>> print(f"Balance: {balance} RUB")

<a id="vak_sms.client.VakSmsClient.get_number"></a>

#### get\_number

```python
def get_number(service: str | list[str],
               country: str | None = None,
               operator: str | None = None,
               rent: bool = False,
               soft_id: str | None = None) -> VakNumber
```

Orders a temporary virtual phone number.

**Arguments**:

- `service` - Service code (e.g. 'tg', 'wa') or list of codes.
- `country` - 2-letter country code (e.g. 'ru', 'kz').
- `operator` - Optional network operator name (e.g. 'megafon').
- `rent` - Whether to lease number under extended rental.
- `soft_id` - Optional software/partner identifier.
  

**Returns**:

  VakNumber containing phone number and idNum.
  

**Raises**:

- `VakSmsError` - If the number cannot be ordered or stock is exhausted.
  

**Examples**:

  >>> client = VakSmsClient(api_key="key")
  >>> number = client.get_number("tg", country="ru")
  >>> print(number.tel, number.id_num)

<a id="vak_sms.client.VakSmsClient.prolong_number"></a>

#### prolong\_number

```python
def prolong_number(service: str,
                   tel: str | int,
                   soft_id: str | None = None) -> VakNumber
```

Extends rental duration for an existing phone number.

**Arguments**:

- `service` - Service code.
- `tel` - Phone number without plus sign.
- `soft_id` - Optional software/partner identifier.
  

**Returns**:

  VakNumber with extended order details.
  

**Raises**:

- `VakSmsError` - If extension request fails.
  

**Examples**:

  >>> client = VakSmsClient(api_key="key")
  >>> order = client.prolong_number("tg", "79991234567")
  >>> print(order.id_num)

<a id="vak_sms.client.VakSmsClient.get_sms_code"></a>

#### get\_sms\_code

```python
def get_sms_code(id_num: str,
                 all_codes: bool = False) -> str | list[str] | None
```

Retrieves incoming SMS code(s) for an active order.

**Arguments**:

- `id_num` - Activation identifier.
- `all_codes` - Whether to return all received SMS codes.
  

**Returns**:

  Single code string, list of strings, or None if code is not yet received.
  

**Examples**:

  >>> client = VakSmsClient(api_key="key")
  >>> code = client.get_sms_code("abcd1234ef")
  >>> print("Received SMS code:", code)

<a id="vak_sms.client.VakSmsClient.wait_for_code"></a>

#### wait\_for\_code

```python
def wait_for_code(id_num: str,
                  timeout: float = 120.0,
                  interval: float = 3.0) -> str | None
```

Polls until an SMS code arrives or timeout expires.

**Arguments**:

- `id_num` - Activation identifier.
- `timeout` - Maximum seconds to wait. Defaults to 120.0.
- `interval` - Polling frequency in seconds. Defaults to 3.0.
  

**Returns**:

  Received SMS code string or None if timed out.
  

**Examples**:

  >>> client = VakSmsClient(api_key="key")
  >>> code = client.wait_for_code("abcd1234ef", timeout=60.0)
  >>> print("SMS code:", code)

<a id="vak_sms.client.VakSmsClient.set_status"></a>

#### set\_status

```python
def set_status(id_num: str, status: str) -> str
```

Updates the status of an ongoing number activation.

Status options:
- 'send': Wait for another SMS code
- 'end': Successfully finish activation
- 'bad': Report number as defective/cancel

**Arguments**:

- `id_num` - Activation identifier.
- `status` - Status command ('send', 'end', 'bad').
  

**Returns**:

  Status confirmation string.
  

**Examples**:

  >>> client = VakSmsClient(api_key="key")
  >>> client.set_status("abcd1234ef", "end")
  'update'

<a id="vak_sms.client.VakSmsClient.get_count_number"></a>

#### get\_count\_number

```python
def get_count_number(service: str,
                     country: str = "ru",
                     operator: str | None = None) -> CountNumber
```

Queries available number count and unit price for a service.

**Arguments**:

- `service` - Service code.
- `country` - Country code (default 'ru').
- `operator` - Optional network operator name.
  

**Returns**:

  CountNumber object with stock and price.
  

**Examples**:

  >>> client = VakSmsClient(api_key="key")
  >>> count = client.get_count_number("tg", "ru")
  >>> print(count.count, count.price)

<a id="vak_sms.client.VakSmsClient.get_country_list"></a>

#### get\_country\_list

```python
def get_country_list() -> list[CountryOperator]
```

Retrieves catalog of supported countries and available operators.

**Returns**:

  List of CountryOperator objects.
  

**Examples**:

  >>> client = VakSmsClient(api_key="key")
  >>> countries = client.get_country_list()
  >>> print(f"Supported countries: {len(countries)}")

<a id="vak_sms.client.VakSmsClient.get_count_numbers_list"></a>

#### get\_count\_numbers\_list

```python
def get_count_numbers_list(country: str = "ru",
                           operator: str | None = None,
                           rent: bool = False) -> dict[str, Any]
```

Retrieves full service inventory for a country.

**Arguments**:

- `country` - Country code (default 'ru').
- `operator` - Optional network operator name.
- `rent` - Whether to query extended rental stock.
  

**Returns**:

  Dictionary of services, quantities, and pricing.
  

**Examples**:

  >>> client = VakSmsClient(api_key="key")
  >>> catalog = client.get_count_numbers_list("ru")

<a id="vak_sms.types"></a>

# vak\_sms.types

Data types for the VAK-SMS API.

<a id="vak_sms.types.VakNumber"></a>

## VakNumber Objects

```python
@dataclass
class VakNumber()
```

Represents an acquired temporary phone number.

<a id="vak_sms.types.CountNumber"></a>

## CountNumber Objects

```python
@dataclass
class CountNumber()
```

Stock count and pricing for a service.

<a id="vak_sms.types.CountryOperator"></a>

## CountryOperator Objects

```python
@dataclass
class CountryOperator()
```

Supported country and list of available mobile operators.

<a id="vak_sms.errors"></a>

# vak\_sms.errors

Error definitions for the VAK-SMS client.

<a id="vak_sms.errors.VakSmsError"></a>

## VakSmsError Objects

```python
class VakSmsError(Exception)
```

Exception raised when a VAK-SMS API request fails.

