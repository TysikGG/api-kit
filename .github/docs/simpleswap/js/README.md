**simpleswap-client**

***

# simpleswap-client

## Classes

### SimpleSwap

Client for interacting with the SimpleSwap cryptocurrency exchange API (v3).

#### Constructors

##### Constructor

> **new SimpleSwap**(`options?`): [`SimpleSwap`](#simpleswap)

Creates an instance of the SimpleSwap client.

###### Parameters

###### options?

[`SimpleSwapClientOptions`](#simpleswapclientoptions) = `{}`

###### Returns

[`SimpleSwap`](#simpleswap)

###### Example

```typescript
import { SimpleSwap } from "simpleswap-client";

const client = new SimpleSwap({ apiKey: "your-api-key" });
const currencies = await client.getCurrencies();
console.log(`Available currencies: ${currencies.length}`);
```

#### Methods

##### checkExchange()

> **checkExchange**(`params`): `Promise`\<[`CheckExchangeResult`](#checkexchangeresult)\>

Checks if an exchange can be created with the specified parameters.

###### Parameters

###### params

[`CheckExchangeParams`](#checkexchangeparams)

###### Returns

`Promise`\<[`CheckExchangeResult`](#checkexchangeresult)\>

###### Example

```typescript
const check = await client.checkExchange({
  tickerFrom: "btc",
  tickerTo: "eth",
  networkFrom: "btc",
  networkTo: "eth",
  amount: "0.1",
});
console.log(`Can create: ${check.canCreate}`);
```

##### createExchange()

> **createExchange**(`params`): `Promise`\<[`ExchangeOrder`](#exchangeorder)\>

Creates a cryptocurrency exchange order.

###### Parameters

###### params

[`CreateExchangeParams`](#createexchangeparams)

###### Returns

`Promise`\<[`ExchangeOrder`](#exchangeorder)\>

###### Example

```typescript
const order = await client.createExchange({
  tickerFrom: "btc",
  tickerTo: "eth",
  networkFrom: "btc",
  networkTo: "eth",
  amount: "0.1",
  addressTo: "0xReceiverEthereumAddress...",
});
console.log(`Deposit address: ${order.addressFrom}`);
```

##### getCurrencies()

> **getCurrencies**(): `Promise`\<[`SimpleSwapCurrency`](#simpleswapcurrency)[]\>

Retrieves all supported currencies and networks.

###### Returns

`Promise`\<[`SimpleSwapCurrency`](#simpleswapcurrency)[]\>

###### Example

```typescript
const currencies = await client.getCurrencies();
console.log(`Currencies count: ${currencies.length}`);
```

##### getCurrency()

> **getCurrency**(`ticker`, `network`): `Promise`\<[`SimpleSwapCurrency`](#simpleswapcurrency)\>

Retrieves details for a specific currency on a given network.

###### Parameters

###### ticker

`string`

###### network

`string`

###### Returns

`Promise`\<[`SimpleSwapCurrency`](#simpleswapcurrency)\>

###### Example

```typescript
const btc = await client.getCurrency("btc", "btc");
console.log(`Currency: ${btc.name}`);
```

##### getEstimate()

> **getEstimate**(`params`): `Promise`\<[`EstimateResult`](#estimateresult)\>

Retrieves estimated receiving amount for an exchange.

###### Parameters

###### params

[`GetEstimateParams`](#getestimateparams)

###### Returns

`Promise`\<[`EstimateResult`](#estimateresult)\>

###### Example

```typescript
const estimate = await client.getEstimate({
  tickerFrom: "btc",
  tickerTo: "eth",
  networkFrom: "btc",
  networkTo: "eth",
  amount: "0.1",
});
console.log(`Estimated ETH: ${estimate.estimatedAmount}`);
```

##### getExchange()

> **getExchange**(`id`): `Promise`\<[`ExchangeOrder`](#exchangeorder)\>

Retrieves details and status of an exchange by ID.

###### Parameters

###### id

`string`

###### Returns

`Promise`\<[`ExchangeOrder`](#exchangeorder)\>

###### Example

```typescript
const order = await client.getExchange("exchange-id");
console.log(`Status: ${order.status}`);
```

##### getExchanges()

> **getExchanges**(`params?`): `Promise`\<[`ExchangeOrder`](#exchangeorder)[]\>

Lists previous exchanges created by this account.

###### Parameters

###### params?

[`GetExchangesParams`](#getexchangesparams)

###### Returns

`Promise`\<[`ExchangeOrder`](#exchangeorder)[]\>

###### Example

```typescript
const exchanges = await client.getExchanges({ limit: 10 });
console.log(`Orders found: ${exchanges.length}`);
```

##### getRanges()

> **getRanges**(`params`): `Promise`\<[`RangesResult`](#rangesresult)\>

Retrieves deposit ranges (minimum and maximum amounts) for a pair.

###### Parameters

###### params

[`GetRangesParams`](#getrangesparams)

###### Returns

`Promise`\<[`RangesResult`](#rangesresult)\>

###### Example

```typescript
const ranges = await client.getRanges({
  tickerFrom: "btc",
  tickerTo: "eth",
  networkFrom: "btc",
  networkTo: "eth",
});
console.log(`Min: ${ranges.min}, Max: ${ranges.max}`);
```

***

### SimpleSwapError

Error thrown by the SimpleSwap client when an API operation fails.

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new SimpleSwapError**(`message`, `options?`): [`SimpleSwapError`](#simpleswaperror)

###### Parameters

###### message

`string`

###### options?

###### responseBody?

`unknown`

###### statusCode?

`number`

###### traceId?

`string`

###### Returns

[`SimpleSwapError`](#simpleswaperror)

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

Full response body from SimpleSwap

##### stack?

> `optional` **stack?**: `string`

###### Inherited from

`Error.stack`

##### statusCode?

> `readonly` `optional` **statusCode?**: `number`

HTTP status code returned by SimpleSwap

##### traceId?

> `readonly` `optional` **traceId?**: `string`

Request trace ID returned by SimpleSwap

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

### CheckExchangeParams

Parameters for checking if an exchange can be created.

#### Properties

##### amount

> **amount**: `string` \| `number`

##### fixed?

> `optional` **fixed?**: `boolean`

##### networkFrom?

> `optional` **networkFrom?**: `string`

##### networkTo?

> `optional` **networkTo?**: `string`

##### reverse?

> `optional` **reverse?**: `boolean`

##### tickerFrom

> **tickerFrom**: `string`

##### tickerTo

> **tickerTo**: `string`

***

### CheckExchangeResult

Result of checkExchange.

#### Properties

##### canCreate

> **canCreate**: `boolean`

***

### CreateExchangeParams

Parameters for creating an exchange.

#### Properties

##### addressTo

> **addressTo**: `string`

##### amount

> **amount**: `string` \| `number`

##### customFee?

> `optional` **customFee?**: `string` \| `number` \| `null`

##### extraIdTo?

> `optional` **extraIdTo?**: `string`

##### fixed?

> `optional` **fixed?**: `boolean`

##### networkFrom?

> `optional` **networkFrom?**: `string`

##### networkTo?

> `optional` **networkTo?**: `string`

##### rateId?

> `optional` **rateId?**: `string` \| `null`

##### tickerFrom

> **tickerFrom**: `string`

##### tickerTo

> **tickerTo**: `string`

##### userRefundAddress?

> `optional` **userRefundAddress?**: `string`

##### userRefundExtraId?

> `optional` **userRefundExtraId?**: `string`

***

### EstimateResult

Result returned by getEstimate.

#### Properties

##### estimatedAmount

> **estimatedAmount**: `string`

##### rateId?

> `optional` **rateId?**: `string` \| `null`

##### validUntil?

> `optional` **validUntil?**: `string` \| `null`

***

### ExchangeOrder

Exchange order details.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### addressFrom

> **addressFrom**: `string`

##### addressTo

> **addressTo**: `string`

##### amountFrom

> **amountFrom**: `string`

##### amountTo

> **amountTo**: `string`

##### createdAt?

> `optional` **createdAt?**: `string`

##### extraIdFrom?

> `optional` **extraIdFrom?**: `string` \| `null`

##### extraIdTo?

> `optional` **extraIdTo?**: `string` \| `null`

##### id

> **id**: `string`

##### networkFrom?

> `optional` **networkFrom?**: `string`

##### networkTo?

> `optional` **networkTo?**: `string`

##### status

> **status**: `string`

##### tickerFrom

> **tickerFrom**: `string`

##### tickerTo

> **tickerTo**: `string`

##### txFrom?

> `optional` **txFrom?**: `string` \| `null`

##### txTo?

> `optional` **txTo?**: `string` \| `null`

##### updatedAt?

> `optional` **updatedAt?**: `string`

##### userRefundAddress?

> `optional` **userRefundAddress?**: `string`

##### userRefundExtraId?

> `optional` **userRefundExtraId?**: `string`

***

### GetEstimateParams

Parameters for querying estimated exchange amounts.

#### Properties

##### amount

> **amount**: `string` \| `number`

##### customFee?

> `optional` **customFee?**: `string` \| `number` \| `null`

##### fixed?

> `optional` **fixed?**: `boolean`

##### networkFrom?

> `optional` **networkFrom?**: `string`

##### networkTo?

> `optional` **networkTo?**: `string`

##### reverse?

> `optional` **reverse?**: `boolean`

##### tickerFrom

> **tickerFrom**: `string`

##### tickerTo

> **tickerTo**: `string`

***

### GetExchangesParams

Parameters for listing exchanges.

#### Properties

##### finishDate?

> `optional` **finishDate?**: `string`

##### limit?

> `optional` **limit?**: `number`

##### offset?

> `optional` **offset?**: `number`

##### startDate?

> `optional` **startDate?**: `string`

***

### GetRangesParams

Parameters for querying deposit ranges (min/max).

#### Properties

##### fixed?

> `optional` **fixed?**: `boolean`

##### networkFrom?

> `optional` **networkFrom?**: `string`

##### networkTo?

> `optional` **networkTo?**: `string`

##### reverse?

> `optional` **reverse?**: `boolean`

##### tickerFrom

> **tickerFrom**: `string`

##### tickerTo

> **tickerTo**: `string`

***

### RangesResult

Minimum and maximum deposit amounts.

#### Properties

##### max

> **max**: `string` \| `null`

##### min

> **min**: `string` \| `null`

***

### SimpleSwapClientOptions

Client configuration options for SimpleSwap.

#### Properties

##### apiKey?

> `optional` **apiKey?**: `string`

SimpleSwap API key (defaults to process.env.SIMPLESWAP_API_KEY).

##### baseURL?

> `optional` **baseURL?**: `string`

Base URL for the SimpleSwap API. Defaults to https://api.simpleswap.io.

##### timeoutMs?

> `optional` **timeoutMs?**: `number`

HTTP request timeout in milliseconds. Defaults to 30000 (30 seconds).

##### userAgent?

> `optional` **userAgent?**: `string`

Custom User-Agent header.

***

### SimpleSwapCurrency

Currency information returned by SimpleSwap.

#### Properties

##### addressExplorer?

> `optional` **addressExplorer?**: `string`

##### confirmationsFrom?

> `optional` **confirmationsFrom?**: `string`

##### contractAddress?

> `optional` **contractAddress?**: `string` \| `null`

##### enabled?

> `optional` **enabled?**: `boolean`

##### extraId?

> `optional` **extraId?**: `string`

##### hasExtraId?

> `optional` **hasExtraId?**: `boolean`

##### image?

> `optional` **image?**: `string`

##### isAvailableFixed?

> `optional` **isAvailableFixed?**: `boolean`

##### isAvailableFloat?

> `optional` **isAvailableFloat?**: `boolean`

##### isFiat?

> `optional` **isFiat?**: `boolean`

##### legacySymbol?

> `optional` **legacySymbol?**: `string`

##### name

> **name**: `string`

##### network

> **network**: `string`

##### precision?

> `optional` **precision?**: `number`

##### ticker

> **ticker**: `string`

##### txExplorer?

> `optional` **txExplorer?**: `string`

##### validationAddress?

> `optional` **validationAddress?**: `string` \| `null`

##### validationExtra?

> `optional` **validationExtra?**: `string` \| `null`

##### warningsFrom?

> `optional` **warningsFrom?**: `string`[]

##### warningsTo?

> `optional` **warningsTo?**: `string`[]
