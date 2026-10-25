<a id="grizzly_sms.partner"></a>

# grizzly\_sms.partner

Client for partner pushes to Grizzly SMS.

<a id="grizzly_sms.partner.GrizzlyPartner"></a>

## GrizzlyPartner Objects

```python
class GrizzlyPartner()
```

Send ``PUSH_SMS``, ``PUSH_CALL``, and ``PUSH_CALL_RECORD``.

``GET_SERVICES``, ``GET_NUMBER``, and ``FINISH_ACTIVATION`` are incoming
requests to the partner server. This client does not implement them.
Pushes go to ``/agent/api/sms``. A non-``SUCCESS`` status is retried only
when ``retries`` is set. The protocol pause is 10 seconds.

**Examples**:

  partner = GrizzlyPartner(partner_key)
  partner.push_sms(
  sms_id=1,
  phone=447472190082,
  phone_from="Microsoft",
  text="code 5015",
  )

<a id="grizzly_sms.partner.GrizzlyPartner.__init__"></a>

#### \_\_init\_\_

```python
def __init__(key: str,
             *,
             base_url: str | None = None,
             timeout_ms: float | None = None,
             client: httpx.Client | None = None) -> None
```

Create a partner client.

**Arguments**:

- `key` - Partner key from the personal account. Blank keys raise ``NO_KEY``.
- `base_url` - Defaults to ``https://api.grizzlysms.com``.
- `timeout_ms` - Request timeout in milliseconds. Defaults to 30000.
- `client` - Optional ``httpx.Client``. It is not closed by this object.
  

**Examples**:

  partner = GrizzlyPartner(partner_key)

<a id="grizzly_sms.partner.GrizzlyPartner.close"></a>

#### close

```python
def close() -> None
```

Close the HTTP client when this object created it.

**Examples**:

  partner.close()

<a id="grizzly_sms.partner.GrizzlyPartner.push_sms"></a>

#### push\_sms

```python
def push_sms(*,
             sms_id: int,
             phone: int,
             phone_from: str,
             text: str,
             retries: int = 0,
             retry_delay_ms: float | None = None) -> PartnerStatus
```

Deliver an inbound SMS (``PUSH_SMS``).

**Examples**:

  partner.push_sms(
  sms_id=1,
  phone=447472190082,
  phone_from="Microsoft",
  text="code 5015",
  )

<a id="grizzly_sms.partner.GrizzlyPartner.push_call"></a>

#### push\_call

```python
def push_call(*,
              call_id: int,
              phone: int,
              phone_from: str,
              retries: int = 0,
              retry_delay_ms: float | None = None) -> PartnerStatus
```

Deliver a flash call (``PUSH_CALL``).

**Examples**:

  partner.push_call(call_id=10, phone=447472190082, phone_from="100")

<a id="grizzly_sms.partner.GrizzlyPartner.push_call_record"></a>

#### push\_call\_record

```python
def push_call_record(*,
                     call_id: int,
                     phone: int,
                     phone_from: str,
                     text: str | None = None,
                     file: bytes | bytearray | None = None,
                     filename: str | None = None,
                     retries: int = 0,
                     retry_delay_ms: float | None = None) -> PartnerStatus
```

Deliver a call recording (``PUSH_CALL_RECORD``).

``text`` or ``file`` is required. The body is ``multipart/form-data``.

**Examples**:

  partner.push_call_record(
  call_id=10,
  phone=447472190082,
  phone_from="100",
  text="your code is 5015",
  )

<a id="grizzly_sms.client"></a>

# grizzly\_sms.client

Synchronous client for the Grizzly SMS activation API.

<a id="grizzly_sms.client.GrizzlySms"></a>

## GrizzlySms Objects

```python
class GrizzlySms()
```

Client for ``GET /stubs/handler_api.php`` and the crypto wallet.

The API key comes from the profile settings on grizzlysms.com.
Pass an ``httpx.Client`` as ``client`` to reuse a session or to mock HTTP.

**Examples**:

  sms = GrizzlySms(api_key)
  balance = sms.get_balance()

<a id="grizzly_sms.client.GrizzlySms.__init__"></a>

#### \_\_init\_\_

```python
def __init__(api_key: str,
             *,
             base_url: str | None = None,
             timeout_ms: float | None = None,
             client: httpx.Client | None = None) -> None
```

Create a client.

**Arguments**:

- `api_key` - User API key. Blank keys raise ``BAD_KEY``.
- `base_url` - Defaults to ``https://api.grizzlysms.com``.
- `timeout_ms` - Request timeout in milliseconds. Defaults to 30000.
- `client` - Optional ``httpx.Client``. When set, ``base_url`` and
  ``timeout_ms`` are ignored and the client is not closed.
  

**Examples**:

  sms = GrizzlySms(api_key)

