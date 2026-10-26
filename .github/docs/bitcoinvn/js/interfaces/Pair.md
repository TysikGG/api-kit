[**bitcoinvn**](../README.md)

***

[bitcoinvn](../README.md) / Pair

# Interface: Pair

Pair rate and deposit range from `GET /api/pairs/{deposit}/{settle}`.

## Properties

### max?

> `optional` **max?**: `number` \| `null`

Maximum deposit amount in the deposit asset.
Null means no pair-level maximum. If `max` is less than `min`, there is no valid range.

***

### min

> **min**: `number`

Minimum deposit amount in the deposit asset.

***

### rate

> **rate**: `number`

Rate from deposit method to settle method, including percentage fees.
