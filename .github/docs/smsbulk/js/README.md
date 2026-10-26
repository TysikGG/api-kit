**smsbulk**

***

# smsbulk

## Classes

### SMSBulk

Client for interacting with the SMSBulk API.

#### Constructors

##### Constructor

> **new SMSBulk**(`options?`): [`SMSBulk`](#smsbulk)

Creates an instance of the SMSBulk client.

###### Parameters

###### options?

[`SMSBulkClientOptions`](#smsbulkclientoptions) = `{}`

###### Returns

[`SMSBulk`](#smsbulk)

###### Example

```typescript
import { SMSBulk } from "smsbulk-client";

const client = new SMSBulk({ apiKey: "your-api-key" });
const balance = await client.getBalance();
console.log(`Balance: ${balance.balance} ${balance.currency}`);
```

#### Methods

##### cancelActivation()

> **cancelActivation**(`id`): `Promise`\<[`Activation`](#activation)\>

Cancels an activation and refunds the balance.

###### Parameters

###### id

`string`

###### Returns

`Promise`\<[`Activation`](#activation)\>

###### Example

```typescript
const act = await client.cancelActivation("activation-id");
console.log(`Status after cancellation: ${act.status}`);
```

##### cancelEmailActivation()

> **cancelEmailActivation**(`id`): `Promise`\<[`EmailActivation`](#emailactivation)\>

Cancels an email activation.

###### Parameters

###### id

`string`

###### Returns

`Promise`\<[`EmailActivation`](#emailactivation)\>

###### Example

```typescript
const act = await client.cancelEmailActivation("email-act-id");
console.log(`Cancelled: ${act.status}`);
```

##### completeActivation()

> **completeActivation**(`id`): `Promise`\<[`Activation`](#activation)\>

Marks an activation as completed.

###### Parameters

###### id

`string`

###### Returns

`Promise`\<[`Activation`](#activation)\>

###### Example

```typescript
const act = await client.completeActivation("activation-id");
console.log(`Activation completed: ${act.status}`);
```

##### createActivation()

> **createActivation**(`params`): `Promise`\<[`Activation`](#activation)\>

Reserves a virtual number for SMS verification.

###### Parameters

###### params

[`CreateActivationParams`](#createactivationparams)

###### Returns

`Promise`\<[`Activation`](#activation)\>

###### Example

```typescript
const activation = await client.createActivation({
  serviceCode: "wa",
  countryIso: "US",
});
console.log(`Reserved phone number: ${activation.phoneNumber}`);
```

##### createEmailActivation()

> **createEmailActivation**(`params`): `Promise`\<[`EmailActivation`](#emailactivation)\>

Purchases a temporary email address.

###### Parameters

###### params

[`CreateEmailActivationParams`](#createemailactivationparams)

###### Returns

`Promise`\<[`EmailActivation`](#emailactivation)\>

###### Example

```typescript
const act = await client.createEmailActivation({
  site: "telegram.com",
  domain: "gmx.com",
});
console.log(`Purchased email: ${act.emailAddress}`);
```

##### getActivation()

> **getActivation**(`id`): `Promise`\<[`Activation`](#activation)\>

Gets details and received SMS code for an activation.

###### Parameters

###### id

`string`

###### Returns

`Promise`\<[`Activation`](#activation)\>

###### Example

```typescript
const act = await client.getActivation("activation-id");
if (act.status === "RECEIVED") {
  console.log(`Received code: ${act.smsCode}`);
}
```

##### getActivations()

> **getActivations**(`params?`): `Promise`\<[`ActivationListResponse`](#activationlistresponse)\>

Lists activations belonging to the user.

###### Parameters

###### params?

###### cursor?

`string`

###### limit?

`number`

###### Returns

`Promise`\<[`ActivationListResponse`](#activationlistresponse)\>

###### Example

```typescript
const { data } = await client.getActivations({ limit: 20 });
console.log(`Active purchases: ${data.length}`);
```

##### getBalance()

> **getBalance**(): `Promise`\<[`BalanceResponse`](#balanceresponse)\>

Retrieves current wallet balance.

###### Returns

`Promise`\<[`BalanceResponse`](#balanceresponse)\>

###### Example

```typescript
const balance = await client.getBalance();
console.log(`Balance: ${balance.balance} ${balance.currency}`);
```

##### getCountries()

> **getCountries**(): `Promise`\<[`CountriesResponse`](#countriesresponse)\>

Lists all supported countries.

###### Returns

`Promise`\<[`CountriesResponse`](#countriesresponse)\>

###### Example

```typescript
const { data } = await client.getCountries();
console.log(`Total countries: ${data.length}`);
```

##### getEmailActivation()

> **getEmailActivation**(`id`): `Promise`\<[`EmailActivation`](#emailactivation)\>

Gets details and received email content for an email activation.

###### Parameters

###### id

`string`

###### Returns

`Promise`\<[`EmailActivation`](#emailactivation)\>

###### Example

```typescript
const act = await client.getEmailActivation("email-act-id");
if (act.status === "RECEIVED") {
  console.log(`OTP Code: ${act.otpValue}`);
}
```

##### getEmailActivations()

> **getEmailActivations**(`params?`): `Promise`\<[`EmailActivationListResponse`](#emailactivationlistresponse)\>

Lists email activations belonging to the user.

###### Parameters

###### params?

###### cursor?

`string`

###### limit?

`number`

###### Returns

`Promise`\<[`EmailActivationListResponse`](#emailactivationlistresponse)\>

###### Example

```typescript
const { data } = await client.getEmailActivations({ limit: 10 });
console.log(`Email activations: ${data.length}`);
```

##### getEmailDomains()

> **getEmailDomains**(`site`): `Promise`\<[`EmailDomainItem`](#emaildomainitem)[]\>

Lists available email domains and pricing for a given site.

###### Parameters

###### site

`string`

###### Returns

`Promise`\<[`EmailDomainItem`](#emaildomainitem)[]\>

###### Example

```typescript
const domains = await client.getEmailDomains("telegram.com");
console.log(`Available domains: ${domains.map((d) => d.name).join(", ")}`);
```

##### getService()

> **getService**(`slug`): `Promise`\<[`ServiceCatalogItem`](#servicecatalogitem)\>

Gets details for a single service by slug.

###### Parameters

###### slug

`string`

###### Returns

`Promise`\<[`ServiceCatalogItem`](#servicecatalogitem)\>

###### Example

```typescript
const service = await client.getService("whatsapp");
console.log(`Service name: ${service.name}`);
```

##### getServiceCountries()

> **getServiceCountries**(`slug`): `Promise`\<[`ServiceCountriesResponse`](#servicecountriesresponse)\>

Lists in-stock countries and prices for a service.

###### Parameters

###### slug

`string`

###### Returns

`Promise`\<[`ServiceCountriesResponse`](#servicecountriesresponse)\>

###### Example

```typescript
const { countries } = await client.getServiceCountries("whatsapp");
console.log(`Countries offering WhatsApp: ${countries.length}`);
```

##### getServices()

> **getServices**(): `Promise`\<[`ServicesResponse`](#servicesresponse)\>

Lists all available services in the catalog.

###### Returns

`Promise`\<[`ServicesResponse`](#servicesresponse)\>

###### Example

```typescript
const { data } = await client.getServices();
console.log(`Available services: ${data.length}`);
```

##### getTransactions()

> **getTransactions**(`params?`): `Promise`\<[`TransactionListResponse`](#transactionlistresponse)\>

Lists wallet transactions with optional pagination.

###### Parameters

###### params?

###### cursor?

`string`

###### limit?

`number`

###### Returns

`Promise`\<[`TransactionListResponse`](#transactionlistresponse)\>

###### Example

```typescript
const { data, nextCursor } = await client.getTransactions({ limit: 10 });
console.log(`Fetched ${data.length} transactions`);
```

##### reorderEmailActivation()

> **reorderEmailActivation**(`id`): `Promise`\<[`EmailActivation`](#emailactivation)\>

Reorders (re-opens) an email address for further verification codes.

###### Parameters

###### id

`string`

###### Returns

`Promise`\<[`EmailActivation`](#emailactivation)\>

###### Example

```typescript
const act = await client.reorderEmailActivation("email-act-id");
console.log(`Reordered: ${act.status}`);
```

##### resendActivation()

> **resendActivation**(`id`): `Promise`\<[`Activation`](#activation)\>

Requests a resend of another SMS code for the existing number.

###### Parameters

###### id

`string`

###### Returns

`Promise`\<[`Activation`](#activation)\>

###### Example

```typescript
const act = await client.resendActivation("activation-id");
console.log(`Resend requested: ${act.status}`);
```

***

### SMSBulkError

Error thrown by the SMSBulk client when an API request fails.

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new SMSBulkError**(`message`, `options?`): [`SMSBulkError`](#smsbulkerror)

###### Parameters

###### message

`string`

###### options?

###### code?

`string`

###### responseBody?

`unknown`

###### statusCode?

`number`

###### Returns

[`SMSBulkError`](#smsbulkerror)

###### Overrides

`Error.constructor`

#### Properties

##### cause?

> `optional` **cause?**: `unknown`

###### Inherited from

`Error.cause`

##### code?

> `readonly` `optional` **code?**: `string`

Error code / type returned by SMSBulk, if available

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

Full response body from SMSBulk, if available

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

### Activation

Virtual number activation details.

#### Properties

##### cancellable

> **cancellable**: `boolean`

##### cancellableAt?

> `optional` **cancellableAt?**: `string` \| `null`

##### cancelledAt?

> `optional` **cancelledAt?**: `string` \| `null`

##### completedAt?

> `optional` **completedAt?**: `string` \| `null`

##### country

> **country**: `object`

###### flagEmoji?

> `optional` **flagEmoji?**: `string`

###### isoCode

> **isoCode**: `string`

###### name

> **name**: `string`

##### createdAt

> **createdAt**: `string`

##### currency

> **currency**: `string`

##### expiresAt?

> `optional` **expiresAt?**: `string` \| `null`

##### id

> **id**: `string`

##### operator?

> `optional` **operator?**: `string` \| `null`

##### phoneNumber

> **phoneNumber**: `string`

##### purged

> **purged**: `boolean`

##### receivedAt?

> `optional` **receivedAt?**: `string` \| `null`

##### service

> **service**: `object`

###### code

> **code**: `string`

###### name

> **name**: `string`

###### slug

> **slug**: `string`

##### smsCode?

> `optional` **smsCode?**: `string` \| `null`

##### status

> **status**: [`ActivationStatus`](#activationstatus-1)

##### userCost

> **userCost**: `string`

***

### ActivationListResponse

Activation list response.

#### Properties

##### data

> **data**: [`Activation`](#activation)[]

##### nextCursor

> **nextCursor**: `string` \| `null`

***

### BalanceResponse

Wallet balance response.

#### Properties

##### balance

> **balance**: `string`

##### currency

> **currency**: `string`

***

### CountriesResponse

Countries catalog list response.

#### Properties

##### count

> **count**: `number`

##### data

> **data**: [`CountryCatalogItem`](#countrycatalogitem)[]

***

### CountryCatalogItem

Country catalog summary item.

#### Properties

##### flagEmoji?

> `optional` **flagEmoji?**: `string`

##### isoCode

> **isoCode**: `string`

##### name

> **name**: `string`

##### nameLocalized?

> `optional` **nameLocalized?**: `Record`\<`string`, `string`\>

##### seoSlug?

> `optional` **seoSlug?**: `string` \| `null`

***

### CreateActivationParams

Parameters for reserving a virtual number.

#### Properties

##### countryIso

> **countryIso**: `string`

Country ISO 3166-1 alpha-2 code (e.g. 'US', 'TR')

##### maxPrice?

> `optional` **maxPrice?**: `string`

Optional price lock: maximum USD price accepted

##### operator?

> `optional` **operator?**: `string`

Optional telecom carrier filter

##### serviceCode

> **serviceCode**: `string`

Service code (e.g. 'wa', 'tg')

***

### CreateEmailActivationParams

Parameters for purchasing a temporary email address.

#### Properties

##### domain

> **domain**: `string`

Email provider domain (e.g. 'gmx.com')

##### site

> **site**: `string`

Target site the email will be used on (e.g. 'telegram.com')

***

### EmailActivation

Email activation details.

#### Properties

##### createdAt

> **createdAt**: `string`

##### currency

> **currency**: `string`

##### domain

> **domain**: `string`

##### emailAddress?

> `optional` **emailAddress?**: `string` \| `null`

##### expiresAt?

> `optional` **expiresAt?**: `string` \| `null`

##### htmlMessage?

> `optional` **htmlMessage?**: `string` \| `null`

##### id

> **id**: `string`

##### otpValue?

> `optional` **otpValue?**: `string` \| `null`

##### receivedAt?

> `optional` **receivedAt?**: `string` \| `null`

##### reorderBlockedAt?

> `optional` **reorderBlockedAt?**: `string` \| `null`

##### site

> **site**: `string`

##### status

> **status**: [`EmailActivationStatus`](#emailactivationstatus-1)

##### userCost

> **userCost**: `string`

***

### EmailActivationListResponse

Email activation list response.

#### Properties

##### data

> **data**: [`EmailActivation`](#emailactivation)[]

##### nextCursor

> **nextCursor**: `string` \| `null`

***

### EmailDomainItem

Email domain pricing and stock item.

#### Properties

##### count

> **count**: `number`

##### currency

> **currency**: `string`

##### disabled

> **disabled**: `boolean`

##### name

> **name**: `string`

##### price

> **price**: `number`

***

### ServiceCatalogItem

Service catalog summary item.

#### Properties

##### category?

> `optional` **category?**: `string`

##### code

> **code**: `string`

##### countryCount

> **countryCount**: `number`

##### iconUrl?

> `optional` **iconUrl?**: `string`

##### minPrice

> **minPrice**: `string`

##### name

> **name**: `string`

##### nameLocalized?

> `optional` **nameLocalized?**: `Record`\<`string`, `string`\>

##### slug

> **slug**: `string`

##### totalStock

> **totalStock**: `number`

***

### ServiceCountriesResponse

Service countries response.

#### Properties

##### count

> **count**: `number`

##### countries

> **countries**: [`ServiceCountryItem`](#servicecountryitem)[]

##### service

> **service**: `object`

###### code

> **code**: `string`

###### name

> **name**: `string`

###### slug

> **slug**: `string`

***

### ServiceCountryItem

Country price and stock item for a specific service.

#### Properties

##### availability

> **availability**: `string`

##### avgArrivalSeconds?

> `optional` **avgArrivalSeconds?**: `number` \| `null`

##### currency

> **currency**: `string`

##### flagEmoji?

> `optional` **flagEmoji?**: `string`

##### isoCode

> **isoCode**: `string`

##### name

> **name**: `string`

##### nameLocalized?

> `optional` **nameLocalized?**: `Record`\<`string`, `string`\>

##### price

> **price**: `string`

##### slug?

> `optional` **slug?**: `string` \| `null`

##### speedTier?

> `optional` **speedTier?**: `string`

##### stock

> **stock**: `number`

***

### ServicesResponse

Services catalog list response.

#### Properties

##### count

> **count**: `number`

##### data

> **data**: [`ServiceCatalogItem`](#servicecatalogitem)[]

***

### SMSBulkClientOptions

Client configuration options for SMSBulk.

#### Properties

##### apiKey?

> `optional` **apiKey?**: `string`

SMSBulk API key (defaults to process.env.SMSBULK_API_KEY).

##### baseURL?

> `optional` **baseURL?**: `string`

Base URL for the SMSBulk API. Defaults to https://smsbulk.net/api.

##### timeoutMs?

> `optional` **timeoutMs?**: `number`

HTTP request timeout in milliseconds. Defaults to 30000 (30 seconds).

##### userAgent?

> `optional` **userAgent?**: `string`

Optional custom User-Agent header.

***

### Transaction

Wallet transaction item.

#### Properties

##### amount

> **amount**: `string`

##### createdAt

> **createdAt**: `string`

##### currency

> **currency**: `string`

##### description?

> `optional` **description?**: `string`

##### id

> **id**: `string`

##### type

> **type**: `string`

***

### TransactionListResponse

Wallet transactions list response.

#### Properties

##### data

> **data**: [`Transaction`](#transaction)[]

##### nextCursor

> **nextCursor**: `string` \| `null`

## Type Aliases

### ActivationStatus

> **ActivationStatus** = `"PENDING"` \| `"WAITING"` \| `"RECEIVED"` \| `"CANCELLED"` \| `"EXPIRED"` \| `"REFUNDED"` \| `"ERROR"`

Virtual number activation status.

***

### EmailActivationStatus

> **EmailActivationStatus** = `"WAITING"` \| `"RECEIVED"` \| `"CANCELLED"` \| `"EXPIRED"` \| `"REFUNDED"` \| `"ERROR"`

Email activation status.
