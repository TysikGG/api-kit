[**bitcoinvn**](../README.md)

***

[bitcoinvn](../README.md) / Quote

# Interface: Quote

Quote returned by `POST /api/quotes` and nested on an order.

## Properties

### accepted?

> `optional` **accepted?**: `boolean`

Whether the linked order currently accepts this rate and deposit.

***

### createdAt?

> `optional` **createdAt?**: `string`

ISO 8601 creation time.

***

### depositAmount?

> `optional` **depositAmount?**: `number` \| `null`

Amount to deposit.

***

### depositFee?

> `optional` **depositFee?**: `number`

Deposit-side fixed fee plus network fee, in deposit-asset units.

***

### depositMethod

> **depositMethod**: `string`

Transfer method id for the deposit side.

***

### expiresAt?

> `optional` **expiresAt?**: `string`

Rate acceptance deadline. Creating an order does not extend it.

***

### id?

> `optional` **id?**: `string`

Quote UUID.

***

### markupRate?

> `optional` **markupRate?**: `number` \| `null`

Markup from quote creation, or null.

***

### rate?

> `optional` **rate?**: `number`

Locked rate including percentage fees and markup.

***

### rawRate?

> `optional` **rawRate?**: `number`

Market rate before fees.

***

### settleAmount?

> `optional` **settleAmount?**: `number` \| `null`

Amount to receive.

***

### settleFee?

> `optional` **settleFee?**: `number`

Settlement-side fixed fee plus network fee, in settlement-asset units.

***

### settleMethod

> **settleMethod**: `string`

Transfer method id for the settlement side.
