**smsbower-client**

***

# smsbower-client

## Classes

### SmsBowerClient

Defined in: [src/index.ts:186](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L186)

Client for the SMSBower virtual number and SMS activation service.

#### Constructors

##### Constructor

> **new SmsBowerClient**(`options`): [`SmsBowerClient`](#smsbowerclient)

Defined in: [src/index.ts:204](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L204)

Creates a new SmsBowerClient.

###### Parameters

###### options

`string` \| [`SmsBowerClientOptions`](#smsbowerclientoptions)

API key string or configuration options.

###### Returns

[`SmsBowerClient`](#smsbowerclient)

###### Example

```typescript
import { SmsBowerClient } from 'smsbower-client';

const client = new SmsBowerClient({ apiKey: 'YOUR_API_KEY' });
const balance = await client.getBalance();
console.log(`Current balance: $${balance}`);
```

#### Methods

##### getActualWalletAddress()

> **getActualWalletAddress**(`coin`, `network`): `Promise`\<\{ `wallet_address`: `string`; \}\>

Defined in: [src/index.ts:572](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L572)

Retrieves static wallet address for crypto deposits.

###### Parameters

###### coin

`string`

Cryptocurrency symbol (e.g. 'usdt', 'trx').

###### network

`string`

Blockchain network (e.g. 'tron').

###### Returns

`Promise`\<\{ `wallet_address`: `string`; \}\>

Wallet address response.

###### Example

```typescript
const wallet = await client.getActualWalletAddress('usdt', 'tron');
console.log('Deposit address:', wallet.wallet_address);
```

##### getBalance()

> **getBalance**(): `Promise`\<`number`\>

Defined in: [src/index.ts:234](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L234)

Checks the current account balance.

###### Returns

`Promise`\<`number`\>

Current balance as a float number.

###### Example

```typescript
const balance = await client.getBalance();
console.log('Account balance:', balance);
```

##### getCountries()

> **getCountries**(): `Promise`\<`Record`\<`string`, [`CountryItem`](#countryitem)\>\>

Defined in: [src/index.ts:534](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L534)

Retrieves the full catalog of available countries.

###### Returns

`Promise`\<`Record`\<`string`, [`CountryItem`](#countryitem)\>\>

Mapping of country IDs to country metadata.

###### Example

```typescript
const countries = await client.getCountries();
console.log('Country 22:', countries['22']);
```

##### getNumber()

> **getNumber**(`options`): `Promise`\<[`ActivationNumber`](#activationnumber)\>

Defined in: [src/index.ts:262](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L262)

Orders a new virtual phone number.

###### Parameters

###### options

[`GetNumberOptions`](#getnumberoptions)

Order parameters including service and optional country.

###### Returns

`Promise`\<[`ActivationNumber`](#activationnumber)\>

Activation details with ID and phone number.

###### Example

```typescript
const activation = await client.getNumber({
  service: 'tg',
  country: '22',
});
console.log(`Order ID: ${activation.id}, Number: ${activation.number}`);
```

##### getNumberV2()

> **getNumberV2**(`options`): `Promise`\<[`ActivationNumberV2`](#activationnumberv2)\>

Defined in: [src/index.ts:313](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L313)

Orders a new virtual phone number with rich details (v2 protocol).

###### Parameters

###### options

[`GetNumberOptions`](#getnumberoptions)

Order parameters including service and optional country.

###### Returns

`Promise`\<[`ActivationNumberV2`](#activationnumberv2)\>

Detailed activation object.

###### Example

```typescript
const details = await client.getNumberV2({
  service: 'tg',
  country: '22',
});
console.log(`Number: ${details.phoneNumber}, Cost: ${details.activationCost}`);
```

##### getPrices()

> **getPrices**(`service?`, `country?`): `Promise`\<`Record`\<`string`, `Record`\<`string`, \{ `cost`: `number`; `count`: `number`; \}\>\>\>

Defined in: [src/index.ts:428](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L428)

Gets prices and counts for services and countries.

###### Parameters

###### service?

`string`

Optional service code filter.

###### country?

`string` \| `number`

Optional country code filter.

###### Returns

`Promise`\<`Record`\<`string`, `Record`\<`string`, \{ `cost`: `number`; `count`: `number`; \}\>\>\>

Price mapping.

###### Example

```typescript
const prices = await client.getPrices('tg', '22');
console.log(prices);
```

##### getPricesV2()

> **getPricesV2**(`service?`, `country?`): `Promise`\<`Record`\<`string`, `Record`\<`string`, `Record`\<`string`, `number`\>\>\>\>

Defined in: [src/index.ts:454](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L454)

Gets detailed price lists grouped by price point (v2).

###### Parameters

###### service?

`string`

Optional service code filter.

###### country?

`string` \| `number`

Optional country code filter.

###### Returns

`Promise`\<`Record`\<`string`, `Record`\<`string`, `Record`\<`string`, `number`\>\>\>\>

Price points mapping.

###### Example

```typescript
const pricesV2 = await client.getPricesV2('tg', '22');
console.log(pricesV2);
```

##### getPricesV3()

> **getPricesV3**(`service?`, `country?`): `Promise`\<`Record`\<`string`, `Record`\<`string`, `Record`\<`string`, \{ `count`: `number`; `price`: `number`; `provider_id`: `string` \| `number`; \}\>\>\>\>

Defined in: [src/index.ts:480](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L480)

Gets granular price lists by provider ID (v3).

###### Parameters

###### service?

`string`

Optional service code filter.

###### country?

`string` \| `number`

Optional country code filter.

###### Returns

`Promise`\<`Record`\<`string`, `Record`\<`string`, `Record`\<`string`, \{ `count`: `number`; `price`: `number`; `provider_id`: `string` \| `number`; \}\>\>\>\>

Provider price mapping.

###### Example

```typescript
const pricesV3 = await client.getPricesV3('tg', '22');
console.log(pricesV3);
```

##### getServicesList()

> **getServicesList**(): `Promise`\<[`ServiceItem`](#serviceitem)[]\>

Defined in: [src/index.ts:509](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L509)

Retrieves the full catalog of supported services.

###### Returns

`Promise`\<[`ServiceItem`](#serviceitem)[]\>

Array of available services.

###### Example

```typescript
const services = await client.getServicesList();
console.log(`Found ${services.length} services`);
```

##### getStatus()

> **getStatus**(`id`): `Promise`\<[`ActivationStatus`](#activationstatus)\>

Defined in: [src/index.ts:364](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L364)

Checks the status and retrieves the received SMS code for an activation.

###### Parameters

###### id

`string` \| `number`

Activation identifier.

###### Returns

`Promise`\<[`ActivationStatus`](#activationstatus)\>

Current status and code if received.

###### Example

```typescript
const res = await client.getStatus('123456');
if (res.status === 'STATUS_OK') {
  console.log('Received SMS code:', res.code);
}
```

##### getTopCountriesByService()

> **getTopCountriesByService**(`service`): `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/index.ts:551](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L551)

Retrieves the top 10 countries and gold partners for a service.

###### Parameters

###### service

`string`

Service code.

###### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

Top countries and partner listings.

###### Example

```typescript
const top = await client.getTopCountriesByService('tg');
console.log(top);
```

##### setStatus()

> **setStatus**(`id`, `status`): `Promise`\<`string`\>

Defined in: [src/index.ts:406](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L406)

Changes the activation status.
Status actions:
- 1: Inform readiness of the number (SMS sent)
- 3: Request another code
- 6: Complete activation
- 8: Cancel activation

###### Parameters

###### id

`string` \| `number`

Activation identifier.

###### status

`number`

Action code (1, 3, 6, 8).

###### Returns

`Promise`\<`string`\>

Status confirmation response string.

###### Example

```typescript
await client.setStatus('123456', 6);
console.log('Activation completed');
```

***

### SmsBowerError

Defined in: [src/index.ts:164](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L164)

Error thrown by the SMSBower client when API calls fail.

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new SmsBowerError**(`message`, `code?`, `responseBody?`): [`SmsBowerError`](#smsbowererror)

Defined in: [src/index.ts:174](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L174)

###### Parameters

###### message

`string`

###### code?

`string`

###### responseBody?

`string`

###### Returns

[`SmsBowerError`](#smsbowererror)

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

Defined in: [src/index.ts:168](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L168)

Short error identifier returned by the server (e.g. BAD_KEY, NO_NUMBERS).

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

> `readonly` `optional` **responseBody?**: `string`

Defined in: [src/index.ts:172](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L172)

Raw server response body.

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

Defined in: [src/index.ts:65](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L65)

Acquired virtual phone number from getNumber.

#### Properties

##### id

> **id**: `string`

Defined in: [src/index.ts:69](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L69)

Unique activation ID.

##### number

> **number**: `string`

Defined in: [src/index.ts:73](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L73)

Full phone number with country code.

***

### ActivationNumberV2

Defined in: [src/index.ts:79](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L79)

Extended activation details returned from getNumberV2.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### activationCost?

> `optional` **activationCost?**: `number`

Defined in: [src/index.ts:91](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L91)

Cost deducted for the activation.

##### activationId

> **activationId**: `string` \| `number`

Defined in: [src/index.ts:83](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L83)

Activation identifier.

##### activationOperator?

> `optional` **activationOperator?**: `string`

Defined in: [src/index.ts:107](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L107)

Mobile operator name or code.

##### activationTime?

> `optional` **activationTime?**: `string`

Defined in: [src/index.ts:103](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L103)

Activation timestamp.

##### canGetAnotherSms?

> `optional` **canGetAnotherSms?**: `number` \| `boolean`

Defined in: [src/index.ts:99](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L99)

Whether another SMS code can be requested.

##### countryCode?

> `optional` **countryCode?**: `string` \| `number`

Defined in: [src/index.ts:95](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L95)

Country code identifier.

##### phoneNumber

> **phoneNumber**: `string` \| `number`

Defined in: [src/index.ts:87](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L87)

Full phone number with country code.

***

### ActivationStatus

Defined in: [src/index.ts:114](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L114)

Activation status response.

#### Properties

##### code?

> `optional` **code?**: `string`

Defined in: [src/index.ts:122](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L122)

Received SMS verification code, if available.

##### status

> **status**: `string`

Defined in: [src/index.ts:118](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L118)

Raw status code name (e.g. STATUS_WAIT_CODE, STATUS_WAIT_RETRY, STATUS_CANCEL, STATUS_OK).

***

### CountryItem

Defined in: [src/index.ts:142](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L142)

Country listing item.

#### Properties

##### chn?

> `optional` **chn?**: `string`

Defined in: [src/index.ts:158](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L158)

Chinese country name.

##### eng?

> `optional` **eng?**: `string`

Defined in: [src/index.ts:154](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L154)

English country name.

##### id

> **id**: `string` \| `number`

Defined in: [src/index.ts:146](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L146)

Country numeric identifier.

##### rus?

> `optional` **rus?**: `string`

Defined in: [src/index.ts:150](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L150)

Russian country name.

***

### GetNumberOptions

Defined in: [src/index.ts:27](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L27)

Options for ordering a virtual phone number.

#### Properties

##### country?

> `optional` **country?**: `string` \| `number`

Defined in: [src/index.ts:35](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L35)

Country ID or code (e.g. '22' for India, '1003' for Bermuda).

##### exceptProviderIds?

> `optional` **exceptProviderIds?**: `string` \| `number`[]

Defined in: [src/index.ts:51](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L51)

Blacklist provider IDs (comma-separated string or array of IDs).

##### maxPrice?

> `optional` **maxPrice?**: `number`

Defined in: [src/index.ts:39](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L39)

Maximum acceptable price for purchasing the number.

##### minPrice?

> `optional` **minPrice?**: `number`

Defined in: [src/index.ts:43](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L43)

Minimum acceptable price for purchasing the number.

##### phoneException?

> `optional` **phoneException?**: `string`

Defined in: [src/index.ts:55](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L55)

Excluded number prefix masks (e.g. '7918,7900111').

##### providerIds?

> `optional` **providerIds?**: `string` \| `number`[]

Defined in: [src/index.ts:47](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L47)

Whitelist provider IDs (comma-separated string or array of IDs).

##### service

> **service**: `string`

Defined in: [src/index.ts:31](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L31)

Service code (e.g. 'tg' for Telegram, 'wa' for WhatsApp).

##### userID?

> `optional` **userID?**: `string` \| `number`

Defined in: [src/index.ts:59](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L59)

Reseller user identifier.

***

### ServiceItem

Defined in: [src/index.ts:128](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L128)

Service listing item.

#### Properties

##### code

> **code**: `string`

Defined in: [src/index.ts:132](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L132)

Service short code (e.g. 'tg', 'kt').

##### name

> **name**: `string`

Defined in: [src/index.ts:136](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L136)

Human-readable service name.

***

### SmsBowerClientOptions

Defined in: [src/index.ts:9](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L9)

Configuration options for the SmsBowerClient.

#### Properties

##### apiKey

> **apiKey**: `string`

Defined in: [src/index.ts:13](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L13)

API key obtained from SMSBower dashboard.

##### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [src/index.ts:17](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L17)

Base URL for the SMSBower API. Defaults to https://smsbower.page.

##### timeout?

> `optional` **timeout?**: `number`

Defined in: [src/index.ts:21](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L21)

Request timeout in milliseconds. Defaults to 30000 ms.

## Variables

### DEFAULT\_REF\_ID

> `const` **DEFAULT\_REF\_ID**: `"572438"` = `'572438'`

Defined in: [src/index.ts:4](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/smsbower/js/src/index.ts#L4)

**`Internal`**
