[**bitcoinvn**](../README.md)

***

[bitcoinvn](../README.md) / Vault

# Interface: Vault

Staking offer from `GET /api/staking`.

## Properties

### asset

> **asset**: `string`

Asset id of the staking receipt token.

***

### distribution

> **distribution**: `number`

Share of exchange volume rewarded to stakers.

***

### id

> **id**: `string`

Staking offer UUID.

***

### latestApr

> **latestApr**: `number`

APR based on the currently staked amount.

***

### latestFullyDilutedApr

> **latestFullyDilutedApr**: `number`

APR based on the fully diluted supply.

***

### staked

> **staked**: `number`

Total amount currently staked.

***

### supplyTarget

> **supplyTarget**: `number`

Positive maximum amount that can be staked.

***

### tvl?

> `optional` **tvl?**: `number`

Total value locked in USD. Omitted when unavailable.

***

### unstakingFee?

> `optional` **unstakingFee?**: `number`

Fee rate charged when funds are unstaked.
