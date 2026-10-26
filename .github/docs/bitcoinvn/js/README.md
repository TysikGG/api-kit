**bitcoinvn**

***

# bitcoinvn

## Classes

### BitcoinVn

Client for the BitcoinVN exchange API.

Public reads, quotes, and order creation do not need a key. Send `X-API-KEY`
by passing `apiKey` when you call an account endpoint. The key is created on
the API keys page at bitcoinvn.io. This client does not manage keys.

#### Example

```ts
const client = new BitcoinVn();
const ticker = await client.getTicker("BTC", "USDT");
```

#### Constructors

##### Constructor

> **new BitcoinVn**(`options?`): [`BitcoinVn`](#bitcoinvn)

###### Parameters

###### options?

`string` \| [`BitcoinVnOptions`](#bitcoinvnoptions) = `{}`

API key string, or settings. A blank key is treated as no key.

###### Returns

[`BitcoinVn`](#bitcoinvn)

###### Example

```ts
const client = new BitcoinVn({ apiKey: process.env.BITCOINVN_API_KEY });
```

#### Methods

##### createOrder()

> **createOrder**(`params`): `Promise`\<[`Order`](#order)\>

`POST /api/orders`. Creates a production order. Funding it, or spending an
internal balance, moves real funds.

Pass a quote id, or `depositMethod` and `settleMethod` for a variable-amount
order. Amountless internal-balance quotes also accept `depositAmount` or
`settleAmount` with the quote id. The client always sends
`referrer` in the JSON body and ignores any other value.

###### Parameters

###### params

[`CreateOrderParams`](#createorderparams)

###### Returns

`Promise`\<[`Order`](#order)\>

###### Example

```ts
const order = await client.createOrder({
  quote: "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
  settleData: { address: "4example" },
});
```

##### createQuote()

> **createQuote**(`params`): `Promise`\<[`Quote`](#quote-4)\>

`POST /api/quotes`. Send `depositAmount`, `settleAmount`, or neither, but not both.
A quote does not move funds. It creates a production quote. Asset-conversion quotes
last 15 minutes; same-asset quotes last one day.

###### Parameters

###### params

[`CreateQuoteParams`](#createquoteparams)

###### Returns

`Promise`\<[`Quote`](#quote-4)\>

###### Example

```ts
const quote = await client.createQuote({
  depositMethod: "btc",
  settleMethod: "xmr",
  depositAmount: 0.01,
});
```

##### getBalances()

> **getBalances**(): `Promise`\<[`Balances`](#balances)\>

`GET /api/balances`. Requires `X-API-KEY`.
Values are available amounts keyed by asset id.

###### Returns

`Promise`\<[`Balances`](#balances)\>

###### Example

```ts
const balances = await client.getBalances();
```

##### getGuaranteePublicKey()

> **getGuaranteePublicKey**(): `Promise`\<`string`\>

`GET /api/guarantee/public-key`. Returns armored OpenPGP certificates as text.

###### Returns

`Promise`\<`string`\>

###### Example

```ts
const certificates = await client.getGuaranteePublicKey();
```

##### getHealth()

> **getHealth**(): `Promise`\<[`HealthStatus`](#healthstatus)\>

`GET /api/health`. Returns `{ status: "ok" }` when the API is available.

###### Returns

`Promise`\<[`HealthStatus`](#healthstatus)\>

###### Example

```ts
const health = await client.getHealth();
```

##### getInfo()

> **getInfo**(): `Promise`\<[`Info`](#info)\>

`GET /api/info`. Returns assets and transfer methods. Use method `id` values
exactly as returned. `enabled` does not by itself mean a direction is open:
check `depositEnabled` or `settleEnabled`.

###### Returns

`Promise`\<[`Info`](#info)\>

###### Example

```ts
const info = await client.getInfo();
```

##### getOrder()

> **getOrder**(`id`): `Promise`\<[`Order`](#order)\>

`GET /api/orders/{id}`. `id` is the 8-character `shortId`.
A key is optional. An account order returns 403 when another account's key is sent.

###### Parameters

###### id

`string`

###### Returns

`Promise`\<[`Order`](#order)\>

###### Example

```ts
const order = await client.getOrder("BV2MTZAF");
```

##### getOrderGuarantee()

> **getOrderGuarantee**(`id`): `Promise`\<`string`\>

`GET /api/orders/{id}/guarantee`. Returns the stored clear-signed letter as text.
Uses the same access rules as `getOrder`. Older orders and some deposit types have no letter.

###### Parameters

###### id

`string`

###### Returns

`Promise`\<`string`\>

###### Example

```ts
const letter = await client.getOrderGuarantee("BV2MTZAF");
```

##### getPair()

> **getPair**(`depositMethodId`, `settleMethodId`): `Promise`\<[`Pair`](#pair)\>

`GET /api/pairs/{depositMethodId}/{settleMethodId}`.
A 200 response does not reserve liquidity. If `max` is less than `min`, the pair
has no valid deposit range. An API key applies the account minimum to `min`.

###### Parameters

###### depositMethodId

`string`

###### settleMethodId

`string`

###### Returns

`Promise`\<[`Pair`](#pair)\>

###### Example

```ts
const pair = await client.getPair("btc", "xmr");
```

##### getTicker()

> **getTicker**(`baseAssetId`, `quoteAssetId`): `Promise`\<[`Ticker`](#ticker)\>

`GET /api/ticker/{baseAssetId}/{quoteAssetId}`.
Asset ids are case-sensitive. The rate is quote units per one base unit, including fees.

###### Parameters

###### baseAssetId

`string`

###### quoteAssetId

`string`

###### Returns

`Promise`\<[`Ticker`](#ticker)\>

###### Example

```ts
const ticker = await client.getTicker("BTC", "USDT");
```

##### listBalanceHistory()

> **listBalanceHistory**(`params?`): `Promise`\<[`LedgerItem`](#ledgeritem)[]\>

`GET /api/balances/history`. Requires `X-API-KEY`. Pages contain 25 rows.

###### Parameters

###### params?

[`BalanceHistoryParams`](#balancehistoryparams) = `{}`

###### Returns

`Promise`\<[`LedgerItem`](#ledgeritem)[]\>

###### Example

```ts
const history = await client.listBalanceHistory({ assetId: "BTC", page: 1 });
```

##### listOrders()

> **listOrders**(`params?`): `Promise`\<[`Order`](#order)[]\>

`GET /api/orders`. Requires `X-API-KEY`. Pages contain 10 orders.

###### Parameters

###### params?

[`ListOrdersParams`](#listordersparams) = `{}`

###### Returns

`Promise`\<[`Order`](#order)[]\>

###### Example

```ts
const orders = await client.listOrders({ page: 1 });
```

##### listStakingOffers()

> **listStakingOffers**(): `Promise`\<[`Vault`](#vault)[]\>

`GET /api/staking`. Lists staking offers that have an active supply target.

###### Returns

`Promise`\<[`Vault`](#vault)[]\>

###### Example

```ts
const offers = await client.listStakingOffers();
```

##### resolveAddress()

> **resolveAddress**(`params`): `Promise`\<[`EnsResolution`](#ensresolution)\>

`GET /api/addresses/resolve`. Resolves an ASCII ENS name for a payout method.
`ensResolutionToken` is used as `settleData.ensResolutionToken` and expires in 15 minutes.

###### Parameters

###### params

###### name

`string`

###### transferMethod

`string`

###### Returns

`Promise`\<[`EnsResolution`](#ensresolution)\>

###### Example

```ts
const resolved = await client.resolveAddress({
  transferMethod: "eth",
  name: "alice.eth",
});
```

##### setAutoStake()

> **setAutoStake**(`id`, `value`): `Promise`\<[`BooleanConfiguration`](#booleanconfiguration)\>

`PUT /api/staking/{id}/auto-stake`. Requires a key with write access.
`id` is the offer UUID from `listStakingOffers`.

###### Parameters

###### id

`string`

###### value

`boolean`

###### Returns

`Promise`\<[`BooleanConfiguration`](#booleanconfiguration)\>

###### Example

```ts
const setting = await client.setAutoStake(
  "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
  true,
);
```

##### setStakingNotifications()

> **setStakingNotifications**(`id`, `value`): `Promise`\<[`BooleanConfiguration`](#booleanconfiguration)\>

`PUT /api/staking/{id}/notifications`. Requires a key with write access.

###### Parameters

###### id

`string`

###### value

`boolean`

###### Returns

`Promise`\<[`BooleanConfiguration`](#booleanconfiguration)\>

###### Example

```ts
const setting = await client.setStakingNotifications(
  "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
  false,
);
```

##### submitDeposit()

> **submitDeposit**(`id`, `params`): `Promise`\<[`Order`](#order)\>

`POST /api/orders/{id}/deposit`. Optional fast path after you broadcast a
supported on-chain deposit while the order is `new`. Fiat, Lightning,
internal-balance, and manual deposits do not use this call. The response
is the current order.

###### Parameters

###### id

`string`

###### params

[`SubmitDepositParams`](#submitdepositparams)

###### Returns

`Promise`\<[`Order`](#order)\>

###### Example

```ts
const order = await client.submitDeposit("BV2MTZAF", {
  txid: "0x0123456789abcdef",
});
```

##### updateSettleData()

> **updateSettleData**(`id`, `settleData`): `Promise`\<[`Order`](#order)\>

`PUT /api/orders/{id}/settle-data`. Requires a key with write access.
The order must be in `settle_data_error`.

###### Parameters

###### id

`string`

###### settleData

[`SettleDataCorrection`](#settledatacorrection)

###### Returns

`Promise`\<[`Order`](#order)\>

###### Example

```ts
const order = await client.updateSettleData("BV2MTZAF", {
  address: "bc1qexample",
});
```

##### validateAddress()

> **validateAddress**(`params`): `Promise`\<[`AddressValidation`](#addressvalidation)\>

`GET /api/addresses/validate`. For Lightning, pass the BOLT11 invoice as `address`
and set `invoiceAmount` when it must match the order amount.

###### Parameters

###### params

###### address

`string`

###### invoiceAmount?

`number`

###### transferMethod

`string`

###### Returns

`Promise`\<[`AddressValidation`](#addressvalidation)\>

###### Example

```ts
const result = await client.validateAddress({
  transferMethod: "btc",
  address: "bc1qexample",
});
```

***

### BitcoinVnError

Error for an HTTP error envelope from BitcoinVN, or a transport failure.

API responses with status 4xx or 5xx use `{ error: { message, code, details? } }`.
`code` equals the HTTP status. `retryAfter` is set from `X-RateLimit-Retry-After`
when that header is present. A transport failure uses `status` 0 and `code` 0.

#### Example

```ts
try {
  await client.getTicker("BTC", "USDT");
} catch (error) {
  if (error instanceof BitcoinVnError && error.code === 404) {
    // asset id is unknown or private
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new BitcoinVnError**(`message`, `options`): [`BitcoinVnError`](#bitcoinvnerror)

###### Parameters

###### message

`string`

Human-readable error text from `error.message`, or a transport message.

###### options

HTTP status, API code, raw body, optional validation details, and retry delay.

###### code

`number`

###### details?

`unknown`

###### raw?

`unknown`

###### retryAfter?

`number`

###### status

`number`

###### Returns

[`BitcoinVnError`](#bitcoinvnerror)

###### Example

```ts
throw new BitcoinVnError("Pair does not exist.", { status: 404, code: 404 });
```

###### Overrides

`Error.constructor`

#### Properties

##### cause?

> `optional` **cause?**: `unknown`

###### Inherited from

`Error.cause`

##### code

> `readonly` **code**: `number`

##### details?

> `readonly` `optional` **details?**: `unknown`

##### message

> **message**: `string`

###### Inherited from

`Error.message`

##### name

> **name**: `string`

###### Inherited from

`Error.name`

##### raw

> `readonly` **raw**: `unknown`

##### retryAfter?

> `readonly` `optional` **retryAfter?**: `number`

##### stack?

> `optional` **stack?**: `string`

###### Inherited from

`Error.stack`

##### status

> `readonly` **status**: `number`

##### stackTraceLimit

> `static` **stackTraceLimit**: `number`

The `Error.stackTraceLimit` property specifies the number of stack frames
collected by a stack trace (whether generated by `new Error().stack` or
`Error.captureStackTrace(obj)`).

The default value is `10` but may be set to any valid JavaScript number. Changes
will affect any stack trace captured _after_ the value has been changed.

If set to a non-number value, or set to a negative number, stack traces will
not capture any frames.

###### Inherited from

`Error.stackTraceLimit`

#### Methods

##### captureStackTrace()

> `static` **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

Creates a `.stack` property on `targetObject`, which when accessed returns
a string representing the location in the code at which
`Error.captureStackTrace()` was called.

```js
const myObject = {};
Error.captureStackTrace(myObject);
myObject.stack;  // Similar to `new Error().stack`
```

The first line of the trace will be prefixed with
`${myObject.name}: ${myObject.message}`.

The optional `constructorOpt` argument accepts a function. If given, all frames
above `constructorOpt`, including `constructorOpt`, will be omitted from the
generated stack trace.

The `constructorOpt` argument is useful for hiding implementation
details of error generation from the user. For instance:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  // Create an error without stack trace to avoid calculating the stack trace twice.
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  const error = new Error();
  Error.stackTraceLimit = stackTraceLimit;

  // Capture the stack trace above function b
  Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
  throw error;
}

a();
```

###### Parameters

###### targetObject

`object`

###### constructorOpt?

`Function`

###### Returns

`void`

###### Inherited from

`Error.captureStackTrace`

##### prepareStackTrace()

> `static` **prepareStackTrace**(`err`, `stackTraces`): `any`

###### Parameters

###### err

`Error`

###### stackTraces

`CallSite`[]

###### Returns

`any`

###### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

###### Inherited from

`Error.prepareStackTrace`

## Interfaces

### AddressValidation

Result of `GET /api/addresses/validate`.

#### Properties

##### error?

> `optional` **error?**: `string` \| `null`

Reason validation failed. Omitted when `valid` is true.

##### valid

> **valid**: `boolean`

Whether the address or invoice is valid for the transfer method.

***

### Asset

Asset record from `GET /api/info`.

#### Properties

##### bridgeFee

> **bridgeFee**: `number`

Percentage-based fee for cross-network bridge operations.

##### exchangeFee

> **exchangeFee**: `number`

Percentage-based fee on currency conversions involving this asset.

##### id

> **id**: `string`

Unique asset ticker symbol.

##### name

> **name**: `string`

Human-readable asset name.

##### sameAs?

> `optional` **sameAs?**: `string` \| `null`

When set, this asset is an alias of another asset.

##### tags

> **tags**: `string`[]

Classification tags such as `crypto`, `fiat`, or `stablecoin`.

***

### BalanceHistoryParams

Query for `GET /api/balances/history`.

#### Properties

##### assetId?

> `optional` **assetId?**: `string`

Asset ticker filter, for example `BTC`. Omit for every asset.

##### page?

> `optional` **page?**: `number`

Page number. Pages contain 25 ledger rows.

***

### BitcoinVnOptions

Client settings. A missing or blank key sends no `X-API-KEY` header.

#### Properties

##### apiKey?

> `optional` **apiKey?**: `string`

API key sent as `X-API-KEY`. Public reads, quotes, and order creation work
without it. Account reads and account writes require it.

##### axios?

> `optional` **axios?**: `AxiosInstance`

Axios instance used instead of the built-in client.

##### baseUrl?

> `optional` **baseUrl?**: `string`

Defaults to `https://bitcoinvn.io`.

##### timeoutMs?

> `optional` **timeoutMs?**: `number`

Request timeout in milliseconds. Defaults to 30000.

***

### BooleanConfiguration

Body for staking preference updates.

#### Properties

##### value

> **value**: `boolean`

Whether this staking preference is enabled.

***

### CashPickupSettleData

Cash pickup payout.

#### Properties

##### phone?

> `optional` **phone?**: `string`

Optional phone number for the cash pickup.

***

### CreateQuoteParams

Body for `POST /api/quotes`. Send at most one of the amount fields.

#### Properties

##### depositAmount?

> `optional` **depositAmount?**: `number`

Positive amount to send. Omit for a fixed settlement or variable quote.

##### depositMethod

> **depositMethod**: `string`

Deposit method id from `GET /api/info`.

##### markupRate?

> `optional` **markupRate?**: `number`

Markup greater than 0 and no more than 0.10.

##### settleAmount?

> `optional` **settleAmount?**: `number`

Positive amount to receive. Omit for a fixed deposit or variable quote.

##### settleMethod

> **settleMethod**: `string`

Settlement method id from `GET /api/info`.

***

### CryptoAddressSettleData

Cryptocurrency address payout.

#### Properties

##### address

> **address**: `string`

Settlement address, or an ASCII ENS name when `ensResolutionToken` is set.

##### ensResolutionToken?

> `optional` **ensResolutionToken?**: `string`

Token from `GET /api/addresses/resolve`. Valid for 15 minutes.

***

### DestinationTagSettleData

Address plus a destination tag, without a memo.

#### Properties

##### address

> **address**: `string`

##### destinationTag

> **destinationTag**: `string`

Destination tag, such as an XRP tag.

##### ensResolutionToken?

> `optional` **ensResolutionToken?**: `string`

##### memo?

> `optional` **memo?**: `undefined`

***

### DirectVariableOrderRequest

Variable-amount order created from method ids, without a quote or amount.

#### Extends

- [`OrderRequestCommon`](#orderrequestcommon)

#### Properties

##### customOrderId?

> `optional` **customOrderId?**: `string`

Client id, at most 64 characters, unique per authenticated user.

###### Inherited from

[`OrderRequestCommon`](#orderrequestcommon).[`customOrderId`](#customorderid-5)

##### depositAmount?

> `optional` **depositAmount?**: `undefined`

##### depositMethod

> **depositMethod**: `string`

Deposit method id from `GET /api/info`.

##### quote?

> `optional` **quote?**: `undefined`

##### settleAmount?

> `optional` **settleAmount?**: `undefined`

##### settleData?

> `optional` **settleData?**: [`OrderSettleData`](#ordersettledata-1)

Payout details. Omit when the settlement method needs none.

###### Inherited from

[`OrderRequestCommon`](#orderrequestcommon).[`settleData`](#settledata-4)

##### settleMethod

> **settleMethod**: `string`

Settlement method id from `GET /api/info`.

##### webhookUrl?

> `optional` **webhookUrl?**: `string`

HTTPS webhook URL. Production allows port 443 or no port, a public domain,
and no credentials or fragment.

###### Inherited from

[`OrderRequestCommon`](#orderrequestcommon).[`webhookUrl`](#webhookurl-3)

***

### EnsResolution

Signed ENS resolution from `GET /api/addresses/resolve`. Times are Unix seconds.

#### Properties

##### address

> **address**: `string`

##### chainId

> **chainId**: `number`

##### ensResolutionToken

> **ensResolutionToken**: `string`

##### expiresAt

> **expiresAt**: `number`

##### name

> **name**: `string`

##### networkId

> **networkId**: `string`

##### networkName

> **networkName**: `string`

##### resolvedAt

> **resolvedAt**: `number`

##### transferMethod

> **transferMethod**: `string`

***

### HealthStatus

`GET /api/health` body.

#### Properties

##### status

> **status**: `"ok"`

Current service health status. The documented value is `ok`.

***

### Info

Public catalogs from `GET /api/info`.

#### Properties

##### assets

> **assets**: `Record`\<`string`, [`Asset`](#asset)\>

Assets keyed by asset id. A record can exist when no method is active.

##### transferMethods

> **transferMethods**: `Record`\<`string`, [`TransferMethod`](#transfermethod-1)\>

Methods keyed by the exact id clients must send.

***

### InternalBalanceDepositAmountOrderRequest

Amountless internal-balance quote priced from `depositAmount`.

#### Extends

- [`OrderRequestCommon`](#orderrequestcommon)

#### Properties

##### customOrderId?

> `optional` **customOrderId?**: `string`

Client id, at most 64 characters, unique per authenticated user.

###### Inherited from

[`OrderRequestCommon`](#orderrequestcommon).[`customOrderId`](#customorderid-5)

##### depositAmount

> **depositAmount**: `number`

Deposit-side amount.

##### depositMethod?

> `optional` **depositMethod?**: `undefined`

##### quote

> **quote**: `string`

Amountless internal-balance quote UUID.

##### settleAmount?

> `optional` **settleAmount?**: `undefined`

##### settleData?

> `optional` **settleData?**: [`OrderSettleData`](#ordersettledata-1)

Payout details. Omit when the settlement method needs none.

###### Inherited from

[`OrderRequestCommon`](#orderrequestcommon).[`settleData`](#settledata-4)

##### settleMethod?

> `optional` **settleMethod?**: `undefined`

##### webhookUrl?

> `optional` **webhookUrl?**: `string`

HTTPS webhook URL. Production allows port 443 or no port, a public domain,
and no credentials or fragment.

###### Inherited from

[`OrderRequestCommon`](#orderrequestcommon).[`webhookUrl`](#webhookurl-3)

***

### InternalBalanceSettleAmountOrderRequest

Amountless internal-balance quote priced from `settleAmount`.

#### Extends

- [`OrderRequestCommon`](#orderrequestcommon)

#### Properties

##### customOrderId?

> `optional` **customOrderId?**: `string`

Client id, at most 64 characters, unique per authenticated user.

###### Inherited from

[`OrderRequestCommon`](#orderrequestcommon).[`customOrderId`](#customorderid-5)

##### depositAmount?

> `optional` **depositAmount?**: `undefined`

##### depositMethod?

> `optional` **depositMethod?**: `undefined`

##### quote

> **quote**: `string`

Amountless internal-balance quote UUID.

##### settleAmount

> **settleAmount**: `number`

Settlement-side amount.

##### settleData?

> `optional` **settleData?**: [`OrderSettleData`](#ordersettledata-1)

Payout details. Omit when the settlement method needs none.

###### Inherited from

[`OrderRequestCommon`](#orderrequestcommon).[`settleData`](#settledata-4)

##### settleMethod?

> `optional` **settleMethod?**: `undefined`

##### webhookUrl?

> `optional` **webhookUrl?**: `string`

HTTPS webhook URL. Production allows port 443 or no port, a public domain,
and no credentials or fragment.

###### Inherited from

[`OrderRequestCommon`](#orderrequestcommon).[`webhookUrl`](#webhookurl-3)

***

### InternalBalanceSettleData

Internal-balance payout. Omit `settleData` to credit the authenticated account.

#### Properties

##### note?

> `optional` **note?**: `string`

Optional internal transfer note.

##### user?

> `optional` **user?**: `string`

Email of the internal-balance beneficiary.

***

### LedgerItem

One ledger row.

#### Properties

##### asset

> **asset**: `string`

Asset ticker.

##### createdAt

> **createdAt**: `string`

ISO 8601 creation time.

##### id

> **id**: `string`

Ledger entry UUID.

##### note?

> `optional` **note?**: `string`

Human-readable description.

##### value

> **value**: `number`

Credited (positive) or debited (negative) amount.

***

### LightningSettleData

BOLT11 Lightning payout.

#### Properties

##### invoice

> **invoice**: `string`

BOLT11 Lightning invoice.

***

### ListOrdersParams

Query for `GET /api/orders`.

#### Properties

##### customOrderId?

> `optional` **customOrderId?**: `string`

Exact case-sensitive client id. Only orders owned by the key are returned.

##### page?

> `optional` **page?**: `number`

Page number. Pages contain 10 orders.

***

### MemoSettleData

Address plus a memo, without a destination tag.

#### Properties

##### address

> **address**: `string`

##### destinationTag?

> `optional` **destinationTag?**: `undefined`

##### ensResolutionToken?

> `optional` **ensResolutionToken?**: `string`

##### memo

> **memo**: `string`

Destination memo, such as an XLM or ATOM memo.

***

### Order

Order returned by create, fetch, deposit, and settle-data calls.

#### Properties

##### adminMessage?

> `optional` **adminMessage?**: `string` \| `null`

Message from the operator, for example a hold reason.

##### createdAt

> **createdAt**: `string`

ISO 8601 creation time.

##### customOrderId?

> `optional` **customOrderId?**: `string`

Client id, when one was sent.

##### depositAmount?

> `optional` **depositAmount?**: `number` \| `null`

Amount to deposit. Null for a variable-amount order.

##### depositAsset

> **depositAsset**: `string`

Deposit asset ticker.

##### depositConfsRequired?

> `optional` **depositConfsRequired?**: `number` \| `null`

Required confirmation count when known. Null means unknown, not zero.

##### depositData

> **depositData**: `Record`\<`string`, `unknown`\>

Where to send the deposit.

##### depositFee

> **depositFee**: `number`

Deposit fee plus deposit network fee.

##### depositMax?

> `optional` **depositMax?**: `number`

Soft maximum deposit, unless KYC sets a hard limit.

##### depositMethod

> **depositMethod**: `string`

Deposit method id.

##### depositMin

> **depositMin**: `number`

Minimum deposit amount for this order.

##### depositTxns?

> `optional` **depositTxns?**: `string`[]

Incoming deposit transaction ids.

##### expiresAt

> **expiresAt**: `string`

Deposit deadline. The order is canceled after this time if nothing arrives.

##### id

> **id**: `string`

Order UUID.

##### quote?

> `optional` **quote?**: [`Quote`](#quote-4)

Quote used to create the order.

##### rate?

> `optional` **rate?**: `number`

Final rate including percentage fees.

##### settleAmount?

> `optional` **settleAmount?**: `number` \| `null`

Amount to receive after fees.

##### settleAsset

> **settleAsset**: `string`

Settlement asset ticker.

##### settleData

> **settleData**: `Record`\<`string`, `unknown`\>

Payout destination stored on the order.

##### settleFee

> **settleFee**: `number`

Settlement fee plus settlement network fee.

##### settleMethod

> **settleMethod**: `string`

Settlement method id.

##### settleProof?

> `optional` **settleProof?**: `Record`\<`string`, `unknown`\> \| `null`

Monero settlement proof, when present.

##### settleReceiptUrl?

> `optional` **settleReceiptUrl?**: `string`

Settlement receipt URL.

##### settleTxns?

> `optional` **settleTxns?**: `string`[]

Outgoing settlement transaction ids.

##### shortId

> **shortId**: `string`

Eight-character id used in URLs and support.

##### status

> **status**: [`OrderStatus`](#orderstatus-1)

Current order state.

***

### OrderRequestCommon

Fields shared by every `POST /api/orders` shape. `referrer` is not accepted here.

#### Extended by

- [`DirectVariableOrderRequest`](#directvariableorderrequest)
- [`InternalBalanceDepositAmountOrderRequest`](#internalbalancedepositamountorderrequest)
- [`InternalBalanceSettleAmountOrderRequest`](#internalbalancesettleamountorderrequest)
- [`QuotedOrderRequest`](#quotedorderrequest)

#### Properties

##### customOrderId?

> `optional` **customOrderId?**: `string`

Client id, at most 64 characters, unique per authenticated user.

##### settleData?

> `optional` **settleData?**: [`OrderSettleData`](#ordersettledata-1)

Payout details. Omit when the settlement method needs none.

##### webhookUrl?

> `optional` **webhookUrl?**: `string`

HTTPS webhook URL. Production allows port 443 or no port, a public domain,
and no credentials or fragment.

***

### Pair

Pair rate and deposit range from `GET /api/pairs/{deposit}/{settle}`.

#### Properties

##### max?

> `optional` **max?**: `number` \| `null`

Maximum deposit amount in the deposit asset.
Null means no pair-level maximum. If `max` is less than `min`, there is no valid range.

##### min

> **min**: `number`

Minimum deposit amount in the deposit asset.

##### rate

> **rate**: `number`

Rate from deposit method to settle method, including percentage fees.

***

### Quote

Quote returned by `POST /api/quotes` and nested on an order.

#### Properties

##### accepted?

> `optional` **accepted?**: `boolean`

Whether the linked order currently accepts this rate and deposit.

##### createdAt?

> `optional` **createdAt?**: `string`

ISO 8601 creation time.

##### depositAmount?

> `optional` **depositAmount?**: `number` \| `null`

Amount to deposit.

##### depositFee?

> `optional` **depositFee?**: `number`

Deposit-side fixed fee plus network fee, in deposit-asset units.

##### depositMethod

> **depositMethod**: `string`

Transfer method id for the deposit side.

##### expiresAt?

> `optional` **expiresAt?**: `string`

Rate acceptance deadline. Creating an order does not extend it.

##### id?

> `optional` **id?**: `string`

Quote UUID.

##### markupRate?

> `optional` **markupRate?**: `number` \| `null`

Markup from quote creation, or null.

##### rate?

> `optional` **rate?**: `number`

Locked rate including percentage fees and markup.

##### rawRate?

> `optional` **rawRate?**: `number`

Market rate before fees.

##### settleAmount?

> `optional` **settleAmount?**: `number` \| `null`

Amount to receive.

##### settleFee?

> `optional` **settleFee?**: `number`

Settlement-side fixed fee plus network fee, in settlement-asset units.

##### settleMethod

> **settleMethod**: `string`

Transfer method id for the settlement side.

***

### QuotedOrderRequest

Fixed quote, or an amountless internal-balance settlement quote, with no top-level amount.

#### Extends

- [`OrderRequestCommon`](#orderrequestcommon)

#### Properties

##### customOrderId?

> `optional` **customOrderId?**: `string`

Client id, at most 64 characters, unique per authenticated user.

###### Inherited from

[`OrderRequestCommon`](#orderrequestcommon).[`customOrderId`](#customorderid-5)

##### depositAmount?

> `optional` **depositAmount?**: `undefined`

##### depositMethod?

> `optional` **depositMethod?**: `undefined`

##### quote

> **quote**: `string`

Quote UUID.

##### settleAmount?

> `optional` **settleAmount?**: `undefined`

##### settleData?

> `optional` **settleData?**: [`OrderSettleData`](#ordersettledata-1)

Payout details. Omit when the settlement method needs none.

###### Inherited from

[`OrderRequestCommon`](#orderrequestcommon).[`settleData`](#settledata-4)

##### settleMethod?

> `optional` **settleMethod?**: `undefined`

##### webhookUrl?

> `optional` **webhookUrl?**: `string`

HTTPS webhook URL. Production allows port 443 or no port, a public domain,
and no credentials or fragment.

###### Inherited from

[`OrderRequestCommon`](#orderrequestcommon).[`webhookUrl`](#webhookurl-3)

***

### SettleDataField

One external payout field required by a transfer method.

#### Properties

##### name

> **name**: `string`

##### required

> **required**: `boolean`

***

### SubmitDepositParams

Body for `POST /api/orders/{id}/deposit`.

#### Properties

##### txid

> **txid**: `string`

Transaction hash of the broadcast deposit.

***

### Ticker

Public ticker from `GET /api/ticker/{base}/{quote}`.

#### Properties

##### rate

> **rate**: `number`

Rate including exchange fees. One base asset equals this many quote assets.

##### volume24h

> **volume24h**: `number`

24-hour volume denominated in the quote asset.

***

### TransferMethod

Transfer method from `GET /api/info`. Use `id` exactly as returned.

#### Properties

##### asset

> **asset**: `string`

Asset ticker this method belongs to.

##### batched?

> `optional` **batched?**: `boolean`

Whether settlements are grouped.

##### decimals

> **decimals**: `number`

Decimal places for amounts.

##### depositEnabled

> **depositEnabled**: `boolean`

Whether this method can be used for a deposit.

##### depositFee?

> `optional` **depositFee?**: `number`

Flat fee charged on deposits.

##### details?

> `optional` **details?**: [`TransferMethodDetails`](#transfermethoddetails-1) \| `null`

Method-specific details, including `banks` for fiat methods.

##### enabled

> **enabled**: `boolean`

Active when deposit or settlement is enabled.

##### exchangeBalanceIndex?

> `optional` **exchangeBalanceIndex?**: `number`

Liquidity modifier. Positive discounts deposits; negative discounts settlements.

##### exchangeFee?

> `optional` **exchangeFee?**: `number`

Percentage fee on conversions involving this method.

##### extraLabel?

> `optional` **extraLabel?**: `string` \| `null`

Extra label when several methods share an asset.

##### id

> **id**: `string`

Unique transfer method identifier, for example `btc` or `vnd`.

##### infoUrl?

> `optional` **infoUrl?**: `string` \| `null`

URL with more information about this method.

##### internalBalance

> **internalBalance**: `boolean`

Whether this method is an internal account balance.

##### invoice?

> `optional` **invoice?**: `boolean`

Whether the method is invoice-based, such as Lightning.

##### maxOrderSize?

> `optional` **maxOrderSize?**: `number` \| `null`

Maximum order size in USD equivalent. Null means no limit.

##### minOrderSize?

> `optional` **minOrderSize?**: `number` \| `null`

Minimum order size in USD equivalent.

##### network?

> `optional` **network?**: `string` \| `null`

Network id. Omitted or null when the method has no network.

##### networkFee?

> `optional` **networkFee?**: `number`

Flat network fee charged on deposits and settlements.

##### predictedSettleWaitTime?

> `optional` **predictedSettleWaitTime?**: `number`

Estimated settlement wait time in seconds.

##### settleDataFields?

> `optional` **settleDataFields?**: [`SettleDataField`](#settledatafield)[]

External payout fields for order `settleData`. Omitted for internal balances.

##### settleEnabled

> **settleEnabled**: `boolean`

Whether this method can be used for a payout.

##### settleFee?

> `optional` **settleFee?**: `number`

Flat fee charged on settlements.

##### tags

> **tags**: `string`[]

Classification tags.

##### tokenId?

> `optional` **tokenId?**: `string` \| `null`

Contract or token address for token methods.

##### warning?

> `optional` **warning?**: `string`

Warning message, when the API sends one.

***

### TransferMethodDetails

Method-specific details. `banks` lists fiat bank ids when present.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### banks?

> `optional` **banks?**: `string`[]

***

### Vault

Staking offer from `GET /api/staking`.

#### Properties

##### asset

> **asset**: `string`

Asset id of the staking receipt token.

##### distribution

> **distribution**: `number`

Share of exchange volume rewarded to stakers.

##### id

> **id**: `string`

Staking offer UUID.

##### latestApr

> **latestApr**: `number`

APR based on the currently staked amount.

##### latestFullyDilutedApr

> **latestFullyDilutedApr**: `number`

APR based on the fully diluted supply.

##### staked

> **staked**: `number`

Total amount currently staked.

##### supplyTarget

> **supplyTarget**: `number`

Positive maximum amount that can be staked.

##### tvl?

> `optional` **tvl?**: `number`

Total value locked in USD. Omitted when unavailable.

##### unstakingFee?

> `optional` **unstakingFee?**: `number`

Fee rate charged when funds are unstaked.

***

### VndBankSettleData

VND bank payout. `bank` comes from `transferMethods.vnd.details.banks`.

#### Properties

##### accountHolder?

> `optional` **accountHolder?**: `string`

Optional account holder name.

##### accountNumber

> **accountNumber**: `string`

VND bank account number.

##### bank

> **bank**: `string`

Bank identifier from `GET /api/info`.

##### note?

> `optional` **note?**: `string`

Optional transfer note.

## Type Aliases

### Balances

> **Balances** = `Record`\<`string`, `number`\>

Available balances keyed by asset id.

***

### CreateOrderParams

> **CreateOrderParams** = [`QuotedOrderRequest`](#quotedorderrequest) \| [`InternalBalanceDepositAmountOrderRequest`](#internalbalancedepositamountorderrequest) \| [`InternalBalanceSettleAmountOrderRequest`](#internalbalancesettleamountorderrequest) \| [`DirectVariableOrderRequest`](#directvariableorderrequest)

One of the four `POST /api/orders` request shapes.

***

### OrderSettleData

> **OrderSettleData** = [`CryptoAddressSettleData`](#cryptoaddresssettledata) \| [`LightningSettleData`](#lightningsettledata) \| [`TaggedAddressSettleData`](#taggedaddresssettledata) \| [`VndBankSettleData`](#vndbanksettledata) \| [`InternalBalanceSettleData`](#internalbalancesettledata) \| [`CashPickupSettleData`](#cashpickupsettledata)

Payout object accepted by `POST /api/orders`. Omit it when the method needs no destination.

***

### OrderStatus

> **OrderStatus** = `"new"` \| `"pending"` \| `"settle_data_error"` \| `"on_hold"` \| `"processing"` \| `"completed"` \| `"canceled"`

Order states documented for `GET /api/orders/{id}`.

***

### SettleDataCorrection

> **SettleDataCorrection** = [`CryptoAddressSettleData`](#cryptoaddresssettledata) \| [`LightningSettleData`](#lightningsettledata) \| [`TaggedAddressSettleData`](#taggedaddresssettledata) \| [`VndBankSettleData`](#vndbanksettledata)

Payout object accepted by `PUT /api/orders/{id}/settle-data`.
The spec allows an address, Lightning invoice, tagged address, or VND bank.

***

### TaggedAddressSettleData

> **TaggedAddressSettleData** = [`DestinationTagSettleData`](#destinationtagsettledata) \| [`MemoSettleData`](#memosettledata)

Tagged-address payout. Send a destination tag or a memo, not both.

## Variables

### REFERRER

> `const` **REFERRER**: `"35b2eec68a1741ac"` = `"35b2eec68a1741ac"`

Referral code sent as the JSON property `referrer` on `POST /api/orders`.
Callers cannot change or omit it.

#### Example

```ts
import { REFERRER } from "bitcoinvn";
REFERRER;
```
