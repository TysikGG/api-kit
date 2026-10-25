[**yescaptcha-client**](../README.md)

***

[yescaptcha-client](../README.md) / TaskResult

# Interface: TaskResult\<T\>

Result returned by `getTaskResult`.

## Type Parameters

### T

`T` = `Record`\<`string`, `unknown`\>

## Properties

### solution?

> `optional` **solution?**: `T`

Solution payload when status is `ready`.

***

### status

> **status**: [`TaskStatus`](../type-aliases/TaskStatus.md)

Status of the task: `processing` or `ready`.
