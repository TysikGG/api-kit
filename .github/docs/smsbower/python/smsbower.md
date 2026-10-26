<a id="smsbower.client"></a>

# smsbower.client

SMSBower API client implementation.

<a id="smsbower.client.SmsBowerClient"></a>

## SmsBowerClient Objects

```python
class SmsBowerClient()
```

Client for communicating with the SMSBower activation API.

**Arguments**:

- `api_key` - SMSBower API key.
- `base_url` - Base URL of the API. Defaults to https://smsbower.page.
- `timeout` - HTTP request timeout in seconds. Defaults to 30.0.
  

**Examples**:

  >>> from smsbower import SmsBowerClient
  >>> client = SmsBowerClient(api_key="your_token")
  >>> balance = client.get_balance()
  >>> print(balance)

<a id="smsbower.client.SmsBowerClient.close"></a>

#### close

```python
def close() -> None
```

Closes the underlying HTTP client session.

<a id="smsbower.client.SmsBowerClient.get_balance"></a>

#### get\_balance

```python
def get_balance() -> float
```

Retrieves the current account balance.

**Returns**:

  The account balance as a float.
  

**Raises**:

- `SmsBowerError` - If the server returns an error or unexpected response.
  

**Examples**:

  >>> client = SmsBowerClient(api_key="key")
  >>> balance = client.get_balance()
  >>> print(f"Balance: {balance}")

<a id="smsbower.client.SmsBowerClient.get_number"></a>

#### get\_number

```python
def get_number(service: str,
               country: str | int | None = None,
               max_price: float | None = None,
               min_price: float | None = None,
               provider_ids: str | list[str | int] | None = None,
               except_provider_ids: str | list[str | int] | None = None,
               phone_exception: str | None = None,
               user_id: str | int | None = None) -> ActivationNumber
```

Orders a virtual phone number for SMS verification.

**Arguments**:

- `service` - Service code (e.g. 'tg', 'wa').
- `country` - Country code or ID (e.g. '22').
- `max_price` - Maximum price willing to pay.
- `min_price` - Minimum price willing to pay.
- `provider_ids` - Provider IDs whitelist.
- `except_provider_ids` - Provider IDs blacklist.
- `phone_exception` - Phone prefix exception filters.
- `user_id` - Reseller user identifier.
  

**Returns**:

  ActivationNumber with ID and phone number.
  

**Raises**:

- `SmsBowerError` - If no numbers are available or an API error occurs.
  

**Examples**:

  >>> client = SmsBowerClient(api_key="key")
  >>> number = client.get_number("tg", country="22")
  >>> print(f"ID: {number.id}, Number: {number.number}")

<a id="smsbower.client.SmsBowerClient.get_number_v2"></a>

#### get\_number\_v2

```python
def get_number_v2(service: str,
                  country: str | int | None = None,
                  max_price: float | None = None,
                  min_price: float | None = None,
                  provider_ids: str | list[str | int] | None = None,
                  except_provider_ids: str | list[str | int] | None = None,
                  phone_exception: str | None = None,
                  user_id: str | int | None = None) -> dict[str, Any]
```

Orders a virtual phone number with rich metadata (v2 protocol).

**Arguments**:

- `service` - Service code.
- `country` - Country code or ID.
- `max_price` - Maximum price willing to pay.
- `min_price` - Minimum price willing to pay.
- `provider_ids` - Provider IDs whitelist.
- `except_provider_ids` - Provider IDs blacklist.
- `phone_exception` - Phone prefix exception filters.
- `user_id` - Reseller user identifier.
  

**Returns**:

  Dictionary with full activation details.
  

**Raises**:

- `SmsBowerError` - If order fails or returns an API error.
  

**Examples**:

  >>> client = SmsBowerClient(api_key="key")
  >>> order = client.get_number_v2("tg", country="22")
  >>> print(order["phoneNumber"], order.get("activationCost"))

<a id="smsbower.client.SmsBowerClient.get_status"></a>

#### get\_status

```python
def get_status(activation_id: str | int) -> ActivationStatus
```

Retrieves the status and SMS code of an activation.

**Arguments**:

- `activation_id` - Unique activation ID.
  

**Returns**:

  ActivationStatus object with status and optional code.
  

**Examples**:

  >>> client = SmsBowerClient(api_key="key")
  >>> status = client.get_status("123456")
  >>> if status.status == "STATUS_OK":
  ...     print("Code:", status.code)

<a id="smsbower.client.SmsBowerClient.set_status"></a>

#### set\_status

```python
def set_status(activation_id: str | int, status: int) -> str
```

Changes activation lifecycle status.

Status codes:
1: SMS sent / number ready
3: Request another code
6: Complete activation
8: Cancel activation

**Arguments**:

- `activation_id` - Unique activation ID.
- `status` - Status code number.
  

**Returns**:

  Server response code string.
  

