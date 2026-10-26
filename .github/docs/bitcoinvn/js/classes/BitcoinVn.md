[**bitcoinvn**](../README.md)

***

[bitcoinvn](../README.md) / BitcoinVn

# Class: BitcoinVn

Client for the BitcoinVN exchange API.

Public reads, quotes, and order creation do not need a key. Send `X-API-KEY`
by passing `apiKey` when you call an account endpoint. The key is created on
the API keys page at bitcoinvn.io. This client does not manage keys.

## Example

```ts
const client = new BitcoinVn();
const ticker = await client.getTicker("BTC", "USDT");
```

## Constructors

### Constructor

> **new BitcoinVn**(`options?`): `BitcoinVn`

#### Parameters

##### options?

`string` \| [`BitcoinVnOptions`](../interfaces/BitcoinVnOptions.md) = `{}`

API key string, or settings. A blank key is treated as no key.

#### Returns

`BitcoinVn`

#### Example

```ts
const client = new BitcoinVn({ apiKey: process.env.BITCOINVN_API_KEY });
```

## Methods

### createOrder()

> **createOrder**(`params`): `Promise`\<[`Order`](../interfaces/Order.md)\>

`POST /api/orders`. Creates a production order. Funding it, or spending an
internal balance, moves real funds.

Pass a quote id, or `depositMethod` and `settleMethod` for a variable-amount
order. Amountless internal-balance quotes also accept `depositAmount` or
`settleAmount` with the quote id. The client always sends
`referrer` in the JSON body and ignores any other value.

#### Parameters

##### params

[`CreateOrderParams`](../type-aliases/CreateOrderParams.md)

#### Returns

`Promise`\<[`Order`](../interfaces/Order.md)\>

#### Example

```ts
const order = await client.createOrder({
  quote: "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
  settleData: { address: "4example" },
});
```

***

### createQuote()

> **createQuote**(`params`): `Promise`\<[`Quote`](../interfaces/Quote.md)\>

`POST /api/quotes`. Send `depositAmount`, `settleAmount`, or neither, but not both.
A quote does not move funds. It creates a production quote. Asset-conversion quotes
last 15 minutes; same-asset quotes last one day.

#### Parameters

##### params

[`CreateQuoteParams`](../interfaces/CreateQuoteParams.md)

#### Returns

`Promise`\<[`Quote`](../interfaces/Quote.md)\>

#### Example

```ts
const quote = await client.createQuote({
  depositMethod: "btc",
  settleMethod: "xmr",
  depositAmount: 0.01,
});
```

***

### getBalances()

> **getBalances**(): `Promise`\<[`Balances`](../type-aliases/Balances.md)\>

`GET /api/balances`. Requires `X-API-KEY`.
Values are available amounts keyed by asset id.

#### Returns

`Promise`\<[`Balances`](../type-aliases/Balances.md)\>

#### Example

```ts
const balances = await client.getBalances();
```

***

### getGuaranteePublicKey()

> **getGuaranteePublicKey**(): `Promise`\<`string`\>

`GET /api/guarantee/public-key`. Returns armored OpenPGP certificates as text.

#### Returns

`Promise`\<`string`\>

#### Example

```ts
const certificates = await client.getGuaranteePublicKey();
```

***

### getHealth()

> **getHealth**(): `Promise`\<[`HealthStatus`](../interfaces/HealthStatus.md)\>

`GET /api/health`. Returns `{ status: "ok" }` when the API is available.

#### Returns

`Promise`\<[`HealthStatus`](../interfaces/HealthStatus.md)\>

#### Example

```ts
const health = await client.getHealth();
```

***

### getInfo()

> **getInfo**(): `Promise`\<[`Info`](../interfaces/Info.md)\>

`GET /api/info`. Returns assets and transfer methods. Use method `id` values
exactly as returned. `enabled` does not by itself mean a direction is open:
check `depositEnabled` or `settleEnabled`.

#### Returns

`Promise`\<[`Info`](../interfaces/Info.md)\>

#### Example

```ts
const info = await client.getInfo();
```

***

### getOrder()

> **getOrder**(`id`): `Promise`\<[`Order`](../interfaces/Order.md)\>

`GET /api/orders/{id}`. `id` is the 8-character `shortId`.
A key is optional. An account order returns 403 when another account's key is sent.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Order`](../interfaces/Order.md)\>

#### Example

```ts
const order = await client.getOrder("BV2MTZAF");
```

***

### getOrderGuarantee()

> **getOrderGuarantee**(`id`): `Promise`\<`string`\>

`GET /api/orders/{id}/guarantee`. Returns the stored clear-signed letter as text.
Uses the same access rules as `getOrder`. Older orders and some deposit types have no letter.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`string`\>

#### Example

```ts
const letter = await client.getOrderGuarantee("BV2MTZAF");
```

***

### getPair()

> **getPair**(`depositMethodId`, `settleMethodId`): `Promise`\<[`Pair`](../interfaces/Pair.md)\>

`GET /api/pairs/{depositMethodId}/{settleMethodId}`.
A 200 response does not reserve liquidity. If `max` is less than `min`, the pair
has no valid deposit range. An API key applies the account minimum to `min`.

#### Parameters

##### depositMethodId

`string`

##### settleMethodId

`string`

#### Returns

`Promise`\<[`Pair`](../interfaces/Pair.md)\>

#### Example

```ts
const pair = await client.getPair("btc", "xmr");
```

***

### getTicker()

> **getTicker**(`baseAssetId`, `quoteAssetId`): `Promise`\<[`Ticker`](../interfaces/Ticker.md)\>

