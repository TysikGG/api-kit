[**stealthex-client**](../README.md)

***

[stealthex-client](../README.md) / StealthEX

# Class: StealthEX

Client for interacting with the StealthEX cryptocurrency exchange API.

## Constructors

### Constructor

> **new StealthEX**(`options?`): `StealthEX`

Creates an instance of the StealthEX client.

#### Parameters

##### options?

[`StealthEXClientOptions`](../interfaces/StealthEXClientOptions.md) = `{}`

#### Returns

`StealthEX`

#### Example

```typescript
import { StealthEX } from "stealthex-client";

const client = new StealthEX({ apiKey: "your-api-key" });
const currencies = await client.getCurrencies();
console.log(`Available currencies: ${currencies.length}`);
```

## Methods

### createExchange()

> **createExchange**(`params`): `Promise`\<[`ExchangeDetails`](../interfaces/ExchangeDetails.md)\>

Creates a cryptocurrency exchange order.

#### Parameters

##### params

[`CreateExchangeParams`](../interfaces/CreateExchangeParams.md)

#### Returns

`Promise`\<[`ExchangeDetails`](../interfaces/ExchangeDetails.md)\>

#### Example

```typescript
const order = await client.createExchange({
  currencyFrom: "btc",
  currencyTo: "eth",
  amountFrom: "0.1",
  addressTo: "0xReceiverEthereumAddress...",
});
console.log(`Deposit address: ${order.address_from}`);
```

***

### getCurrencies()

> **getCurrencies**(`params?`): `Promise`\<[`StealthEXCurrency`](../interfaces/StealthEXCurrency.md)[]\>

Retrieves all supported currencies and networks.

#### Parameters

##### params?

###### fixed?

`boolean`

#### Returns

`Promise`\<[`StealthEXCurrency`](../interfaces/StealthEXCurrency.md)[]\>

#### Example

```typescript
const currencies = await client.getCurrencies();
console.log(`Currencies: ${currencies.length}`);
```

***

### getCurrency()

> **getCurrency**(`symbol`): `Promise`\<[`StealthEXCurrency`](../interfaces/StealthEXCurrency.md)\>

Retrieves information for a single currency by symbol.

#### Parameters

##### symbol

`string`

#### Returns

`Promise`\<[`StealthEXCurrency`](../interfaces/StealthEXCurrency.md)\>

#### Example

```typescript
const btc = await client.getCurrency("btc");
console.log(`Currency: ${btc.name}`);
```

***

### getEstimate()

> **getEstimate**(`fromCurrency`, `toCurrency`, `amount`, `fixed?`): `Promise`\<[`EstimateResult`](../interfaces/EstimateResult.md)\>

Retrieves estimated return amount for an exchange pair.

#### Parameters

##### fromCurrency

`string`

##### toCurrency

`string`

##### amount

`string` \| `number`

##### fixed?

`boolean`

#### Returns

`Promise`\<[`EstimateResult`](../interfaces/EstimateResult.md)\>

#### Example

```typescript
const est = await client.getEstimate("btc", "eth", "0.1");
console.log(`Estimated ETH: ${est.estimated_amount}`);
```

***

### getExchange()

> **getExchange**(`id`): `Promise`\<[`ExchangeDetails`](../interfaces/ExchangeDetails.md)\>

Retrieves details and status of an exchange by ID.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`ExchangeDetails`](../interfaces/ExchangeDetails.md)\>

#### Example

```typescript
const order = await client.getExchange("exchange-id");
console.log(`Status: ${order.status}`);
```

***

### getExchanges()

> **getExchanges**(`limit?`): `Promise`\<[`ExchangeDetails`](../interfaces/ExchangeDetails.md)[]\>

Lists past transactions.

#### Parameters

##### limit?

`number`

#### Returns

`Promise`\<[`ExchangeDetails`](../interfaces/ExchangeDetails.md)[]\>

#### Example

```typescript
const txs = await client.getExchanges(10);
console.log(`Transactions found: ${txs.length}`);
```

***

### getMinAmount()

> **getMinAmount**(`fromCurrency`, `toCurrency`, `fixed?`): `Promise`\<[`MinAmountResult`](../interfaces/MinAmountResult.md)\>

Retrieves minimal deposit amount required for a pair.

#### Parameters

##### fromCurrency

`string`

##### toCurrency

`string`

##### fixed?

`boolean`

#### Returns

`Promise`\<[`MinAmountResult`](../interfaces/MinAmountResult.md)\>

#### Example

```typescript
const min = await client.getMinAmount("btc", "eth");
console.log(`Minimal amount: ${min.min_amount}`);
```

***

### getPairs()

> **getPairs**(`symbol?`): `Promise`\<`string`[]\>

Retrieves available pairs for exchange.

#### Parameters

##### symbol?

`string`

#### Returns

`Promise`\<`string`[]\>

#### Example

```typescript
const pairs = await client.getPairs("btc");
console.log(`Pairs for BTC: ${pairs.length}`);
```

***

### getRange()

> **getRange**(`fromCurrency`, `toCurrency`, `fixed?`): `Promise`\<[`RangeResult`](../interfaces/RangeResult.md)\>

Retrieves minimum and maximum deposit range for a pair.

#### Parameters

##### fromCurrency

`string`

##### toCurrency

`string`

##### fixed?

`boolean`

#### Returns

`Promise`\<[`RangeResult`](../interfaces/RangeResult.md)\>

#### Example

```typescript
const range = await client.getRange("btc", "eth");
console.log(`Min: ${range.min_amount}`);
```
