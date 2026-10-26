[**fixedfloat-client**](../README.md)

***

[fixedfloat-client](../README.md) / CreateOrderParams

# Interface: CreateOrderParams

Defined in: src/types.ts:173

Parameters for creating an exchange order.

## Properties

### afftax?

> `optional` **afftax?**: `number`

Defined in: src/types.ts:222

Optional affiliate tax percent.

***

### amount

> **amount**: `number`

Defined in: src/types.ts:187

Exchange amount.

***

### direction

> **direction**: [`ExchangeDirection`](../type-aliases/ExchangeDirection.md)

Defined in: src/types.ts:192

Exchange direction.

***

### extraId?

> `optional` **extraId?**: `string`

Defined in: src/types.ts:207

Optional destination tag, memo, or extra ID for destination address.

***

### fromCcy

> **fromCcy**: `string`

Defined in: src/types.ts:177

Source cryptocurrency code (e.g. "BTC").

***

### refundAddress?

> `optional` **refundAddress?**: `string`

Defined in: src/types.ts:212

Optional refund wallet address in case of order cancellation or mismatch.

***

### refundExtraId?

> `optional` **refundExtraId?**: `string`

Defined in: src/types.ts:217

Optional destination tag or memo for the refund address.

***

### toAddress

> **toAddress**: `string`

Defined in: src/types.ts:202

Destination wallet address to receive the exchanged funds.

***

### toCcy

> **toCcy**: `string`

Defined in: src/types.ts:182

Destination cryptocurrency code (e.g. "ETH").

***

### type

> **type**: [`OrderType`](../type-aliases/OrderType.md)

Defined in: src/types.ts:197

Order type: "fixed" or "float".
