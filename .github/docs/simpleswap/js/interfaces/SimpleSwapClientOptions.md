[**simpleswap-client**](../README.md)

***

[simpleswap-client](../README.md) / SimpleSwapClientOptions

# Interface: SimpleSwapClientOptions

Client configuration options for SimpleSwap.

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

SimpleSwap API key (defaults to process.env.SIMPLESWAP_API_KEY).

***

### baseURL?

> `optional` **baseURL?**: `string`

Base URL for the SimpleSwap API. Defaults to https://api.simpleswap.io.

***

### timeoutMs?

> `optional` **timeoutMs?**: `number`

HTTP request timeout in milliseconds. Defaults to 30000 (30 seconds).

***

### userAgent?

> `optional` **userAgent?**: `string`

Custom User-Agent header.
