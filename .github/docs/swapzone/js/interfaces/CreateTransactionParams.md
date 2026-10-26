[**swapzone-client**](../README.md)

***

[swapzone-client](../README.md) / CreateTransactionParams

# Interface: CreateTransactionParams

Parameters for creating an exchange transaction.

## Properties

### addressReceive

> **addressReceive**: `string`

Destination address to receive exchanged funds

***

### amountDeposit

> **amountDeposit**: `string` \| `number`

Amount to deposit

***

### extraIdReceive?

> `optional` **extraIdReceive?**: `string`

Memo or extra ID for destination address (optional)

***

### from

> **from**: `string`

Ticker of the currency to exchange

***

### fromNetwork?

> `optional` **fromNetwork?**: `string`

Network for deposit currency

***

### noQuotaId?

> `optional` **noQuotaId?**: `boolean`

Skip quota ID requirement

***

### offerReferenceId?

> `optional` **offerReferenceId?**: `string`

Reference ID for fixed-rate flows

***

### quotaId?

> `optional` **quotaId?**: `string`

Quota ID obtained from getRate

***

### refundAddress?

> `optional` **refundAddress?**: `string`

Address for refunds if the exchange fails (optional)

***

### refundExtraId?

> `optional` **refundExtraId?**: `string`

Memo for refund address (optional)

***

### to

> **to**: `string`

Ticker of the currency to receive

***

### toNetwork?

> `optional` **toNetwork?**: `string`

Network for receive currency
