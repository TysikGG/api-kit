[**fixedfloat-client**](../README.md)

***

[fixedfloat-client](../README.md) / GetPriceParams

# Interface: GetPriceParams

Defined in: src/types.ts:116

Parameters for requesting exchange price estimates.

## Properties

### afftax?

> `optional` **afftax?**: `number`

Defined in: src/types.ts:145

Optional custom affiliate tax percent if applicable.

***

### amount

> **amount**: `number`

Defined in: src/types.ts:130

Exchange amount.

***

### direction

> **direction**: [`ExchangeDirection`](../type-aliases/ExchangeDirection.md)

Defined in: src/types.ts:135

Exchange direction.

***

### fromCcy

> **fromCcy**: `string`

Defined in: src/types.ts:120

Source cryptocurrency code (e.g. "BTC").

***

### toCcy

> **toCcy**: `string`

Defined in: src/types.ts:125

Destination cryptocurrency code (e.g. "ETH").

***

### type

> **type**: [`OrderType`](../type-aliases/OrderType.md)

Defined in: src/types.ts:140

Rate type: "fixed" or "float".
