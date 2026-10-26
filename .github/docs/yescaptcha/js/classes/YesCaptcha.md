[**yescaptcha-client**](../README.md)

***

[yescaptcha-client](../README.md) / YesCaptcha

# Class: YesCaptcha

Client for the YesCaptcha recognition API.

## Example

```ts
const client = new YesCaptcha({ clientKey: "your_client_key" });
const balance = await client.getBalance();
```

## Constructors

### Constructor

> **new YesCaptcha**(`options`): `YesCaptcha`

#### Parameters

##### options

`string` \| [`YesCaptchaOptions`](../interfaces/YesCaptchaOptions.md)

Client options or client key string.

#### Returns

`YesCaptcha`

## Methods

### createTask()

> **createTask**(`task`): `Promise`\<`string`\>

Submit a new recognition task.
Automatically embeds the application software identifier (`softID`).

#### Parameters

##### task

[`TaskParams`](../interfaces/TaskParams.md)

Captcha task parameters (e.g. `NoCaptchaTaskProxyless`, `TurnstileTaskProxyless`).

#### Returns

`Promise`\<`string`\>

The generated `taskId`.

#### Example

```ts
const taskId = await client.createTask({
  type: "TurnstileTaskProxyless",
  websiteURL: "https://example.com",
  websiteKey: "0x4AAAAAAA...",
});
```

***

### getBalance()

> **getBalance**(): `Promise`\<[`YesCaptchaBalance`](../interfaces/YesCaptchaBalance.md)\>

Check account balance.

#### Returns

`Promise`\<[`YesCaptchaBalance`](../interfaces/YesCaptchaBalance.md)\>

#### Example

```ts
const { balance } = await client.getBalance();
console.log(`Balance: ${balance}`);
```

***

### getTaskResult()

> **getTaskResult**\<`T`\>(`taskId`): `Promise`\<[`TaskResult`](../interfaces/TaskResult.md)\<`T`\>\>

Query the result of a submitted task.

#### Type Parameters

##### T

`T` = `Record`\<`string`, `unknown`\>

#### Parameters

##### taskId

`string`

Task identifier returned by `createTask`.

#### Returns

`Promise`\<[`TaskResult`](../interfaces/TaskResult.md)\<`T`\>\>

#### Example

```ts
const result = await client.getTaskResult(taskId);
if (result.status === "ready") {
  console.log("Solution:", result.solution);
}
```

***

### solve()

> **solve**\<`T`\>(`task`, `options?`): `Promise`\<`T`\>

Submit a task and wait for its completion in a single call.

#### Type Parameters

##### T

`T` = `Record`\<`string`, `unknown`\>

#### Parameters

##### task

[`TaskParams`](../interfaces/TaskParams.md)

##### options?

[`WaitForOptions`](../interfaces/WaitForOptions.md) = `{}`

#### Returns

`Promise`\<`T`\>

#### Example

```ts
const solution = await client.solve({
  type: "TurnstileTaskProxyless",
  websiteURL: "https://example.com",
  websiteKey: "0x4AAAAAAA...",
});
```

***

### waitForResult()

> **waitForResult**\<`T`\>(`taskId`, `options?`): `Promise`\<`T`\>

Poll `getTaskResult` until the solution is ready or the timeout is reached.

#### Type Parameters

##### T

`T` = `Record`\<`string`, `unknown`\>

#### Parameters

##### taskId

`string`

Task identifier.

##### options?

[`WaitForOptions`](../interfaces/WaitForOptions.md) = `{}`

Polling configuration (intervalMs, timeoutMs, AbortSignal).

#### Returns

`Promise`\<`T`\>

#### Example

```ts
const solution = await client.waitForResult(taskId, { timeoutMs: 60_000 });
```
