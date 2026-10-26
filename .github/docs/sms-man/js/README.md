**sms-man**

***

# sms-man

## Classes

### SmsMan

Defined in: src/client.ts:11

Client for the SMS-MAN virtual number and SMS activation API.

#### Constructors

##### Constructor

> **new SmsMan**(`options`): [`SmsMan`](#smsman)

Defined in: src/client.ts:27

Creates an instance of SmsMan.

###### Parameters

###### options

`string` \| [`SmsManOptions`](#smsmanoptions)

Configuration options or token string.

###### Returns

[`SmsMan`](#smsman)

###### Example

```ts
import { SmsMan } from 'sms-man';

const client = new SmsMan({ token: 'YOUR_API_TOKEN' });
```

#### Methods

##### getApplications()

> **getApplications**(): `Promise`\<`unknown`\>

Defined in: src/client.ts:127

Retrieves list of all supported applications/services.

###### Returns

`Promise`\<`unknown`\>

Map of supported applications.

###### Example

```ts
const apps = await client.getApplications();
console.log(apps);
```

##### getBalance()

> **getBalance**(): `Promise`\<`number`\>

Defined in: src/client.ts:50

Retrieves the current user account balance.

###### Returns

`Promise`\<`number`\>

Current account balance.

###### Example

```ts
const balance = await client.getBalance();
console.log(`Balance: ${balance}`);
```

##### getCountries()

> **getCountries**(): `Promise`\<`unknown`\>

Defined in: src/client.ts:112

Retrieves list of all supported countries.

###### Returns

`Promise`\<`unknown`\>

Map of supported countries.

###### Example

```ts
const countries = await client.getCountries();
console.log(countries);
```

##### getLimits()

> **getLimits**(`countryId?`, `applicationId?`): `Promise`\<`unknown`\>

Defined in: src/client.ts:76

Retrieves the number of available phone numbers for a country and application.

###### Parameters

###### countryId?

`number`

Country identifier (e.g. 1 for Russia, 2 for Kazakhstan).

###### applicationId?

`number`

Application/service identifier (e.g. 1 for Telegram).

###### Returns

`Promise`\<`unknown`\>

Availability count or limits details.

###### Example

```ts
const limits = await client.getLimits(1, 1);
console.log(limits);
```

##### getNumber()

> **getNumber**(`countryId`, `applicationId`): `Promise`\<[`PhoneNumberOrder`](#phonenumberorder)\>

Defined in: src/client.ts:144

Orders a disposable virtual phone number.

###### Parameters

###### countryId

`number`

Country identifier (use 0 for random).

###### applicationId

`number`

Service identifier.

###### Returns

`Promise`\<[`PhoneNumberOrder`](#phonenumberorder)\>

Order details with requestId and phone number.

###### Example

```ts
const order = await client.getNumber(1, 1);
console.log(`Allocated number: ${order.number} (Request ID: ${order.requestId})`);
```

##### getPrices()

> **getPrices**(`countryId?`): `Promise`\<`unknown`\>

Defined in: src/client.ts:95

Retrieves prices for all services in a country.

###### Parameters

###### countryId?

`number`

Optional country identifier.

###### Returns

`Promise`\<`unknown`\>

Map of service pricing.

###### Example

```ts
const prices = await client.getPrices(1);
console.log(prices);
```

##### getSms()

> **getSms**(`requestId`): `Promise`\<[`SmsCodeResult`](#smscoderesult)\>

Defined in: src/client.ts:175

Retrieves the received SMS code for an active order.

###### Parameters

###### requestId

`number`

Order request ID.

###### Returns

`Promise`\<[`SmsCodeResult`](#smscoderesult)\>

Received SMS code.

###### Example

```ts
const res = await client.getSms(12345);
if (res.smsCode) {
  console.log(`Received code: ${res.smsCode}`);
}
```

##### handlerGetBalance()

> **handlerGetBalance**(): `Promise`\<`number`\>

Defined in: src/client.ts:215

Retrieves account balance using SMS-Activate compatible handler endpoint.

###### Returns

`Promise`\<`number`\>

Current account balance.

###### Example

```ts
const balance = await client.handlerGetBalance();
```

##### handlerGetNumber()

> **handlerGetNumber**(`country`, `service`): `Promise`\<\{ `id`: `string`; `number`: `string`; \}\>

Defined in: src/client.ts:239

Orders a number using SMS-Activate compatible handler endpoint.

###### Parameters

###### country

`string` \| `number`

Country ID.

###### service

`string`

Service code.

###### Returns

`Promise`\<\{ `id`: `string`; `number`: `string`; \}\>

Activation ID and number.

###### Example

```ts
const num = await client.handlerGetNumber(1, 'tg');
```

##### handlerGetPrices()

> **handlerGetPrices**(`country?`): `Promise`\<`unknown`\>

Defined in: src/client.ts:307

Retrieves prices via handler endpoint.

###### Parameters

###### country?

`string` \| `number`

Optional country code.

###### Returns

`Promise`\<`unknown`\>

Prices response.

###### Example

```ts
const prices = await client.handlerGetPrices(1);
```

##### handlerGetStatus()

> **handlerGetStatus**(`id`): `Promise`\<[`HandlerStatusResult`](#handlerstatusresult)\>

Defined in: src/client.ts:272

Retrieves status and code via handler endpoint.

###### Parameters

###### id

`string` \| `number`

Activation ID.

###### Returns

`Promise`\<[`HandlerStatusResult`](#handlerstatusresult)\>

Status and code.

###### Example

```ts
const status = await client.handlerGetStatus('12345');
```

##### handlerSetStatus()

> **handlerSetStatus**(`id`, `status`): `Promise`\<`string`\>

Defined in: src/client.ts:292

Sets status via handler endpoint.

###### Parameters

###### id

`string` \| `number`

Activation ID.

###### status

`number`

Status code.

###### Returns

`Promise`\<`string`\>

Response text.

###### Example

```ts
await client.handlerSetStatus('12345', 1);
```

##### setStatus()

> **setStatus**(`requestId`, `status`): `Promise`\<`boolean`\>

Defined in: src/client.ts:197

Updates status of an order (e.g. 'ready', 'reject').

###### Parameters

###### requestId

`number`

Order request ID.

###### status

`string`

Target status string.

###### Returns

`Promise`\<`boolean`\>

True if successfully updated.

###### Example

```ts
await client.setStatus(12345, 'reject');
```

***

### SmsManError

Defined in: src/errors.ts:4

Error thrown by the SMS-MAN client.

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new SmsManError**(`message`, `code?`, `responseData?`): [`SmsManError`](#smsmanerror)

Defined in: src/errors.ts:15

###### Parameters

###### message

`string`

###### code?

`string`

###### responseData?

`unknown`

###### Returns

[`SmsManError`](#smsmanerror)

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

API error code string (e.g. wrong_token, no_numbers, BAD_KEY).

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

### HandlerStatusResult

Defined in: src/types.ts:40

Handler status response.

#### Properties

##### code?

> `optional` **code?**: `string`

Defined in: src/types.ts:42

##### status

> **status**: `string`

Defined in: src/types.ts:41

***

### PhoneNumberOrder

Defined in: src/types.ts:24

Result of ordering a virtual phone number.

#### Properties

##### number

> **number**: `string`

Defined in: src/types.ts:26

##### requestId

> **requestId**: `number`

Defined in: src/types.ts:25

***

### SmsCodeResult

Defined in: src/types.ts:32

SMS verification code result.

#### Properties

##### error?

> `optional` **error?**: `string`

Defined in: src/types.ts:34

##### smsCode?

> `optional` **smsCode?**: `string`

Defined in: src/types.ts:33

***

### SmsManOptions

Defined in: src/types.ts:4

Options for configuring SmsMan client.

#### Properties

##### baseUrl?

> `optional` **baseUrl?**: `string`

Defined in: src/types.ts:13

Base URL for requests (defaults to https://api.sms-man.com).

##### timeout?

> `optional` **timeout?**: `number`

Defined in: src/types.ts:18

Request timeout in milliseconds (defaults to 30000).

##### token

> **token**: `string`

Defined in: src/types.ts:8

SMS-MAN API token.

## Variables

### DEFAULT\_REF

> `const` **DEFAULT\_REF**: `"s_iNhkmN48Jf"` = `'s_iNhkmN48Jf'`

Defined in: src/client.ts:6

**`Internal`**