<a id="grizzly_sms.client.GrizzlySms.close"></a>

#### close

```python
def close() -> None
```

Close the HTTP client when this object created it.

**Examples**:

  sms.close()

<a id="grizzly_sms.client.GrizzlySms.call"></a>

#### call

```python
def call(action: str, params: Mapping[str, Any] | None = None) -> Any
```

Call ``handler_api.php`` for one ``action``.

Known error strings are raised as ``GrizzlySmsError``. Other text is
returned unchanged.

**Examples**:

  raw = sms.call("getBalance")

<a id="grizzly_sms.client.GrizzlySms.get_balance"></a>

#### get\_balance

```python
def get_balance() -> float
```

Return the account balance.

**Examples**:

  balance = sms.get_balance()

<a id="grizzly_sms.client.GrizzlySms.get_number"></a>

#### get\_number

```python
def get_number(
        service: str,
        *,
        country: str | int | None = None,
        max_price: float | None = None,
        min_price: float | None = None,
        provider_ids: Sequence[str | int] | str | None = None,
        except_provider_ids: Sequence[str | int] | str | None = None,
        phone_exception: Sequence[str] | str | None = None) -> OrderedNumber
```

Order a number.

``country`` may be ``"any"`` or omitted so Grizzly picks a country.

**Examples**:

  ordered = sms.get_number("tg", country="any", max_price=1)

<a id="grizzly_sms.client.GrizzlySms.get_number_v2"></a>

#### get\_number\_v2

```python
def get_number_v2(
        service: str,
        *,
        country: str | int | None = None,
        max_price: float | None = None,
        min_price: float | None = None,
        provider_ids: Sequence[str | int] | str | None = None,
        except_provider_ids: Sequence[str | int] | str | None = None,
        phone_exception: Sequence[str] | str | None = None) -> OrderedNumberV2
```

Order a number and return price, currency, and timestamps.

**Examples**:

  ordered = sms.get_number_v2("tg", country=12)

<a id="grizzly_sms.client.GrizzlySms.set_status"></a>

#### set\_status

```python
def set_status(activation_id: str | int, status: int) -> str
```

Change an activation status.

**Examples**:

  sms.set_status(activation_id, ActivationAction.COMPLETE)

<a id="grizzly_sms.client.GrizzlySms.ready"></a>

#### ready

```python
def ready(activation_id: str | int) -> str
```

Tell the service that the SMS was sent (``status=1``).

**Examples**:

  sms.ready(activation_id)

<a id="grizzly_sms.client.GrizzlySms.request_another_code"></a>

#### request\_another\_code

```python
def request_another_code(activation_id: str | int) -> str
```

Ask for another code on the same number (``status=3``).

**Examples**:

  sms.request_another_code(activation_id)

<a id="grizzly_sms.client.GrizzlySms.complete"></a>

#### complete

```python
def complete(activation_id: str | int) -> str
```

Finish the activation (``status=6``).

**Examples**:

  sms.complete(activation_id)

<a id="grizzly_sms.client.GrizzlySms.cancel"></a>

#### cancel

```python
def cancel(activation_id: str | int, status: int = 8) -> str
```

Cancel the activation.

The default status is ``8``. Pass ``-1`` for the alternate cancel code.

**Examples**:

  sms.cancel(activation_id)

<a id="grizzly_sms.client.GrizzlySms.get_status"></a>

#### get\_status

```python
def get_status(activation_id: str | int) -> ActivationStatus
```

Return the plain-text activation status.

**Examples**:

  status = sms.get_status(activation_id)

<a id="grizzly_sms.client.GrizzlySms.get_status_v2"></a>

#### get\_status\_v2

```python
def get_status_v2(activation_id: str | int) -> dict[str, Any]
```

Return the JSON activation status, including SMS and call payloads.

**Examples**:

  status = sms.get_status_v2(activation_id)

<a id="grizzly_sms.client.GrizzlySms.wait_for_code"></a>

#### wait\_for\_code

```python
def wait_for_code(activation_id: str | int,
                  *,
                  interval_ms: float = 3_000,
                  timeout_ms: float = 120_000,
                  signal: Any = None) -> ReceivedCode
```

Poll ``get_status`` until a code arrives, or the wait is cancelled.

``STATUS_WAIT_RESEND`` keeps the loop running. ``STATUS_CANCEL`` raises
``GrizzlySmsError``. ``signal`` is any object with an ``aborted`` flag.

**Examples**:

  received = sms.wait_for_code(activation_id, timeout_ms=120_000)

<a id="grizzly_sms.client.GrizzlySms.get_prices"></a>

#### get\_prices

```python
def get_prices(*,
               service: str | None = None,
               country: str | int | None = None) -> dict[str, Any]
```

