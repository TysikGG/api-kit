[**smsbower-client**](../README.md)

***

[smsbower-client](../README.md) / ActivationNumberV2

# Interface: ActivationNumberV2

Defined in: [src/index.ts:81](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/smsbower/js/src/index.ts#L81)

Extended activation details returned from getNumberV2.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### activationCost?

> `optional` **activationCost?**: `number`

Defined in: [src/index.ts:93](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/smsbower/js/src/index.ts#L93)

Cost deducted for the activation.

***

### activationId

> **activationId**: `string` \| `number`

Defined in: [src/index.ts:85](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/smsbower/js/src/index.ts#L85)

Activation identifier.

***

### activationOperator?

> `optional` **activationOperator?**: `string`

Defined in: [src/index.ts:109](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/smsbower/js/src/index.ts#L109)

Mobile operator name or code.

***

### activationTime?

> `optional` **activationTime?**: `string`

Defined in: [src/index.ts:105](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/smsbower/js/src/index.ts#L105)

Activation timestamp.

***

### canGetAnotherSms?

> `optional` **canGetAnotherSms?**: `number` \| `boolean`

Defined in: [src/index.ts:101](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/smsbower/js/src/index.ts#L101)

Whether another SMS code can be requested.

***

### countryCode?

> `optional` **countryCode?**: `string` \| `number`

Defined in: [src/index.ts:97](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/smsbower/js/src/index.ts#L97)

Country code identifier.

***

### phoneNumber

> **phoneNumber**: `string` \| `number`

Defined in: [src/index.ts:89](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/smsbower/js/src/index.ts#L89)

Full phone number with country code.
