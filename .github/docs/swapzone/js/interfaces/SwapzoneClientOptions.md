[**swapzone-client**](../README.md)

***

[swapzone-client](../README.md) / SwapzoneClientOptions

# Interface: SwapzoneClientOptions

Client configuration options for Swapzone.

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Swapzone API key (defaults to process.env.SWAPZONE_API_KEY).

***

### baseURL?

> `optional` **baseURL?**: `string`

Base URL for the Swapzone API. Defaults to https://api.swapzone.io.

***

### timeoutMs?

> `optional` **timeoutMs?**: `number`

HTTP request timeout in milliseconds. Defaults to 30000 (30 seconds).

***

### userAgent?

> `optional` **userAgent?**: `string`

Optional custom User-Agent header.
