[**chaojiying-client**](../README.md)

***

[chaojiying-client](../README.md) / ChaojiyingOptions

# Interface: ChaojiyingOptions

Configuration options for the Chaojiying client.

## Properties

### baseURL?

> `optional` **baseURL?**: `string`

Base URL for the Chaojiying API. Defaults to https://upload.chaojiying.net.

***

### password?

> `optional` **password?**: `string`

Chaojiying user password (defaults to process.env.CHAOJIYING_PASS).
Can be either plaintext or a 32-character lowercase hex MD5 hash.

***

### timeoutMs?

> `optional` **timeoutMs?**: `number`

HTTP request timeout in milliseconds. Defaults to 60000 (60 seconds).

***

### userAgent?

> `optional` **userAgent?**: `string`

Custom User-Agent header string.

***

### username?

> `optional` **username?**: `string`

Chaojiying username (defaults to process.env.CHAOJIYING_USER).
