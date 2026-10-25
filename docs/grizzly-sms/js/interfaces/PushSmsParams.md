[**grizzly-sms**](../README.md)

***

[grizzly-sms](../README.md) / PushSmsParams

# Interface: PushSmsParams

## Extends

- [`PushRetryOptions`](PushRetryOptions.md)

## Properties

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

### smsId

> **smsId**: `number`

***

### text

> **text**: `string`
