[**sv-number**](../README.md)

***

[sv-number](../README.md) / SvNumberOptions

# Interface: SvNumberOptions

Options for configuring the SvNumber client.

## Properties

### apiKey

> **apiKey**: `string`

API key from the SV Number account dashboard.

***

### axios?

> `optional` **axios?**: `AxiosInstance`

Custom Axios instance, useful for testing or proxy routing.

***

### baseUrl?

> `optional` **baseUrl?**: `string`

Base URL for SV Number. Defaults to `https://sms-verification-number.com`.

***

### lang?

> `optional` **lang?**: `string`

Preferred language for country and service names (`en`, `ru`, etc.).

***

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Request timeout in milliseconds. Defaults to 30000ms.
