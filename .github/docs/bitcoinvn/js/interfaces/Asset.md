[**bitcoinvn**](../README.md)

***

[bitcoinvn](../README.md) / Asset

# Interface: Asset

Asset record from `GET /api/info`.

## Properties

### bridgeFee

> **bridgeFee**: `number`

Percentage-based fee for cross-network bridge operations.

***

### exchangeFee

> **exchangeFee**: `number`

Percentage-based fee on currency conversions involving this asset.

***

### id

> **id**: `string`

Unique asset ticker symbol.

***

### name

> **name**: `string`

Human-readable asset name.

***

### sameAs?

> `optional` **sameAs?**: `string` \| `null`

When set, this asset is an alias of another asset.

***

### tags

> **tags**: `string`[]

Classification tags such as `crypto`, `fiat`, or `stablecoin`.
