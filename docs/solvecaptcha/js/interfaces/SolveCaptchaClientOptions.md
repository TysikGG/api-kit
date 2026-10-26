[**solvecaptcha-client**](../README.md)

***

[solvecaptcha-client](../README.md) / SolveCaptchaClientOptions

# Interface: SolveCaptchaClientOptions

Defined in: src/index.ts:11

Configuration options for the SolveCaptchaClient.

## Properties

### apiKey

> **apiKey**: `string`

Defined in: src/index.ts:15

API key obtained from SolveCaptcha dashboard.

***

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: src/index.ts:19

Base URL for the SolveCaptcha API. Defaults to https://api.solvecaptcha.com.

***

### defaultPollingIntervalMs?

> `optional` **defaultPollingIntervalMs?**: `number`

Defined in: src/index.ts:35

Default polling interval in milliseconds. Defaults to 5000 ms.

***

### defaultPollingTimeoutMs?

> `optional` **defaultPollingTimeoutMs?**: `number`

Defined in: src/index.ts:31

Default polling timeout in milliseconds for captcha resolution. Defaults to 120000 ms.

***

### softId?

> `optional` **softId?**: `string` \| `number`

Defined in: src/index.ts:27

Optional partner/software ID.

***

### timeout?

> `optional` **timeout?**: `number`

Defined in: src/index.ts:23

Request timeout in milliseconds. Defaults to 30000 ms.
