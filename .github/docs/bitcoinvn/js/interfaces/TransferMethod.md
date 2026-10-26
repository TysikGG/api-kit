[**bitcoinvn**](../README.md)

***

[bitcoinvn](../README.md) / TransferMethod

# Interface: TransferMethod

Transfer method from `GET /api/info`. Use `id` exactly as returned.

## Properties

### asset

> **asset**: `string`

Asset ticker this method belongs to.

***

### batched?

> `optional` **batched?**: `boolean`

Whether settlements are grouped.

***

### decimals

> **decimals**: `number`

Decimal places for amounts.

***

### depositEnabled

> **depositEnabled**: `boolean`

Whether this method can be used for a deposit.

***

### depositFee?

> `optional` **depositFee?**: `number`

Flat fee charged on deposits.

***

### details?

> `optional` **details?**: [`TransferMethodDetails`](TransferMethodDetails.md) \| `null`

Method-specific details, including `banks` for fiat methods.

***

### enabled

> **enabled**: `boolean`

Active when deposit or settlement is enabled.

***

### exchangeBalanceIndex?

> `optional` **exchangeBalanceIndex?**: `number`

Liquidity modifier. Positive discounts deposits; negative discounts settlements.

***

### exchangeFee?

> `optional` **exchangeFee?**: `number`

Percentage fee on conversions involving this method.

***

### extraLabel?

> `optional` **extraLabel?**: `string` \| `null`

Extra label when several methods share an asset.

***

### id

> **id**: `string`

Unique transfer method identifier, for example `btc` or `vnd`.

***

### infoUrl?

> `optional` **infoUrl?**: `string` \| `null`

URL with more information about this method.

***

### internalBalance

> **internalBalance**: `boolean`

Whether this method is an internal account balance.

***

### invoice?

> `optional` **invoice?**: `boolean`

Whether the method is invoice-based, such as Lightning.

***

### maxOrderSize?

> `optional` **maxOrderSize?**: `number` \| `null`

Maximum order size in USD equivalent. Null means no limit.

***

### minOrderSize?

> `optional` **minOrderSize?**: `number` \| `null`

Minimum order size in USD equivalent.

***

### network?

> `optional` **network?**: `string` \| `null`

Network id. Omitted or null when the method has no network.

***

### networkFee?

> `optional` **networkFee?**: `number`

Flat network fee charged on deposits and settlements.

***

### predictedSettleWaitTime?

> `optional` **predictedSettleWaitTime?**: `number`

Estimated settlement wait time in seconds.

***

### settleDataFields?

> `optional` **settleDataFields?**: [`SettleDataField`](SettleDataField.md)[]

External payout fields for order `settleData`. Omitted for internal balances.

***

### settleEnabled

> **settleEnabled**: `boolean`

Whether this method can be used for a payout.

***

### settleFee?

> `optional` **settleFee?**: `number`

Flat fee charged on settlements.

***

### tags

> **tags**: `string`[]

Classification tags.

***

### tokenId?

> `optional` **tokenId?**: `string` \| `null`

Contract or token address for token methods.

***

### warning?

> `optional` **warning?**: `string`

Warning message, when the API sends one.
