[**bitcoinvn**](../README.md)

***

[bitcoinvn](../README.md) / InternalBalanceSettleAmountOrderRequest

# Interface: InternalBalanceSettleAmountOrderRequest

Amountless internal-balance quote priced from `settleAmount`.

## Extends

- [`OrderRequestCommon`](OrderRequestCommon.md)

## Properties

### customOrderId?

> `optional` **customOrderId?**: `string`

Client id, at most 64 characters, unique per authenticated user.

#### Inherited from

[`OrderRequestCommon`](OrderRequestCommon.md).[`customOrderId`](OrderRequestCommon.md#customorderid)

***

### depositAmount?

> `optional` **depositAmount?**: `undefined`

***

### depositMethod?

> `optional` **depositMethod?**: `undefined`

***

### quote

> **quote**: `string`

Amountless internal-balance quote UUID.

***

### settleAmount

> **settleAmount**: `number`

Settlement-side amount.

***

### settleData?

> `optional` **settleData?**: [`OrderSettleData`](../type-aliases/OrderSettleData.md)

Payout details. Omit when the settlement method needs none.

#### Inherited from

[`OrderRequestCommon`](OrderRequestCommon.md).[`settleData`](OrderRequestCommon.md#settledata)

***

### settleMethod?

> `optional` **settleMethod?**: `undefined`

***

### webhookUrl?

> `optional` **webhookUrl?**: `string`

HTTPS webhook URL. Production allows port 443 or no port, a public domain,
and no credentials or fragment.

#### Inherited from

[`OrderRequestCommon`](OrderRequestCommon.md).[`webhookUrl`](OrderRequestCommon.md#webhookurl)