Return prices grouped by country, then service.

**Examples**:

  prices = sms.get_prices(service="tg")

<a id="grizzly_sms.client.GrizzlySms.get_prices_v2"></a>

#### get\_prices\_v2

```python
def get_prices_v2(*,
                  service: str | None = None,
                  country: str | int | None = None) -> dict[str, Any]
```

Return price buckets: price string to available count.

**Examples**:

  prices = sms.get_prices_v2(service="tg", country=0)

<a id="grizzly_sms.client.GrizzlySms.get_prices_v3"></a>

#### get\_prices\_v3

```python
def get_prices_v3(*,
                  service: str | None = None,
                  country: str | int | None = None) -> dict[str, Any]
```

Return prices with per-provider offers.

**Examples**:

  prices = sms.get_prices_v3(service="tg", country=0)

<a id="grizzly_sms.client.GrizzlySms.find_prices"></a>

#### find\_prices

```python
def find_prices(*,
                service: str | None = None,
                country: str | int | None = None,
                min_count: float | None = None,
                max_price: float | None = None) -> list[PriceQuote]
```

Return ``get_prices`` rows sorted by cost, then by count descending.

**Examples**:

  quotes = sms.find_prices(service="tg", min_count=10, max_price=1)

<a id="grizzly_sms.client.GrizzlySms.get_services"></a>

#### get\_services

```python
def get_services() -> list[ServiceInfo]
```

Return the service catalog (``getServicesList``).

**Examples**:

  services = sms.get_services()

<a id="grizzly_sms.client.GrizzlySms.get_countries"></a>

#### get\_countries

```python
def get_countries() -> list[CountryInfo]
```

Return the country catalog.

**Examples**:

  countries = sms.get_countries()

<a id="grizzly_sms.client.GrizzlySms.get_active_activations"></a>

#### get\_active\_activations

```python
def get_active_activations() -> list[ActiveActivation]
```

Return activations that are still open.

**Examples**:

  active = sms.get_active_activations()

<a id="grizzly_sms.client.GrizzlySms.get_wallet"></a>

#### get\_wallet

```python
def get_wallet(*,
               coin: str | None = None,
               network: str | None = None) -> CryptoWallet
```

Return the static deposit address.

The documented sample is ``coin="usdt"`` and ``network="tron"``.
Amounts from 50 USD are credited automatically.

**Examples**:

  wallet = sms.get_wallet(coin="usdt", network="tron")

<a id="grizzly_sms.types"></a>

# grizzly\_sms.types

Response objects returned by the Grizzly SMS clients.

<a id="grizzly_sms.types.ActivationAction"></a>

## ActivationAction Objects

```python
class ActivationAction()
```

Status values passed to ``set_status``.

``CANCEL`` is ``8``. ``CANCEL_ALT`` is the documented alternate ``-1``.

**Examples**:

  from grizzly_sms import ActivationAction
  
  ActivationAction.COMPLETE

<a id="grizzly_sms.types.OrderedNumber"></a>

## OrderedNumber Objects

```python
@dataclass(frozen=True)
class OrderedNumber()
```

Number returned by ``get_number``.

<a id="grizzly_sms.types.OrderedNumberV2"></a>

## OrderedNumberV2 Objects

```python
@dataclass(frozen=True)
class OrderedNumberV2()
```

Number returned by ``get_number_v2``.

<a id="grizzly_sms.types.ActivationStatus"></a>

## ActivationStatus Objects

```python
@dataclass(frozen=True)
class ActivationStatus()
```

Plain-text activation status from ``get_status``.

<a id="grizzly_sms.types.ReceivedCode"></a>

## ReceivedCode Objects

```python
@dataclass(frozen=True)
class ReceivedCode()
```

Code delivered by ``wait_for_code``.

<a id="grizzly_sms.types.PriceQuote"></a>

## PriceQuote Objects

```python
@dataclass(frozen=True)
class PriceQuote()
```

One country/service row from ``find_prices``.

<a id="grizzly_sms.types.ServiceInfo"></a>

## ServiceInfo Objects

```python
@dataclass(frozen=True)
class ServiceInfo()
```

One row from ``get_services``.

<a id="grizzly_sms.types.CountryInfo"></a>

## CountryInfo Objects

```python
@dataclass(frozen=True)
class CountryInfo()
```

One row from ``get_countries``.

<a id="grizzly_sms.types.ActiveActivation"></a>

## ActiveActivation Objects

```python
@dataclass(frozen=True)
class ActiveActivation()
```

One open activation from ``get_active_activations``.

<a id="grizzly_sms.types.CryptoWallet"></a>

## CryptoWallet Objects

```python
@dataclass(frozen=True)
class CryptoWallet()
```

Deposit address from ``get_wallet``.

