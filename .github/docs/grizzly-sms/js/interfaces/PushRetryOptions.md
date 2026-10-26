[**grizzly-sms**](../README.md)

***

[grizzly-sms](../README.md) / PushRetryOptions

# Interface: PushRetryOptions

## Extended by

- [`PushCallParams`](PushCallParams.md)
- [`PushCallRecordParams`](PushCallRecordParams.md)
- [`PushSmsParams`](PushSmsParams.md)

## Properties

### retries?

> `optional` **retries?**: `number`

Extra attempts after the first request. Default `0`.

***

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Delay between attempts. The protocol asks for 10 seconds.
