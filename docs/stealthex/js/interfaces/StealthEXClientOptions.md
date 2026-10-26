[**stealthex-client**](../README.md)

***

[stealthex-client](../README.md) / StealthEXClientOptions

# Interface: StealthEXClientOptions

Client configuration options for StealthEX.

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

StealthEX API key (defaults to process.env.STEALTHEX_API_KEY).

***

### baseURL?

> `optional` **baseURL?**: `string`

Base URL for the StealthEX API. Defaults to https://api.stealthex.io.

***

### timeoutMs?

> `optional` **timeoutMs?**: `number`

HTTP request timeout in milliseconds. Defaults to 30000 (30 seconds).

***

### userAgent?

> `optional` **userAgent?**: `string`

Custom User-Agent header string.
