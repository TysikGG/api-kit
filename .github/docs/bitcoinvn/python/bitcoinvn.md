<a id="bitcoinvn.client"></a>

# bitcoinvn.client

Synchronous client for the BitcoinVN exchange API.

<a id="bitcoinvn.client.BitcoinVn"></a>

## BitcoinVn Objects

```python
class BitcoinVn()
```

Client for the BitcoinVN exchange API.

Public reads, quotes, and order creation do not need a key. Pass ``api_key``
to send ``X-API-KEY``. The key is created on the API keys page at
bitcoinvn.io. This client does not manage keys.

``create_order`` always sends the JSON property ``referrer``. Callers cannot
pass or disable it. Other methods do not send that field.

**Examples**:

  client = BitcoinVn()
  ticker = client.get_ticker("BTC", "USDT")

<a id="bitcoinvn.client.BitcoinVn.__init__"></a>

#### \_\_init\_\_

```python
def __init__(api_key: str | None = None,
             *,
             base_url: str | None = None,
             timeout_ms: float | None = None,
             client: httpx.Client | None = None) -> None
```

Create a client.

**Arguments**:

- `api_key` - Key sent as ``X-API-KEY``. A blank value sends no header.
- `base_url` - Defaults to ``https://bitcoinvn.io``.
- `timeout_ms` - Request timeout in milliseconds. Defaults to 30000.
- `client` - Optional ``httpx.Client``. When set, this object does not
  close it and ignores ``base_url`` and ``timeout_ms``.
  

**Examples**:

  client = BitcoinVn(api_key)

<a id="bitcoinvn.client.BitcoinVn.close"></a>

#### close

```python
def close() -> None
```

Close the HTTP client when this object created it.

**Examples**:

  client.close()

<a id="bitcoinvn.client.BitcoinVn.get_health"></a>

#### get\_health

```python
def get_health() -> HealthStatus
```

``GET /api/health``.

**Examples**:

  health = client.get_health()

<a id="bitcoinvn.client.BitcoinVn.get_info"></a>

#### get\_info

```python
def get_info() -> Info
```

``GET /api/info``.

Use method ids exactly as returned. Check ``depositEnabled`` or
``settleEnabled`` for the direction you need.

**Examples**:

  info = client.get_info()

<a id="bitcoinvn.client.BitcoinVn.get_pair"></a>

#### get\_pair

```python
def get_pair(deposit_method_id: str, settle_method_id: str) -> Pair
```

``GET /api/pairs/{depositMethodId}/{settleMethodId}``.

A successful response does not reserve liquidity. An API key applies
the account minimum to ``min``.

**Examples**:

  pair = client.get_pair("btc", "xmr")

<a id="bitcoinvn.client.BitcoinVn.get_ticker"></a>

#### get\_ticker

```python
def get_ticker(base_asset_id: str, quote_asset_id: str) -> Ticker
```

``GET /api/ticker/{baseAssetId}/{quoteAssetId}``.

Asset ids are case-sensitive. ``rate`` is quote units per one base unit.

**Examples**:

  ticker = client.get_ticker("BTC", "USDT")

<a id="bitcoinvn.client.BitcoinVn.validate_address"></a>

#### validate\_address

```python
def validate_address(transfer_method: str,
                     address: str,
                     *,
                     invoice_amount: float | None = None) -> AddressValidation
```

``GET /api/addresses/validate``.

For Lightning, pass the BOLT11 invoice as ``address``.

**Examples**:

  result = client.validate_address("btc", "bc1qexample")

<a id="bitcoinvn.client.BitcoinVn.create_quote"></a>

#### create\_quote

```python
def create_quote(deposit_method: str,
                 settle_method: str,
                 *,
                 deposit_amount: float | None = None,
                 settle_amount: float | None = None,
                 markup_rate: float | None = None) -> Quote
```

``POST /api/quotes``.

Send ``deposit_amount``, ``settle_amount``, or neither, but not both.
This creates a production quote and does not move funds.

**Examples**:

  quote = client.create_quote("btc", "xmr", deposit_amount=0.01)

<a id="bitcoinvn.client.BitcoinVn.list_orders"></a>

#### list\_orders

```python
def list_orders(*,
                page: int | None = None,
                custom_order_id: str | None = None) -> list[Order]
```

``GET /api/orders``. Requires ``X-API-KEY``. Pages contain 10 orders.

**Examples**:

  orders = client.list_orders(page=1)

<a id="bitcoinvn.client.BitcoinVn.create_order"></a>

#### create\_order

```python
def create_order(*,
                 quote: str | None = None,
                 deposit_method: str | None = None,
                 settle_method: str | None = None,
                 deposit_amount: float | None = None,
                 settle_amount: float | None = None,
                 custom_order_id: str | None = None,
                 webhook_url: str | None = None,
                 settle_data: Mapping[str, Any] | None = None) -> Order
```

``POST /api/orders``. Creates a production order.

