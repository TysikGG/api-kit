[**peak-client**](../README.md)

***

[peak-client](../README.md) / PeakOptions

# Interface: PeakOptions

Options for configuring the Peak client.

## Properties

### apiKey

> **apiKey**: `string`

API key from the Peak dashboard (`pk_...`).

***

### axios?

> `optional` **axios?**: `AxiosInstance`

Custom Axios instance, useful for testing or custom proxies.

***

### baseUrl?

> `optional` **baseUrl?**: `string`

Base URL for Peak API. Defaults to `https://api.peak.fo`.

***

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Request timeout in milliseconds. Defaults to 60000ms.
