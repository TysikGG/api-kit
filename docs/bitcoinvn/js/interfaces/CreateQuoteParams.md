[**bitcoinvn**](../README.md)

***

[bitcoinvn](../README.md) / CreateQuoteParams

# Interface: CreateQuoteParams

Body for `POST /api/quotes`. Send at most one of the amount fields.

## Properties

### depositAmount?

> `optional` **depositAmount?**: `number`

Positive amount to send. Omit for a fixed settlement or variable quote.

***

### depositMethod

> **depositMethod**: `string`

Deposit method id from `GET /api/info`.

***

### markupRate?

> `optional` **markupRate?**: `number`

Markup greater than 0 and no more than 0.10.

***

### settleAmount?

> `optional` **settleAmount?**: `number`

Positive amount to receive. Omit for a fixed deposit or variable quote.

***

### settleMethod

> **settleMethod**: `string`

Settlement method id from `GET /api/info`.
