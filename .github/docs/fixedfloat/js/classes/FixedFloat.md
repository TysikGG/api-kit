[**fixedfloat-client**](../README.md)

***

[fixedfloat-client](../README.md) / FixedFloat

# Class: FixedFloat

Defined in: src/client.ts:22

FixedFloat API v2 client for cryptocurrency swaps and rates.

## Constructors

### Constructor

> **new FixedFloat**(`options?`): `FixedFloat`

Defined in: src/client.ts:43

Creates a new FixedFloat API client.

#### Parameters

##### options?

[`FixedFloatOptions`](../interfaces/FixedFloatOptions.md) = `{}`

Configuration options for the client.

#### Returns

`FixedFloat`

#### Example

```typescript
import { FixedFloat } from "fixedfloat-client";

const ff = new FixedFloat({
  apiKey: "your-api-key",
  apiSecret: "your-api-secret",
});
const currencies = await ff.getCurrencies();
```

## Methods

### createOrder()

> **createOrder**(`params`): `Promise`\<[`Order`](../interfaces/Order.md)\>

Defined in: src/client.ts:175

Creates a new cryptocurrency exchange order.

#### Parameters

##### params

[`CreateOrderParams`](../interfaces/CreateOrderParams.md)

Parameters required to create the order.

#### Returns

`Promise`\<[`Order`](../interfaces/Order.md)\>

The created order details including ID and security token.

#### Example

```typescript
const order = await ff.createOrder({
  fromCcy: "BTC",
  toCcy: "ETH",
  amount: 0.1,
  direction: "from",
  type: "float",
  toAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
});
console.log(`Order created: ${order.id}`);
```

***

### getCurrencies()

> **getCurrencies**(): `Promise`\<[`Currency`](../interfaces/Currency.md)[]\>

Defined in: src/client.ts:117

Retrieves the list of available cryptocurrencies and networks.

#### Returns

`Promise`\<[`Currency`](../interfaces/Currency.md)[]\>

A promise resolving to an array of supported currencies.

#### Example

```typescript
const currencies = await ff.getCurrencies();
console.log(`Found ${currencies.length} currencies`);
```

***

### getOrder()

> **getOrder**(`id`, `token`): `Promise`\<[`Order`](../interfaces/Order.md)\>

Defined in: src/client.ts:215

Fetches the current status and information of an order.

#### Parameters

##### id

`string`

Order ID.

##### token

`string`

Security token returned when creating the order.

#### Returns

`Promise`\<[`Order`](../interfaces/Order.md)\>

Current order status and transaction info.

#### Example

```typescript
const order = await ff.getOrder("ORDER123", "TOKEN_ABC");
console.log(`Order status: ${order.status}`);
```

***

### getPrice()

> **getPrice**(`params`): `Promise`\<[`PriceResult`](../interfaces/PriceResult.md)\>

Defined in: src/client.ts:139

Calculates exchange price estimate for a currency pair.

#### Parameters

##### params

[`GetPriceParams`](../interfaces/GetPriceParams.md)

Parameters for the price calculation.

#### Returns

`Promise`\<[`PriceResult`](../interfaces/PriceResult.md)\>

Exchange price rates and limits.

#### Example

```typescript
const price = await ff.getPrice({
  fromCcy: "BTC",
  toCcy: "ETH",
  amount: 0.1,
  direction: "from",
  type: "float",
});
console.log(`To amount: ${price.to.amount}`);
```

***

### getQr()

> **getQr**(`id`, `token`): `Promise`\<[`QrResult`](../interfaces/QrResult.md)\>

Defined in: src/client.ts:269

Retrieves a QR code for the deposit address of an order.

#### Parameters

##### id

`string`

Order ID.

##### token

`string`

Order security token.

#### Returns

`Promise`\<[`QrResult`](../interfaces/QrResult.md)\>

QR code image data or URL.

#### Example

```typescript
const qr = await ff.getQr("ORDER123", "TOKEN_ABC");
console.log(`QR: ${qr.src}`);
```

***

### setEmail()

> **setEmail**(`id`, `token`, `email`): `Promise`\<`unknown`\>

Defined in: src/client.ts:252

Sets notification email address on an active order.

#### Parameters

##### id

`string`

Order ID.

##### token

`string`

Order security token.

##### email

`string`

Email address to receive notifications.

#### Returns

`Promise`\<`unknown`\>

API result.

#### Example

```typescript
await ff.setEmail("ORDER123", "TOKEN_ABC", "user@example.com");
```

***

### setEmergency()

> **setEmergency**(`params`): `Promise`\<`unknown`\>

Defined in: src/client.ts:235

Sets an emergency action choice (EXCHANGE or REFUND) on an active order.

#### Parameters

##### params

[`SetEmergencyParams`](../interfaces/SetEmergencyParams.md)

Emergency parameters including order ID, security token, and choice.

#### Returns

`Promise`\<`unknown`\>

API result.

#### Example

```typescript
await ff.setEmergency({
  id: "ORDER123",
  token: "TOKEN_ABC",
  choice: "REFUND",
  address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
});
```
