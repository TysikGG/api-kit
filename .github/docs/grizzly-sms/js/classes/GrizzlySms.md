[**grizzly-sms**](../README.md)

***

[grizzly-sms](../README.md) / GrizzlySms

# Class: GrizzlySms

Client for the Grizzly SMS activation API (`handler_api.php`).

## Example

```ts
const sms = new GrizzlySms(process.env.GRIZZLY_API_KEY!);
const balance = await sms.getBalance();
```

## Constructors

### Constructor

> **new GrizzlySms**(`options`): `GrizzlySms`

#### Parameters

##### options

`string` \| [`GrizzlySmsOptions`](../interfaces/GrizzlySmsOptions.md)

API key string, or settings from the Grizzly profile.

#### Returns

`GrizzlySms`

#### Example

```ts
const sms = new GrizzlySms({ apiKey: process.env.GRIZZLY_API_KEY! });
```

## Methods

### call()

> **call**\<`T`\>(`action`, `params?`): `Promise`\<`T`\>

Low-level `handler_api.php` call. Use it for actions added after this
client was published. Known error strings are still thrown.

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### action

`string`

##### params?

`Record`\<`string`, `string` \| `number` \| `undefined`\> = `{}`

#### Returns

`Promise`\<`T`\>

#### Example

```ts
const raw = await sms.call("getBalance");
```

***

### cancel()

> **cancel**(`activationId`, `status?`): `Promise`\<[`SetStatusResult`](../type-aliases/SetStatusResult.md)\>

Cancel the activation. Pass `-1` to use the alternate cancel code from
the docs; the default is `8`.

#### Parameters

##### activationId

`string` \| `number`

##### status?

`-1` \| `8` = `8`

#### Returns

`Promise`\<[`SetStatusResult`](../type-aliases/SetStatusResult.md)\>

#### Example

```ts
await sms.cancel(activationId);
```

***

### complete()

> **complete**(`activationId`): `Promise`\<[`SetStatusResult`](../type-aliases/SetStatusResult.md)\>

Finish the activation (`status=6`).

#### Parameters

##### activationId

`string` \| `number`

#### Returns

`Promise`\<[`SetStatusResult`](../type-aliases/SetStatusResult.md)\>

#### Example

```ts
await sms.complete(activationId);
```

***

### findPrices()

> **findPrices**(`params?`): `Promise`\<[`PriceQuote`](../interfaces/PriceQuote.md)[]\>

`getPrices` flattened and sorted by cost. One request replaces scanning
every country code by hand.

#### Parameters

##### params?

[`FindPricesParams`](../interfaces/FindPricesParams.md) = `{}`

#### Returns

`Promise`\<[`PriceQuote`](../interfaces/PriceQuote.md)[]\>

#### Example

```ts
const quotes = await sms.findPrices({ service: "tg", minCount: 10, maxPrice: 1 });
```

***

### getActiveActivations()

> **getActiveActivations**(): `Promise`\<[`ActiveActivation`](../interfaces/ActiveActivation.md)[]\>

Activations that are still open on the account.

#### Returns

`Promise`\<[`ActiveActivation`](../interfaces/ActiveActivation.md)[]\>

#### Example

```ts
const active = await sms.getActiveActivations();
```

***

### getBalance()

> **getBalance**(): `Promise`\<`number`\>

Account balance in USD.

#### Returns

`Promise`\<`number`\>

#### Example

```ts
const balance = await sms.getBalance();
```

***

### getCountries()

> **getCountries**(): `Promise`\<[`CountryInfo`](../interfaces/CountryInfo.md)[]\>

Country catalog.

#### Returns

`Promise`\<[`CountryInfo`](../interfaces/CountryInfo.md)[]\>

#### Example

```ts
const countries = await sms.getCountries();
```

***

### getNumber()

> **getNumber**(`params`): `Promise`\<[`OrderedNumber`](../interfaces/OrderedNumber.md)\>

Order a number. `country` may be `"any"` or omitted.

#### Parameters

##### params

[`GetNumberParams`](../interfaces/GetNumberParams.md)

#### Returns

`Promise`\<[`OrderedNumber`](../interfaces/OrderedNumber.md)\>

#### Example

```ts
const ordered = await sms.getNumber({ service: "tg", country: "any" });
```

***

### getNumberV2()

> **getNumberV2**(`params`): `Promise`\<[`OrderedNumberV2`](../interfaces/OrderedNumberV2.md)\>

Order a number and return price, currency, and activation timestamps.

#### Parameters

##### params

[`GetNumberParams`](../interfaces/GetNumberParams.md)

#### Returns

`Promise`\<[`OrderedNumberV2`](../interfaces/OrderedNumberV2.md)\>

#### Example

```ts
const ordered = await sms.getNumberV2({ service: "tg", country: 12 });
```

***

### getPrices()

> **getPrices**(`params?`): `Promise`\<[`PricesByCountry`](../type-aliases/PricesByCountry.md)\>

Prices grouped by country, then service.

#### Parameters

##### params?

###### country?

`string` \| `number`

###### service?

`string`

#### Returns

