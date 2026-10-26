[**simpleswap-client**](../README.md)

***

[simpleswap-client](../README.md) / SimpleSwap

# Class: SimpleSwap

Client for interacting with the SimpleSwap cryptocurrency exchange API (v3).

## Constructors

### Constructor

> **new SimpleSwap**(`options?`): `SimpleSwap`

Creates an instance of the SimpleSwap client.

#### Parameters

##### options?

[`SimpleSwapClientOptions`](../interfaces/SimpleSwapClientOptions.md) = `{}`

#### Returns

`SimpleSwap`

#### Example

```typescript
import { SimpleSwap } from "simpleswap-client";

const client = new SimpleSwap({ apiKey: "your-api-key" });
const currencies = await client.getCurrencies();
console.log(`Available currencies: ${currencies.length}`);
```

## Methods

### checkExchange()

> **checkExchange**(`params`): `Promise`\<[`CheckExchangeResult`](../interfaces/CheckExchangeResult.md)\>

Checks if an exchange can be created with the specified parameters.

#### Parameters

##### params

[`CheckExchangeParams`](../interfaces/CheckExchangeParams.md)

#### Returns

`Promise`\<[`CheckExchangeResult`](../interfaces/CheckExchangeResult.md)\>

#### Example

```typescript
const check = await client.checkExchange({
  tickerFrom: "btc",
  tickerTo: "eth",
  networkFrom: "btc",
  networkTo: "eth",
  amount: "0.1",
});
console.log(`Can create: ${check.canCreate}`);
```

***

### createExchange()

> **createExchange**(`params`): `Promise`\<[`ExchangeOrder`](../interfaces/ExchangeOrder.md)\>

Creates a cryptocurrency exchange order.

#### Parameters

##### params

[`CreateExchangeParams`](../interfaces/CreateExchangeParams.md)

#### Returns

`Promise`\<[`ExchangeOrder`](../interfaces/ExchangeOrder.md)\>

#### Example

```typescript
const order = await client.createExchange({
  tickerFrom: "btc",
  tickerTo: "eth",
  networkFrom: "btc",
  networkTo: "eth",
  amount: "0.1",
  addressTo: "0xReceiverEthereumAddress...",
});
console.log(`Deposit address: ${order.addressFrom}`);
```

***

### getCurrencies()

> **getCurrencies**(): `Promise`\<[`SimpleSwapCurrency`](../interfaces/SimpleSwapCurrency.md)[]\>

Retrieves all supported currencies and networks.

#### Returns

`Promise`\<[`SimpleSwapCurrency`](../interfaces/SimpleSwapCurrency.md)[]\>

#### Example

```typescript
const currencies = await client.getCurrencies();
console.log(`Currencies count: ${currencies.length}`);
```

***

### getCurrency()

> **getCurrency**(`ticker`, `network`): `Promise`\<[`SimpleSwapCurrency`](../interfaces/SimpleSwapCurrency.md)\>

Retrieves details for a specific currency on a given network.

#### Parameters

##### ticker

`string`

##### network

`string`

#### Returns

`Promise`\<[`SimpleSwapCurrency`](../interfaces/SimpleSwapCurrency.md)\>

#### Example

```typescript
const btc = await client.getCurrency("btc", "btc");
console.log(`Currency: ${btc.name}`);
```

***

### getEstimate()

> **getEstimate**(`params`): `Promise`\<[`EstimateResult`](../interfaces/EstimateResult.md)\>

Retrieves estimated receiving amount for an exchange.

#### Parameters

##### params

[`GetEstimateParams`](../interfaces/GetEstimateParams.md)

#### Returns

`Promise`\<[`EstimateResult`](../interfaces/EstimateResult.md)\>

#### Example

```typescript
const estimate = await client.getEstimate({
  tickerFrom: "btc",
  tickerTo: "eth",
  networkFrom: "btc",
  networkTo: "eth",
  amount: "0.1",
});
console.log(`Estimated ETH: ${estimate.estimatedAmount}`);
```

***

### getExchange()

> **getExchange**(`id`): `Promise`\<[`ExchangeOrder`](../interfaces/ExchangeOrder.md)\>

Retrieves details and status of an exchange by ID.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`ExchangeOrder`](../interfaces/ExchangeOrder.md)\>

#### Example

```typescript
const order = await client.getExchange("exchange-id");
console.log(`Status: ${order.status}`);
```

***

### getExchanges()

> **getExchanges**(`params?`): `Promise`\<[`ExchangeOrder`](../interfaces/ExchangeOrder.md)[]\>

Lists previous exchanges created by this account.

#### Parameters

##### params?

[`GetExchangesParams`](../interfaces/GetExchangesParams.md)

#### Returns

`Promise`\<[`ExchangeOrder`](../interfaces/ExchangeOrder.md)[]\>

#### Example

```typescript
const exchanges = await client.getExchanges({ limit: 10 });
console.log(`Orders found: ${exchanges.length}`);
```

***

### getRanges()

> **getRanges**(`params`): `Promise`\<[`RangesResult`](../interfaces/RangesResult.md)\>

Retrieves deposit ranges (minimum and maximum amounts) for a pair.

#### Parameters

##### params

[`GetRangesParams`](../interfaces/GetRangesParams.md)

#### Returns

`Promise`\<[`RangesResult`](../interfaces/RangesResult.md)\>

#### Example

```typescript
const ranges = await client.getRanges({
  tickerFrom: "btc",
  tickerTo: "eth",
  networkFrom: "btc",
  networkTo: "eth",
});
console.log(`Min: ${ranges.min}, Max: ${ranges.max}`);
```
