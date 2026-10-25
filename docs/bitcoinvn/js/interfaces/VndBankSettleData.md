[**bitcoinvn**](../README.md)

***

[bitcoinvn](../README.md) / VndBankSettleData

# Interface: VndBankSettleData

VND bank payout. `bank` comes from `transferMethods.vnd.details.banks`.

## Properties

### accountHolder?

> `optional` **accountHolder?**: `string`

Optional account holder name.

***

### accountNumber

> **accountNumber**: `string`

VND bank account number.

***

### bank

> **bank**: `string`

Bank identifier from `GET /api/info`.

***

### note?

> `optional` **note?**: `string`

Optional transfer note.
