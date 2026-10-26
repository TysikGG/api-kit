[**smsbower-client**](../README.md)

***

[smsbower-client](../README.md) / SmsBowerClient

# Class: SmsBowerClient

Defined in: src/index.ts:188

Client for the SMSBower virtual number and SMS activation service.

## Constructors

### Constructor

> **new SmsBowerClient**(`options`): `SmsBowerClient`

Defined in: src/index.ts:206

Creates a new SmsBowerClient.

#### Parameters

##### options

`string` \| [`SmsBowerClientOptions`](../interfaces/SmsBowerClientOptions.md)

API key string or configuration options.

#### Returns

`SmsBowerClient`

#### Example

```typescript
import { SmsBowerClient } from 'smsbower-client';

const client = new SmsBowerClient({ apiKey: 'YOUR_API_KEY' });
const balance = await client.getBalance();
console.log(`Current balance: $${balance}`);
```

## Methods

### getActualWalletAddress()

> **getActualWalletAddress**(`coin`, `network`): `Promise`\<\{ `wallet_address`: `string`; \}\>

Defined in: src/index.ts:574

Retrieves static wallet address for crypto deposits.

#### Parameters

##### coin

`string`

Cryptocurrency symbol (e.g. 'usdt', 'trx').

##### network

`string`

Blockchain network (e.g. 'tron').

#### Returns

`Promise`\<\{ `wallet_address`: `string`; \}\>

Wallet address response.

#### Example

```typescript
const wallet = await client.getActualWalletAddress('usdt', 'tron');
console.log('Deposit address:', wallet.wallet_address);
```

***

### getBalance()

> **getBalance**(): `Promise`\<`number`\>

Defined in: src/index.ts:236

Checks the current account balance.

#### Returns

`Promise`\<`number`\>

Current balance as a float number.

#### Example

```typescript
const balance = await client.getBalance();
console.log('Account balance:', balance);
```

***

### getCountries()

> **getCountries**(): `Promise`\<`Record`\<`string`, [`CountryItem`](../interfaces/CountryItem.md)\>\>

Defined in: src/index.ts:536

Retrieves the full catalog of available countries.

#### Returns

`Promise`\<`Record`\<`string`, [`CountryItem`](../interfaces/CountryItem.md)\>\>

Mapping of country IDs to country metadata.

#### Example

```typescript
const countries = await client.getCountries();
console.log('Country 22:', countries['22']);
```

***

### getNumber()

> **getNumber**(`options`): `Promise`\<[`ActivationNumber`](../interfaces/ActivationNumber.md)\>

Defined in: src/index.ts:264

Orders a new virtual phone number.

#### Parameters

##### options

[`GetNumberOptions`](../interfaces/GetNumberOptions.md)

Order parameters including service and optional country.

#### Returns

`Promise`\<[`ActivationNumber`](../interfaces/ActivationNumber.md)\>

Activation details with ID and phone number.

#### Example

```typescript
const activation = await client.getNumber({
  service: 'tg',
  country: '22',
});
console.log(`Order ID: ${activation.id}, Number: ${activation.number}`);
```

***

### getNumberV2()

> **getNumberV2**(`options`): `Promise`\<[`ActivationNumberV2`](../interfaces/ActivationNumberV2.md)\>

Defined in: src/index.ts:315

Orders a new virtual phone number with rich details (v2 protocol).

#### Parameters

##### options

[`GetNumberOptions`](../interfaces/GetNumberOptions.md)

Order parameters including service and optional country.

#### Returns

`Promise`\<[`ActivationNumberV2`](../interfaces/ActivationNumberV2.md)\>

Detailed activation object.

#### Example

```typescript
const details = await client.getNumberV2({
  service: 'tg',
  country: '22',
});
console.log(`Number: ${details.phoneNumber}, Cost: ${details.activationCost}`);
```

***

### getPrices()

> **getPrices**(`service?`, `country?`): `Promise`\<`Record`\<`string`, `Record`\<`string`, \{ `cost`: `number`; `count`: `number`; \}\>\>\>

