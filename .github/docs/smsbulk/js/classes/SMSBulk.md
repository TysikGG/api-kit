[**smsbulk-client**](../README.md)

***

[smsbulk-client](../README.md) / SMSBulk

# Class: SMSBulk

Client for interacting with the SMSBulk API.

## Constructors

### Constructor

> **new SMSBulk**(`options?`): `SMSBulk`

Creates an instance of the SMSBulk client.

#### Parameters

##### options?

[`SMSBulkClientOptions`](../interfaces/SMSBulkClientOptions.md) = `{}`

#### Returns

`SMSBulk`

#### Example

```typescript
import { SMSBulk } from "smsbulk-client";

const client = new SMSBulk({ apiKey: "your-api-key" });
const balance = await client.getBalance();
console.log(`Balance: ${balance.balance} ${balance.currency}`);
```

## Methods

### cancelActivation()

> **cancelActivation**(`id`): `Promise`\<[`Activation`](../interfaces/Activation.md)\>

Cancels an activation and refunds the balance.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Activation`](../interfaces/Activation.md)\>

#### Example

```typescript
const act = await client.cancelActivation("activation-id");
console.log(`Status after cancellation: ${act.status}`);
```

***

### cancelEmailActivation()

> **cancelEmailActivation**(`id`): `Promise`\<[`EmailActivation`](../interfaces/EmailActivation.md)\>

Cancels an email activation.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`EmailActivation`](../interfaces/EmailActivation.md)\>

#### Example

```typescript
const act = await client.cancelEmailActivation("email-act-id");
console.log(`Cancelled: ${act.status}`);
```

***

### completeActivation()

> **completeActivation**(`id`): `Promise`\<[`Activation`](../interfaces/Activation.md)\>

Marks an activation as completed.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Activation`](../interfaces/Activation.md)\>

#### Example

```typescript
const act = await client.completeActivation("activation-id");
console.log(`Activation completed: ${act.status}`);
```

***

### createActivation()

> **createActivation**(`params`): `Promise`\<[`Activation`](../interfaces/Activation.md)\>

Reserves a virtual number for SMS verification.

#### Parameters

##### params

[`CreateActivationParams`](../interfaces/CreateActivationParams.md)

#### Returns

`Promise`\<[`Activation`](../interfaces/Activation.md)\>

#### Example

```typescript
const activation = await client.createActivation({
  serviceCode: "wa",
  countryIso: "US",
});
console.log(`Reserved phone number: ${activation.phoneNumber}`);
```

***

### createEmailActivation()

> **createEmailActivation**(`params`): `Promise`\<[`EmailActivation`](../interfaces/EmailActivation.md)\>

Purchases a temporary email address.

#### Parameters

##### params

[`CreateEmailActivationParams`](../interfaces/CreateEmailActivationParams.md)

#### Returns

`Promise`\<[`EmailActivation`](../interfaces/EmailActivation.md)\>

#### Example

```typescript
const act = await client.createEmailActivation({
  site: "telegram.com",
  domain: "gmx.com",
});
console.log(`Purchased email: ${act.emailAddress}`);
```

***

### getActivation()

> **getActivation**(`id`): `Promise`\<[`Activation`](../interfaces/Activation.md)\>

