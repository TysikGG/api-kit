[**fixedfloat-client**](../README.md)

***

[fixedfloat-client](../README.md) / Currency

# Interface: Currency

Defined in: src/types.ts:51

Represents a cryptocurrency supported by FixedFloat.

## Properties

### code

> **code**: `string`

Defined in: src/types.ts:55

Currency identifier code (e.g. "BTC", "ETH").

***

### coin

> **coin**: `string`

Defined in: src/types.ts:60

Coin symbol name.

***

### color

> **color**: `string`

Defined in: src/types.ts:95

Brand color hex code.

***

### logo

> **logo**: `string`

Defined in: src/types.ts:90

Logo image URL.

***

### name

> **name**: `string`

Defined in: src/types.ts:70

Full human-readable name of the cryptocurrency.

***

### network

> **network**: `string`

Defined in: src/types.ts:65

Blockchain network name (e.g. "BTC", "ETH", "BSC", "TRX").

***

### priority

> **priority**: `number`

Defined in: src/types.ts:100

Display priority sorting index.

***

### recv

> **recv**: `number`

Defined in: src/types.ts:75

Flag indicating whether receiving (deposit) is supported (1 = yes, 0 = no).

***

### send

> **send**: `number`

Defined in: src/types.ts:80

Flag indicating whether sending (withdrawal) is supported (1 = yes, 0 = no).

***

### tag

> **tag**: `string` \| `null`

Defined in: src/types.ts:85

Memo or destination tag name if required by the network.
