[**bitcoinvn**](../README.md)

***

[bitcoinvn](../README.md) / BitcoinVnOptions

# Interface: BitcoinVnOptions

Client settings. A missing or blank key sends no `X-API-KEY` header.

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

API key sent as `X-API-KEY`. Public reads, quotes, and order creation work
without it. Account reads and account writes require it.

***

### axios?

> `optional` **axios?**: `AxiosInstance`

Axios instance used instead of the built-in client.

***

### baseUrl?

> `optional` **baseUrl?**: `string`

Defaults to `https://bitcoinvn.io`.

***

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Request timeout in milliseconds. Defaults to 30000.
