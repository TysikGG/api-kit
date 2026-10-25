[**yescaptcha-client**](../README.md)

***

[yescaptcha-client](../README.md) / WaitForOptions

# Interface: WaitForOptions

Options for polling task completion.

## Properties

### intervalMs?

> `optional` **intervalMs?**: `number`

Polling interval in milliseconds. Defaults to 3000ms.

***

### signal?

> `optional` **signal?**: `AbortSignal`

Optional AbortSignal to cancel polling.

***

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Maximum wait time in milliseconds before timing out. Defaults to 120000ms.
