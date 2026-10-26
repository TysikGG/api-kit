**sv-number-client**

***

# sv-number-client

## Classes

### SvNumber

Client for the SV Number SMS verification API.

#### Example

```ts
const client = new SvNumber({ apiKey: "your_api_key" });
const balance = await client.getBalance();
```

#### Constructors

##### Constructor

> **new SvNumber**(`options`): [`SvNumber`](#svnumber)

###### Parameters

###### options

`string` \| [`SvNumberOptions`](#svnumberoptions)

###### Returns

[`SvNumber`](#svnumber)

#### Methods

##### call()

> **call**\<`T`\>(`action`, `params?`): `Promise`\<`T`\>

Low-level call to `/stubs/handler_api`.
Automatically attaches `api_key`, `ref_key`, and `lang`.

###### Type Parameters

###### T

`T` = `unknown`

###### Parameters

###### action

`string`

###### params?

`Record`\<`string`, `string` \| `number` \| `undefined`\> = `{}`

###### Returns

`Promise`\<`T`\>

##### cancel()

> **cancel**(`activationId`): `Promise`\<`string`\>

Cancel the activation to refund balance (`status=8`).

###### Parameters

###### activationId

`string` \| `number`

###### Returns

`Promise`\<`string`\>

##### complete()

> **complete**(`activationId`): `Promise`\<`string`\>

Confirm successful activation and release the number (`status=6`).

###### Parameters

###### activationId

`string` \| `number`

###### Returns

`Promise`\<`string`\>

##### getBalance()

> **getBalance**(): `Promise`\<`number`\>

Get current account balance in USD.

###### Returns

`Promise`\<`number`\>

###### Example

```ts
const balance = await client.getBalance();
console.log(`Balance: $${balance}`);
```

##### getNumber()

> **getNumber**(`params`): `Promise`\<[`OrderedNumber`](#orderednumber)\>

Order a temporary virtual number.

###### Parameters

###### params

[`GetNumberParams`](#getnumberparams)

###### Returns

`Promise`\<[`OrderedNumber`](#orderednumber)\>

###### Example

```ts
const order = await client.getNumber({ service: "wa", country: 0 });
console.log(`Number: ${order.phoneNumber}, ID: ${order.activationId}`);
```

##### getNumberV2()

> **getNumberV2**(`params`): `Promise`\<[`OrderedNumberV2`](#orderednumberv2)\>

Order a virtual number returning JSON details.

###### Parameters

###### params

[`GetNumberParams`](#getnumberparams)

###### Returns

`Promise`\<[`OrderedNumberV2`](#orderednumberv2)\>

###### Example

```ts
const order = await client.getNumberV2({ service: "tg", country: 0 });
```

##### getPrices()

> **getPrices**(`country?`): `Promise`\<[`PricesByCountry`](#pricesbycountry)\>

Get price table grouped by country and service.

###### Parameters

###### country?

`string` \| `number`

###### Returns

`Promise`\<[`PricesByCountry`](#pricesbycountry)\>

###### Example

```ts
const prices = await client.getPrices(0);
```

##### getServicesAndCost()

> **getServicesAndCost**(`params?`): `Promise`\<[`ServiceCostItem`](#servicecostitem)[]\>

Get list of services with prices and quantity for a country.

###### Parameters

###### params?

###### country?

`string` \| `number`

###### operator?

`string`

###### service?

`string`

###### Returns

`Promise`\<[`ServiceCostItem`](#servicecostitem)[]\>

###### Example

```ts
const services = await client.getServicesAndCost({ country: 0 });
```

##### getStatus()

> **getStatus**(`activationId`): `Promise`\<[`ActivationStatus`](#activationstatus)\>

Query the status of an active activation.

###### Parameters

###### activationId

`string` \| `number`

###### Returns

`Promise`\<[`ActivationStatus`](#activationstatus)\>

###### Example

```ts
const status = await client.getStatus(activationId);
if (status.status === "STATUS_OK") {
  console.log("SMS code:", status.code);
}
```

##### ready()

> **ready**(`activationId`): `Promise`\<`string`\>

Notify that the SMS has been sent to the number (`status=1`).

###### Parameters

###### activationId

`string` \| `number`

###### Returns

`Promise`\<`string`\>

##### setStatus()

> **setStatus**(`activationId`, `status`): `Promise`\<`string`\>

Update activation status (1 = ready, 3 = request retry, 6 = complete, 8 = cancel).

###### Parameters

###### activationId

`string` \| `number`

###### status

`number`

###### Returns

`Promise`\<`string`\>

##### waitForCode()

> **waitForCode**(`activationId`, `options?`): `Promise`\<[`ReceivedCode`](#receivedcode)\>

Poll for an incoming SMS verification code until it arrives or times out.

###### Parameters

###### activationId

`string` \| `number`

###### options?

[`WaitForCodeOptions`](#waitforcodeoptions) = `{}`

###### Returns

`Promise`\<[`ReceivedCode`](#receivedcode)\>

###### Example

```ts
const { code } = await client.waitForCode(order.activationId, { timeoutMs: 120_000 });
console.log("Received code:", code);
```

***

### SvNumberError

Error thrown by the SV Number client.

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new SvNumberError**(`code`, `raw?`): [`SvNumberError`](#svnumbererror)

###### Parameters

###### code

`string`

###### raw?

`unknown` = `code`

###### Returns

[`SvNumberError`](#svnumbererror)

###### Overrides

`Error.constructor`

#### Properties

##### cause?

> `optional` **cause?**: `unknown`

###### Inherited from

`Error.cause`

##### code

> `readonly` **code**: `string`

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

##### stack?

> `optional` **stack?**: `string`

###### Inherited from

`Error.stack`

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

### ActivationStatus

#### Properties

##### code?

> `optional` **code?**: `string`

##### status

> **status**: `string`

***

### GetNumberParams

#### Properties

##### country?

> `optional` **country?**: `string` \| `number`

Country code or ID. Defaults to `0` (or any available).

##### operator?

> `optional` **operator?**: `string`

Specific telecom operator name, or `any`.

##### service

> **service**: `string`

Service identifier (e.g. `wa` for WhatsApp, `tg` for Telegram).

***

### OrderedNumber

#### Extended by

- [`OrderedNumberV2`](#orderednumberv2)

#### Properties

##### activationId

> **activationId**: `string`

##### phoneNumber

> **phoneNumber**: `string`

***

### OrderedNumberV2

#### Extends

- [`OrderedNumber`](#orderednumber)

#### Properties

##### activationCost?

> `optional` **activationCost?**: `number`

##### activationId

> **activationId**: `string`

###### Inherited from

[`OrderedNumber`](#orderednumber).[`activationId`](#activationid)

##### countryCode?

> `optional` **countryCode?**: `string`

##### phoneNumber

> **phoneNumber**: `string`

###### Inherited from

[`OrderedNumber`](#orderednumber).[`phoneNumber`](#phonenumber)

##### service?

> `optional` **service?**: `string`

***

### ReceivedCode

#### Properties

##### code

> **code**: `string`

##### status

> **status**: `"STATUS_OK"`

***

### ServiceCostItem

#### Properties

##### id

> **id**: `string`

##### name

> **name**: `string`

##### price

> **price**: `number`

##### quantity

> **quantity**: `number`

***

### SvNumberOptions

Options for configuring the SvNumber client.

#### Properties

##### apiKey

> **apiKey**: `string`

API key from the SV Number account dashboard.

##### axios?

> `optional` **axios?**: `AxiosInstance`

Custom Axios instance, useful for testing or proxy routing.

##### baseUrl?

> `optional` **baseUrl?**: `string`

Base URL for SV Number. Defaults to `https://sms-verification-number.com`.

##### lang?

> `optional` **lang?**: `string`

Preferred language for country and service names (`en`, `ru`, etc.).

##### timeoutMs?

> `optional` **timeoutMs?**: `number`

Request timeout in milliseconds. Defaults to 30000ms.

***

### WaitForCodeOptions

#### Properties

##### intervalMs?

> `optional` **intervalMs?**: `number`

##### signal?

> `optional` **signal?**: `AbortSignal`

##### timeoutMs?

> `optional` **timeoutMs?**: `number`

## Type Aliases

### ActivationStatusName

> **ActivationStatusName** = `"STATUS_WAIT_CODE"` \| `"STATUS_WAIT_RETRY"` \| `"STATUS_WAIT_RESEND"` \| `"STATUS_CANCEL"` \| `"STATUS_OK"`

***

### PricesByCountry

> **PricesByCountry** = `Record`\<`string`, `Record`\<`string`, \{ `cost`: `number`; `count`: `number`; \}\>\>
