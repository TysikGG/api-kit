**swapzone**

***

# swapzone

## Classes

### Swapzone

Client for interacting with the Swapzone cryptocurrency exchange API.

#### Constructors

##### Constructor

> **new Swapzone**(`options?`): [`Swapzone`](#swapzone)

Creates an instance of the Swapzone client.

###### Parameters

###### options?

[`SwapzoneClientOptions`](#swapzoneclientoptions) = `{}`

###### Returns

[`Swapzone`](#swapzone)

###### Example

```typescript
import { Swapzone } from "swapzone-client";

const client = new Swapzone({ apiKey: "your-api-key" });
const currencies = await client.getCurrencies();
console.log(`Supported currencies: ${currencies.length}`);
```

#### Methods

##### createTransaction()

> **createTransaction**(`params`): `Promise`\<[`TransactionResult`](#transactionresult)\>

Creates an exchange transaction order with a selected provider.

###### Parameters

###### params

[`CreateTransactionParams`](#createtransactionparams)

###### Returns

`Promise`\<[`TransactionResult`](#transactionresult)\>

###### Example

```typescript
const order = await client.createTransaction({
  from: "btc",
  to: "eth",
  amountDeposit: "0.1",
  addressReceive: "0xReceiverAddress...",
  quotaId: rate.quotaId,
});
console.log(`Deposit address: ${order.addressDeposit}`);
```

##### getCurrencies()

> **getCurrencies**(): `Promise`\<[`SupportedCurrency`](#supportedcurrency)[]\>

Retrieves all supported currencies across instant exchange adapters.

###### Returns

`Promise`\<[`SupportedCurrency`](#supportedcurrency)[]\>

###### Example

```typescript
const currencies = await client.getCurrencies();
console.log(`Available currencies: ${currencies.length}`);
```

##### getDEXBlockchains()

> **getDEXBlockchains**(): `Promise`\<[`DEXBlockchain`](#dexblockchain)[]\>

Retrieves supported blockchains for decentralized (DEX) swaps.

###### Returns

`Promise`\<[`DEXBlockchain`](#dexblockchain)[]\>

###### Example

```typescript
const chains = await client.getDEXBlockchains();
console.log(`DEX blockchains: ${chains.length}`);
```

##### getDEXQuote()

> **getDEXQuote**(`params`): `Promise`\<`unknown`\>

Gets a cross-chain or on-chain DEX quote.

###### Parameters

###### params

[`DEXQuoteParams`](#dexquoteparams)

###### Returns

`Promise`\<`unknown`\>

###### Example

```typescript
const quote = await client.getDEXQuote({
  fromChainId: 1,
  toChainId: 56,
  fromTokenAddress: "0x...",
  toTokenAddress: "0x...",
  fromAmount: "0.05",
});
```

##### getDEXSwapStatus()

> **getDEXSwapStatus**(`swapId`, `fromHash?`): `Promise`\<`unknown`\>

Gets the status of a DEX swap.

###### Parameters

###### swapId

`string`

###### fromHash?

`string`

###### Returns

`Promise`\<`unknown`\>

###### Example

```typescript
const status = await client.getDEXSwapStatus("swap-id");
```

##### getDEXTokens()

> **getDEXTokens**(): `Promise`\<`unknown`[]\>

Retrieves supported tokens for DEX swaps.

###### Returns

`Promise`\<`unknown`[]\>

###### Example

```typescript
const tokens = await client.getDEXTokens();
console.log(`DEX tokens: ${tokens.length}`);
```

##### getMarkets()

> **getMarkets**(`rateType?`): `Promise`\<`unknown`[]\>

Retrieves bulk rate markets for instant exchange pairs.

###### Parameters

###### rateType?

`"all"` \| `"fixed"` \| `"floating"`

###### Returns

`Promise`\<`unknown`[]\>

###### Example

```typescript
const markets = await client.getMarkets("fixed");
console.log(`Markets count: ${markets.length}`);
```

##### getRate()

> **getRate**(`params`): `Promise`\<[`RateOffer`](#rateoffer)\>

Retrieves the best or all rate offers for exchanging between two assets.

###### Parameters

###### params

[`GetRateParams`](#getrateparams)

###### Returns

`Promise`\<[`RateOffer`](#rateoffer)\>

###### Example

```typescript
const rate = await client.getRate({
  from: "btc",
  to: "eth",
  amount: "0.1",
});
console.log(`Estimated ETH: ${rate.amountTo} (via ${rate.adapter})`);
```

##### getTransaction()

> **getTransaction**(`id`): `Promise`\<[`TransactionStatus`](#transactionstatus)\>

Retrieves the current status of an exchange transaction.

###### Parameters

###### id

`string`

###### Returns

`Promise`\<[`TransactionStatus`](#transactionstatus)\>

###### Example

```typescript
const status = await client.getTransaction("transaction-id");
console.log(`Transaction status: ${status.status}`);
```

##### validateAddress()

> **validateAddress**(`params`): `Promise`\<[`ValidateAddressResult`](#validateaddressresult)\>

Validates a cryptocurrency recipient address.

###### Parameters

###### params

[`ValidateAddressParams`](#validateaddressparams)

###### Returns

`Promise`\<[`ValidateAddressResult`](#validateaddressresult)\>

###### Example

```typescript
const res = await client.validateAddress({
  currency: "eth",
  network: "ETH",
  address: "0x57f31ad4b64095347F87eDB1675566DAfF5EC886",
});
console.log(`Address valid: ${res.result}`);
```

***

### SwapzoneError

Error thrown by the Swapzone client when an API request fails.

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new SwapzoneError**(`message`, `options?`): [`SwapzoneError`](#swapzoneerror)

###### Parameters

###### message

`string`

###### options?

###### responseBody?

`unknown`

###### statusCode?

`number`

###### Returns

[`SwapzoneError`](#swapzoneerror)

###### Overrides

`Error.constructor`

#### Properties

##### cause?

> `optional` **cause?**: `unknown`

###### Inherited from

`Error.cause`

##### message

> **message**: `string`

###### Inherited from

`Error.message`

##### name

> **name**: `string`

###### Inherited from

`Error.name`

##### responseBody?

> `readonly` `optional` **responseBody?**: `unknown`

Full response body from Swapzone, if available

##### stack?

> `optional` **stack?**: `string`

###### Inherited from

`Error.stack`

##### statusCode?

> `readonly` `optional` **statusCode?**: `number`

HTTP status code returned by the server, if available

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

### CreateTransactionParams

Parameters for creating an exchange transaction.

#### Properties

##### addressReceive

> **addressReceive**: `string`

Destination address to receive exchanged funds

##### amountDeposit

> **amountDeposit**: `string` \| `number`

Amount to deposit

##### extraIdReceive?

> `optional` **extraIdReceive?**: `string`

Memo or extra ID for destination address (optional)

##### from

> **from**: `string`

Ticker of the currency to exchange

##### fromNetwork?

> `optional` **fromNetwork?**: `string`

Network for deposit currency

##### noQuotaId?

> `optional` **noQuotaId?**: `boolean`

Skip quota ID requirement

##### offerReferenceId?

> `optional` **offerReferenceId?**: `string`

Reference ID for fixed-rate flows

##### quotaId?

> `optional` **quotaId?**: `string`

Quota ID obtained from getRate

##### refundAddress?

> `optional` **refundAddress?**: `string`

Address for refunds if the exchange fails (optional)

##### refundExtraId?

> `optional` **refundExtraId?**: `string`

Memo for refund address (optional)

##### to

> **to**: `string`

Ticker of the currency to receive

##### toNetwork?

> `optional` **toNetwork?**: `string`

Network for receive currency

***

### DEXBlockchain

DEX supported blockchain item.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### chainId

> **chainId**: `number`

##### explorerUrls?

> `optional` **explorerUrls?**: `string`[]

##### name

> **name**: `string`

##### nativeCurrency?

> `optional` **nativeCurrency?**: `object`

###### decimals

> **decimals**: `number`

###### name

> **name**: `string`

###### symbol

> **symbol**: `string`

##### rpcUrls?

> `optional` **rpcUrls?**: `string`[]

***

### DEXQuoteParams

Parameters for getting a DEX quote.

#### Properties

##### fromAmount

> **fromAmount**: `string` \| `number`

##### fromChainId

> **fromChainId**: `string` \| `number`

##### fromTokenAddress

> **fromTokenAddress**: `string`

##### slippage?

> `optional` **slippage?**: `string` \| `number`

##### toChainId

> **toChainId**: `string` \| `number`

##### toTokenAddress

> **toTokenAddress**: `string`

***

### GetRateParams

Parameters for querying exchange rates.

#### Properties

##### amount

> **amount**: `string` \| `number`

Exchange deposit amount

##### amountTo?

> `optional` **amountTo?**: `string` \| `number`

Amount to receive after exchange (for reverse rate)

##### availableInUSA?

> `optional` **availableInUSA?**: `boolean`

Filter for partners that work with USA clients

##### chooseRate?

> `optional` **chooseRate?**: `"all"` \| `"best"` \| `"recommended"`

Selection strategy: 'best', 'all', or 'recommended' (default: 'best')

##### from

> **from**: `string`

Ticker of the deposited currency (e.g. 'btc')

##### fromNetwork?

> `optional` **fromNetwork?**: `string`

Network of the deposit currency

##### noRefundAddress?

> `optional` **noRefundAddress?**: `boolean`

Exchangers with optional return address

##### rateType?

> `optional` **rateType?**: `"all"` \| `"fixed"` \| `"floating"`

Rate type: 'all', 'fixed', or 'floating' (default: 'all')

##### timeout?

> `optional` **timeout?**: `string` \| `number`

Timeout in ms to limit exchanger response time

##### to

> **to**: `string`

Ticker of the received currency (e.g. 'eth')

##### toNetwork?

> `optional` **toNetwork?**: `string`

Network of the received currency

***

### RateOffer

Rate offer result returned by getRate.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### accuracyRate?

> `optional` **accuracyRate?**: `number`

##### adapter

> **adapter**: `string`

##### amountFrom

> **amountFrom**: `number`

##### amountFromUSD?

> `optional` **amountFromUSD?**: `number`

##### amountTo

> **amountTo**: `number`

##### amountToUSD?

> `optional` **amountToUSD?**: `number`

##### from

> **from**: `string`

##### fromNetwork?

> `optional` **fromNetwork?**: `string`

##### maxAmount?

> `optional` **maxAmount?**: `number`

##### minAmount?

> `optional` **minAmount?**: `number`

##### quotaId?

> `optional` **quotaId?**: `string`

##### time?

> `optional` **time?**: `number`

##### to

> **to**: `string`

##### toNetwork?

> `optional` **toNetwork?**: `string`

***

### SupportedCurrency

Supported cryptocurrency information.

#### Properties

##### alias?

> `optional` **alias?**: `string`[]

##### defaultAmount?

> `optional` **defaultAmount?**: `number`

##### hasExternalId?

> `optional` **hasExternalId?**: `boolean`

##### name

> **name**: `string`

##### network

> **network**: `string`

##### smartContract?

> `optional` **smartContract?**: `string` \| `null`

##### ticker

> **ticker**: `string`

***

### SwapzoneClientOptions

Client configuration options for Swapzone.

#### Properties

##### apiKey?

> `optional` **apiKey?**: `string`

Swapzone API key (defaults to process.env.SWAPZONE_API_KEY).

##### baseURL?

> `optional` **baseURL?**: `string`

Base URL for the Swapzone API. Defaults to https://api.swapzone.io.

##### timeoutMs?

> `optional` **timeoutMs?**: `number`

HTTP request timeout in milliseconds. Defaults to 30000 (30 seconds).

##### userAgent?

> `optional` **userAgent?**: `string`

Optional custom User-Agent header.

***

### TransactionResult

Transaction creation response.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### addressDeposit

> **addressDeposit**: `string`

##### addressReceive

> **addressReceive**: `string`

##### amountDeposit

> **amountDeposit**: `number`

##### amountEstimated

> **amountEstimated**: `number`

##### createdAt

> **createdAt**: `string`

##### extraIdReceive?

> `optional` **extraIdReceive?**: `string`

##### from

> **from**: `string`

##### fromNetwork?

> `optional` **fromNetwork?**: `string`

##### id

> **id**: `string`

##### payTill?

> `optional` **payTill?**: `string`

##### quotaId?

> `optional` **quotaId?**: `string`

##### refundAddress?

> `optional` **refundAddress?**: `string`

##### refundExtraId?

> `optional` **refundExtraId?**: `string`

##### status

> **status**: `string`

##### to

> **to**: `string`

##### toNetwork?

> `optional` **toNetwork?**: `string`

***

### TransactionStatus

Transaction status response.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### addressDeposit?

> `optional` **addressDeposit?**: `string`

##### addressReceive?

> `optional` **addressReceive?**: `string`

##### amountDeposit

> **amountDeposit**: `number`

##### amountEstimated

> **amountEstimated**: `number`

##### createdAt?

> `optional` **createdAt?**: `string`

##### from

> **from**: `string`

##### hashDeposit?

> `optional` **hashDeposit?**: `string` \| `null`

##### hashReceive?

> `optional` **hashReceive?**: `string` \| `null`

##### id

> **id**: `string`

##### status

> **status**: `string`

##### to

> **to**: `string`

##### updatedAt?

> `optional` **updatedAt?**: `string`

***

### ValidateAddressParams

Parameters for address validation.

#### Properties

##### address

> **address**: `string`

##### currency

> **currency**: `string`

##### network?

> `optional` **network?**: `string`

***

### ValidateAddressResult

Address validation result.

#### Properties

##### message?

> `optional` **message?**: `string` \| `null`

##### result

> **result**: `boolean`