Pass ``quote``, or ``deposit_method`` and ``settle_method`` for a
variable-amount order. An amountless internal-balance quote can also
take ``deposit_amount`` or ``settle_amount``. The JSON body always
includes ``referrer``. Funding the order moves real funds.

**Examples**:

  order = client.create_order(
  quote="8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
- `settle_data={"address"` - "4example"},
  )

<a id="bitcoinvn.client.BitcoinVn.get_order"></a>

#### get\_order

```python
def get_order(order_id: str) -> Order
```

``GET /api/orders/{id}``. ``order_id`` is the 8-character short id.

**Examples**:

  order = client.get_order("BV2MTZAF")

<a id="bitcoinvn.client.BitcoinVn.submit_deposit"></a>

#### submit\_deposit

```python
def submit_deposit(order_id: str, txid: str) -> Order
```

``POST /api/orders/{id}/deposit``.

Optional fast path after a supported on-chain deposit is broadcast and
the order is ``new``. Fiat, Lightning, internal-balance, and manual
deposits do not use this call.

**Examples**:

  order = client.submit_deposit("BV2MTZAF", "0x0123456789abcdef")

<a id="bitcoinvn.client.BitcoinVn.update_settle_data"></a>

#### update\_settle\_data

```python
def update_settle_data(order_id: str, settle_data: Mapping[str, Any]) -> Order
```

``PUT /api/orders/{id}/settle-data``.

Requires a key with write access. The order must be ``settle_data_error``.

**Examples**:

  order = client.update_settle_data("BV2MTZAF", {"address": "bc1qexample"})

<a id="bitcoinvn.client.BitcoinVn.get_balances"></a>

#### get\_balances

```python
def get_balances() -> Balances
```

``GET /api/balances``. Requires ``X-API-KEY``.

**Examples**:

  balances = client.get_balances()

<a id="bitcoinvn.client.BitcoinVn.list_balance_history"></a>

#### list\_balance\_history

```python
def list_balance_history(*,
                         asset_id: str | None = None,
                         page: int | None = None) -> list[LedgerItem]
```

``GET /api/balances/history``. Requires ``X-API-KEY``.

Pages contain 25 rows.

**Examples**:

  history = client.list_balance_history(asset_id="BTC", page=1)

<a id="bitcoinvn.client.BitcoinVn.list_staking_offers"></a>

#### list\_staking\_offers

```python
def list_staking_offers() -> list[Vault]
```

``GET /api/staking``.

**Examples**:

  offers = client.list_staking_offers()

<a id="bitcoinvn.client.BitcoinVn.set_auto_stake"></a>

#### set\_auto\_stake

```python
def set_auto_stake(offer_id: str, value: bool) -> BooleanConfiguration
```

``PUT /api/staking/{id}/auto-stake``. Requires write access.

**Examples**:

  setting = client.set_auto_stake(
  "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
  True,
  )

<a id="bitcoinvn.client.BitcoinVn.set_staking_notifications"></a>

#### set\_staking\_notifications

```python
def set_staking_notifications(offer_id: str,
                              value: bool) -> BooleanConfiguration
```

``PUT /api/staking/{id}/notifications``. Requires write access.

**Examples**:

  setting = client.set_staking_notifications(
  "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
  False,
  )

<a id="bitcoinvn.client.BitcoinVn.resolve_address"></a>

#### resolve\_address

```python
def resolve_address(transfer_method: str, name: str) -> EnsResolution
```

``GET /api/addresses/resolve``.

Resolves an ASCII ENS name. The token expires after 15 minutes.

**Examples**:

  resolved = client.resolve_address("eth", "alice.eth")

<a id="bitcoinvn.client.BitcoinVn.get_guarantee_public_key"></a>

#### get\_guarantee\_public\_key

```python
def get_guarantee_public_key() -> str
```

``GET /api/guarantee/public-key``.

Returns armored OpenPGP certificates.

**Examples**:

  certificates = client.get_guarantee_public_key()

<a id="bitcoinvn.client.BitcoinVn.get_order_guarantee"></a>

#### get\_order\_guarantee

```python
def get_order_guarantee(order_id: str) -> str
```

``GET /api/orders/{id}/guarantee``.

Returns the stored clear-signed letter. Access matches ``get_order``.

**Examples**:

  letter = client.get_order_guarantee("BV2MTZAF")

<a id="bitcoinvn.types"></a>

# bitcoinvn.types

Types for the BitcoinVN exchange API.

Response dictionaries keep the JSON names from the OpenAPI spec.

<a id="bitcoinvn.types.HealthStatus"></a>

## HealthStatus Objects

```python
class HealthStatus(TypedDict)
```

Body of ``GET /api/health``.

<a id="bitcoinvn.types.AssetRequired"></a>

## AssetRequired Objects

```python
class AssetRequired(TypedDict)
```

Required asset fields from ``GET /api/info``.

<a id="bitcoinvn.types.Asset"></a>

## Asset Objects

```python
class Asset(AssetRequired)
```

