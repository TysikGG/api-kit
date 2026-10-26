[**bitcoinvn**](../README.md)

***

[bitcoinvn](../README.md) / DirectVariableOrderRequest

# Interface: DirectVariableOrderRequest

Variable-amount order created from method ids, without a quote or amount.

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

### depositMethod

> **depositMethod**: `string`

Deposit method id from `GET /api/info`.

***

### quote?

> `optional` **quote?**: `undefined`

***

### settleAmount?

> `optional` **settleAmount?**: `undefined`

***

### settleData?

> `optional` **settleData?**: [`OrderSettleData`](../type-aliases/OrderSettleData.md)

Payout details. Omit when the settlement method needs none.

#### Inherited from

[`OrderRequestCommon`](OrderRequestCommon.md).[`settleData`](OrderRequestCommon.md#settledata)

***

### settleMethod

> **settleMethod**: `string`

Settlement method id from `GET /api/info`.

***

### webhookUrl?

> `optional` **webhookUrl?**: `string`

HTTPS webhook URL. Production allows port 443 or no port, a public domain,
and no credentials or fragment.

#### Inherited from

[`OrderRequestCommon`](OrderRequestCommon.md).[`webhookUrl`](OrderRequestCommon.md#webhookurl)
