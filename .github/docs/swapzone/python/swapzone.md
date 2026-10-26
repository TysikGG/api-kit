<a id="swapzone.client"></a>

# swapzone.client

<a id="swapzone.client.Swapzone"></a>

## Swapzone Objects

```python
class Swapzone()
```

Client for the Swapzone cryptocurrency exchange and DEX aggregator API.

**Attributes**:

- `api_key` - Swapzone API key.
- `base_url` - Base URL of the API.

<a id="swapzone.client.Swapzone.__init__"></a>

#### \_\_init\_\_

```python
def __init__(api_key: str | None = None,
             base_url: str | None = None,
             timeout: float = 30.0,
             user_agent: str | None = None) -> None
```

Initializes the Swapzone client.

**Arguments**:

- `api_key` - Swapzone API key. Defaults to SWAPZONE_API_KEY environment variable.
- `base_url` - Base URL for the Swapzone API. Defaults to https://api.swapzone.io.
- `timeout` - Timeout in seconds for HTTP requests. Defaults to 30.0.
- `user_agent` - Custom User-Agent header string.
  

**Examples**:

  >>> from swapzone import Swapzone
  >>> client = Swapzone(api_key="your-api-key")
  >>> currencies = client.get_currencies()
  >>> print(len(currencies))

<a id="swapzone.client.Swapzone.close"></a>

#### close

```python
def close() -> None
```

Closes the underlying HTTP client session.

<a id="swapzone.client.Swapzone.get_currencies"></a>

#### get\_currencies

```python
def get_currencies() -> list[SupportedCurrency]
```

Retrieves all supported cryptocurrencies and tokens.

**Returns**:

  List of supported currencies with tickers and networks.
  

**Examples**:

  >>> currencies = client.get_currencies()
  >>> print(currencies[0]["ticker"])

<a id="swapzone.client.Swapzone.get_rate"></a>

#### get\_rate

```python
def get_rate(from_currency: str,
             to_currency: str,
             amount: float | str,
             rate_type: str = "all",
             choose_rate: str = "best",
             available_in_usa: bool | None = None,
             no_refund_address: bool | None = None,
             from_network: str | None = None,
             to_network: str | None = None,
             amount_to: float | str | None = None,
             timeout: float | str | None = None) -> RateOffer
```

Retrieves rate estimates for an exchange pair.

**Arguments**:

- `from_currency` - Deposit asset ticker (e.g. 'btc').
- `to_currency` - Receiving asset ticker (e.g. 'eth').
- `amount` - Deposit amount.
- `rate_type` - Rate type ('all', 'fixed', or 'floating').
- `choose_rate` - Strategy ('best', 'all', or 'recommended').
- `available_in_usa` - Restrict to partners supporting US clients.
- `no_refund_address` - Restrict to exchangers with optional refund address.
- `from_network` - Network for deposit asset.
- `to_network` - Network for receiving asset.
- `amount_to` - Target receiving amount (for reverse rate).
- `timeout` - Maximum response timeout in ms.
  

**Returns**:

  Rate offer dictionary with amounts and quota ID.
  

**Examples**:

  >>> rate = client.get_rate("btc", "eth", amount="0.1")
  >>> print(f"ETH: {rate['amountTo']} via {rate['adapter']}")

<a id="swapzone.client.Swapzone.create_transaction"></a>

#### create\_transaction

```python
def create_transaction(
        from_currency: str,
        to_currency: str,
        amount_deposit: float | str,
        address_receive: str,
        extra_id_receive: str | None = None,
        refund_address: str | None = None,
        refund_extra_id: str | None = None,
        quota_id: str | None = None,
        no_quota_id: bool | None = None,
        from_network: str | None = None,
        to_network: str | None = None,
        offer_reference_id: str | None = None) -> TransactionResult
```

Creates an exchange transaction order.

**Arguments**:

- `from_currency` - Deposit asset ticker.
- `to_currency` - Receiving asset ticker.
- `amount_deposit` - Amount to deposit.
- `address_receive` - Destination recipient wallet address.
- `extra_id_receive` - Optional memo / extra ID for recipient.
- `refund_address` - Optional address to return funds on failure.
- `refund_extra_id` - Optional memo for refund address.
- `quota_id` - Quota ID obtained from get_rate.
- `no_quota_id` - Bypass quota ID requirement.
- `from_network` - Deposit blockchain network.
- `to_network` - Receiving blockchain network.
- `offer_reference_id` - Reference ID for fixed-rate quotes.
  

**Returns**:

  Order details containing deposit address and transaction ID.
  

**Examples**:

  >>> order = client.create_transaction(
  ...     from_currency="btc",
  ...     to_currency="eth",
  ...     amount_deposit="0.1",
  ...     address_receive="0xReceiverAddress...",
  ...     quota_id=rate["quotaId"],
  ... )
  >>> print(f"Deposit address: {order['addressDeposit']}")

<a id="swapzone.client.Swapzone.get_transaction"></a>

#### get\_transaction

```python
def get_transaction(transaction_id: str) -> TransactionStatus
```

Retrieves transaction status.

**Arguments**:

- `transaction_id` - Swapzone transaction ID.
  

**Returns**:

  Transaction details and status.
  

**Examples**:

  >>> status = client.get_transaction("tx-id")
  >>> print(status["status"])

<a id="swapzone.client.Swapzone.validate_address"></a>

#### validate\_address

```python
def validate_address(currency: str,
                     address: str,
                     network: str | None = None) -> ValidateAddressResult
```

Validates a cryptocurrency address for a given asset.

**Arguments**:

- `currency` - Asset ticker (e.g. 'eth').
- `address` - Wallet address to validate.
- `network` - Blockchain network (e.g. 'ETH').
  

**Returns**:

  Dictionary indicating if the address is valid.
  

**Examples**:

  >>> res = client.validate_address("eth", "0x57f3...", network="ETH")
  >>> print(res["result"])

<a id="swapzone.client.Swapzone.get_markets"></a>

#### get\_markets

```python
def get_markets(rate_type: str | None = None) -> list[Any]
```

Retrieves bulk rate markets for instant exchange pairs.

**Arguments**:

- `rate_type` - Optional rate type filter ('all', 'fixed', 'floating').
  

**Returns**:

  List of market pairs.
  

**Examples**:

  >>> markets = client.get_markets("fixed")

<a id="swapzone.client.Swapzone.get_dex_blockchains"></a>

#### get\_dex\_blockchains

```python
def get_dex_blockchains() -> list[DEXBlockchain]
```

Retrieves supported blockchain networks for decentralized swaps.

**Returns**:

  List of supported blockchains with chain IDs.
  

**Examples**:

  >>> chains = client.get_dex_blockchains()
  >>> print(len(chains))

<a id="swapzone.client.Swapzone.get_dex_tokens"></a>

#### get\_dex\_tokens

```python
def get_dex_tokens() -> list[Any]
```

Retrieves supported tokens for DEX swaps.

**Returns**:

  List of supported tokens.
  

**Examples**:

  >>> tokens = client.get_dex_tokens()

<a id="swapzone.errors"></a>

# swapzone.errors

<a id="swapzone.errors.SwapzoneError"></a>

## SwapzoneError Objects

```python
class SwapzoneError(Exception)
```

Exception raised when a Swapzone API call fails.