Defined in: src/index.ts:430

Gets prices and counts for services and countries.

#### Parameters

##### service?

`string`

Optional service code filter.

##### country?

`string` \| `number`

Optional country code filter.

#### Returns

`Promise`\<`Record`\<`string`, `Record`\<`string`, \{ `cost`: `number`; `count`: `number`; \}\>\>\>

Price mapping.

#### Example

```typescript
const prices = await client.getPrices('tg', '22');
console.log(prices);
```

***

### getPricesV2()

> **getPricesV2**(`service?`, `country?`): `Promise`\<`Record`\<`string`, `Record`\<`string`, `Record`\<`string`, `number`\>\>\>\>

Defined in: src/index.ts:456

Gets detailed price lists grouped by price point (v2).

#### Parameters

##### service?

`string`

Optional service code filter.

##### country?

`string` \| `number`

Optional country code filter.

#### Returns

`Promise`\<`Record`\<`string`, `Record`\<`string`, `Record`\<`string`, `number`\>\>\>\>

Price points mapping.

#### Example

```typescript
const pricesV2 = await client.getPricesV2('tg', '22');
console.log(pricesV2);
```

***

### getPricesV3()

> **getPricesV3**(`service?`, `country?`): `Promise`\<`Record`\<`string`, `Record`\<`string`, `Record`\<`string`, \{ `count`: `number`; `price`: `number`; `provider_id`: `string` \| `number`; \}\>\>\>\>

Defined in: src/index.ts:482

Gets granular price lists by provider ID (v3).

#### Parameters

##### service?

`string`

Optional service code filter.

##### country?

`string` \| `number`

Optional country code filter.

#### Returns

`Promise`\<`Record`\<`string`, `Record`\<`string`, `Record`\<`string`, \{ `count`: `number`; `price`: `number`; `provider_id`: `string` \| `number`; \}\>\>\>\>

Provider price mapping.

#### Example

```typescript
const pricesV3 = await client.getPricesV3('tg', '22');
console.log(pricesV3);
```

***

### getServicesList()

> **getServicesList**(): `Promise`\<[`ServiceItem`](../interfaces/ServiceItem.md)[]\>

Defined in: src/index.ts:511

Retrieves the full catalog of supported services.

#### Returns

`Promise`\<[`ServiceItem`](../interfaces/ServiceItem.md)[]\>

Array of available services.

#### Example

```typescript
const services = await client.getServicesList();
console.log(`Found ${services.length} services`);
```

***

### getStatus()

> **getStatus**(`id`): `Promise`\<[`ActivationStatus`](../interfaces/ActivationStatus.md)\>

Defined in: src/index.ts:366

Checks the status and retrieves the received SMS code for an activation.

#### Parameters

##### id

`string` \| `number`

Activation identifier.

#### Returns

`Promise`\<[`ActivationStatus`](../interfaces/ActivationStatus.md)\>

Current status and code if received.

#### Example

```typescript
const res = await client.getStatus('123456');
if (res.status === 'STATUS_OK') {
  console.log('Received SMS code:', res.code);
}
```

***

### getTopCountriesByService()

> **getTopCountriesByService**(`service`): `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: src/index.ts:553

Retrieves the top 10 countries and gold partners for a service.

#### Parameters

##### service

`string`

Service code.

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

Top countries and partner listings.

#### Example

```typescript
const top = await client.getTopCountriesByService('tg');
console.log(top);
```

***

### setStatus()

> **setStatus**(`id`, `status`): `Promise`\<`string`\>

Defined in: src/index.ts:408

Changes the activation status.
Status actions:
- 1: Inform readiness of the number (SMS sent)
- 3: Request another code
- 6: Complete activation
- 8: Cancel activation

#### Parameters

##### id

`string` \| `number`

Activation identifier.

##### status

`number`

Action code (1, 3, 6, 8).

#### Returns

`Promise`\<`string`\>

Status confirmation response string.

#### Example

```typescript
await client.setStatus('123456', 6);
console.log('Activation completed');
```
