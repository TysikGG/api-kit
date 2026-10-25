[**bitcoinvn**](../README.md)

***

[bitcoinvn](../README.md) / CryptoAddressSettleData

# Interface: CryptoAddressSettleData

Cryptocurrency address payout.

## Properties

### address

> **address**: `string`

Settlement address, or an ASCII ENS name when `ensResolutionToken` is set.

***

### ensResolutionToken?

> `optional` **ensResolutionToken?**: `string`

Token from `GET /api/addresses/resolve`. Valid for 15 minutes.
