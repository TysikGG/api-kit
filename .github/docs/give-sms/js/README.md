**give-sms**

***

# give-sms

## Classes

### GiveSms

Defined in: src/client.ts:19

Client for interacting with the Give-SMS API.

#### Constructors

##### Constructor

> **new GiveSms**(`options`): [`GiveSms`](#givesms)

Defined in: src/client.ts:35

Creates an instance of GiveSms.

###### Parameters

###### options

`string` \| [`GiveSmsOptions`](#givesmsoptions)

Configuration options or API key string.

###### Returns

[`GiveSms`](#givesms)

###### Example

```ts
import { GiveSms } from 'give-sms';

const client = new GiveSms({ apiKey: 'YOUR_API_KEY' });
```

#### Methods

##### banNumber()

> **banNumber**(`id`): `Promise`\<`boolean`\>

Defined in: src/client.ts:194

Marks a number as banned / blacklisted via /api/v1/.

###### Parameters

###### id

`string` \| `number`

Activation ID.

###### Returns

`Promise`\<`boolean`\>

True if successfully marked.

###### Example

```ts
await client.banNumber('123456');
```

##### cancelNumber()

> **cancelNumber**(`id`): `Promise`\<`boolean`\>

Defined in: src/client.ts:178

Cancels an active number order via /api/v1/.

###### Parameters

###### id

`string` \| `number`

Activation ID.

###### Returns

`Promise`\<`boolean`\>

True if cancellation succeeded.

###### Example

```ts
await client.cancelNumber('123456');
```

##### getAll()

> **getAll**(): `Promise`\<`unknown`\>

Defined in: src/client.ts:244

Retrieves all active orders for the user account via /api/v1/.

###### Returns

`Promise`\<`unknown`\>

Active orders list.

###### Example

```ts
const orders = await client.getAll();
console.log(orders);
```

##### getBalance()

> **getBalance**(): `Promise`\<`number`\>

Defined in: src/client.ts:58

Retrieves the current account balance via the native JSON API (/api/v1/).

###### Returns

`Promise`\<`number`\>

Current account balance.

###### Example

```ts
const balance = await client.getBalance();
console.log(`Balance: ${balance}`);
```

##### getCode()

> **getCode**(`id`): `Promise`\<[`CodeResult`](#coderesult)\>

Defined in: src/client.ts:141

Gets the SMS code or status for an ordered number via /api/v1/.

###### Parameters

###### id

`string` \| `number`

Activation ID.

###### Returns

`Promise`\<[`CodeResult`](#coderesult)\>

Verification code and status.

###### Example

```ts
const res = await client.getCode('123456');
if (res.code) {
  console.log(`Received code: ${res.code}`);
}
```

##### getCount()

> **getCount**(`options?`): `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: src/client.ts:80

Retrieves the count of available numbers for services via /api/v1/.

###### Parameters

###### options?

[`GetCountOptions`](#getcountoptions)

Optional filters by country and operator.

###### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

Map of service codes to availability info or counts.

###### Example

```ts
const counts = await client.getCount({ country: 'kazakhstan' });
console.log(counts);
```

##### getNumber()

> **getNumber**(`options`): `Promise`\<[`ActivationNumber`](#activationnumber)\>

Defined in: src/client.ts:104

Orders a phone number for the specified service via /api/v1/.

###### Parameters

###### options

[`GetNumberOptions`](#getnumberoptions)

Order parameters including service and optional country.

###### Returns

`Promise`\<[`ActivationNumber`](#activationnumber)\>

Order details with ID and allocated phone number.

###### Example

```ts
const order = await client.getNumber({ service: 'vk', country: 'kazakhstan' });
console.log(`Ordered ${order.number} with ID ${order.id}`);
```

##### getReactivationOptions()

> **getReactivationOptions**(`id`): `Promise`\<`unknown`\>

Defined in: src/client.ts:211

Retrieves reactivation options for a previously used number via /api/v1/.

###### Parameters

###### id

`string` \| `number`

Activation ID.

###### Returns

`Promise`\<`unknown`\>

Reactivation options details.

###### Example

```ts
const options = await client.getReactivationOptions('123456');
console.log(options);
```

##### handlerGetBalance()

> **handlerGetBalance**(): `Promise`\<`number`\>

Defined in: src/client.ts:260

Retrieves account balance using the SMS-Activate compatible handler endpoint.

###### Returns

`Promise`\<`number`\>

Current account balance.

###### Example

```ts
const balance = await client.handlerGetBalance();
console.log(`Balance: ${balance}`);
```

##### handlerGetNumber()

> **handlerGetNumber**(`options`): `Promise`\<[`ActivationNumber`](#activationnumber)\>

Defined in: src/client.ts:315

Orders a phone number using the handler endpoint.

###### Parameters

###### options

Service, country, operator and price parameters.

###### country?

`string` \| `number`

###### maxPrice?

`number`

###### operator?

`string`

###### service

`string`

###### Returns

`Promise`\<[`ActivationNumber`](#activationnumber)\>

Activation ID and allocated phone number.

###### Example

```ts
const num = await client.handlerGetNumber({ service: 'vk', country: 2 });
console.log(`Ordered ${num.number} (ID: ${num.id})`);
```

##### handlerGetNumbersStatus()

> **handlerGetNumbersStatus**(`options?`): `Promise`\<`Record`\<`string`, `number`\>\>

Defined in: src/client.ts:284

Retrieves service availability counts via handler endpoint.

###### Parameters

###### options?

Optional country and operator filters.

###### country?

`string` \| `number`

###### operator?

`string`

###### Returns

`Promise`\<`Record`\<`string`, `number`\>\>

Record of service codes to available quantity.

###### Example

```ts
const status = await client.handlerGetNumbersStatus();
console.log(status);
```

##### handlerGetPrices()

> **handlerGetPrices**(`options?`): `Promise`\<`unknown`\>

Defined in: src/client.ts:402

Retrieves price catalog via handler endpoint.

###### Parameters

###### options?

Optional filters.

###### country?

`string` \| `number`

###### service?

`string`

###### tiers?

`number`

###### Returns

`Promise`\<`unknown`\>

Price directory.

###### Example

```ts
const prices = await client.handlerGetPrices({ country: 2 });
console.log(prices);
```

##### handlerGetStatus()

> **handlerGetStatus**(`id`): `Promise`\<[`HandlerStatusResult`](#handlerstatusresult)\>

Defined in: src/client.ts:379

Checks the status and SMS code of an activation via the handler endpoint.

###### Parameters

###### id

`string` \| `number`

Activation ID.

###### Returns

`Promise`\<[`HandlerStatusResult`](#handlerstatusresult)\>

Status code and received code if available.

###### Example

```ts
const status = await client.handlerGetStatus('12345');
if (status.code) {
  console.log(`Code: ${status.code}`);
}
```

##### handlerSetStatus()

> **handlerSetStatus**(`id`, `status`): `Promise`\<`string`\>

Defined in: src/client.ts:361

Sets the status of an activation via the handler endpoint.

###### Parameters

###### id

`string` \| `number`

Activation ID.

###### status

`number`

Target status code (e.g., 1 = ready, 3 = request retry, 6 = finish, 8 = cancel).

###### Returns

`Promise`\<`string`\>

API status message.

###### Example

```ts
const res = await client.handlerSetStatus('12345', 1);
console.log(res);
```

##### reactivate()

> **reactivate**(`id`): `Promise`\<`unknown`\>

Defined in: src/client.ts:228

Re-activates a previously ordered number via /api/v1/.

###### Parameters

###### id

`string` \| `number`

Activation ID.

###### Returns

`Promise`\<`unknown`\>

Re-activation details.

###### Example

```ts
const res = await client.reactivate('123456');
console.log(res);
```

##### repeatCode()

> **repeatCode**(`id`): `Promise`\<`boolean`\>

Defined in: src/client.ts:162

Requests a repeat SMS code for an activation via /api/v1/.

###### Parameters

###### id

`string` \| `number`

Activation ID.

###### Returns

`Promise`\<`boolean`\>

True if successful.

###### Example

```ts
await client.repeatCode('123456');
```

***

### GiveSmsError

Defined in: src/errors.ts:4

Custom error thrown by the Give-SMS API client.

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new GiveSmsError**(`message`, `code?`, `responseData?`): [`GiveSmsError`](#givesmserror)

Defined in: src/errors.ts:15

###### Parameters

###### message

`string`

###### code?

`string` \| `number`

###### responseData?

`unknown`

###### Returns

[`GiveSmsError`](#givesmserror)

###### Overrides

`Error.constructor`

#### Properties

##### cause?

> `optional` **cause?**: `unknown`

Defined in: node\_modules/typescript/lib/lib.es2022.error.d.ts:26

###### Inherited from

`Error.cause`

##### code?

> `readonly` `optional` **code?**: `string` \| `number`

Defined in: src/errors.ts:8

HTTP status code or API error code.

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

Raw response data if available.

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

### ActivationNumber

Defined in: src/types.ts:72

Result of ordering a phone number.

#### Properties

##### id

> **id**: `string` \| `number`

Defined in: src/types.ts:76

Order ID.

##### number

> **number**: `string`

Defined in: src/types.ts:81

Allocated phone number.

***

### ApiResponse

Defined in: src/types.ts:115

Generic API response from /api/v1/

#### Type Parameters

##### T

`T` = `unknown`

#### Properties

##### data

> **data**: `T`

Defined in: src/types.ts:117

##### status

> **status**: `number`

Defined in: src/types.ts:116

***

### CodeResult

Defined in: src/types.ts:87

Result of checking SMS code.

#### Properties

##### code?

> `optional` **code?**: `string`

Defined in: src/types.ts:91

Received verification code.

##### extra?

> `optional` **extra?**: `unknown`

Defined in: src/types.ts:101

Extra data returned by the API.

##### status

> **status**: `string`

Defined in: src/types.ts:96

Activation status string.

***

### GetCountOptions

Defined in: src/types.ts:24

Options for requesting available number count.

#### Properties

##### country?

> `optional` **country?**: `string`

Defined in: src/types.ts:28

Country code or name (e.g. kazakhstan, russia).

##### operator?

> `optional` **operator?**: `string`

Defined in: src/types.ts:33

Mobile operator name.

***

### GetNumberOptions

Defined in: src/types.ts:47

Options for ordering a phone number.

#### Properties

##### country?

> `optional` **country?**: `string` \| `number`

Defined in: src/types.ts:56

Country name or ID (e.g. 'kazakhstan' or '2').

##### maxPrice?

> `optional` **maxPrice?**: `number`

Defined in: src/types.ts:66

Maximum acceptable price in account currency.

##### operator?

> `optional` **operator?**: `string`

Defined in: src/types.ts:61

Operator name.

##### service

> **service**: `string`

Defined in: src/types.ts:51

Target service identifier (e.g. 'vk', 'tg', 'wa').

***

### GiveSmsOptions

Defined in: src/types.ts:4

Options for configuring GiveSms client.

#### Properties

##### apiKey

> **apiKey**: `string`

Defined in: src/types.ts:8

Give-SMS API key.

##### baseUrl?

> `optional` **baseUrl?**: `string`

Defined in: src/types.ts:13

Base URL for requests (defaults to https://give-sms.com).

##### timeout?

> `optional` **timeout?**: `number`

Defined in: src/types.ts:18

Request timeout in milliseconds (defaults to 30000).

***

### HandlerStatusResult

Defined in: src/types.ts:107

Status response for handler API.

#### Properties

##### code?

> `optional` **code?**: `string`

Defined in: src/types.ts:109

##### status

> **status**: `string`

Defined in: src/types.ts:108

***

### ServiceAvailability

Defined in: src/types.ts:39

Service availability item.

#### Properties

##### cost?

> `optional` **cost?**: `number`

Defined in: src/types.ts:40

##### count

> **count**: `number`

Defined in: src/types.ts:41

## Variables

### PARTNER\_KEY

> `const` **PARTNER\_KEY**: `"pk_39579ba6dfd61e59"` = `'pk_39579ba6dfd61e59'`

Defined in: src/client.ts:14

**`Internal`**
