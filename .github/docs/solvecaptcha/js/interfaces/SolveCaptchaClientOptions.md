[**solvecaptcha-client**](../README.md)

***

[solvecaptcha-client](../README.md) / SolveCaptchaClientOptions

# Interface: SolveCaptchaClientOptions

Defined in: [src/index.ts:11](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/solvecaptcha/js/src/index.ts#L11)

Configuration options for the SolveCaptchaClient.

## Properties

### apiKey

> **apiKey**: `string`

Defined in: [src/index.ts:15](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/solvecaptcha/js/src/index.ts#L15)

API key obtained from SolveCaptcha dashboard.

***

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [src/index.ts:19](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/solvecaptcha/js/src/index.ts#L19)

Base URL for the SolveCaptcha API. Defaults to https://api.solvecaptcha.com.

***

### defaultPollingIntervalMs?

> `optional` **defaultPollingIntervalMs?**: `number`

Defined in: [src/index.ts:35](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/solvecaptcha/js/src/index.ts#L35)

Default polling interval in milliseconds. Defaults to 5000 ms.

***

### defaultPollingTimeoutMs?

> `optional` **defaultPollingTimeoutMs?**: `number`

Defined in: [src/index.ts:31](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/solvecaptcha/js/src/index.ts#L31)

Default polling timeout in milliseconds for captcha resolution. Defaults to 120000 ms.

***

### softId?

> `optional` **softId?**: `string` \| `number`

Defined in: [src/index.ts:27](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/solvecaptcha/js/src/index.ts#L27)

Optional partner/software ID.

***

### timeout?

> `optional` **timeout?**: `number`

Defined in: [src/index.ts:23](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/solvecaptcha/js/src/index.ts#L23)

Request timeout in milliseconds. Defaults to 30000 ms.
