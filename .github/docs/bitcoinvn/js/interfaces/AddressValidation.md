[**bitcoinvn**](../README.md)

***

[bitcoinvn](../README.md) / AddressValidation

# Interface: AddressValidation

Result of `GET /api/addresses/validate`.

## Properties

### error?

> `optional` **error?**: `string` \| `null`

Reason validation failed. Omitted when `valid` is true.

***

### valid

> **valid**: `boolean`

Whether the address or invoice is valid for the transfer method.
