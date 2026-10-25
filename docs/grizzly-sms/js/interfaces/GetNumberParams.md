[**grizzly-sms**](../README.md)

***

[grizzly-sms](../README.md) / GetNumberParams

# Interface: GetNumberParams

## Properties

### country?

> `optional` **country?**: `string` \| `number`

Country id. `"any"` or omitting the field lets Grizzly pick a country
by stock, price, and deliverability.

***

### exceptProviderIds?

> `optional` **exceptProviderIds?**: `string` \| readonly (`string` \| `number`)[]

***

### maxPrice?

> `optional` **maxPrice?**: `number`

***

### minPrice?

> `optional` **minPrice?**: `number`

***

### phoneException?

> `optional` **phoneException?**: `string` \| readonly `string`[]

Prefixes to skip. Each item is a country code plus 3–6 digits of the
number mask, for example `1628` or `147220`.

***

### providerIds?

> `optional` **providerIds?**: `string` \| readonly (`string` \| `number`)[]

***

### service

> **service**: `string`
