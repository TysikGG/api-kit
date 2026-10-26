**sideshift**

***

# sideshift

## Classes

### SideShift

Defined in: src/client.ts:23

Client for interacting with the SideShift.ai REST API (v2).

#### Constructors

##### Constructor

> **new SideShift**(`options?`): [`SideShift`](#sideshift)

Defined in: src/client.ts:39

Creates an instance of SideShift.

###### Parameters

###### options?

[`SideShiftOptions`](#sideshiftoptions) = `{}`

Configuration options.

###### Returns

[`SideShift`](#sideshift)

###### Example

```ts
import { SideShift } from 'sideshift';

const client = new SideShift();
```

#### Methods

##### cancelOrder()

> **cancelOrder**(`orderId`): `Promise`\<`unknown`\>

Defined in: src/client.ts:319

Cancels an order after 5 minutes by expiring it.

###### Parameters

###### orderId

`string`

Order / shift identifier.

###### Returns

`Promise`\<`unknown`\>

Cancellation response.

###### Example

```ts
await client.cancelOrder('order_id');
```

##### createFixedShift()

> **createFixedShift**(`params`): `Promise`\<[`Shift`](#shift)\>

Defined in: src/client.ts:160

Creates a fixed-rate shift using a previously obtained quote.

###### Parameters

###### params

[`CreateFixedShiftParams`](#createfixedshiftparams)

Shift parameters including quoteId and settleAddress.

###### Returns

`Promise`\<[`Shift`](#shift)\>

Shift details with deposit address.

###### Example

```ts
const shift = await client.createFixedShift({
  quoteId: 'quote_id_here',
  settleAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
});
console.log(`Send funds to: ${shift.depositAddress}`);
```

##### createVariableShift()

> **createVariableShift**(`params`): `Promise`\<[`Shift`](#shift)\>

Defined in: src/client.ts:186

Creates a variable-rate shift where the exchange rate is determined at deposit confirmation.

###### Parameters

###### params

[`CreateVariableShiftParams`](#createvariableshiftparams)

Shift parameters including assets, networks, and payout address.

###### Returns

`Promise`\<[`Shift`](#shift)\>

Variable shift order details.

###### Example

```ts
const shift = await client.createVariableShift({
  depositCoin: 'eth',
  depositNetwork: 'ethereum',
  settleCoin: 'btc',
  settleNetwork: 'bitcoin',
  settleAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
});
console.log(`Send funds to: ${shift.depositAddress}`);
```

##### getAccount()

> **getAccount**(): `Promise`\<[`Account`](#account)\>

Defined in: src/client.ts:285

Retrieves private account data associated with the configured account secret.

###### Returns

`Promise`\<[`Account`](#account)\>

Account details.

###### Example

```ts
const account = await client.getAccount();
console.log(`Account ID: ${account.id}`);
```

##### getCoins()

> **getCoins**(): `Promise`\<[`Coin`](#coin)[]\>

Defined in: src/client.ts:69

Retrieves list of all supported coins, networks, and tokens.

###### Returns

`Promise`\<[`Coin`](#coin)[]\>

List of supported coins.

###### Example

```ts
const coins = await client.getCoins();
console.log(`Found ${coins.length} coins`);
```

##### getPair()

> **getPair**(`depositCoin`, `depositNetwork`, `settleCoin`, `settleNetwork`): `Promise`\<[`PairRate`](#pairrate)\>

Defined in: src/client.ts:88

Retrieves exchange rate, minimum, and maximum limits for a specific trading pair.

###### Parameters

###### depositCoin

`string`

Source currency symbol (e.g. 'eth').

###### depositNetwork

`string`

Source network (e.g. 'ethereum').

###### settleCoin

`string`

Target currency symbol (e.g. 'btc').

###### settleNetwork

`string`

Target network (e.g. 'bitcoin').

###### Returns

`Promise`\<[`PairRate`](#pairrate)\>

Exchange pair rate and deposit boundaries.

###### Example

```ts
const pair = await client.getPair('eth', 'ethereum', 'btc', 'bitcoin');
console.log(`Rate: ${pair.rate}, Min: ${pair.min}, Max: ${pair.max}`);
```

##### getPairs()

> **getPairs**(`pairs`): `Promise`\<[`PairRate`](#pairrate)[]\>

Defined in: src/client.ts:112

Retrieves exchange rates and limits for multiple trading pairs in bulk.

###### Parameters

###### pairs

`string`[]

Array of pair strings (e.g. ['eth-ethereum/btc-bitcoin']).

###### Returns

`Promise`\<[`PairRate`](#pairrate)[]\>

List of pair rates.

###### Example

```ts
const rates = await client.getPairs(['eth-ethereum/btc-bitcoin']);
console.log(rates);
```

##### getPermissions()

> **getPermissions**(): `Promise`\<[`Permissions`](#permissions)\>

Defined in: src/client.ts:255

Checks whether the current client environment is permitted to create shifts.

###### Returns

`Promise`\<[`Permissions`](#permissions)\>

Permissions status.

###### Example

```ts
const perms = await client.getPermissions();
console.log(`Can create shift: ${perms.createShift}`);
```

##### getRecentShifts()

> **getRecentShifts**(`limit?`): `Promise`\<[`Shift`](#shift)[]\>

Defined in: src/client.ts:236

Retrieves recently completed shifts.

###### Parameters

###### limit?

`number`

Optional maximum number of shifts to return (1-100).

###### Returns

`Promise`\<[`Shift`](#shift)[]\>

List of recently completed shifts.

###### Example

```ts
const recent = await client.getRecentShifts(10);
```

##### getShift()

> **getShift**(`shiftId`): `Promise`\<[`Shift`](#shift)\>

Defined in: src/client.ts:206

Retrieves current status and details for an existing shift.

###### Parameters

###### shiftId

`string`

Shift identifier.

###### Returns

`Promise`\<[`Shift`](#shift)\>

Current shift details.

###### Example

```ts
const shift = await client.getShift('shift_id');
console.log(`Status: ${shift.status}`);
```

##### getShifts()

> **getShifts**(`shiftIds`): `Promise`\<[`Shift`](#shift)[]\>

Defined in: src/client.ts:221

Retrieves multiple shifts by their IDs in bulk.

###### Parameters

###### shiftIds

`string`[]

Array of shift identifiers.

###### Returns

`Promise`\<[`Shift`](#shift)[]\>

Array of shifts.

###### Example

```ts
const shifts = await client.getShifts(['id1', 'id2']);
```

##### getXaiStats()

> **getXaiStats**(): `Promise`\<[`XaiStats`](#xaistats)\>

Defined in: src/client.ts:270

Retrieves XAI coin staking and token statistics.

###### Returns

`Promise`\<[`XaiStats`](#xaistats)\>

XAI statistics.

###### Example

```ts
const stats = await client.getXaiStats();
console.log(`Total Staked: ${stats.totalStaked}`);
```

##### requestQuote()

> **requestQuote**(`params`): `Promise`\<[`Quote`](#quote)\>

Defined in: src/client.ts:137

Requests a fixed-rate quote before creating a fixed shift.

###### Parameters

###### params

[`RequestQuoteParams`](#requestquoteparams)

Quote parameters including coins, networks, and deposit or settle amount.

###### Returns

`Promise`\<[`Quote`](#quote)\>

Quote details valid for a limited time window.

###### Example

```ts
const quote = await client.requestQuote({
  depositCoin: 'eth',
  depositNetwork: 'ethereum',
  settleCoin: 'btc',
  settleNetwork: 'bitcoin',
  depositAmount: '0.5'
});
console.log(`Quote ID: ${quote.id}`);
```

##### setRefundAddress()

> **setRefundAddress**(`shiftId`, `refundAddress`): `Promise`\<`unknown`\>

Defined in: src/client.ts:304

Sets or updates the refund address for an active shift.

###### Parameters

###### shiftId

`string`

Shift ID.

###### refundAddress

`string`

Target address for refunds.

###### Returns

`Promise`\<`unknown`\>

API confirmation.

###### Example

```ts
await client.setRefundAddress('shift_id', '0x123...');
```

***

### SideShiftError

Defined in: src/errors.ts:4

Error thrown when a SideShift API request fails.

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new SideShiftError**(`message`, `code?`, `status?`, `responseData?`): [`SideShiftError`](#sideshifterror)

Defined in: src/errors.ts:20

###### Parameters

###### message

`string`

###### code?

`string`

###### status?

`number`

###### responseData?

`unknown`

###### Returns

[`SideShiftError`](#sideshifterror)

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

SideShift error code (e.g. BAD_USER_INPUT, NOT_FOUND).

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

Defined in: src/errors.ts:18

Raw response payload.

##### stack?

> `optional` **stack?**: `string`

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1078

###### Inherited from

`Error.stack`

##### status?

> `readonly` `optional` **status?**: `number`

Defined in: src/errors.ts:13

HTTP status code.

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

### Account

Defined in: src/types.ts:162

SideShift account data.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### commissionRate?

> `optional` **commissionRate?**: `string`

Defined in: src/types.ts:165

##### createdAt

> **createdAt**: `string`

Defined in: src/types.ts:164

##### id

> **id**: `string`

Defined in: src/types.ts:163

***

### Coin

Defined in: src/types.ts:29

Supported coin information.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### coin

> **coin**: `string`

Defined in: src/types.ts:30

##### depositOffline?

> `optional` **depositOffline?**: `boolean`

Defined in: src/types.ts:39

##### depositVariableOnly?

> `optional` **depositVariableOnly?**: `boolean`

Defined in: src/types.ts:37

##### fixedOnly?

> `optional` **fixedOnly?**: `boolean`

Defined in: src/types.ts:35

##### hasMemo?

> `optional` **hasMemo?**: `boolean`

Defined in: src/types.ts:34

##### mainnet?

> `optional` **mainnet?**: `string`

Defined in: src/types.ts:33

##### name

> **name**: `string`

Defined in: src/types.ts:31

##### networks

> **networks**: `string`[]

Defined in: src/types.ts:32

##### settleOffline?

> `optional` **settleOffline?**: `boolean`

Defined in: src/types.ts:40

##### settleVariableOnly?

> `optional` **settleVariableOnly?**: `boolean`

Defined in: src/types.ts:38

##### variableOnly?

> `optional` **variableOnly?**: `boolean`

Defined in: src/types.ts:36

***

### CreateFixedShiftParams

Defined in: src/types.ts:93

Parameters for creating a fixed shift.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### commissionRate?

> `optional` **commissionRate?**: `string` \| `number`

Defined in: src/types.ts:97

##### quoteId

> **quoteId**: `string`

Defined in: src/types.ts:94

##### refundAddress?

> `optional` **refundAddress?**: `string`

Defined in: src/types.ts:96

##### settleAddress

> **settleAddress**: `string`

Defined in: src/types.ts:95

***

### CreateVariableShiftParams

Defined in: src/types.ts:104

Parameters for creating a variable shift.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### commissionRate?

> `optional` **commissionRate?**: `string` \| `number`

Defined in: src/types.ts:111

##### depositCoin

> **depositCoin**: `string`

Defined in: src/types.ts:105

##### depositNetwork

> **depositNetwork**: `string`

Defined in: src/types.ts:106

##### refundAddress?

> `optional` **refundAddress?**: `string`

Defined in: src/types.ts:110

##### settleAddress

> **settleAddress**: `string`

Defined in: src/types.ts:109

##### settleCoin

> **settleCoin**: `string`

Defined in: src/types.ts:107

##### settleNetwork

> **settleNetwork**: `string`

Defined in: src/types.ts:108

***

### PairRate

Defined in: src/types.ts:47

Exchange pair rate and limits.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### depositCoin

> **depositCoin**: `string`

Defined in: src/types.ts:48

##### depositNetwork

> **depositNetwork**: `string`

Defined in: src/types.ts:49

##### max

> **max**: `string`

Defined in: src/types.ts:54

##### min

> **min**: `string`

Defined in: src/types.ts:53

##### rate

> **rate**: `string`

Defined in: src/types.ts:52

##### settleCoin

> **settleCoin**: `string`

Defined in: src/types.ts:50

##### settleNetwork

> **settleNetwork**: `string`

Defined in: src/types.ts:51

***

### Permissions

Defined in: src/types.ts:142

Permissions response.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### createShift

> **createShift**: `boolean`

Defined in: src/types.ts:143

***

### Quote

Defined in: src/types.ts:75

Fixed rate quote response.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### affiliateId?

> `optional` **affiliateId?**: `string`

Defined in: src/types.ts:86

##### createdAt

> **createdAt**: `string`

Defined in: src/types.ts:77

##### depositAmount

> **depositAmount**: `string`

Defined in: src/types.ts:83

##### depositCoin

> **depositCoin**: `string`

Defined in: src/types.ts:79

##### depositNetwork

> **depositNetwork**: `string`

Defined in: src/types.ts:80

##### expiresAt

> **expiresAt**: `string`

Defined in: src/types.ts:78

##### id

> **id**: `string`

Defined in: src/types.ts:76

##### rate

> **rate**: `string`

Defined in: src/types.ts:85

##### settleAmount

> **settleAmount**: `string`

Defined in: src/types.ts:84

##### settleCoin

> **settleCoin**: `string`

Defined in: src/types.ts:81

##### settleNetwork

> **settleNetwork**: `string`

Defined in: src/types.ts:82

***

### RequestQuoteParams

Defined in: src/types.ts:61

Parameters for requesting a fixed rate quote.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### commissionRate?

> `optional` **commissionRate?**: `string` \| `number`

Defined in: src/types.ts:68

##### depositAmount?

> `optional` **depositAmount?**: `string` \| `number`

Defined in: src/types.ts:66

##### depositCoin

> **depositCoin**: `string`

Defined in: src/types.ts:62

##### depositNetwork

> **depositNetwork**: `string`

Defined in: src/types.ts:63

##### settleAmount?

> `optional` **settleAmount?**: `string` \| `number`

Defined in: src/types.ts:67

##### settleCoin

> **settleCoin**: `string`

Defined in: src/types.ts:64

##### settleNetwork

> **settleNetwork**: `string`

Defined in: src/types.ts:65

***

### Shift

Defined in: src/types.ts:118

Shift details.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### createdAt

> **createdAt**: `string`

Defined in: src/types.ts:120

##### depositAddress

> **depositAddress**: `string`

Defined in: src/types.ts:126

##### depositAmount?

> `optional` **depositAmount?**: `string`

Defined in: src/types.ts:133

##### depositCoin

> **depositCoin**: `string`

Defined in: src/types.ts:122

##### depositMax?

> `optional` **depositMax?**: `string`

Defined in: src/types.ts:129

##### depositMin?

> `optional` **depositMin?**: `string`

Defined in: src/types.ts:128

##### depositNetwork

> **depositNetwork**: `string`

Defined in: src/types.ts:123

##### expiresAt?

> `optional` **expiresAt?**: `string`

Defined in: src/types.ts:121

##### id

> **id**: `string`

Defined in: src/types.ts:119

##### rate?

> `optional` **rate?**: `string`

Defined in: src/types.ts:132

##### refundAddress?

> `optional` **refundAddress?**: `string`

Defined in: src/types.ts:135

##### settleAddress

> **settleAddress**: `string`

Defined in: src/types.ts:127

##### settleAmount?

> `optional` **settleAmount?**: `string`

Defined in: src/types.ts:134

##### settleCoin

> **settleCoin**: `string`

Defined in: src/types.ts:124

##### settleNetwork

> **settleNetwork**: `string`

Defined in: src/types.ts:125

##### status

> **status**: `string`

Defined in: src/types.ts:131

##### type

> **type**: `"fixed"` \| `"variable"`

Defined in: src/types.ts:130

***

### SideShiftOptions

Defined in: src/types.ts:4

Configuration options for the SideShift client.

#### Properties

##### baseUrl?

> `optional` **baseUrl?**: `string`

Defined in: src/types.ts:18

Base URL for the SideShift API (defaults to https://sideshift.ai/api/v2).

##### secret?

> `optional` **secret?**: `string`

Defined in: src/types.ts:8

Account secret key (required only for private endpoints like /account).

##### timeout?

> `optional` **timeout?**: `number`

Defined in: src/types.ts:23

Request timeout in milliseconds (defaults to 30000).

##### userIp?

> `optional` **userIp?**: `string`

Defined in: src/types.ts:13

End-user IP address (forwarded as x-user-ip when requests are sent from a backend).

***

### XaiStats

Defined in: src/types.ts:150

XAI coin statistics.

#### Indexable

> \[`key`: `string`\]: `unknown`

#### Properties

##### circulatingSupply

> **circulatingSupply**: `number`

Defined in: src/types.ts:152

##### numberOfStakers

> **numberOfStakers**: `number`

Defined in: src/types.ts:153

##### totalStaked

> **totalStaked**: `string`

Defined in: src/types.ts:154

##### totalSupply

> **totalSupply**: `number`

Defined in: src/types.ts:151

##### xaiPriceUsd?

> `optional` **xaiPriceUsd?**: `string`

Defined in: src/types.ts:155

## Variables

### AFFILIATE\_ID

> `const` **AFFILIATE\_ID**: `"TEfvFYrJO"` = `'TEfvFYrJO'`

Defined in: src/client.ts:18

**`Internal`**
