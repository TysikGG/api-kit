[**solvecaptcha-client**](../README.md)

***

[solvecaptcha-client](../README.md) / SolveCaptchaClient

# Class: SolveCaptchaClient

Defined in: src/index.ts:257

Client for the SolveCaptcha human and AI captcha solving service.

## Constructors

### Constructor

> **new SolveCaptchaClient**(`options`): `SolveCaptchaClient`

Defined in: src/index.ts:278

Creates a new SolveCaptchaClient.

#### Parameters

##### options

`string` \| [`SolveCaptchaClientOptions`](../interfaces/SolveCaptchaClientOptions.md)

API key string or configuration object.

#### Returns

`SolveCaptchaClient`

#### Example

```typescript
import { SolveCaptchaClient } from 'solvecaptcha-client';

const client = new SolveCaptchaClient({ apiKey: 'YOUR_API_KEY' });
const balance = await client.getBalance();
console.log(`Balance: $${balance}`);
```

## Methods

### createTask()

> **createTask**(`params`): `Promise`\<`string`\>

Defined in: src/index.ts:545

Submits a captcha task to /in.php and returns the assigned task ID.

#### Parameters

##### params

`Record`\<`string`, `unknown`\>

Task parameters.

#### Returns

`Promise`\<`string`\>

Assigned numeric task ID string.

***

### getBalance()

> **getBalance**(): `Promise`\<`number`\>

Defined in: src/index.ts:317

Retrieves the current account balance.

#### Returns

`Promise`\<`number`\>

Current balance in USD.

#### Example

```typescript
const balance = await client.getBalance();
console.log(`Current balance: $${balance}`);
```

***

### getTaskResult()

> **getTaskResult**(`taskId`): `Promise`\<`string` \| `null`\>

Defined in: src/index.ts:595

Checks the status and gets the result of a submitted task.

#### Parameters

##### taskId

`string`

Task ID returned by createTask.

#### Returns

`Promise`\<`string` \| `null`\>

Solution string, or null if captcha is still being solved.

***

### reportBad()

> **reportBad**(`taskId`): `Promise`\<`boolean`\>

Defined in: src/index.ts:664

Reports that a captcha was solved incorrectly to request a refund.

#### Parameters

##### taskId

`string`

Task ID.

#### Returns

`Promise`\<`boolean`\>

True if report recorded.

***

### reportGood()

> **reportGood**(`taskId`): `Promise`\<`boolean`\>

Defined in: src/index.ts:646

Reports that a captcha was solved correctly.

#### Parameters

##### taskId

`string`

Task ID.

#### Returns

`Promise`\<`boolean`\>

True if report recorded.

***

### solveFunCaptcha()

> **solveFunCaptcha**(`options`): `Promise`\<`string`\>

Defined in: src/index.ts:485

Solves Arkose Labs FunCaptcha.

#### Parameters

##### options

[`FunCaptchaOptions`](../interfaces/FunCaptchaOptions.md)

FunCaptcha options.

#### Returns

`Promise`\<`string`\>

Solution token.

#### Example

```typescript
const token = await client.solveFunCaptcha({
  publickey: '69A21A01-CC43-44CC-A7DC-3E088835E78D',
  pageurl: 'https://example.com/signup',
});
```

***

### solveGeeTest()

> **solveGeeTest**(`options`): `Promise`\<[`GeeTestResult`](../interfaces/GeeTestResult.md)\>

Defined in: src/index.ts:516

Solves GeeTest captcha.

#### Parameters

##### options

[`GeeTestOptions`](../interfaces/GeeTestOptions.md)

GeeTest options.

#### Returns

`Promise`\<[`GeeTestResult`](../interfaces/GeeTestResult.md)\>

GeeTestResult object with challenge, validate, and seccode.

#### Example

```typescript
const res = await client.solveGeeTest({
  gt: '022397c99c9d64352069eab73bc373d7',
  challenge: '3049170ffb08bb6b907572ca35489f07',
  pageurl: 'https://example.com/geetest',
});
console.log(res.validate);
```

***

### solveImage()

> **solveImage**(`options`): `Promise`\<`string`\>

Defined in: src/index.ts:342

Solves an image-based captcha from base64 data.

#### Parameters

##### options

`string` \| [`ImageCaptchaOptions`](../interfaces/ImageCaptchaOptions.md)

Image parameters or base64 string.

#### Returns

`Promise`\<`string`\>

Solved captcha text solution.

#### Example

```typescript
const text = await client.solveImage({
  body: 'iVBORw0KGgoAAAANSUhEUgAA...',
});
console.log(`Solved text: ${text}`);
```

***

### solveRecaptchaV2()

> **solveRecaptchaV2**(`options`): `Promise`\<`string`\>

Defined in: src/index.ts:400

Solves Google reCAPTCHA V2.

#### Parameters

##### options

[`RecaptchaV2Options`](../interfaces/RecaptchaV2Options.md)

reCAPTCHA V2 options.

#### Returns

`Promise`\<`string`\>

Solution token.

#### Example

```typescript
const token = await client.solveRecaptchaV2({
  googlekey: '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-',
  pageurl: 'https://example.com/login',
});
console.log('Token:', token);
```

***

### solveRecaptchaV3()

> **solveRecaptchaV3**(`options`): `Promise`\<`string`\>

Defined in: src/index.ts:429

Solves Google reCAPTCHA V3.

#### Parameters

##### options

[`RecaptchaV3Options`](../interfaces/RecaptchaV3Options.md)

reCAPTCHA V3 options.

#### Returns

`Promise`\<`string`\>

Solution token.

#### Example

```typescript
const token = await client.solveRecaptchaV3({
  googlekey: '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-',
  pageurl: 'https://example.com/login',
  action: 'verify',
  minScore: 0.7,
});
```

***

### solveText()

> **solveText**(`text`, `options?`): `Promise`\<`string`\>

Defined in: src/index.ts:375

Solves a text question captcha.

#### Parameters

##### text

`string`

The question text to answer.

##### options?

[`TextCaptchaOptions`](../interfaces/TextCaptchaOptions.md)

Additional options.

#### Returns

`Promise`\<`string`\>

Answer to the question.

#### Example

```typescript
const answer = await client.solveText('If tomorrow is Saturday, what day is today?');
console.log(`Answer: ${answer}`);
```

***

### solveTurnstile()

> **solveTurnstile**(`options`): `Promise`\<`string`\>

Defined in: src/index.ts:457

Solves Cloudflare Turnstile.

#### Parameters

##### options

[`TurnstileOptions`](../interfaces/TurnstileOptions.md)

Turnstile options.

#### Returns

`Promise`\<`string`\>

Turnstile token.

#### Example

```typescript
const token = await client.solveTurnstile({
  sitekey: '0x4AAAAAAABnEBq1w7gYv_m-',
  pageurl: 'https://example.com/page',
});
```

***

### waitForResult()

> **waitForResult**(`taskId`, `timeoutMs?`, `intervalMs?`): `Promise`\<`string`\>

Defined in: src/index.ts:617

Polls until a captcha task is solved or timeout occurs.

#### Parameters

##### taskId

`string`

Task ID.

##### timeoutMs?

`number`

Maximum milliseconds to wait.

##### intervalMs?

`number`

Polling interval in milliseconds.

#### Returns

`Promise`\<`string`\>

Solved captcha string.
