<a id="smsbulk.client"></a>

# smsbulk.client

<a id="smsbulk.client.SMSBulk"></a>

## SMSBulk Objects

```python
class SMSBulk()
```

Client for the SMSBulk virtual number and email verification API.

**Attributes**:

- `api_key` - SMSBulk API key.
- `base_url` - Base URL of the API.

<a id="smsbulk.client.SMSBulk.__init__"></a>

#### \_\_init\_\_

```python
def __init__(api_key: str | None = None,
             base_url: str | None = None,
             timeout: float = 30.0,
             user_agent: str | None = None) -> None
```

Initializes the SMSBulk client.

**Arguments**:

- `api_key` - SMSBulk API key. Defaults to SMSBULK_API_KEY environment variable.
- `base_url` - Base URL for the SMSBulk API. Defaults to https://smsbulk.net/api.
- `timeout` - Timeout in seconds for HTTP requests. Defaults to 30.0.
- `user_agent` - Custom User-Agent header string.
  

**Examples**:

  >>> from smsbulk import SMSBulk
  >>> client = SMSBulk(api_key="your-api-key")
  >>> balance = client.get_balance()
  >>> print(balance["balance"])

<a id="smsbulk.client.SMSBulk.close"></a>

#### close

```python
def close() -> None
```

Closes the underlying HTTP client session.

<a id="smsbulk.client.SMSBulk.get_balance"></a>

#### get\_balance

```python
def get_balance() -> BalanceResponse
```

Retrieves the current wallet balance.

**Returns**:

  Dictionary containing balance and currency.
  

**Examples**:

  >>> balance = client.get_balance()
  >>> print(f"{balance['balance']} {balance['currency']}")

<a id="smsbulk.client.SMSBulk.get_transactions"></a>

#### get\_transactions

```python
def get_transactions(limit: int | None = None,
                     cursor: str | None = None) -> TransactionListResponse
```

Lists wallet transactions.

**Arguments**:

- `limit` - Maximum items to return.
- `cursor` - Cursor for next page pagination.
  

**Returns**:

  Dictionary containing data list and nextCursor.
  

**Examples**:

  >>> txs = client.get_transactions(limit=10)
  >>> print(len(txs["data"]))

<a id="smsbulk.client.SMSBulk.get_services"></a>

#### get\_services

```python
def get_services() -> ServicesResponse
```

Lists all supported services in the catalog.

**Returns**:

  Dictionary containing service items and total count.
  

**Examples**:

  >>> services = client.get_services()
  >>> print(f"Total services: {services['count']}")

<a id="smsbulk.client.SMSBulk.get_service"></a>

#### get\_service

```python
def get_service(slug: str) -> ServiceCatalogItem
```

Gets detailed catalog information for a single service.

**Arguments**:

- `slug` - Service slug (e.g. 'whatsapp').
  

**Returns**:

  Service details dictionary.
  

**Examples**:

  >>> s = client.get_service("whatsapp")
  >>> print(s["name"])

<a id="smsbulk.client.SMSBulk.get_countries"></a>

#### get\_countries

```python
def get_countries() -> CountriesResponse
```

Lists all supported countries.

**Returns**:

  Dictionary containing country items and total count.
  

**Examples**:

  >>> countries = client.get_countries()
  >>> print(f"Total countries: {countries['count']}")

<a id="smsbulk.client.SMSBulk.get_service_countries"></a>

#### get\_service\_countries

```python
def get_service_countries(slug: str) -> ServiceCountriesResponse
```

Lists in-stock countries and prices for a service.

**Arguments**:

- `slug` - Service slug (e.g. 'whatsapp').
  

**Returns**:

  Dictionary with service details and list of available countries.
  

**Examples**:

  >>> info = client.get_service_countries("whatsapp")
  >>> print(len(info["countries"]))

<a id="smsbulk.client.SMSBulk.create_activation"></a>

#### create\_activation

```python
def create_activation(service_code: str,
                      country_iso: str,
                      operator: str | None = None,
                      max_price: str | None = None) -> Activation
```

Reserves a virtual phone number for SMS verification.

**Arguments**:

- `service_code` - Service identifier code (e.g. 'wa', 'tg').
- `country_iso` - ISO 3166-1 alpha-2 country code (e.g. 'US', 'TR').
- `operator` - Optional carrier filter.
- `max_price` - Optional maximum acceptable price.
  

**Returns**:

  Activation details including reserved phone number.
  

**Examples**:

  >>> act = client.create_activation(service_code="wa", country_iso="US")
  >>> print(act["phoneNumber"])

<a id="smsbulk.client.SMSBulk.get_activations"></a>

#### get\_activations

```python
def get_activations(limit: int | None = None,
                    cursor: str | None = None) -> ActivationListResponse
```

Lists user activations.

**Arguments**:

- `limit` - Maximum items to return.
- `cursor` - Cursor for pagination.
  

