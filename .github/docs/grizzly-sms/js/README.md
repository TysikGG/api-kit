**grizzly-sms**

***

# grizzly-sms

## Classes

### GrizzlyPartner

Client for the calls a partner sends to Grizzly: SMS, flash-call, and
call-record delivery. `GET_SERVICES`, `GET_NUMBER`, and `FINISH_ACTIVATION`
are incoming requests — the types above describe those payloads.

PUSH_CALL and PUSH_CALL_RECORD are posted to `/agent/api/sms`, the address
written in the protocol articles. The `action` field selects the method.

#### Example

```ts
const partner = new GrizzlyPartner({ key: process.env.GRIZZLY_PARTNER_KEY! });
await partner.pushSms({
  smsId: 1,
  phone: 447472190082,
  phoneFrom: "Microsoft",
  text: "code 5015",
});
```

#### Constructors

##### Constructor

> **new GrizzlyPartner**(`options`): [`GrizzlyPartner`](#grizzlypartner)

###### Parameters

###### options

[`GrizzlyPartnerOptions`](#grizzlypartneroptions)

Partner key from the personal account.

###### Returns

[`GrizzlyPartner`](#grizzlypartner)

###### Example

```ts
const partner = new GrizzlyPartner({ key: process.env.GRIZZLY_PARTNER_KEY! });
```

#### Methods

##### pushCall()

> **pushCall**(`params`): `Promise`\<[`PartnerStatus`](#partnerstatus)\>

Deliver a flash-call (`PUSH_CALL`).

###### Parameters

###### params

[`PushCallParams`](#pushcallparams)

###### Returns

`Promise`\<[`PartnerStatus`](#partnerstatus)\>

###### Example

```ts
await partner.pushCall({
  callId: 10,
  phone: 447472190082,
  phoneFrom: "100",
});
```

##### pushCallRecord()

> **pushCallRecord**(`params`): `Promise`\<[`PartnerStatus`](#partnerstatus)\>

Deliver a call recording (`PUSH_CALL_RECORD`). Pass `text`, `file`, or both.

###### Parameters

###### params

[`PushCallRecordParams`](#pushcallrecordparams)

###### Returns

`Promise`\<[`PartnerStatus`](#partnerstatus)\>

###### Example

```ts
await partner.pushCallRecord({
  callId: 10,
  phone: 447472190082,
  phoneFrom: "100",
  text: "your code is 5015",
});
```

##### pushSms()

> **pushSms**(`params`): `Promise`\<[`PartnerStatus`](#partnerstatus)\>

Deliver an inbound SMS (`PUSH_SMS`).

###### Parameters

###### params

[`PushSmsParams`](#pushsmsparams)

###### Returns

`Promise`\<[`PartnerStatus`](#partnerstatus)\>

###### Example

```ts
await partner.pushSms({
  smsId: 1,
  phone: 447472190082,
  phoneFrom: "Microsoft",
  text: "code 5015",
});
```

***

### GrizzlySms

Client for the Grizzly SMS activation API (`handler_api.php`).

#### Example

```ts
const sms = new GrizzlySms(process.env.GRIZZLY_API_KEY!);
const balance = await sms.getBalance();
```

#### Constructors

##### Constructor

> **new GrizzlySms**(`options`): [`GrizzlySms`](#grizzlysms)

###### Parameters

###### options

`string` \| [`GrizzlySmsOptions`](#grizzlysmsoptions)

API key string, or settings from the Grizzly profile.

###### Returns

[`GrizzlySms`](#grizzlysms)

###### Example

```ts
const sms = new GrizzlySms({ apiKey: process.env.GRIZZLY_API_KEY! });
```

#### Methods

##### call()

> **call**\<`T`\>(`action`, `params?`): `Promise`\<`T`\>

Low-level `handler_api.php` call. Use it for actions added after this
client was published. Known error strings are still thrown.

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

###### Example

```ts
const raw = await sms.call("getBalance");
```

##### cancel()

> **cancel**(`activationId`, `status?`): `Promise`\<[`SetStatusResult`](#setstatusresult)\>

Cancel the activation. Pass `-1` to use the alternate cancel code from
the docs; the default is `8`.

###### Parameters

###### activationId

`string` \| `number`

###### status?

`-1` \| `8` = `8`

###### Returns

`Promise`\<[`SetStatusResult`](#setstatusresult)\>

###### Example

```ts
await sms.cancel(activationId);
```

##### complete()

> **complete**(`activationId`): `Promise`\<[`SetStatusResult`](#setstatusresult)\>

Finish the activation (`status=6`).

###### Parameters

###### activationId

`string` \| `number`

###### Returns

`Promise`\<[`SetStatusResult`](#setstatusresult)\>

###### Example

```ts
await sms.complete(activationId);
```

##### findPrices()

> **findPrices**(`params?`): `Promise`\<[`PriceQuote`](#pricequote)[]\>

`getPrices` flattened and sorted by cost. One request replaces scanning
every country code by hand.

###### Parameters

###### params?

[`FindPricesParams`](#findpricesparams) = `{}`

###### Returns

`Promise`\<[`PriceQuote`](#pricequote)[]\>

###### Example

```ts
const quotes = await sms.findPrices({ service: "tg", minCount: 10, maxPrice: 1 });
```

##### getActiveActivations()

> **getActiveActivations**(): `Promise`\<[`ActiveActivation`](#activeactivation)[]\>

Activations that are still open on the account.

###### Returns

`Promise`\<[`ActiveActivation`](#activeactivation)[]\>

###### Example

```ts
const active = await sms.getActiveActivations();
```

##### getBalance()

> **getBalance**(): `Promise`\<`number`\>

Account balance in USD.

###### Returns

`Promise`\<`number`\>

###### Example

```ts
const balance = await sms.getBalance();
```

##### getCountries()

> **getCountries**(): `Promise`\<[`CountryInfo`](#countryinfo)[]\>

Country catalog.

###### Returns

`Promise`\<[`CountryInfo`](#countryinfo)[]\>

###### Example

```ts
const countries = await sms.getCountries();
```

##### getNumber()

> **getNumber**(`params`): `Promise`\<[`OrderedNumber`](#orderednumber)\>

Order a number. `country` may be `"any"` or omitted.

###### Parameters

###### params

[`GetNumberParams`](#getnumberparams)

###### Returns

`Promise`\<[`OrderedNumber`](#orderednumber)\>

###### Example

```ts
const ordered = await sms.getNumber({ service: "tg", country: "any" });
```

##### getNumberV2()

> **getNumberV2**(`params`): `Promise`\<[`OrderedNumberV2`](#orderednumberv2)\>

Order a number and return price, currency, and activation timestamps.

###### Parameters

###### params

[`GetNumberParams`](#getnumberparams)

###### Returns

`Promise`\<[`OrderedNumberV2`](#orderednumberv2)\>

###### Example

```ts
const ordered = await sms.getNumberV2({ service: "tg", country: 12 });
```

##### getPrices()

> **getPrices**(`params?`): `Promise`\<[`PricesByCountry`](#pricesbycountry)\>

Prices grouped by country, then service.

###### Parameters

###### params?

###### country?

`string` \| `number`

###### service?

`string`

###### Returns

`Promise`\<[`PricesByCountry`](#pricesbycountry)\>

###### Example

```ts
const prices = await sms.getPrices({ service: "tg" });
```

##### getPricesV2()

> **getPricesV2**(`params?`): `Promise`\<[`PricesV2`](#pricesv2)\>

Price buckets: country, service, then price string to available count.

###### Parameters

###### params?

###### country?

`string` \| `number`

###### service?

`string`

###### Returns

`Promise`\<[`PricesV2`](#pricesv2)\>

###### Example

```ts
const prices = await sms.getPricesV2({ service: "tg", country: 0 });
```

##### getPricesV3()

> **getPricesV3**(`params?`): `Promise`\<[`PricesV3`](#pricesv3)\>

Prices with per-provider offers.

###### Parameters

###### params?

###### country?

`string` \| `number`

###### service?

`string`

###### Returns

`Promise`\<[`PricesV3`](#pricesv3)\>

###### Example

```ts
const prices = await sms.getPricesV3({ service: "tg", country: 0 });
```

##### getServices()

> **getServices**(): `Promise`\<[`ServiceInfo`](#serviceinfo)[]\>

Service catalog (`getServicesList`).

###### Returns

`Promise`\<[`ServiceInfo`](#serviceinfo)[]\>

###### Example

```ts
const services = await sms.getServices();
```

##### getStatus()

> **getStatus**(`activationId`): `Promise`\<[`ActivationStatus`](#activationstatus)\>

Current activation status. `STATUS_OK` includes the SMS code.

###### Parameters

###### activationId

`string` \| `number`

###### Returns

`Promise`\<[`ActivationStatus`](#activationstatus)\>

###### Example

```ts
const status = await sms.getStatus(activationId);
```

##### getStatusV2()

> **getStatusV2**(`activationId`): `Promise`\<[`ActivationStatusV2`](#activationstatusv2)\>

Activation status as JSON, including SMS and call payloads.

###### Parameters

###### activationId

`string` \| `number`

###### Returns

`Promise`\<[`ActivationStatusV2`](#activationstatusv2)\>

###### Example

```ts
const status = await sms.getStatusV2(activationId);
```

##### getWallet()

> **getWallet**(`params?`): `Promise`\<[`CryptoWallet`](#cryptowallet)\>

Static deposit address. The documented sample is `coin=usdt` and
`network=tron`. Amounts from 50 USD are credited automatically.

###### Parameters

###### params?

[`WalletParams`](#walletparams) = `{}`

###### Returns

`Promise`\<[`CryptoWallet`](#cryptowallet)\>

###### Example

```ts
const wallet = await sms.getWallet({ coin: "usdt", network: "tron" });
```

##### ready()

> **ready**(`activationId`): `Promise`\<[`SetStatusResult`](#setstatusresult)\>

Tell the service that the SMS was sent to the number (`status=1`).

###### Parameters

###### activationId

`string` \| `number`

###### Returns

`Promise`\<[`SetStatusResult`](#setstatusresult)\>

###### Example

```ts
await sms.ready(activationId);
```

##### requestAnotherCode()

> **requestAnotherCode**(`activationId`): `Promise`\<[`SetStatusResult`](#setstatusresult)\>

Ask for another code on the same number (`status=3`).

###### Parameters

###### activationId

`string` \| `number`

###### Returns

`Promise`\<[`SetStatusResult`](#setstatusresult)\>

###### Example

```ts
await sms.requestAnotherCode(activationId);
```

##### setStatus()

> **setStatus**(`activationId`, `status`): `Promise`\<[`SetStatusResult`](#setstatusresult)\>

Change an activation status. Prefer [ready](#ready), [complete](#complete), and
[cancel](#cancel) for the documented codes.

###### Parameters

###### activationId

`string` \| `number`

###### status

`number`

###### Returns

`Promise`\<[`SetStatusResult`](#setstatusresult)\>

###### Example

```ts
await sms.setStatus(activationId, ActivationAction.Complete);
```

##### waitForCode()

> **waitForCode**(`activationId`, `options?`): `Promise`\<[`ReceivedCode`](#receivedcode)\>

Poll until a code arrives, the activation is cancelled, or the timeout
elapses. `STATUS_WAIT_RESEND` keeps waiting: call `complete()` when your
app has requested the SMS again.

###### Parameters

###### activationId

`string` \| `number`

###### options?

[`WaitForCodeOptions`](#waitforcodeoptions) = `{}`

###### Returns

`Promise`\<[`ReceivedCode`](#receivedcode)\>

###### Example

```ts
const received = await sms.waitForCode(activationId, { timeoutMs: 120_000 });
```

***

### GrizzlySmsError

Error thrown for API status strings, HTTP failures, and client-side checks.

#### Example

```ts
try {
  await sms.getNumber({ service: "tg" });
} catch (error) {
  if (error instanceof GrizzlySmsError && error.code === "NO_NUMBERS") {
    // choose another country
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new GrizzlySmsError**(`code`, `raw?`): [`GrizzlySmsError`](#grizzlysmserror)

###### Parameters

###### code

`string`

Stable error code, for example `NO_NUMBERS` or `BAD_KEY`.

###### raw?

`unknown` = `code`

Original response body. The message is `raw` when it is a non-empty string.

###### Returns

[`GrizzlySmsError`](#grizzlysmserror)

###### Example

```ts
throw new GrizzlySmsError("NO_NUMBERS", "NO_NUMBERS");
```

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

Present for `STATUS_OK` (the code) and `STATUS_WAIT_RETRY` (last code).

##### status

> **status**: `string`

***

### ActivationStatusV2

#### Properties

##### call?

> `optional` **call?**: [`VerificationMessage`](#verificationmessage) \| `null`

##### sms?

> `optional` **sms?**: [`VerificationMessage`](#verificationmessage) \| `null`

##### verificationType?

> `optional` **verificationType?**: `number`

***

### ActiveActivation

#### Properties

##### activationCost

> **activationCost**: `number`

##### activationId

> **activationId**: `string`

##### activationStatus?

> `optional` **activationStatus?**: `string` \| `number`

##### activationTime?

> `optional` **activationTime?**: `string`

##### canGetAnotherSms?

> `optional` **canGetAnotherSms?**: `boolean`

##### countryCode

> **countryCode**: `string`

##### countryName?

> `optional` **countryName?**: `string`

##### currency?

> `optional` **currency?**: `number`

##### discount?

> `optional` **discount?**: `string`

##### phoneNumber

> **phoneNumber**: `string`

##### repeated?

> `optional` **repeated?**: `string`

##### serviceCode

> **serviceCode**: `string`

##### smsCode?

> `optional` **smsCode?**: `string`

##### smsText?

> `optional` **smsText?**: `string`

***

### CountryInfo

#### Properties

##### ara?

> `optional` **ara?**: `string`

##### chn?

> `optional` **chn?**: `string`

##### eng?

> `optional` **eng?**: `string`

##### fra?

> `optional` **fra?**: `string`

##### hin?

> `optional` **hin?**: `string`

##### id

> **id**: `number`

##### rus?

> `optional` **rus?**: `string`

##### spa?

> `optional` **spa?**: `string`

##### tur?

> `optional` **tur?**: `string`

***

### CryptoWallet

#### Properties

##### walletAddress

> **walletAddress**: `string`

***

### FindPricesParams

#### Properties

##### country?

> `optional` **country?**: `string` \| `number`

##### maxPrice?

> `optional` **maxPrice?**: `number`

##### minCount?

> `optional` **minCount?**: `number`

##### service?

> `optional` **service?**: `string`

***

### GetNumberParams

#### Properties

##### country?

> `optional` **country?**: `string` \| `number`

Country id. `"any"` or omitting the field lets Grizzly pick a country
by stock, price, and deliverability.

##### exceptProviderIds?

> `optional` **exceptProviderIds?**: `string` \| readonly (`string` \| `number`)[]

##### maxPrice?

> `optional` **maxPrice?**: `number`

##### minPrice?

> `optional` **minPrice?**: `number`

##### phoneException?

> `optional` **phoneException?**: `string` \| readonly `string`[]

Prefixes to skip. Each item is a country code plus 3–6 digits of the
number mask, for example `1628` or `147220`.

##### providerIds?

> `optional` **providerIds?**: `string` \| readonly (`string` \| `number`)[]

##### service

> **service**: `string`

***

### GrizzlyPartnerOptions

#### Properties

##### axios?

> `optional` **axios?**: `AxiosInstance`

##### baseUrl?

> `optional` **baseUrl?**: `string`

##### key

> **key**: `string`

Partner protocol key from the personal account.

##### timeoutMs?

> `optional` **timeoutMs?**: `number`

***

### GrizzlySmsOptions

#### Properties

##### apiKey

> **apiKey**: `string`

API key from https://grizzlysms.com profile settings.

##### axios?

> `optional` **axios?**: `AxiosInstance`

Inject a custom axios instance (tests, proxies).

##### baseUrl?

> `optional` **baseUrl?**: `string`

Default `https://api.grizzlysms.com`.

##### timeoutMs?

> `optional` **timeoutMs?**: `number`

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

##### activationCancel?

> `optional` **activationCancel?**: `string`

Moment when cancellation becomes allowed.

##### activationCost

> **activationCost**: `number`

##### activationEnd?

> `optional` **activationEnd?**: `string`

Activation expiry.

##### activationId

> **activationId**: `string`

###### Inherited from

[`OrderedNumber`](#orderednumber).[`activationId`](#activationid-1)

##### activationTime

> **activationTime**: `string`

Activation start, `YYYY-MM-DD HH:mm:ss`.

##### canGetAnotherSms

> **canGetAnotherSms**: `boolean`

##### countryCode

> **countryCode**: `string`

##### currency

> **currency**: `number`

ISO 4217 numeric currency code.

##### phoneNumber

> **phoneNumber**: `string`

###### Inherited from

[`OrderedNumber`](#orderednumber).[`phoneNumber`](#phonenumber-1)

***

### PartnerCountryStock

#### Properties

##### country

> **country**: `number`

##### operatorMap

> **operatorMap**: `Record`\<`string`, `Record`\<`string`, `number`\>\>

***

### PartnerFinishActivationRequest

Inbound `FINISH_ACTIVATION` body.
`1` forbidden, `3` sold, `4` cancelled, `5` returned to the customer.

#### Properties

##### action

> **action**: `"FINISH_ACTIVATION"`

##### activationId

> **activationId**: `number`

##### key

> **key**: `string`

##### status

> **status**: `1` \| `3` \| `4` \| `5`

***

### PartnerFinishActivationResponse

#### Properties

##### error?

> `optional` **error?**: `string`

##### status

> **status**: `"SUCCESS"` \| `"ERROR"`

***

### PartnerGetNumberRequest

Inbound `GET_NUMBER` body sent by Grizzly to the partner server.

#### Properties

##### action

> **action**: `"GET_NUMBER"`

##### canGetAnotherSms?

> `optional` **canGetAnotherSms?**: `string` \| `number` \| `boolean`

##### country

> **country**: `number`

##### exceptionPhoneSet?

> `optional` **exceptionPhoneSet?**: `string`[]

##### key

> **key**: `string`

##### operator

> **operator**: `string`

##### service

> **service**: `string`

##### sum

> **sum**: `number`

***

### PartnerGetNumberResponse

#### Properties

##### activationId?

> `optional` **activationId?**: `number`

##### canGetAnotherSms?

> `optional` **canGetAnotherSms?**: `string` \| `number` \| `boolean`

##### error?

> `optional` **error?**: `string`

##### flashcall?

> `optional` **flashcall?**: `boolean`

##### number?

> `optional` **number?**: `number`

##### status

> **status**: `"NO_NUMBERS"` \| `"SUCCESS"` \| `"ERROR"`

##### voice?

> `optional` **voice?**: `boolean`

***

### PartnerGetServicesRequest

Inbound `GET_SERVICES` body sent by Grizzly to the partner server.

#### Properties

##### action

> **action**: `"GET_SERVICES"`

##### key

> **key**: `string`

***

### PartnerGetServicesResponse

#### Properties

##### countryList?

> `optional` **countryList?**: [`PartnerCountryStock`](#partnercountrystock)[]

##### error?

> `optional` **error?**: `string`

##### status

> **status**: `"SUCCESS"` \| `"ERROR"`

***

### PartnerStatus

#### Properties

##### error?

> `optional` **error?**: `string`

##### status

> **status**: `string`

***

### PriceQuote

#### Properties

##### cost

> **cost**: `number`

##### count

> **count**: `number`

##### country

> **country**: `string`

##### service

> **service**: `string`

***

### PriceV3Offer

#### Properties

##### count

> **count**: `number`

##### price

> **price**: `number`

##### providers?

> `optional` **providers?**: `Record`\<`string`, [`ProviderOffer`](#provideroffer)\>

***

### ProviderOffer

#### Properties

##### count

> **count**: `number`

##### price

> **price**: `number`[]

##### provider\_id

> **provider\_id**: `string` \| `number`

***

### PushCallParams

#### Extends

- [`PushRetryOptions`](#pushretryoptions)

#### Properties

##### callId

> **callId**: `number`

##### phone

> **phone**: `number`

##### phoneFrom

> **phoneFrom**: `string`

##### retries?

> `optional` **retries?**: `number`

Extra attempts after the first request. Default `0`.

###### Inherited from

[`PushRetryOptions`](#pushretryoptions).[`retries`](#retries-2)

##### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Delay between attempts. The protocol asks for 10 seconds.

###### Inherited from

[`PushRetryOptions`](#pushretryoptions).[`retryDelayMs`](#retrydelayms-2)

***

### PushCallRecordParams

#### Extends

- [`PushRetryOptions`](#pushretryoptions)

#### Properties

##### callId

> **callId**: `number`

##### file?

> `optional` **file?**: `Blob`

wav, amr, mp3, or ogg. Required when `text` is omitted.

##### filename?

> `optional` **filename?**: `string`

##### phone

> **phone**: `number`

##### phoneFrom

> **phoneFrom**: `string`

##### retries?

> `optional` **retries?**: `number`

Extra attempts after the first request. Default `0`.

###### Inherited from

[`PushRetryOptions`](#pushretryoptions).[`retries`](#retries-2)

##### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Delay between attempts. The protocol asks for 10 seconds.

###### Inherited from

[`PushRetryOptions`](#pushretryoptions).[`retryDelayMs`](#retrydelayms-2)

##### text?

> `optional` **text?**: `string`

Required when `file` is omitted.

***

### PushRetryOptions

#### Extended by

- [`PushCallParams`](#pushcallparams)
- [`PushCallRecordParams`](#pushcallrecordparams)
- [`PushSmsParams`](#pushsmsparams)

#### Properties

##### retries?

> `optional` **retries?**: `number`

Extra attempts after the first request. Default `0`.

##### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Delay between attempts. The protocol asks for 10 seconds.

***

### PushSmsParams

#### Extends

- [`PushRetryOptions`](#pushretryoptions)

#### Properties

##### phone

> **phone**: `number`

##### phoneFrom

> **phoneFrom**: `string`

##### retries?

> `optional` **retries?**: `number`

Extra attempts after the first request. Default `0`.

###### Inherited from

[`PushRetryOptions`](#pushretryoptions).[`retries`](#retries-2)

##### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Delay between attempts. The protocol asks for 10 seconds.

###### Inherited from

[`PushRetryOptions`](#pushretryoptions).[`retryDelayMs`](#retrydelayms-2)

##### smsId

> **smsId**: `number`

##### text

> **text**: `string`

***

### ReceivedCode

#### Properties

##### code

> **code**: `string`

##### status

> **status**: `"STATUS_OK"`

***

### ServiceInfo

#### Properties

##### code

> **code**: `string`

##### name

> **name**: `string`

***

### VerificationMessage

#### Properties

##### code?

> `optional` **code?**: `string`

##### dateTime?

> `optional` **dateTime?**: `string`

##### from?

> `optional` **from?**: `string`

##### parsingCount?

> `optional` **parsingCount?**: `number`

##### text?

> `optional` **text?**: `string`

##### url?

> `optional` **url?**: `string`

***

### WaitForCodeOptions

#### Properties

##### intervalMs?

> `optional` **intervalMs?**: `number`

##### signal?

> `optional` **signal?**: `AbortSignal`

##### timeoutMs?

> `optional` **timeoutMs?**: `number`

***

### WalletParams

#### Properties

##### coin?

> `optional` **coin?**: `string`

Example from the docs: `usdt`.

##### network?

> `optional` **network?**: `string`

Example from the docs: `tron`.

## Type Aliases

### ActivationActionValue

> **ActivationActionValue** = *typeof* [`ActivationAction`](#activationaction)\[keyof *typeof* [`ActivationAction`](#activationaction)\]

***

### PricesByCountry

> **PricesByCountry** = `Record`\<`string`, `Record`\<`string`, \{ `cost`: `number`; `count`: `number`; \}\>\>

***

### PricesV2

> **PricesV2** = `Record`\<`string`, `Record`\<`string`, `Record`\<`string`, `number`\>\>\>

Price bucket map from `getPricesV2`: price string -> available count.

***

### PricesV3

> **PricesV3** = `Record`\<`string`, `Record`\<`string`, [`PriceV3Offer`](#pricev3offer)\>\>

***

### SetStatusResult

> **SetStatusResult** = `"ACCESS_READY"` \| `"ACCESS_RETRY_GET"` \| `"ACCESS_ACTIVATION"` \| `"ACCESS_CANCEL"`

## Variables

### ActivationAction

> `const` **ActivationAction**: `object`

Status passed to `setStatus`. Both `-1` and `8` cancel an activation.

#### Type Declaration

##### Cancel

> `readonly` **Cancel**: `8` = `8`

Cancel the activation.

##### CancelAlt

> `readonly` **CancelAlt**: `-1` = `-1`

Alternate cancel code documented alongside `8`.

##### Complete

> `readonly` **Complete**: `6` = `6`

Finish the activation.

##### Ready

> `readonly` **Ready**: `1` = `1`

Inform the service that an SMS was sent to the number.

##### Retry

> `readonly` **Retry**: `3` = `3`

Wait for another code on the same number.

## Functions

### flattenPrices()

> **flattenPrices**(`data`): [`PriceQuote`](#pricequote)[]

Flatten a `getPrices` table into rows. Non-numeric cost or count is skipped.

#### Parameters

##### data

[`PricesByCountry`](#pricesbycountry)

#### Returns

[`PriceQuote`](#pricequote)[]

#### Example

```ts
const quotes = flattenPrices({ "16": { tg: { cost: 0.4, count: 20 } } });
```
