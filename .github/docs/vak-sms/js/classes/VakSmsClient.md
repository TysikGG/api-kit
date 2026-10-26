[**vak-sms-client**](../README.md)

***

[vak-sms-client](../README.md) / VakSmsClient

# Class: VakSmsClient

Defined in: [src/index.ts:155](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/vak-sms/js/src/index.ts#L155)

Client for the VAK-SMS temporary number and SMS OTP receiving service.

## Constructors

### Constructor

> **new VakSmsClient**(`options`): `VakSmsClient`

Defined in: [src/index.ts:174](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/vak-sms/js/src/index.ts#L174)

Creates a new VakSmsClient.

#### Parameters

##### options

`string` \| [`VakSmsClientOptions`](../interfaces/VakSmsClientOptions.md)

API key string or configuration object.

#### Returns

`VakSmsClient`

#### Example

```typescript
import { VakSmsClient } from 'vak-sms-client';

const client = new VakSmsClient({ apiKey: 'YOUR_API_KEY' });
const balance = await client.getBalance();
console.log(`Balance: ${balance} RUB`);
```

## Methods

### getBalance()

> **getBalance**(): `Promise`\<`number`\>

Defined in: [src/index.ts:206](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/vak-sms/js/src/index.ts#L206)

Retrieves the current account balance.

#### Returns

`Promise`\<`number`\>

Current balance in RUB.

#### Example

```typescript
const balance = await client.getBalance();
console.log(`Current balance: ${balance}`);
```

***

### getCountNumber()

> **getCountNumber**(`service`, `country?`, `operator?`): `Promise`\<[`CountNumber`](../interfaces/CountNumber.md)\>

Defined in: [src/index.ts:410](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/vak-sms/js/src/index.ts#L410)

Checks available phone number quantity and price for a service.

#### Parameters

##### service

`string`

Service code.

##### country?

`string` = `'ru'`

Country code (default: 'ru').

##### operator?

`string`

Optional mobile operator filter.

#### Returns

`Promise`\<[`CountNumber`](../interfaces/CountNumber.md)\>

Quantity and unit price.

#### Example

```typescript
const count = await client.getCountNumber('tg', 'ru');
console.log(`Available: ${count.count}, Price: ${count.price} RUB`);
```

***

### getCountNumbersList()

> **getCountNumbersList**(`country?`, `operator?`, `rent?`): `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/index.ts:471](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/vak-sms/js/src/index.ts#L471)

Retrieves full catalog of available services and stock for a country.

#### Parameters

##### country?

`string` = `'ru'`

Country code (default 'ru').

##### operator?

`string`

Optional mobile operator filter.

##### rent?

`boolean`

Whether to query prolonged rental service stock.

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

Map of services and stock.

#### Example

```typescript
const catalog = await client.getCountNumbersList('ru');
console.log(catalog);
```

***

### getCountryList()

> **getCountryList**(): `Promise`\<[`CountryOperator`](../interfaces/CountryOperator.md)[]\>

Defined in: [src/index.ts:449](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/vak-sms/js/src/index.ts#L449)

Retrieves the catalog of supported countries and operators.

#### Returns

`Promise`\<[`CountryOperator`](../interfaces/CountryOperator.md)[]\>

List of country and operator listings.

#### Example

```typescript
const countries = await client.getCountryList();
console.log(`Supported countries: ${countries.length}`);
```

***

### getNumber()

> **getNumber**(`options`): `Promise`\<[`VakNumber`](../interfaces/VakNumber.md)\>

Defined in: [src/index.ts:229](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/vak-sms/js/src/index.ts#L229)

Requests a temporary virtual phone number.

#### Parameters

##### options

[`GetNumberOptions`](../interfaces/GetNumberOptions.md)

Order parameters including service, country, operator, and rental status.

#### Returns

`Promise`\<[`VakNumber`](../interfaces/VakNumber.md)\>

Number details with idNum and phone number.

#### Example

```typescript
const order = await client.getNumber({
  service: 'tg',
  country: 'ru',
});
console.log(`Phone: ${order.tel}, ID: ${order.idNum}`);
```

***

### getSmsCode()

> **getSmsCode**(`idNum`, `all?`): `Promise`\<`string` \| `string`[] \| `null`\>

Defined in: [src/index.ts:318](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/vak-sms/js/src/index.ts#L318)

Retrieves incoming SMS code(s) for an active order.

#### Parameters

##### idNum

`string`

Activation ID returned by getNumber.

##### all?

`boolean`

Whether to return an array of all received codes.

#### Returns

`Promise`\<`string` \| `string`[] \| `null`\>

Code string, array of codes, or null if code not yet arrived.

#### Example

```typescript
const code = await client.getSmsCode('abcd1234ef');
if (code) {
  console.log('Received SMS code:', code);
}
```

***

### prolongNumber()

> **prolongNumber**(`service`, `tel`, `softId?`): `Promise`\<[`VakNumber`](../interfaces/VakNumber.md)\>

Defined in: [src/index.ts:274](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/vak-sms/js/src/index.ts#L274)

Extends the rental duration for an existing number.

#### Parameters

##### service

`string`

Service code.

##### tel

`string` \| `number`

Phone number without plus sign (e.g. 79991234567).

##### softId?

`string`

Optional software referral ID.

#### Returns

`Promise`\<[`VakNumber`](../interfaces/VakNumber.md)\>

Prolonged number details.

#### Example

```typescript
const res = await client.prolongNumber('tg', '79991234567');
console.log(`Prolonged ID: ${res.idNum}`);
```

***

### setStatus()

> **setStatus**(`idNum`, `status`): `Promise`\<`string`\>

Defined in: [src/index.ts:384](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/vak-sms/js/src/index.ts#L384)

Updates activation status.

Status actions:
- 'send': Ready to receive another SMS code
- 'end': Successfully complete the activation
- 'bad': Ban/report number as defective to release it

#### Parameters

##### idNum

`string`

Activation identifier.

##### status

`"send"` \| `"end"` \| `"bad"`

Action name ('send', 'end', 'bad').

#### Returns

`Promise`\<`string`\>

Status response string.

#### Example

```typescript
await client.setStatus('abcd1234ef', 'end');
console.log('Activation completed');
```

***

### waitForCode()

> **waitForCode**(`idNum`, `options?`): `Promise`\<`string` \| `null`\>

Defined in: [src/index.ts:345](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/vak-sms/js/src/index.ts#L345)

Polls until an SMS code arrives or timeout occurs.

#### Parameters

##### idNum

`string`

Activation identifier.

##### options?

Polling options with timeoutMs (default 120s) and intervalMs (default 3s).

###### intervalMs?

`number`

###### timeoutMs?

`number`

#### Returns

`Promise`\<`string` \| `null`\>

Code string or null on timeout.

#### Example

```typescript
const code = await client.waitForCode('abcd1234ef', { timeoutMs: 60000 });
console.log('Code:', code);
```
