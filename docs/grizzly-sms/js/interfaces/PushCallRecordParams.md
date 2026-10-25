[**grizzly-sms**](../README.md)

***

[grizzly-sms](../README.md) / PushCallRecordParams

# Interface: PushCallRecordParams

## Extends

- [`PushRetryOptions`](PushRetryOptions.md)

## Properties

### callId

> **callId**: `number`

***

### file?

> `optional` **file?**: `Blob`

wav, amr, mp3, or ogg. Required when `text` is omitted.

***

### filename?

> `optional` **filename?**: `string`

***

### phone

> **phone**: `number`

***

### phoneFrom

> **phoneFrom**: `string`

***

### retries?

> `optional` **retries?**: `number`

Extra attempts after the first request. Default `0`.

#### Inherited from

[`PushRetryOptions`](PushRetryOptions.md).[`retries`](PushRetryOptions.md#retries)

***

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Delay between attempts. The protocol asks for 10 seconds.

#### Inherited from

[`PushRetryOptions`](PushRetryOptions.md).[`retryDelayMs`](PushRetryOptions.md#retrydelayms)

***

### text?

> `optional` **text?**: `string`

Required when `file` is omitted.