Asset record. ``sameAs`` is set when the asset aliases another asset.

<a id="bitcoinvn.types.SettleDataField"></a>

## SettleDataField Objects

```python
class SettleDataField(TypedDict)
```

One external payout field on a transfer method.

<a id="bitcoinvn.types.TransferMethodRequired"></a>

## TransferMethodRequired Objects

```python
class TransferMethodRequired(TypedDict)
```

Required transfer-method fields.

<a id="bitcoinvn.types.TransferMethod"></a>

## TransferMethod Objects

```python
class TransferMethod(TransferMethodRequired)
```

Transfer method. Use ``id`` exactly as returned by ``GET /api/info``.

<a id="bitcoinvn.types.Info"></a>

## Info Objects

```python
class Info(TypedDict)
```

Public catalogs from ``GET /api/info``.

<a id="bitcoinvn.types.PairRequired"></a>

## PairRequired Objects

```python
class PairRequired(TypedDict)
```

Required pair fields.

<a id="bitcoinvn.types.Pair"></a>

## Pair Objects

```python
class Pair(PairRequired)
```

Rate and deposit range. ``max`` below ``min`` means no valid range.

<a id="bitcoinvn.types.Ticker"></a>

## Ticker Objects

```python
class Ticker(TypedDict)
```

Public rate and 24-hour volume.

<a id="bitcoinvn.types.AddressValidationRequired"></a>

## AddressValidationRequired Objects

```python
class AddressValidationRequired(TypedDict)
```

Required address-validation field.

<a id="bitcoinvn.types.AddressValidation"></a>

## AddressValidation Objects

```python
class AddressValidation(AddressValidationRequired)
```

Result of ``GET /api/addresses/validate``.

<a id="bitcoinvn.types.QuoteRequired"></a>

## QuoteRequired Objects

```python
class QuoteRequired(TypedDict)
```

Required quote fields.

<a id="bitcoinvn.types.Quote"></a>

## Quote Objects

```python
class Quote(QuoteRequired)
```

Quote from ``POST /api/quotes`` or nested on an order.

<a id="bitcoinvn.types.OrderRequired"></a>

## OrderRequired Objects

```python
class OrderRequired(TypedDict)
```

Required order fields.

<a id="bitcoinvn.types.Order"></a>

## Order Objects

```python
class Order(OrderRequired)
```

Order object returned by the order endpoints and by order webhooks.

<a id="bitcoinvn.types.LedgerItemRequired"></a>

## LedgerItemRequired Objects

```python
class LedgerItemRequired(TypedDict)
```

Required ledger fields.

<a id="bitcoinvn.types.LedgerItem"></a>

## LedgerItem Objects

```python
class LedgerItem(LedgerItemRequired)
```

One balance-history row.

<a id="bitcoinvn.types.VaultRequired"></a>

## VaultRequired Objects

```python
class VaultRequired(TypedDict)
```

Required staking-offer fields.

<a id="bitcoinvn.types.Vault"></a>

## Vault Objects

```python
class Vault(VaultRequired)
```

Staking offer from ``GET /api/staking``.

<a id="bitcoinvn.types.BooleanConfiguration"></a>

## BooleanConfiguration Objects

```python
class BooleanConfiguration(TypedDict)
```

Staking preference body.

<a id="bitcoinvn.types.EnsResolution"></a>

## EnsResolution Objects

```python
class EnsResolution(TypedDict)
```

Signed ENS resolution. Times are Unix seconds.

<a id="bitcoinvn.errors"></a>

# bitcoinvn.errors

Errors returned by the BitcoinVN API and transport failures.

<a id="bitcoinvn.errors.BitcoinVnError"></a>

## BitcoinVnError Objects

```python
class BitcoinVnError(Exception)
```

HTTP error envelope from BitcoinVN, or a transport failure.

Responses with status 4xx or 5xx use ``error.message`` and ``error.code``.
``code`` equals the HTTP status. ``retry_after`` is set from the
``X-RateLimit-Retry-After`` header when it is present. A transport failure
uses ``status`` 0 and ``code`` 0.

**Examples**:

  try:
  client.get_ticker("BTC", "USDT")
  except BitcoinVnError as error:
  if error.code == 404:
  pass

<a id="bitcoinvn.errors.BitcoinVnError.__init__"></a>

#### \_\_init\_\_

```python
def __init__(message: str,
             *,
             status: int,
             code: int,
             raw: Any = None,
             details: Any = None,
             retry_after: int | None = None) -> None
```

Create an error.

**Arguments**:

- `message` - Text from ``error.message``, or a transport message.
- `status` - HTTP status, or 0 when the request was not sent.
- `code` - API ``error.code``, or ``status`` when the body has no envelope.
- `raw` - Original response body.
- `details` - ``error.details`` when the API sent validation details.
- `retry_after` - Seconds from ``X-RateLimit-Retry-After``.
  

**Examples**:

  raise BitcoinVnError("Pair does not exist.", status=404, code=404)

