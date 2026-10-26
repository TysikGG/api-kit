[**smsbower-client**](../README.md)

***

[smsbower-client](../README.md) / ActivationNumberV2

# Interface: ActivationNumberV2

Defined in: src/index.ts:81

Extended activation details returned from getNumberV2.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### activationCost?

> `optional` **activationCost?**: `number`

Defined in: src/index.ts:93

Cost deducted for the activation.

***

### activationId

> **activationId**: `string` \| `number`

Defined in: src/index.ts:85

Activation identifier.

***

### activationOperator?

> `optional` **activationOperator?**: `string`

Defined in: src/index.ts:109

Mobile operator name or code.

***

### activationTime?

> `optional` **activationTime?**: `string`

Defined in: src/index.ts:105

Activation timestamp.

***

### canGetAnotherSms?

> `optional` **canGetAnotherSms?**: `number` \| `boolean`

Defined in: src/index.ts:101

Whether another SMS code can be requested.

***

### countryCode?

> `optional` **countryCode?**: `string` \| `number`

Defined in: src/index.ts:97

Country code identifier.

***

### phoneNumber

> **phoneNumber**: `string` \| `number`

Defined in: src/index.ts:89

Full phone number with country code.
