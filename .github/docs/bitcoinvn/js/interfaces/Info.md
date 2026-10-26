[**bitcoinvn**](../README.md)

***

[bitcoinvn](../README.md) / Info

# Interface: Info

Public catalogs from `GET /api/info`.

## Properties

### assets

> **assets**: `Record`\<`string`, [`Asset`](Asset.md)\>

Assets keyed by asset id. A record can exist when no method is active.

***

### transferMethods

> **transferMethods**: `Record`\<`string`, [`TransferMethod`](TransferMethod.md)\>

Methods keyed by the exact id clients must send.
