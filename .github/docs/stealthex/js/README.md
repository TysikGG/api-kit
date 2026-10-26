**stealthex**

***

# stealthex

## Classes

### StealthEX

Client for interacting with the StealthEX cryptocurrency exchange API.

#### Constructors

##### Constructor

> **new StealthEX**(`options?`): [`StealthEX`](#stealthex)

Creates an instance of the StealthEX client.

###### Parameters

###### options?

[`StealthEXClientOptions`](#stealthexclientoptions) = `{}`

###### Returns

[`StealthEX`](#stealthex)

###### Example

```typescript
import { StealthEX } from "stealthex-client";

const client = new StealthEX({ apiKey: "your-api-key" });
const currencies = await client.getCurrencies();
console.log(`Available currencies: ${currencies.length}`);
```

#### Methods

##### createExchange()

> **createExchange**(`params`): `Promise`\<[`ExchangeDetails`](#exchangedetails)\>

Creates a cryptocurrency exchange order.

###### Parameters

###### params

[`CreateExchangeParams`](#createexchangeparams)

###### Returns

`Promise`\<[`ExchangeDetails`](#exchangedetails)\>

###### Example

```typescript
const order = await client.createExchange({
  currencyFrom: "btc",
  currencyTo: "eth",
  amountFrom: "0.1",
  addressTo: "0xReceiverEthereumAddress...",
});
console.log(`Deposit address: ${order.address_from}`);
```

##### getCurrencies()

> **getCurrencies**(`params?`): `Promise`\<[`StealthEXCurrency`](#stealthexcurrency)[]\>

Retrieves all supported currencies and networks.

###### Parameters

###### params?

###### fixed?

`boolean`

###### Returns

`Promise`\<[`StealthEXCurrency`](#stealthexcurrency)[]\>

###### Example

```typescript
const currencies = await client.getCurrencies();
console.log(`Currencies: ${currencies.length}`);
```

##### getCurrency()

> **getCurrency**(`symbol`): `Promise`\<[`StealthEXCurrency`](#stealthexcurrency)\>

Retrieves information for a single currency by symbol.

###### Parameters

###### symbol

`string`

###### Returns

`Promise`\<[`StealthEXCurrency`](#stealthexcurrency)\>

###### Example

```typescript
const btc = await client.getCurrency("btc");
console.log(`Currency: ${btc.name}`);
```

##### getEstimate()

> **getEstimate**(`fromCurrency`, `toCurrency`, `amount`, `fixed?`): `Promise`\<[`EstimateResult`](#estimateresult)\>

Retrieves estimated return amount for an exchange pair.

###### Parameters

###### fromCurrency

`string`

###### toCurrency

`string`

###### amount

`string` \| `number`

###### fixed?

`boolean`

###### Returns

`Promise`\<[`EstimateResult`](#estimateresult)\>

###### Example

```typescript
const est = await client.getEstimate("btc", "eth", "0.1");
console.log(`Estimated ETH: ${est.estimated_amount}`);
```

##### getExchange()

> **getExchange**(`id`): `Promise`\<[`ExchangeDetails`](#exchangedetails)\>

Retrieves details and status of an exchange by ID.

###### Parameters

###### id

`string`

###### Returns

`Promise`\<[`ExchangeDetails`](#exchangedetails)\>

###### Example

```typescript
const order = await client.getExchange("exchange-id");
console.log(`Status: ${order.status}`);
```

##### getExchanges()

> **getExchanges**(`limit?`): `Promise`\<[`ExchangeDetails`](#exchangedetails)[]\>

Lists past transactions.

###### Parameters

###### limit?

`number`

###### Returns

`Promise`\<[`ExchangeDetails`](#exchangedetails)[]\>

###### Example

```typescript
const txs = await client.getExchanges(10);
console.log(`Transactions found: ${txs.length}`);
```

##### getMinAmount()

> **getMinAmount**(`fromCurrency`, `toCurrency`, `fixed?`): `Promise`\<[`MinAmountResult`](#minamountresult)\>

Retrieves minimal deposit amount required for a pair.

###### Parameters

###### fromCurrency

`string`

###### toCurrency

`string`

###### fixed?

`boolean`

###### Returns

`Promise`\<[`MinAmountResult`](#minamountresult)\>

###### Example

```typescript
const min = await client.getMinAmount("btc", "eth");
console.log(`Minimal amount: ${min.min_amount}`);
```

##### getPairs()

> **getPairs**(`symbol?`): `Promise`\<`string`[]\>

Retrieves available pairs for exchange.

###### Parameters

###### symbol?

`string`

###### Returns

`Promise`\<`string`[]\>

###### Example

```typescript
const pairs = await client.getPairs("btc");
console.log(`Pairs for BTC: ${pairs.length}`);
```

##### getRange()

> **getRange**(`fromCurrency`, `toCurrency`, `fixed?`): `Promise`\<[`RangeResult`](#rangeresult)\>

Retrieves minimum and maximum deposit range for a pair.

###### Parameters

###### fromCurrency

`string`

###### toCurrency

`string`

###### fixed?

`boolean`

###### Returns

`Promise`\<[`RangeResult`](#rangeresult)\>

###### Example

```typescript
const range = await client.getRange("btc", "eth");
console.log(`Min: ${range.min_amount}`);
```

***

### StealthEXError

Error thrown by the StealthEX client when an API operation fails.

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new StealthEXError**(`message`, `options?`): [`StealthEXError`](#stealthexerror)

###### Parameters

###### message

`string`

###### options?

###### responseBody?

`unknown`

###### statusCode?

`number`

###### Returns

[`StealthEXError`](#stealthexerror)

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

Full response body from StealthEX, if available

##### stack?

> `optional` **stack?**: `string`

###### Inherited from

`Error.stack`

##### statusCode?

> `readonly` `optional` **statusCode?**: `number`

HTTP status code returned by StealthEX, if available

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

### CreateExchangeParams

Parameters for creating an exchange on StealthEX.

#### Properties

##### addressTo

> **addressTo**: `string`

##### amountFrom

> **amountFrom**: `string` \| `number`

##### amountTo?

> `optional` **amountTo?**: `string` \| `number`

##### currencyFrom

> **currencyFrom**: `string`

##### currencyTo

> **currencyTo**: `string`

##### extraIdTo?

> `optional` **extraIdTo?**: `string`

##### fixed?

> `optional` **fixed?**: `boolean`

##### rateId?

> `optional` **rateId?**: `string`

##### referral?

> `optional` **referral?**: `string`

##### refundAddress?

> `optional` **refundAddress?**: `string`

##### refundExtraId?

> `optional` **refundExtraId?**: `string`

***

### EstimateResult

Estimated receiving amount.

#### Properties

##### estimated\_amount

> **estimated\_amount**: `string`

##### rate\_id?

> `optional` **rate\_id?**: `string` \| `null`

##### valid\_until?

> `optional` **valid\_until?**: `string` \| `null`

***

### ExchangeDetails

Exchange details returned by StealthEX.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### address\_from

> **address\_from**: `string`

##### address\_to

> **address\_to**: `string`

##### amount\_from

> **amount\_from**: `string`

##### amount\_to

> **amount\_to**: `string`

##### currency\_from

> **currency\_from**: `string`

##### currency\_to

> **currency\_to**: `string`

##### extra\_id\_from?

> `optional` **extra\_id\_from?**: `string` \| `null`

##### extra\_id\_to?

> `optional` **extra\_id\_to?**: `string` \| `null`

##### id

> **id**: `string`

##### refund\_address?

> `optional` **refund\_address?**: `string` \| `null`

##### refund\_extra\_id?

> `optional` **refund\_extra\_id?**: `string` \| `null`

##### status

> **status**: `string`

##### timestamp?

> `optional` **timestamp?**: `string`

##### tx\_from?

> `optional` **tx\_from?**: `string` \| `null`

##### tx\_to?

> `optional` **tx\_to?**: `string` \| `null`

##### type?

> `optional` **type?**: `string`

##### updated\_at?

> `optional` **updated\_at?**: `string`

***

### MinAmountResult

Minimal amount required for an exchange pair.

#### Properties

##### min\_amount

> **min\_amount**: `string`

***

### RangeResult

Range bounds for an exchange pair.

#### Properties

##### max\_amount?

> `optional` **max\_amount?**: `string` \| `null`

##### min\_amount

> **min\_amount**: `string` \| `null`

***

### StealthEXClientOptions

Client configuration options for StealthEX.

#### Properties

##### apiKey?

> `optional` **apiKey?**: `string`

StealthEX API key (defaults to process.env.STEALTHEX_API_KEY).

##### baseURL?

> `optional` **baseURL?**: `string`

Base URL for the StealthEX API. Defaults to https://api.stealthex.io.

##### timeoutMs?

> `optional` **timeoutMs?**: `number`

HTTP request timeout in milliseconds. Defaults to 30000 (30 seconds).

##### userAgent?

> `optional` **userAgent?**: `string`

Custom User-Agent header string.

***

### StealthEXCurrency

Currency information returned by StealthEX.

#### Properties

##### address\_explorer?

> `optional` **address\_explorer?**: `string`

##### extra\_id?

> `optional` **extra\_id?**: `string` \| `null`

##### has\_extra\_id?

> `optional` **has\_extra\_id?**: `boolean`

##### image?

> `optional` **image?**: `string`

##### name

> **name**: `string`

##### network?

> `optional` **network?**: `string`

##### symbol

> **symbol**: `string`

##### tx\_explorer?

> `optional` **tx\_explorer?**: `string`

##### validation\_address?

> `optional` **validation\_address?**: `string` \| `null`

##### validation\_extra?

> `optional` **validation\_extra?**: `string` \| `null`

##### warnings\_from?

> `optional` **warnings\_from?**: `string`[]

##### warnings\_to?

> `optional` **warnings\_to?**: `string`[]