`GET /api/ticker/{baseAssetId}/{quoteAssetId}`.
Asset ids are case-sensitive. The rate is quote units per one base unit, including fees.

#### Parameters

##### baseAssetId

`string`

##### quoteAssetId

`string`

#### Returns

`Promise`\<[`Ticker`](../interfaces/Ticker.md)\>

#### Example

```ts
const ticker = await client.getTicker("BTC", "USDT");
```

***

### listBalanceHistory()

> **listBalanceHistory**(`params?`): `Promise`\<[`LedgerItem`](../interfaces/LedgerItem.md)[]\>

`GET /api/balances/history`. Requires `X-API-KEY`. Pages contain 25 rows.

#### Parameters

##### params?

[`BalanceHistoryParams`](../interfaces/BalanceHistoryParams.md) = `{}`

#### Returns

`Promise`\<[`LedgerItem`](../interfaces/LedgerItem.md)[]\>

#### Example

```ts
const history = await client.listBalanceHistory({ assetId: "BTC", page: 1 });
```

***

### listOrders()

> **listOrders**(`params?`): `Promise`\<[`Order`](../interfaces/Order.md)[]\>

`GET /api/orders`. Requires `X-API-KEY`. Pages contain 10 orders.

#### Parameters

##### params?

[`ListOrdersParams`](../interfaces/ListOrdersParams.md) = `{}`

#### Returns

`Promise`\<[`Order`](../interfaces/Order.md)[]\>

#### Example

```ts
const orders = await client.listOrders({ page: 1 });
```

***

### listStakingOffers()

> **listStakingOffers**(): `Promise`\<[`Vault`](../interfaces/Vault.md)[]\>

`GET /api/staking`. Lists staking offers that have an active supply target.

#### Returns

`Promise`\<[`Vault`](../interfaces/Vault.md)[]\>

#### Example

```ts
const offers = await client.listStakingOffers();
```

***

### resolveAddress()

> **resolveAddress**(`params`): `Promise`\<[`EnsResolution`](../interfaces/EnsResolution.md)\>

`GET /api/addresses/resolve`. Resolves an ASCII ENS name for a payout method.
`ensResolutionToken` is used as `settleData.ensResolutionToken` and expires in 15 minutes.

#### Parameters

##### params

###### name

`string`

###### transferMethod

`string`

#### Returns

`Promise`\<[`EnsResolution`](../interfaces/EnsResolution.md)\>

#### Example

```ts
const resolved = await client.resolveAddress({
  transferMethod: "eth",
  name: "alice.eth",
});
```

***

### setAutoStake()

> **setAutoStake**(`id`, `value`): `Promise`\<[`BooleanConfiguration`](../interfaces/BooleanConfiguration.md)\>

`PUT /api/staking/{id}/auto-stake`. Requires a key with write access.
`id` is the offer UUID from `listStakingOffers`.

#### Parameters

##### id

`string`

##### value

`boolean`

#### Returns

`Promise`\<[`BooleanConfiguration`](../interfaces/BooleanConfiguration.md)\>

#### Example

```ts
const setting = await client.setAutoStake(
  "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
  true,
);
```

***

### setStakingNotifications()

> **setStakingNotifications**(`id`, `value`): `Promise`\<[`BooleanConfiguration`](../interfaces/BooleanConfiguration.md)\>

`PUT /api/staking/{id}/notifications`. Requires a key with write access.

#### Parameters

##### id

`string`

##### value

`boolean`

#### Returns

`Promise`\<[`BooleanConfiguration`](../interfaces/BooleanConfiguration.md)\>

#### Example

```ts
const setting = await client.setStakingNotifications(
  "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
  false,
);
```

***

### submitDeposit()

> **submitDeposit**(`id`, `params`): `Promise`\<[`Order`](../interfaces/Order.md)\>

`POST /api/orders/{id}/deposit`. Optional fast path after you broadcast a
supported on-chain deposit while the order is `new`. Fiat, Lightning,
internal-balance, and manual deposits do not use this call. The response
is the current order.

#### Parameters

##### id

`string`

##### params

[`SubmitDepositParams`](../interfaces/SubmitDepositParams.md)

#### Returns

`Promise`\<[`Order`](../interfaces/Order.md)\>

#### Example

```ts
const order = await client.submitDeposit("BV2MTZAF", {
  txid: "0x0123456789abcdef",
});
```

***

### updateSettleData()

> **updateSettleData**(`id`, `settleData`): `Promise`\<[`Order`](../interfaces/Order.md)\>

`PUT /api/orders/{id}/settle-data`. Requires a key with write access.
The order must be in `settle_data_error`.

#### Parameters

##### id

`string`

##### settleData

[`SettleDataCorrection`](../type-aliases/SettleDataCorrection.md)

#### Returns

`Promise`\<[`Order`](../interfaces/Order.md)\>

#### Example

```ts
const order = await client.updateSettleData("BV2MTZAF", {
  address: "bc1qexample",
});
```

***

### validateAddress()

> **validateAddress**(`params`): `Promise`\<[`AddressValidation`](../interfaces/AddressValidation.md)\>

`GET /api/addresses/validate`. For Lightning, pass the BOLT11 invoice as `address`
and set `invoiceAmount` when it must match the order amount.

#### Parameters

##### params

###### address

`string`

###### invoiceAmount?

`number`

###### transferMethod

`string`

#### Returns

`Promise`\<[`AddressValidation`](../interfaces/AddressValidation.md)\>

#### Example

```ts
const result = await client.validateAddress({
  transferMethod: "btc",
  address: "bc1qexample",
});
```