**Examples**:

  >>> client = SmsBowerClient(api_key="key")
  >>> client.set_status("123456", 6)
  'ACCESS_ACTIVATION'

<a id="smsbower.client.SmsBowerClient.get_prices"></a>

#### get\_prices

```python
def get_prices(service: str | None = None,
               country: str | int | None = None) -> dict[str, Any]
```

Retrieves the standard service price catalog.

**Arguments**:

- `service` - Optional service code filter.
- `country` - Optional country ID filter.
  

**Returns**:

  Nested dictionary of prices and counts.
  

**Examples**:

  >>> client = SmsBowerClient(api_key="key")
  >>> prices = client.get_prices("tg", "22")
  >>> print(prices)

<a id="smsbower.client.SmsBowerClient.get_prices_v2"></a>

#### get\_prices\_v2

```python
def get_prices_v2(service: str | None = None,
                  country: str | int | None = None) -> dict[str, Any]
```

Retrieves detailed price list grouped by price points.

**Arguments**:

- `service` - Optional service code filter.
- `country` - Optional country ID filter.
  

**Returns**:

  Price mapping dictionary.
  

**Examples**:

  >>> client = SmsBowerClient(api_key="key")
  >>> v2_prices = client.get_prices_v2("tg", "22")

<a id="smsbower.client.SmsBowerClient.get_prices_v3"></a>

#### get\_prices\_v3

```python
def get_prices_v3(service: str | None = None,
                  country: str | int | None = None) -> dict[str, Any]
```

Retrieves granular provider-level price list.

**Arguments**:

- `service` - Optional service code filter.
- `country` - Optional country ID filter.
  

**Returns**:

  Provider price mapping.
  

**Examples**:

  >>> client = SmsBowerClient(api_key="key")
  >>> v3_prices = client.get_prices_v3("tg", "22")

<a id="smsbower.client.SmsBowerClient.get_services_list"></a>

#### get\_services\_list

```python
def get_services_list() -> list[ServiceItem]
```

Retrieves all supported services.

**Returns**:

  List of ServiceItem objects.
  

**Examples**:

  >>> client = SmsBowerClient(api_key="key")
  >>> services = client.get_services_list()
  >>> print(f"Supported services: {len(services)}")

<a id="smsbower.client.SmsBowerClient.get_countries"></a>

#### get\_countries

```python
def get_countries() -> dict[str, CountryItem]
```

Retrieves all available countries.

**Returns**:

  Dictionary mapping country IDs to CountryItem objects.
  

**Examples**:

  >>> client = SmsBowerClient(api_key="key")
  >>> countries = client.get_countries()
  >>> print(countries["22"].eng)

<a id="smsbower.client.SmsBowerClient.get_top_countries_by_service"></a>

#### get\_top\_countries\_by\_service

```python
def get_top_countries_by_service(service: str) -> dict[str, Any]
```

Retrieves top 10 countries and gold partners for a service.

**Arguments**:

- `service` - Service code.
  

**Returns**:

  Dictionary of top countries and partners.
  

**Examples**:

  >>> client = SmsBowerClient(api_key="key")
  >>> top = client.get_top_countries_by_service("tg")

<a id="smsbower.client.SmsBowerClient.get_actual_wallet_address"></a>

#### get\_actual\_wallet\_address

```python
def get_actual_wallet_address(coin: str, network: str) -> str
```

Retrieves static crypto deposit address.

**Arguments**:

- `coin` - Cryptocurrency symbol (e.g. 'usdt', 'trx').
- `network` - Blockchain network (e.g. 'tron').
  

**Returns**:

  Wallet deposit address string.
  

**Raises**:

- `SmsBowerError` - If request fails.
  

**Examples**:

  >>> client = SmsBowerClient(api_key="key")
  >>> addr = client.get_actual_wallet_address("usdt", "tron")
  >>> print("Deposit address:", addr)

<a id="smsbower.types"></a>

# smsbower.types

Type definitions for the SMSBower API.

<a id="smsbower.types.ActivationNumber"></a>

## ActivationNumber Objects

```python
@dataclass
class ActivationNumber()
```

Represents an acquired virtual phone number.

<a id="smsbower.types.ActivationStatus"></a>

## ActivationStatus Objects

```python
@dataclass
class ActivationStatus()
```

Status of an activation.

<a id="smsbower.types.ServiceItem"></a>

## ServiceItem Objects

```python
@dataclass
class ServiceItem()
```

Supported SMSBower service item.

<a id="smsbower.types.CountryItem"></a>

## CountryItem Objects

```python
@dataclass
class CountryItem()
```

Country metadata item.

<a id="smsbower.errors"></a>

# smsbower.errors

Exceptions for the SMSBower client.

<a id="smsbower.errors.SmsBowerError"></a>

## SmsBowerError Objects

```python
class SmsBowerError(Exception)
```

Base exception for all SMSBower client errors.