**Returns**:

  List of activations and nextCursor.
  

**Examples**:

  >>> acts = client.get_activations(limit=5)
  >>> print(len(acts["data"]))

<a id="smsbulk.client.SMSBulk.get_activation"></a>

#### get\_activation

```python
def get_activation(activation_id: str) -> Activation
```

Retrieves details and SMS code for an activation.

**Arguments**:

- `activation_id` - Activation ID.
  

**Returns**:

  Activation details dictionary.
  

**Examples**:

  >>> act = client.get_activation("act_123")
  >>> print(act["status"])

<a id="smsbulk.client.SMSBulk.cancel_activation"></a>

#### cancel\_activation

```python
def cancel_activation(activation_id: str) -> Activation
```

Cancels an activation and refunds the balance.

**Arguments**:

- `activation_id` - Activation ID to cancel.
  

**Returns**:

  Updated activation details.
  

**Examples**:

  >>> act = client.cancel_activation("act_123")
  >>> print(act["status"])

<a id="smsbulk.client.SMSBulk.complete_activation"></a>

#### complete\_activation

```python
def complete_activation(activation_id: str) -> Activation
```

Marks an activation as finished.

**Arguments**:

- `activation_id` - Activation ID to complete.
  

**Returns**:

  Updated activation details.
  

**Examples**:

  >>> act = client.complete_activation("act_123")
  >>> print(act["status"])

<a id="smsbulk.client.SMSBulk.resend_activation"></a>

#### resend\_activation

```python
def resend_activation(activation_id: str) -> Activation
```

Requests an additional SMS verification code.

**Arguments**:

- `activation_id` - Activation ID.
  

**Returns**:

  Updated activation details.
  

**Examples**:

  >>> act = client.resend_activation("act_123")
  >>> print(act["status"])

<a id="smsbulk.client.SMSBulk.get_email_domains"></a>

#### get\_email\_domains

```python
def get_email_domains(site: str) -> list[EmailDomainItem]
```

Lists available email domains and pricing for a site.

**Arguments**:

- `site` - Target website (e.g. 'telegram.com').
  

**Returns**:

  List of email domains with pricing and count.
  

**Examples**:

  >>> domains = client.get_email_domains("telegram.com")
  >>> print([d["name"] for d in domains])

<a id="smsbulk.client.SMSBulk.create_email_activation"></a>

#### create\_email\_activation

```python
def create_email_activation(site: str, domain: str) -> EmailActivation
```

Purchases a disposable email address for verification.

**Arguments**:

- `site` - Target website (e.g. 'telegram.com').
- `domain` - Domain name (e.g. 'gmx.com').
  

**Returns**:

  Email activation details including emailAddress.
  

**Examples**:

  >>> act = client.create_email_activation(site="telegram.com", domain="gmx.com")
  >>> print(act["emailAddress"])

<a id="smsbulk.client.SMSBulk.get_email_activations"></a>

#### get\_email\_activations

```python
def get_email_activations(
        limit: int | None = None,
        cursor: str | None = None) -> EmailActivationListResponse
```

Lists email activations.

**Arguments**:

- `limit` - Maximum items to return.
- `cursor` - Cursor for pagination.
  

**Returns**:

  List of email activations and nextCursor.
  

**Examples**:

  >>> acts = client.get_email_activations(limit=5)
  >>> print(len(acts["data"]))

<a id="smsbulk.client.SMSBulk.get_email_activation"></a>

#### get\_email\_activation

```python
def get_email_activation(activation_id: str) -> EmailActivation
```

Retrieves details and OTP for an email activation.

**Arguments**:

- `activation_id` - Email activation ID.
  

**Returns**:

  Email activation details dictionary.
  

**Examples**:

  >>> act = client.get_email_activation("em_123")
  >>> print(act["otpValue"])

<a id="smsbulk.client.SMSBulk.cancel_email_activation"></a>

#### cancel\_email\_activation

```python
def cancel_email_activation(activation_id: str) -> EmailActivation
```

Cancels an email activation.

**Arguments**:

- `activation_id` - Email activation ID to cancel.
  

**Returns**:

  Updated email activation details.
  

**Examples**:

  >>> act = client.cancel_email_activation("em_123")
  >>> print(act["status"])

<a id="smsbulk.client.SMSBulk.reorder_email_activation"></a>

#### reorder\_email\_activation

```python
def reorder_email_activation(activation_id: str) -> EmailActivation
```

Reopens an email address for further verification messages.

**Arguments**:

- `activation_id` - Email activation ID to reopen.
  

**Returns**:

  Updated email activation details.
  

**Examples**:

  >>> act = client.reorder_email_activation("em_123")
  >>> print(act["status"])

<a id="smsbulk.errors"></a>

# smsbulk.errors

<a id="smsbulk.errors.SMSBulkError"></a>

## SMSBulkError Objects

```python
class SMSBulkError(Exception)
```

Exception raised when an SMSBulk API call fails.

