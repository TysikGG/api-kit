[**yescaptcha-client**](../README.md)

***

[yescaptcha-client](../README.md) / YesCaptchaOptions

# Interface: YesCaptchaOptions

Options for configuring the YesCaptcha client.

## Properties

### axios?

> `optional` **axios?**: `AxiosInstance`

Custom Axios instance, useful for testing or custom proxies.

***

### baseUrl?

> `optional` **baseUrl?**: `string`

API Base URL. Defaults to `https://api.yescaptcha.com`.

***

### clientKey

> **clientKey**: `string`

Client key from the YesCaptcha dashboard.

***

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Request timeout in milliseconds. Defaults to 30000ms.
