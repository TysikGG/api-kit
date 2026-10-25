[**bitcoinvn**](../README.md)

***

[bitcoinvn](../README.md) / OrderRequestCommon

# Interface: OrderRequestCommon

Fields shared by every `POST /api/orders` shape. `referrer` is not accepted here.

## Extended by

- [`DirectVariableOrderRequest`](DirectVariableOrderRequest.md)
- [`InternalBalanceDepositAmountOrderRequest`](InternalBalanceDepositAmountOrderRequest.md)
- [`InternalBalanceSettleAmountOrderRequest`](InternalBalanceSettleAmountOrderRequest.md)
- [`QuotedOrderRequest`](QuotedOrderRequest.md)

## Properties

### customOrderId?

> `optional` **customOrderId?**: `string`

Client id, at most 64 characters, unique per authenticated user.

***

### settleData?

> `optional` **settleData?**: [`OrderSettleData`](../type-aliases/OrderSettleData.md)

Payout details. Omit when the settlement method needs none.

***

### webhookUrl?

> `optional` **webhookUrl?**: `string`

HTTPS webhook URL. Production allows port 443 or no port, a public domain,
and no credentials or fragment.