Gets details and received SMS code for an activation.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Activation`](../interfaces/Activation.md)\>

#### Example

```typescript
const act = await client.getActivation("activation-id");
if (act.status === "RECEIVED") {
  console.log(`Received code: ${act.smsCode}`);
}
```

***

### getActivations()

> **getActivations**(`params?`): `Promise`\<[`ActivationListResponse`](../interfaces/ActivationListResponse.md)\>

Lists activations belonging to the user.

#### Parameters

##### params?

###### cursor?

`string`

###### limit?

`number`

#### Returns

`Promise`\<[`ActivationListResponse`](../interfaces/ActivationListResponse.md)\>

#### Example

```typescript
const { data } = await client.getActivations({ limit: 20 });
console.log(`Active purchases: ${data.length}`);
```

***

### getBalance()

> **getBalance**(): `Promise`\<[`BalanceResponse`](../interfaces/BalanceResponse.md)\>

Retrieves current wallet balance.

#### Returns

`Promise`\<[`BalanceResponse`](../interfaces/BalanceResponse.md)\>

#### Example

```typescript
const balance = await client.getBalance();
console.log(`Balance: ${balance.balance} ${balance.currency}`);
```

***

### getCountries()

> **getCountries**(): `Promise`\<[`CountriesResponse`](../interfaces/CountriesResponse.md)\>

Lists all supported countries.

#### Returns

`Promise`\<[`CountriesResponse`](../interfaces/CountriesResponse.md)\>

#### Example

```typescript
const { data } = await client.getCountries();
console.log(`Total countries: ${data.length}`);
```

***

### getEmailActivation()

> **getEmailActivation**(`id`): `Promise`\<[`EmailActivation`](../interfaces/EmailActivation.md)\>

Gets details and received email content for an email activation.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`EmailActivation`](../interfaces/EmailActivation.md)\>

#### Example

```typescript
const act = await client.getEmailActivation("email-act-id");
if (act.status === "RECEIVED") {
  console.log(`OTP Code: ${act.otpValue}`);
}
```

***

### getEmailActivations()

> **getEmailActivations**(`params?`): `Promise`\<[`EmailActivationListResponse`](../interfaces/EmailActivationListResponse.md)\>

Lists email activations belonging to the user.

#### Parameters

##### params?

###### cursor?

`string`

###### limit?

`number`

#### Returns

`Promise`\<[`EmailActivationListResponse`](../interfaces/EmailActivationListResponse.md)\>

#### Example

```typescript
const { data } = await client.getEmailActivations({ limit: 10 });
console.log(`Email activations: ${data.length}`);
```

***

### getEmailDomains()

> **getEmailDomains**(`site`): `Promise`\<[`EmailDomainItem`](../interfaces/EmailDomainItem.md)[]\>

Lists available email domains and pricing for a given site.

#### Parameters

##### site

`string`

#### Returns

`Promise`\<[`EmailDomainItem`](../interfaces/EmailDomainItem.md)[]\>

#### Example

```typescript
const domains = await client.getEmailDomains("telegram.com");
console.log(`Available domains: ${domains.map((d) => d.name).join(", ")}`);
```

***

### getService()

> **getService**(`slug`): `Promise`\<[`ServiceCatalogItem`](../interfaces/ServiceCatalogItem.md)\>

Gets details for a single service by slug.

#### Parameters

##### slug

`string`

#### Returns

`Promise`\<[`ServiceCatalogItem`](../interfaces/ServiceCatalogItem.md)\>

#### Example

```typescript
const service = await client.getService("whatsapp");
console.log(`Service name: ${service.name}`);
```

***

### getServiceCountries()

> **getServiceCountries**(`slug`): `Promise`\<[`ServiceCountriesResponse`](../interfaces/ServiceCountriesResponse.md)\>

Lists in-stock countries and prices for a service.

#### Parameters

##### slug

`string`

#### Returns

`Promise`\<[`ServiceCountriesResponse`](../interfaces/ServiceCountriesResponse.md)\>

#### Example

```typescript
const { countries } = await client.getServiceCountries("whatsapp");
console.log(`Countries offering WhatsApp: ${countries.length}`);
```

***

### getServices()

> **getServices**(): `Promise`\<[`ServicesResponse`](../interfaces/ServicesResponse.md)\>

Lists all available services in the catalog.

#### Returns

`Promise`\<[`ServicesResponse`](../interfaces/ServicesResponse.md)\>

#### Example

```typescript
const { data } = await client.getServices();
console.log(`Available services: ${data.length}`);
```

***

### getTransactions()

> **getTransactions**(`params?`): `Promise`\<[`TransactionListResponse`](../interfaces/TransactionListResponse.md)\>

Lists wallet transactions with optional pagination.

#### Parameters

##### params?

###### cursor?

`string`

###### limit?

`number`

#### Returns

`Promise`\<[`TransactionListResponse`](../interfaces/TransactionListResponse.md)\>

#### Example

```typescript
const { data, nextCursor } = await client.getTransactions({ limit: 10 });
console.log(`Fetched ${data.length} transactions`);
```

***

### reorderEmailActivation()

> **reorderEmailActivation**(`id`): `Promise`\<[`EmailActivation`](../interfaces/EmailActivation.md)\>

Reorders (re-opens) an email address for further verification codes.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`EmailActivation`](../interfaces/EmailActivation.md)\>

#### Example

```typescript
const act = await client.reorderEmailActivation("email-act-id");
console.log(`Reordered: ${act.status}`);
```

***

### resendActivation()

> **resendActivation**(`id`): `Promise`\<[`Activation`](../interfaces/Activation.md)\>

Requests a resend of another SMS code for the existing number.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Activation`](../interfaces/Activation.md)\>

#### Example

```typescript
const act = await client.resendActivation("activation-id");
console.log(`Resend requested: ${act.status}`);
```
