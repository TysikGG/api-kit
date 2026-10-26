[**swapzone-client**](../README.md)

***

[swapzone-client](../README.md) / Swapzone

# Class: Swapzone

Client for interacting with the Swapzone cryptocurrency exchange API.

## Constructors

### Constructor

> **new Swapzone**(`options?`): `Swapzone`

Creates an instance of the Swapzone client.

#### Parameters

##### options?

[`SwapzoneClientOptions`](../interfaces/SwapzoneClientOptions.md) = `{}`

#### Returns

`Swapzone`

#### Example

```typescript
import { Swapzone } from "swapzone-client";

const client = new Swapzone({ apiKey: "your-api-key" });
const currencies = await client.getCurrencies();
console.log(`Supported currencies: ${currencies.length}`);
```

## Methods

### createTransaction()

> **createTransaction**(`params`): `Promise`\<[`TransactionResult`](../interfaces/TransactionResult.md)\>

Creates an exchange transaction order with a selected provider.

#### Parameters

##### params

[`CreateTransactionParams`](../interfaces/CreateTransactionParams.md)

#### Returns

`Promise`\<[`TransactionResult`](../interfaces/TransactionResult.md)\>

#### Example

```typescript
const order = await client.createTransaction({
  from: "btc",
  to: "eth",
  amountDeposit: "0.1",
  addressReceive: "0xReceiverAddress...",
  quotaId: rate.quotaId,
});
console.log(`Deposit address: ${order.addressDeposit}`);
```

***

### getCurrencies()

> **getCurrencies**(): `Promise`\<[`SupportedCurrency`](../interfaces/SupportedCurrency.md)[]\>

Retrieves all supported currencies across instant exchange adapters.

#### Returns

`Promise`\<[`SupportedCurrency`](../interfaces/SupportedCurrency.md)[]\>

#### Example

```typescript
const currencies = await client.getCurrencies();
console.log(`Available currencies: ${currencies.length}`);
```

***

### getDEXBlockchains()

> **getDEXBlockchains**(): `Promise`\<[`DEXBlockchain`](../interfaces/DEXBlockchain.md)[]\>

Retrieves supported blockchains for decentralized (DEX) swaps.

#### Returns

`Promise`\<[`DEXBlockchain`](../interfaces/DEXBlockchain.md)[]\>

#### Example

```typescript
const chains = await client.getDEXBlockchains();
console.log(`DEX blockchains: ${chains.length}`);
```

***

### getDEXQuote()

> **getDEXQuote**(`params`): `Promise`\<`unknown`\>

Gets a cross-chain or on-chain DEX quote.

#### Parameters

##### params

[`DEXQuoteParams`](../interfaces/DEXQuoteParams.md)

#### Returns

`Promise`\<`unknown`\>

#### Example

```typescript
const quote = await client.getDEXQuote({
  fromChainId: 1,
  toChainId: 56,
  fromTokenAddress: "0x...",
  toTokenAddress: "0x...",
  fromAmount: "0.05",
});
```

***

### getDEXSwapStatus()

> **getDEXSwapStatus**(`swapId`, `fromHash?`): `Promise`\<`unknown`\>

Gets the status of a DEX swap.

#### Parameters

##### swapId

`string`

##### fromHash?

`string`

#### Returns

`Promise`\<`unknown`\>

#### Example

```typescript
const status = await client.getDEXSwapStatus("swap-id");
```

***

### getDEXTokens()

> **getDEXTokens**(): `Promise`\<`unknown`[]\>

Retrieves supported tokens for DEX swaps.

#### Returns

`Promise`\<`unknown`[]\>

#### Example

```typescript
const tokens = await client.getDEXTokens();
console.log(`DEX tokens: ${tokens.length}`);
```

***

### getMarkets()

> **getMarkets**(`rateType?`): `Promise`\<`unknown`[]\>

Retrieves bulk rate markets for instant exchange pairs.

#### Parameters

##### rateType?

`"all"` \| `"fixed"` \| `"floating"`

#### Returns

`Promise`\<`unknown`[]\>

#### Example

```typescript
const markets = await client.getMarkets("fixed");
console.log(`Markets count: ${markets.length}`);
```

***

### getRate()

> **getRate**(`params`): `Promise`\<[`RateOffer`](../interfaces/RateOffer.md)\>

Retrieves the best or all rate offers for exchanging between two assets.

#### Parameters

##### params

[`GetRateParams`](../interfaces/GetRateParams.md)

#### Returns

`Promise`\<[`RateOffer`](../interfaces/RateOffer.md)\>

#### Example

```typescript
const rate = await client.getRate({
  from: "btc",
  to: "eth",
  amount: "0.1",
});
console.log(`Estimated ETH: ${rate.amountTo} (via ${rate.adapter})`);
```

***

### getTransaction()

> **getTransaction**(`id`): `Promise`\<[`TransactionStatus`](../interfaces/TransactionStatus.md)\>

Retrieves the current status of an exchange transaction.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`TransactionStatus`](../interfaces/TransactionStatus.md)\>

#### Example

```typescript
const status = await client.getTransaction("transaction-id");
console.log(`Transaction status: ${status.status}`);
```

***

### validateAddress()

> **validateAddress**(`params`): `Promise`\<[`ValidateAddressResult`](../interfaces/ValidateAddressResult.md)\>

Validates a cryptocurrency recipient address.

#### Parameters

##### params

[`ValidateAddressParams`](../interfaces/ValidateAddressParams.md)

#### Returns

`Promise`\<[`ValidateAddressResult`](../interfaces/ValidateAddressResult.md)\>

#### Example

```typescript
const res = await client.validateAddress({
  currency: "eth",
  network: "ETH",
  address: "0x57f31ad4b64095347F87eDB1675566DAfF5EC886",
});
console.log(`Address valid: ${res.result}`);
```
