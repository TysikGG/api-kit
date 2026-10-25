[**smsbulk-client**](../README.md)

***

[smsbulk-client](../README.md) / SMSBulkClientOptions

# Interface: SMSBulkClientOptions

Client configuration options for SMSBulk.

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

SMSBulk API key (defaults to process.env.SMSBULK_API_KEY).

***

### baseURL?

> `optional` **baseURL?**: `string`

Base URL for the SMSBulk API. Defaults to https://smsbulk.net/api.

***

### timeoutMs?

> `optional` **timeoutMs?**: `number`

HTTP request timeout in milliseconds. Defaults to 30000 (30 seconds).

***

### userAgent?

> `optional` **userAgent?**: `string`

Optional custom User-Agent header.