`Promise`\<[`PricesByCountry`](../type-aliases/PricesByCountry.md)\>

#### Example

```ts
const prices = await sms.getPrices({ service: "tg" });
```

***

### getPricesV2()

> **getPricesV2**(`params?`): `Promise`\<[`PricesV2`](../type-aliases/PricesV2.md)\>

Price buckets: country, service, then price string to available count.

#### Parameters

##### params?

###### country?

`string` \| `number`

###### service?

`string`

#### Returns

`Promise`\<[`PricesV2`](../type-aliases/PricesV2.md)\>

#### Example

```ts
const prices = await sms.getPricesV2({ service: "tg", country: 0 });
```

***

### getPricesV3()

> **getPricesV3**(`params?`): `Promise`\<[`PricesV3`](../type-aliases/PricesV3.md)\>

Prices with per-provider offers.

#### Parameters

##### params?

###### country?

`string` \| `number`

###### service?

`string`

#### Returns

`Promise`\<[`PricesV3`](../type-aliases/PricesV3.md)\>

#### Example

```ts
const prices = await sms.getPricesV3({ service: "tg", country: 0 });
```

***

### getServices()

> **getServices**(): `Promise`\<[`ServiceInfo`](../interfaces/ServiceInfo.md)[]\>

Service catalog (`getServicesList`).

#### Returns

`Promise`\<[`ServiceInfo`](../interfaces/ServiceInfo.md)[]\>

#### Example

```ts
const services = await sms.getServices();
```

***

### getStatus()

> **getStatus**(`activationId`): `Promise`\<[`ActivationStatus`](../interfaces/ActivationStatus.md)\>

Current activation status. `STATUS_OK` includes the SMS code.

#### Parameters

##### activationId

`string` \| `number`

#### Returns

`Promise`\<[`ActivationStatus`](../interfaces/ActivationStatus.md)\>

#### Example

```ts
const status = await sms.getStatus(activationId);
```

***

### getStatusV2()

> **getStatusV2**(`activationId`): `Promise`\<[`ActivationStatusV2`](../interfaces/ActivationStatusV2.md)\>

Activation status as JSON, including SMS and call payloads.

#### Parameters

##### activationId

`string` \| `number`

#### Returns

`Promise`\<[`ActivationStatusV2`](../interfaces/ActivationStatusV2.md)\>

#### Example

```ts
const status = await sms.getStatusV2(activationId);
```

***

### getWallet()

> **getWallet**(`params?`): `Promise`\<[`CryptoWallet`](../interfaces/CryptoWallet.md)\>

Static deposit address. The documented sample is `coin=usdt` and
`network=tron`. Amounts from 50 USD are credited automatically.

#### Parameters

##### params?

[`WalletParams`](../interfaces/WalletParams.md) = `{}`

#### Returns

`Promise`\<[`CryptoWallet`](../interfaces/CryptoWallet.md)\>

#### Example

```ts
const wallet = await sms.getWallet({ coin: "usdt", network: "tron" });
```

***

### ready()

> **ready**(`activationId`): `Promise`\<[`SetStatusResult`](../type-aliases/SetStatusResult.md)\>

Tell the service that the SMS was sent to the number (`status=1`).

#### Parameters

##### activationId

`string` \| `number`

#### Returns

`Promise`\<[`SetStatusResult`](../type-aliases/SetStatusResult.md)\>

#### Example

```ts
await sms.ready(activationId);
```

***

### requestAnotherCode()

> **requestAnotherCode**(`activationId`): `Promise`\<[`SetStatusResult`](../type-aliases/SetStatusResult.md)\>

Ask for another code on the same number (`status=3`).

#### Parameters

##### activationId

`string` \| `number`

#### Returns

`Promise`\<[`SetStatusResult`](../type-aliases/SetStatusResult.md)\>

#### Example

```ts
await sms.requestAnotherCode(activationId);
```

***

### setStatus()

> **setStatus**(`activationId`, `status`): `Promise`\<[`SetStatusResult`](../type-aliases/SetStatusResult.md)\>

Change an activation status. Prefer [ready](#ready), [complete](#complete), and
[cancel](#cancel) for the documented codes.

#### Parameters

##### activationId

`string` \| `number`

##### status

`number`

#### Returns

`Promise`\<[`SetStatusResult`](../type-aliases/SetStatusResult.md)\>

#### Example

```ts
await sms.setStatus(activationId, ActivationAction.Complete);
```

***

### waitForCode()

> **waitForCode**(`activationId`, `options?`): `Promise`\<[`ReceivedCode`](../interfaces/ReceivedCode.md)\>

Poll until a code arrives, the activation is cancelled, or the timeout
elapses. `STATUS_WAIT_RESEND` keeps waiting: call `complete()` when your
app has requested the SMS again.

#### Parameters

##### activationId

`string` \| `number`

##### options?

[`WaitForCodeOptions`](../interfaces/WaitForCodeOptions.md) = `{}`

#### Returns

`Promise`\<[`ReceivedCode`](../interfaces/ReceivedCode.md)\>

#### Example

```ts
const received = await sms.waitForCode(activationId, { timeoutMs: 120_000 });
```