<a id="grizzly_sms.types.PartnerStatus"></a>

## PartnerStatus Objects

```python
@dataclass(frozen=True)
class PartnerStatus()
```

JSON status returned by a partner push.

<a id="grizzly_sms.types.PartnerGetServicesRequest"></a>

## PartnerGetServicesRequest Objects

```python
class PartnerGetServicesRequest(TypedDict)
```

Inbound ``GET_SERVICES`` body sent by Grizzly to the partner server.

**Examples**:

- `body` - PartnerGetServicesRequest = {"action": "GET_SERVICES", "key": partner_key}

<a id="grizzly_sms.types.PartnerCountryStock"></a>

## PartnerCountryStock Objects

```python
class PartnerCountryStock(TypedDict)
```

One country in a ``GET_SERVICES`` response.

``operatorMap`` maps an operator name to a service code and a count.

<a id="grizzly_sms.types.PartnerGetServicesResponse"></a>

## PartnerGetServicesResponse Objects

```python
class PartnerGetServicesResponse(_PartnerServicesStatus)
```

Reply to inbound ``GET_SERVICES``.

**Examples**:

- `reply` - PartnerGetServicesResponse = {"status": "SUCCESS", "countryList": []}

<a id="grizzly_sms.types.PartnerGetNumberRequest"></a>

## PartnerGetNumberRequest Objects

```python
class PartnerGetNumberRequest(_PartnerGetNumberRequired)
```

Inbound ``GET_NUMBER`` body sent by Grizzly to the partner server.

``exceptionPhoneSet`` and ``canGetAnotherSms`` may be omitted.

**Examples**:

- `body` - PartnerGetNumberRequest = {
- `"action"` - "GET_NUMBER",
- `"key"` - partner_key,
- `"country"` - 0,
- `"operator"` - "any",
- `"service"` - "tg",
- `"sum"` - 1,
  }

<a id="grizzly_sms.types.PartnerGetNumberResponse"></a>

## PartnerGetNumberResponse Objects

```python
class PartnerGetNumberResponse(_PartnerNumberStatus)
```

Reply to inbound ``GET_NUMBER``.

**Examples**:

- `reply` - PartnerGetNumberResponse = {
- `"status"` - "SUCCESS",
- `"number"` - 447472190082,
- `"activationId"` - 1,
  }

<a id="grizzly_sms.types.PartnerFinishActivationRequest"></a>

## PartnerFinishActivationRequest Objects

```python
class PartnerFinishActivationRequest(TypedDict)
```

Inbound ``FINISH_ACTIVATION`` body.

Status ``1`` is forbidden, ``3`` sold, ``4`` cancelled, and ``5`` returned.

**Examples**:

- `body` - PartnerFinishActivationRequest = {
- `"action"` - "FINISH_ACTIVATION",
- `"key"` - partner_key,
- `"activationId"` - 1,
- `"status"` - 3,
  }

<a id="grizzly_sms.types.PartnerFinishActivationResponse"></a>

## PartnerFinishActivationResponse Objects

```python
class PartnerFinishActivationResponse(_PartnerFinishStatus)
```

Reply to inbound ``FINISH_ACTIVATION``.

**Examples**:

- `reply` - PartnerFinishActivationResponse = {"status": "SUCCESS"}

<a id="grizzly_sms.errors"></a>

# grizzly\_sms.errors

API and client errors for Grizzly SMS.

<a id="grizzly_sms.errors.GrizzlySmsError"></a>

## GrizzlySmsError Objects

```python
class GrizzlySmsError(Exception)
```

Error for an API status string, an HTTP failure, or a client-side check.

**Examples**:

  try:
  sms.get_number("tg")
  except GrizzlySmsError as error:
  if error.code == "NO_NUMBERS":
  pass

<a id="grizzly_sms.errors.GrizzlySmsError.__init__"></a>

#### \_\_init\_\_

```python
def __init__(code: str, raw: Any = None) -> None
```

Create an error.

**Arguments**:

- `code` - Stable code such as ``NO_NUMBERS`` or ``BAD_KEY``.
- `raw` - Original response body. A non-empty string becomes the message.
  

**Examples**:

  raise GrizzlySmsError("NO_NUMBERS", "NO_NUMBERS")

<a id="grizzly_sms.parse"></a>

# grizzly\_sms.parse

Parsers for the text and JSON bodies used by the Grizzly SMS API.

<a id="grizzly_sms.parse.flatten_prices"></a>

#### flatten\_prices

```python
def flatten_prices(data: Mapping[str, Any] | None) -> list[PriceQuote]
```

Flatten a ``getPrices`` table into rows.

Rows whose cost or count is not a finite number are skipped.

**Examples**:

  quotes = flatten_prices({"16": {"tg": {"cost": 0.4, "count": 20}}})

