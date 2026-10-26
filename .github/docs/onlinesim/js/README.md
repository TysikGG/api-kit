**onlinesim**

***

# onlinesim

## Classes

### OnlineSim

Defined in: src/client.ts:17

Client for interacting with the OnlineSIM virtual number and SMS activation API.

#### Constructors

##### Constructor

> **new OnlineSim**(`options`): [`OnlineSim`](#onlinesim)

Defined in: src/client.ts:33

Creates an instance of OnlineSim.

###### Parameters

###### options

`string` \| [`OnlineSimOptions`](#onlinesimoptions)

Configuration options or API key string.

###### Returns

[`OnlineSim`](#onlinesim)

###### Example

```ts
import { OnlineSim } from 'onlinesim';

const client = new OnlineSim({ apiKey: 'YOUR_API_KEY' });
```

#### Methods

##### closeRentNum()

> **closeRentNum**(`tzid`): `Promise`\<`boolean`\>

Defined in: src/client.ts:301

Closes an active rental number.

###### Parameters

###### tzid

`string` \| `number`

Rent order ID.

###### Returns

`Promise`\<`boolean`\>

True if successfully closed.

###### Example

```ts
await client.closeRentNum(12345);
```

##### getBalance()

> **getBalance**(): `Promise`\<`number`\>

Defined in: src/client.ts:56

Retrieves current user account balance in RUB / user currency.

###### Returns

`Promise`\<`number`\>

Current balance.

###### Example

```ts
const balance = await client.getBalance();
console.log(`Balance: ${balance}`);
```

##### getCountries()

> **getCountries**(): `Promise`\<`unknown`\>

Defined in: src/client.ts:120

Retrieves all supported countries.

###### Returns

`Promise`\<`unknown`\>

List of supported countries and metadata.

###### Example

```ts
const countries = await client.getCountries();
console.log(countries);
```

##### getNum()

> **getNum**(`options`): `Promise`\<[`OrderResult`](#orderresult)\>

Defined in: src/client.ts:136

Orders a disposable virtual phone number for SMS activation.

###### Parameters

###### options

[`GetNumOptions`](#getnumoptions)

Order parameters including service and optional country.

###### Returns

`Promise`\<[`OrderResult`](#orderresult)\>

Order result with assigned tzid.

###### Example

```ts
const order = await client.getNum({ service: 'telegram', country: 7 });
console.log(`Order ID (tzid): ${order.tzid}`);
```

##### getRentNum()

> **getRentNum**(`options`): `Promise`\<`unknown`\>

Defined in: src/client.ts:258

Orders a long-term rental phone number.

###### Parameters

###### options

[`GetRentNumOptions`](#getrentnumoptions)

Rental options.

###### Returns

`Promise`\<`unknown`\>

Rental order result.

###### Example

```ts
const rent = await client.getRentNum({ country: 7, days: 1 });
console.log(rent);
```

##### getRentState()

> **getRentState**(`tzid?`): `Promise`\<`unknown`\>

Defined in: src/client.ts:282

Retrieves status for rented numbers.

###### Parameters

###### tzid?

`string` \| `number`

Optional rent order ID.

###### Returns

`Promise`\<`unknown`\>

Rent state details.

###### Example

```ts
const rentState = await client.getRentState(12345);
console.log(rentState);
```

##### getRentTariffs()

> **getRentTariffs**(): `Promise`\<`unknown`\>

Defined in: src/client.ts:242

Retrieves long-term rental tariffs.

###### Returns

`Promise`\<`unknown`\>

Rental tariffs catalog.

###### Example

```ts
const rentTariffs = await client.getRentTariffs();
console.log(rentTariffs);
```

##### getServiceList()

> **getServiceList**(`country?`): `Promise`\<`unknown`\>

Defined in: src/client.ts:101

Retrieves the list of available services and stock counts.

###### Parameters

###### country?

`string` \| `number`

Optional country code filter.

###### Returns

`Promise`\<`unknown`\>

Service list.

###### Example

```ts
const services = await client.getServiceList(7);
console.log(services);
```

##### getState()

> **getState**(`tzid?`, `options?`): `Promise`\<[`ActivationState`](#activationstate)[]\>

Defined in: src/client.ts:174

Retrieves the state, phone number, and received SMS message for an order.

###### Parameters

###### tzid?

`string` \| `number`

Activation order ID.

###### options?

Optional query parameters.

###### messageToCode?

`number`

###### msgList?

`number`

###### Returns

`Promise`\<[`ActivationState`](#activationstate)[]\>

Array or object representing activation states.

###### Example

```ts
const state = await client.getState(12345);
console.log(state);
```

##### getTariffs()

> **getTariffs**(`country?`): `Promise`\<`unknown`\>

Defined in: src/client.ts:81

Retrieves current prices and tariffs for disposable activation numbers.

###### Parameters

###### country?

`string` \| `number`

Optional country code filter.

###### Returns

`Promise`\<`unknown`\>

Tariffs response.

###### Example

```ts
const tariffs = await client.getTariffs(7);
console.log(tariffs);
```

##### setOperationOk()

> **setOperationOk**(`tzid`): `Promise`\<`boolean`\>

Defined in: src/client.ts:210

Confirms successful activation and closes the order.

###### Parameters

###### tzid

`string` \| `number`

Activation order ID.

###### Returns

`Promise`\<`boolean`\>

True if confirmation was recorded.

###### Example

```ts
await client.setOperationOk(12345);
```

##### setOperationRevise()

> **setOperationRevise**(`tzid`): `Promise`\<`boolean`\>

Defined in: src/client.ts:226

Requests a repeat SMS code or marks the operation for revision.

###### Parameters

###### tzid

`string` \| `number`

Activation order ID.

###### Returns

`Promise`\<`boolean`\>

True if revision was requested.

###### Example

```ts
await client.setOperationRevise(12345);
```

***

### OnlineSimError

Defined in: src/errors.ts:4

Error thrown by the OnlineSIM API client.

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new OnlineSimError**(`message`, `code?`, `responseData?`): [`OnlineSimError`](#onlinesimerror)

Defined in: src/errors.ts:15

###### Parameters

###### message

`string`

###### code?

`string`

###### responseData?

`unknown`

###### Returns

[`OnlineSimError`](#onlinesimerror)

###### Overrides

`Error.constructor`

#### Properties

##### cause?

> `optional` **cause?**: `unknown`

Defined in: node\_modules/typescript/lib/lib.es2022.error.d.ts:26

###### Inherited from

`Error.cause`

##### code?

> `readonly` `optional` **code?**: `string`

Defined in: src/errors.ts:8

API error response string or code (e.g. ERROR_WRONG_KEY, NO_NUMBER).

##### message

> **message**: `string`

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1077

###### Inherited from

`Error.message`

##### name

> **name**: `string`

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1076

###### Inherited from

`Error.name`

##### responseData?

> `readonly` `optional` **responseData?**: `unknown`

Defined in: src/errors.ts:13

Raw response payload.

##### stack?

> `optional` **stack?**: `string`

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1078

###### Inherited from

`Error.stack`

##### stackTraceLimit

> `static` **stackTraceLimit**: `number`

Defined in: node\_modules/@types/node/globals.d.ts:68

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

Defined in: node\_modules/@types/node/globals.d.ts:52

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

Defined in: node\_modules/@types/node/globals.d.ts:56

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

### ActivationState

Defined in: src/types.ts:62

State of an ordered activation.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### country?

> `optional` **country?**: `number`

Defined in: src/types.ts:70

##### form?

> `optional` **form?**: `string`

Defined in: src/types.ts:69

##### msg?

> `optional` **msg?**: `string`

Defined in: src/types.ts:68

##### number?

> `optional` **number?**: `string`

Defined in: src/types.ts:65

##### response

> **response**: `string`

Defined in: src/types.ts:64

##### service?

> `optional` **service?**: `string`

Defined in: src/types.ts:66

##### time?

> `optional` **time?**: `number`

Defined in: src/types.ts:67

##### tzid

> **tzid**: `number`

Defined in: src/types.ts:63

***

### GetNumOptions

Defined in: src/types.ts:24

Options for ordering a phone number.

#### Properties

##### clean?

> `optional` **clean?**: `number` \| `boolean`

Defined in: src/types.ts:48

Clean session flag.

##### country?

> `optional` **country?**: `string` \| `number`

Defined in: src/types.ts:33

Country code (e.g. 7 for Russia, 380 for Ukraine, 49 for Germany).

##### number?

> `optional` **number?**: `string`

Defined in: src/types.ts:43

Specific phone number to request.

##### reject?

> `optional` **reject?**: `string`

Defined in: src/types.ts:38

Reject numbers with specific prefixes or operators.

##### service

> **service**: `string`

Defined in: src/types.ts:28

Service identifier name (e.g. 'vk', 'telegram', 'whatsapp').

***

### GetRentNumOptions

Defined in: src/types.ts:77

Options for ordering a long-term rent number.

#### Properties

##### country

> **country**: `string` \| `number`

Defined in: src/types.ts:78

##### days

> **days**: `number`

Defined in: src/types.ts:79

##### extension?

> `optional` **extension?**: `boolean`

Defined in: src/types.ts:80

***

### OnlineSimOptions

Defined in: src/types.ts:4

Configuration options for OnlineSim client.

#### Properties

##### apiKey

> **apiKey**: `string`

Defined in: src/types.ts:8

API key obtained from OnlineSIM dashboard.

##### baseUrl?

> `optional` **baseUrl?**: `string`

Defined in: src/types.ts:13

Base URL for the OnlineSIM API (defaults to https://onlinesim.io/api).

##### timeout?

> `optional` **timeout?**: `number`

Defined in: src/types.ts:18

Request timeout in milliseconds (defaults to 30000).

***

### OrderResult

Defined in: src/types.ts:54

Result of ordering a phone number.

#### Properties

##### response

> **response**: `string` \| `number`

Defined in: src/types.ts:56

##### tzid

> **tzid**: `number`

Defined in: src/types.ts:55

## Variables

### DEFAULT\_DEV\_ID

> `const` **DEFAULT\_DEV\_ID**: `9656076` = `9656076`

Defined in: src/client.ts:12

**`Internal`**
