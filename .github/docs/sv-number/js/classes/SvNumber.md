[**sv-number**](../README.md)

***

[sv-number](../README.md) / SvNumber

# Class: SvNumber

Client for the SV Number SMS verification API.

## Example

```ts
const client = new SvNumber({ apiKey: "your_api_key" });
const balance = await client.getBalance();
```

## Constructors

### Constructor

> **new SvNumber**(`options`): `SvNumber`

#### Parameters

##### options

`string` \| [`SvNumberOptions`](../interfaces/SvNumberOptions.md)

#### Returns

`SvNumber`

## Methods

### call()

> **call**\<`T`\>(`action`, `params?`): `Promise`\<`T`\>

Low-level call to `/stubs/handler_api`.
Automatically attaches `api_key`, `ref_key`, and `lang`.

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

***

### cancel()

> **cancel**(`activationId`): `Promise`\<`string`\>

Cancel the activation to refund balance (`status=8`).

#### Parameters

##### activationId

`string` \| `number`

#### Returns

`Promise`\<`string`\>

***

### complete()

> **complete**(`activationId`): `Promise`\<`string`\>

Confirm successful activation and release the number (`status=6`).

#### Parameters

##### activationId

`string` \| `number`

#### Returns

`Promise`\<`string`\>

***

### getBalance()

> **getBalance**(): `Promise`\<`number`\>

Get current account balance in USD.

#### Returns

`Promise`\<`number`\>

#### Example

```ts
const balance = await client.getBalance();
console.log(`Balance: $${balance}`);
```

***

### getNumber()

> **getNumber**(`params`): `Promise`\<[`OrderedNumber`](../interfaces/OrderedNumber.md)\>

Order a temporary virtual number.

#### Parameters

##### params

[`GetNumberParams`](../interfaces/GetNumberParams.md)

#### Returns

`Promise`\<[`OrderedNumber`](../interfaces/OrderedNumber.md)\>

#### Example

```ts
const order = await client.getNumber({ service: "wa", country: 0 });
console.log(`Number: ${order.phoneNumber}, ID: ${order.activationId}`);
```

***

### getNumberV2()

> **getNumberV2**(`params`): `Promise`\<[`OrderedNumberV2`](../interfaces/OrderedNumberV2.md)\>

Order a virtual number returning JSON details.

#### Parameters

##### params

[`GetNumberParams`](../interfaces/GetNumberParams.md)

#### Returns

`Promise`\<[`OrderedNumberV2`](../interfaces/OrderedNumberV2.md)\>

#### Example

```ts
const order = await client.getNumberV2({ service: "tg", country: 0 });
```

***

### getPrices()

> **getPrices**(`country?`): `Promise`\<[`PricesByCountry`](../type-aliases/PricesByCountry.md)\>

Get price table grouped by country and service.

#### Parameters

##### country?

`string` \| `number`

#### Returns

`Promise`\<[`PricesByCountry`](../type-aliases/PricesByCountry.md)\>

#### Example

```ts
const prices = await client.getPrices(0);
```

***

### getServicesAndCost()

> **getServicesAndCost**(`params?`): `Promise`\<[`ServiceCostItem`](../interfaces/ServiceCostItem.md)[]\>

Get list of services with prices and quantity for a country.

#### Parameters

##### params?

###### country?

`string` \| `number`

###### operator?

`string`

###### service?

`string`

#### Returns

`Promise`\<[`ServiceCostItem`](../interfaces/ServiceCostItem.md)[]\>

#### Example

```ts
const services = await client.getServicesAndCost({ country: 0 });
```

***

### getStatus()

> **getStatus**(`activationId`): `Promise`\<[`ActivationStatus`](../interfaces/ActivationStatus.md)\>

Query the status of an active activation.

#### Parameters

##### activationId

`string` \| `number`

#### Returns

`Promise`\<[`ActivationStatus`](../interfaces/ActivationStatus.md)\>

#### Example

```ts
const status = await client.getStatus(activationId);
if (status.status === "STATUS_OK") {
  console.log("SMS code:", status.code);
}
```

***

### ready()

> **ready**(`activationId`): `Promise`\<`string`\>

Notify that the SMS has been sent to the number (`status=1`).

#### Parameters

##### activationId

`string` \| `number`

#### Returns

`Promise`\<`string`\>

***

### setStatus()

> **setStatus**(`activationId`, `status`): `Promise`\<`string`\>

Update activation status (1 = ready, 3 = request retry, 6 = complete, 8 = cancel).

#### Parameters

##### activationId

`string` \| `number`

##### status

`number`

#### Returns

`Promise`\<`string`\>

***

### waitForCode()

> **waitForCode**(`activationId`, `options?`): `Promise`\<[`ReceivedCode`](../interfaces/ReceivedCode.md)\>

Poll for an incoming SMS verification code until it arrives or times out.

#### Parameters

##### activationId

`string` \| `number`

##### options?

[`WaitForCodeOptions`](../interfaces/WaitForCodeOptions.md) = `{}`

#### Returns

`Promise`\<[`ReceivedCode`](../interfaces/ReceivedCode.md)\>

#### Example

```ts
const { code } = await client.waitForCode(order.activationId, { timeoutMs: 120_000 });
console.log("Received code:", code);
```
