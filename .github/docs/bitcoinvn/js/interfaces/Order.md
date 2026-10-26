[**bitcoinvn**](../README.md)

***

[bitcoinvn](../README.md) / Order

# Interface: Order

Order returned by create, fetch, deposit, and settle-data calls.

## Properties

### adminMessage?

> `optional` **adminMessage?**: `string` \| `null`

Message from the operator, for example a hold reason.

***

### createdAt

> **createdAt**: `string`

ISO 8601 creation time.

***

### customOrderId?

> `optional` **customOrderId?**: `string`

Client id, when one was sent.

***

### depositAmount?

> `optional` **depositAmount?**: `number` \| `null`

Amount to deposit. Null for a variable-amount order.

***

### depositAsset

> **depositAsset**: `string`

Deposit asset ticker.

***

### depositConfsRequired?

> `optional` **depositConfsRequired?**: `number` \| `null`

Required confirmation count when known. Null means unknown, not zero.

***

### depositData

> **depositData**: `Record`\<`string`, `unknown`\>

Where to send the deposit.

***

### depositFee

> **depositFee**: `number`

Deposit fee plus deposit network fee.

***

### depositMax?

> `optional` **depositMax?**: `number`

Soft maximum deposit, unless KYC sets a hard limit.

***

### depositMethod

> **depositMethod**: `string`

Deposit method id.

***

### depositMin

> **depositMin**: `number`

Minimum deposit amount for this order.

***

### depositTxns?

> `optional` **depositTxns?**: `string`[]

Incoming deposit transaction ids.

***

### expiresAt

> **expiresAt**: `string`

Deposit deadline. The order is canceled after this time if nothing arrives.

***

### id

> **id**: `string`

Order UUID.

***

### quote?

> `optional` **quote?**: [`Quote`](Quote.md)

Quote used to create the order.

***

### rate?

> `optional` **rate?**: `number`

Final rate including percentage fees.

***

### settleAmount?

> `optional` **settleAmount?**: `number` \| `null`

Amount to receive after fees.

***

### settleAsset

> **settleAsset**: `string`

Settlement asset ticker.

***

### settleData

> **settleData**: `Record`\<`string`, `unknown`\>

Payout destination stored on the order.

***

### settleFee

> **settleFee**: `number`

Settlement fee plus settlement network fee.

***

### settleMethod

> **settleMethod**: `string`

Settlement method id.

***

### settleProof?

> `optional` **settleProof?**: `Record`\<`string`, `unknown`\> \| `null`

Monero settlement proof, when present.

***

### settleReceiptUrl?

> `optional` **settleReceiptUrl?**: `string`

Settlement receipt URL.

***

### settleTxns?

> `optional` **settleTxns?**: `string`[]

Outgoing settlement transaction ids.

***

### shortId

> **shortId**: `string`

Eight-character id used in URLs and support.

***

### status

> **status**: [`OrderStatus`](../type-aliases/OrderStatus.md)

Current order state.
