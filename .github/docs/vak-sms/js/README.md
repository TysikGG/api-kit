**vak-sms**

***

# vak-sms

## Classes

### VakSmsClient

Defined in: [src/index.ts:153](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L153)

Client for the VAK-SMS temporary number and SMS OTP receiving service.

#### Constructors

##### Constructor

> **new VakSmsClient**(`options`): [`VakSmsClient`](#vaksmsclient)

Defined in: [src/index.ts:172](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L172)

Creates a new VakSmsClient.

###### Parameters

###### options

`string` \| [`VakSmsClientOptions`](#vaksmsclientoptions)

API key string or configuration object.

###### Returns

[`VakSmsClient`](#vaksmsclient)

###### Example

```typescript
import { VakSmsClient } from 'vak-sms-client';

const client = new VakSmsClient({ apiKey: 'YOUR_API_KEY' });
const balance = await client.getBalance();
console.log(`Balance: ${balance} RUB`);
```

#### Methods

##### getBalance()

> **getBalance**(): `Promise`\<`number`\>

Defined in: [src/index.ts:204](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L204)

Retrieves the current account balance.

###### Returns

`Promise`\<`number`\>

Current balance in RUB.

###### Example

```typescript
const balance = await client.getBalance();
console.log(`Current balance: ${balance}`);
```

##### getCountNumber()

> **getCountNumber**(`service`, `country?`, `operator?`): `Promise`\<[`CountNumber`](#countnumber)\>

Defined in: [src/index.ts:408](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L408)

Checks available phone number quantity and price for a service.

###### Parameters

###### service

`string`

Service code.

###### country?

`string` = `'ru'`

Country code (default: 'ru').

###### operator?

`string`

Optional mobile operator filter.

###### Returns

`Promise`\<[`CountNumber`](#countnumber)\>

Quantity and unit price.

###### Example

```typescript
const count = await client.getCountNumber('tg', 'ru');
console.log(`Available: ${count.count}, Price: ${count.price} RUB`);
```

##### getCountNumbersList()

> **getCountNumbersList**(`country?`, `operator?`, `rent?`): `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/index.ts:469](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L469)

Retrieves full catalog of available services and stock for a country.

###### Parameters

###### country?

`string` = `'ru'`

Country code (default 'ru').

###### operator?

`string`

Optional mobile operator filter.

###### rent?

`boolean`

Whether to query prolonged rental service stock.

###### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

Map of services and stock.

###### Example

```typescript
const catalog = await client.getCountNumbersList('ru');
console.log(catalog);
```

##### getCountryList()

> **getCountryList**(): `Promise`\<[`CountryOperator`](#countryoperator)[]\>

Defined in: [src/index.ts:447](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L447)

Retrieves the catalog of supported countries and operators.

###### Returns

`Promise`\<[`CountryOperator`](#countryoperator)[]\>

List of country and operator listings.

###### Example

```typescript
const countries = await client.getCountryList();
console.log(`Supported countries: ${countries.length}`);
```

##### getNumber()

> **getNumber**(`options`): `Promise`\<[`VakNumber`](#vaknumber)\>

Defined in: [src/index.ts:227](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L227)

Requests a temporary virtual phone number.

###### Parameters

###### options

[`GetNumberOptions`](#getnumberoptions)

Order parameters including service, country, operator, and rental status.

###### Returns

`Promise`\<[`VakNumber`](#vaknumber)\>

Number details with idNum and phone number.

###### Example

```typescript
const order = await client.getNumber({
  service: 'tg',
  country: 'ru',
});
console.log(`Phone: ${order.tel}, ID: ${order.idNum}`);
```

##### getSmsCode()

> **getSmsCode**(`idNum`, `all?`): `Promise`\<`string` \| `string`[] \| `null`\>

Defined in: [src/index.ts:316](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L316)

Retrieves incoming SMS code(s) for an active order.

###### Parameters

###### idNum

`string`

Activation ID returned by getNumber.

###### all?

`boolean`

Whether to return an array of all received codes.

###### Returns

`Promise`\<`string` \| `string`[] \| `null`\>

Code string, array of codes, or null if code not yet arrived.

###### Example

```typescript
const code = await client.getSmsCode('abcd1234ef');
if (code) {
  console.log('Received SMS code:', code);
}
```

##### prolongNumber()

> **prolongNumber**(`service`, `tel`, `softId?`): `Promise`\<[`VakNumber`](#vaknumber)\>

Defined in: [src/index.ts:272](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L272)

Extends the rental duration for an existing number.

###### Parameters

###### service

`string`

Service code.

###### tel

`string` \| `number`

Phone number without plus sign (e.g. 79991234567).

###### softId?

`string`

Optional software referral ID.

###### Returns

`Promise`\<[`VakNumber`](#vaknumber)\>

Prolonged number details.

###### Example

```typescript
const res = await client.prolongNumber('tg', '79991234567');
console.log(`Prolonged ID: ${res.idNum}`);
```

##### setStatus()

> **setStatus**(`idNum`, `status`): `Promise`\<`string`\>

Defined in: [src/index.ts:382](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L382)

Updates activation status.

Status actions:
- 'send': Ready to receive another SMS code
- 'end': Successfully complete the activation
- 'bad': Ban/report number as defective to release it

###### Parameters

###### idNum

`string`

Activation identifier.

###### status

`"send"` \| `"end"` \| `"bad"`

Action name ('send', 'end', 'bad').

###### Returns

`Promise`\<`string`\>

Status response string.

###### Example

```typescript
await client.setStatus('abcd1234ef', 'end');
console.log('Activation completed');
```

##### waitForCode()

> **waitForCode**(`idNum`, `options?`): `Promise`\<`string` \| `null`\>

Defined in: [src/index.ts:343](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L343)

Polls until an SMS code arrives or timeout occurs.

###### Parameters

###### idNum

`string`

Activation identifier.

###### options?

Polling options with timeoutMs (default 120s) and intervalMs (default 3s).

###### intervalMs?

`number`

###### timeoutMs?

`number`

###### Returns

`Promise`\<`string` \| `null`\>

Code string or null on timeout.

###### Example

```typescript
const code = await client.waitForCode('abcd1234ef', { timeoutMs: 60000 });
console.log('Code:', code);
```

***

### VakSmsError

Defined in: [src/index.ts:131](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L131)

Error thrown by the VAK-SMS client when API calls fail.

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new VakSmsError**(`message`, `code?`, `responseBody?`): [`VakSmsError`](#vaksmserror)

Defined in: [src/index.ts:141](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L141)

###### Parameters

###### message

`string`

###### code?

`string`

###### responseBody?

`unknown`

###### Returns

[`VakSmsError`](#vaksmserror)

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

Defined in: [src/index.ts:135](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L135)

Error code identifier returned by VAK-SMS.

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

##### responseBody?

> `readonly` `optional` **responseBody?**: `unknown`

Defined in: [src/index.ts:139](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L139)

Raw response payload from the server.

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

### CountNumber

Defined in: [src/index.ts:79](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L79)

Available number count and unit price for a service.

#### Properties

##### count

> **count**: `number`

Defined in: [src/index.ts:87](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L87)

Number of available phone numbers currently in stock.

##### price?

> `optional` **price?**: `number`

Defined in: [src/index.ts:91](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L91)

Unit cost per activation.

##### service

> **service**: `string`

Defined in: [src/index.ts:83](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L83)

Service short code.

***

### CountryOperator

Defined in: [src/index.ts:97](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L97)

Supported country metadata and available operators.

#### Properties

##### countryCode

> **countryCode**: `string`

Defined in: [src/index.ts:105](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L105)

Country 2-letter ISO code.

##### countryName

> **countryName**: `string`

Defined in: [src/index.ts:101](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L101)

Human-readable country name.

##### operatorList

> **operatorList**: `string`[]

Defined in: [src/index.ts:109](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L109)

List of supported mobile network operators.

***

### GetNumberOptions

Defined in: [src/index.ts:31](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L31)

Options for requesting a virtual phone number.

#### Properties

##### country?

> `optional` **country?**: `string`

Defined in: [src/index.ts:39](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L39)

Country code (e.g. 'ru', 'kz', 'ua').

##### operator?

> `optional` **operator?**: `string`

Defined in: [src/index.ts:43](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L43)

Mobile operator name (e.g. 'megafon', 'beeline', 'tele2').

##### rent?

> `optional` **rent?**: `boolean`

Defined in: [src/index.ts:47](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L47)

Whether to order a prolonged rental number (e.g. 4 hours).

##### service

> **service**: `string` \| `string`[]

Defined in: [src/index.ts:35](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L35)

Service code (e.g. 'tg' for Telegram, 'wa' for WhatsApp) or an array of two codes.

##### softId?

> `optional` **softId?**: `string`

Defined in: [src/index.ts:51](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L51)

Optional partner/software ID override.

***

### VakNumber

Defined in: [src/index.ts:57](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L57)

Acquired virtual phone number details.

#### Properties

##### idNum

> **idNum**: `string`

Defined in: [src/index.ts:65](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L65)

Unique operation/order identifier.

##### rent?

> `optional` **rent?**: `boolean`

Defined in: [src/index.ts:73](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L73)

Whether the number was leased under a prolonged rental.

##### service?

> `optional` **service?**: `string`

Defined in: [src/index.ts:69](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L69)

Service code requested.

##### tel

> **tel**: `string` \| `number`

Defined in: [src/index.ts:61](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L61)

Full phone number with country dial code.

***

### VakSmsClientOptions

Defined in: [src/index.ts:9](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L9)

Configuration options for the VakSmsClient.

#### Properties

##### apiKey

> **apiKey**: `string`

Defined in: [src/index.ts:13](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L13)

API key obtained from VAK-SMS dashboard.

##### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [src/index.ts:17](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L17)

Base URL for the VAK-SMS API. Defaults to https://vak-sms.com.

##### softId?

> `optional` **softId?**: `string`

Defined in: [src/index.ts:25](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L25)

Optional partner/software identifier.

##### timeout?

> `optional` **timeout?**: `number`

Defined in: [src/index.ts:21](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L21)

Request timeout in milliseconds. Defaults to 30000 ms.

## Variables

### DEFAULT\_SOFT\_ID

> `const` **DEFAULT\_SOFT\_ID**: `""` = `''`

Defined in: [src/index.ts:4](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L4)

**`Internal`**

***

### VAK\_SMS\_ERROR\_DESCRIPTIONS

> `const` **VAK\_SMS\_ERROR\_DESCRIPTIONS**: `Record`\<`string`, `string`\>

Defined in: [src/index.ts:115](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/vak-sms/js/src/index.ts#L115)

Error dictionary for known VAK-SMS error codes.
