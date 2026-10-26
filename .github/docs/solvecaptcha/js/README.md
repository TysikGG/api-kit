**solvecaptcha**

***

# solvecaptcha

## Classes

### SolveCaptchaClient

Defined in: [src/index.ts:255](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L255)

Client for the SolveCaptcha human and AI captcha solving service.

#### Constructors

##### Constructor

> **new SolveCaptchaClient**(`options`): [`SolveCaptchaClient`](#solvecaptchaclient)

Defined in: [src/index.ts:276](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L276)

Creates a new SolveCaptchaClient.

###### Parameters

###### options

`string` \| [`SolveCaptchaClientOptions`](#solvecaptchaclientoptions)

API key string or configuration object.

###### Returns

[`SolveCaptchaClient`](#solvecaptchaclient)

###### Example

```typescript
import { SolveCaptchaClient } from 'solvecaptcha-client';

const client = new SolveCaptchaClient({ apiKey: 'YOUR_API_KEY' });
const balance = await client.getBalance();
console.log(`Balance: $${balance}`);
```

#### Methods

##### createTask()

> **createTask**(`params`): `Promise`\<`string`\>

Defined in: [src/index.ts:543](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L543)

Submits a captcha task to /in.php and returns the assigned task ID.

###### Parameters

###### params

`Record`\<`string`, `unknown`\>

Task parameters.

###### Returns

`Promise`\<`string`\>

Assigned numeric task ID string.

##### getBalance()

> **getBalance**(): `Promise`\<`number`\>

Defined in: [src/index.ts:315](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L315)

Retrieves the current account balance.

###### Returns

`Promise`\<`number`\>

Current balance in USD.

###### Example

```typescript
const balance = await client.getBalance();
console.log(`Current balance: $${balance}`);
```

##### getTaskResult()

> **getTaskResult**(`taskId`): `Promise`\<`string` \| `null`\>

Defined in: [src/index.ts:593](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L593)

Checks the status and gets the result of a submitted task.

###### Parameters

###### taskId

`string`

Task ID returned by createTask.

###### Returns

`Promise`\<`string` \| `null`\>

Solution string, or null if captcha is still being solved.

##### reportBad()

> **reportBad**(`taskId`): `Promise`\<`boolean`\>

Defined in: [src/index.ts:662](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L662)

Reports that a captcha was solved incorrectly to request a refund.

###### Parameters

###### taskId

`string`

Task ID.

###### Returns

`Promise`\<`boolean`\>

True if report recorded.

##### reportGood()

> **reportGood**(`taskId`): `Promise`\<`boolean`\>

Defined in: [src/index.ts:644](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L644)

Reports that a captcha was solved correctly.

###### Parameters

###### taskId

`string`

Task ID.

###### Returns

`Promise`\<`boolean`\>

True if report recorded.

##### solveFunCaptcha()

> **solveFunCaptcha**(`options`): `Promise`\<`string`\>

Defined in: [src/index.ts:483](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L483)

Solves Arkose Labs FunCaptcha.

###### Parameters

###### options

[`FunCaptchaOptions`](#funcaptchaoptions)

FunCaptcha options.

###### Returns

`Promise`\<`string`\>

Solution token.

###### Example

```typescript
const token = await client.solveFunCaptcha({
  publickey: '69A21A01-CC43-44CC-A7DC-3E088835E78D',
  pageurl: 'https://example.com/signup',
});
```

##### solveGeeTest()

> **solveGeeTest**(`options`): `Promise`\<[`GeeTestResult`](#geetestresult)\>

Defined in: [src/index.ts:514](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L514)

Solves GeeTest captcha.

###### Parameters

###### options

[`GeeTestOptions`](#geetestoptions)

GeeTest options.

###### Returns

`Promise`\<[`GeeTestResult`](#geetestresult)\>

GeeTestResult object with challenge, validate, and seccode.

###### Example

```typescript
const res = await client.solveGeeTest({
  gt: '022397c99c9d64352069eab73bc373d7',
  challenge: '3049170ffb08bb6b907572ca35489f07',
  pageurl: 'https://example.com/geetest',
});
console.log(res.validate);
```

##### solveImage()

> **solveImage**(`options`): `Promise`\<`string`\>

Defined in: [src/index.ts:340](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L340)

Solves an image-based captcha from base64 data.

###### Parameters

###### options

`string` \| [`ImageCaptchaOptions`](#imagecaptchaoptions)

Image parameters or base64 string.

###### Returns

`Promise`\<`string`\>

Solved captcha text solution.

###### Example

```typescript
const text = await client.solveImage({
  body: 'iVBORw0KGgoAAAANSUhEUgAA...',
});
console.log(`Solved text: ${text}`);
```

##### solveRecaptchaV2()

> **solveRecaptchaV2**(`options`): `Promise`\<`string`\>

Defined in: [src/index.ts:398](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L398)

Solves Google reCAPTCHA V2.

###### Parameters

###### options

[`RecaptchaV2Options`](#recaptchav2options)

reCAPTCHA V2 options.

###### Returns

`Promise`\<`string`\>

Solution token.

###### Example

```typescript
const token = await client.solveRecaptchaV2({
  googlekey: '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-',
  pageurl: 'https://example.com/login',
});
console.log('Token:', token);
```

##### solveRecaptchaV3()

> **solveRecaptchaV3**(`options`): `Promise`\<`string`\>

Defined in: [src/index.ts:427](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L427)

Solves Google reCAPTCHA V3.

###### Parameters

###### options

[`RecaptchaV3Options`](#recaptchav3options)

reCAPTCHA V3 options.

###### Returns

`Promise`\<`string`\>

Solution token.

###### Example

```typescript
const token = await client.solveRecaptchaV3({
  googlekey: '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-',
  pageurl: 'https://example.com/login',
  action: 'verify',
  minScore: 0.7,
});
```

##### solveText()

> **solveText**(`text`, `options?`): `Promise`\<`string`\>

Defined in: [src/index.ts:373](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L373)

Solves a text question captcha.

###### Parameters

###### text

`string`

The question text to answer.

###### options?

[`TextCaptchaOptions`](#textcaptchaoptions)

Additional options.

###### Returns

`Promise`\<`string`\>

Answer to the question.

###### Example

```typescript
const answer = await client.solveText('If tomorrow is Saturday, what day is today?');
console.log(`Answer: ${answer}`);
```

##### solveTurnstile()

> **solveTurnstile**(`options`): `Promise`\<`string`\>

Defined in: [src/index.ts:455](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L455)

Solves Cloudflare Turnstile.

###### Parameters

###### options

[`TurnstileOptions`](#turnstileoptions)

Turnstile options.

###### Returns

`Promise`\<`string`\>

Turnstile token.

###### Example

```typescript
const token = await client.solveTurnstile({
  sitekey: '0x4AAAAAAABnEBq1w7gYv_m-',
  pageurl: 'https://example.com/page',
});
```

##### waitForResult()

> **waitForResult**(`taskId`, `timeoutMs?`, `intervalMs?`): `Promise`\<`string`\>

Defined in: [src/index.ts:615](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L615)

Polls until a captcha task is solved or timeout occurs.

###### Parameters

###### taskId

`string`

Task ID.

###### timeoutMs?

`number`

Maximum milliseconds to wait.

###### intervalMs?

`number`

Polling interval in milliseconds.

###### Returns

`Promise`\<`string`\>

Solved captcha string.

***

### SolveCaptchaError

Defined in: [src/index.ts:233](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L233)

Error thrown by the SolveCaptcha client when API requests or solving tasks fail.

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new SolveCaptchaError**(`message`, `code?`, `responseBody?`): [`SolveCaptchaError`](#solvecaptchaerror)

Defined in: [src/index.ts:243](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L243)

###### Parameters

###### message

`string`

###### code?

`string`

###### responseBody?

`unknown`

###### Returns

[`SolveCaptchaError`](#solvecaptchaerror)

###### Overrides

`Error.constructor`

#### Properties

##### cause?

> `optional` **cause?**: `unknown`

Defined in: node\_modules/typescript/lib/lib.es2022.error.d.ts:26

###### Inherited from

`Error.cause`

##### code?

> `readonly` `optional` **code?**: `string`

Defined in: [src/index.ts:237](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L237)

Error code returned by SolveCaptcha.

##### message

> **message**: `string`

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1077

###### Inherited from

`Error.message`

##### name

> **name**: `string`

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1076

###### Inherited from

`Error.name`

##### responseBody?

> `readonly` `optional` **responseBody?**: `unknown`

Defined in: [src/index.ts:241](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L241)

Raw server response payload.

##### stack?

> `optional` **stack?**: `string`

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1078

###### Inherited from

`Error.stack`

##### stackTraceLimit

> `static` **stackTraceLimit**: `number`

Defined in: node\_modules/@types/node/globals.d.ts:68

The `Error.stackTraceLimit` property specifies the number of stack frames
collected by a stack trace (whether generated by `new Error().stack` or
`Error.captureStackTrace(obj)`).

The default value is `10` but may be set to any valid JavaScript number. Changes
will affect any stack trace captured _after_ the value has been changed.

If set to a non-number value, or set to a negative number, stack traces will
not capture any frames.

###### Inherited from

`Error.stackTraceLimit`

#### Methods

##### captureStackTrace()

> `static` **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

Defined in: node\_modules/@types/node/globals.d.ts:52

Creates a `.stack` property on `targetObject`, which when accessed returns
a string representing the location in the code at which
`Error.captureStackTrace()` was called.

```js
const myObject = {};
Error.captureStackTrace(myObject);
myObject.stack;  // Similar to `new Error().stack`
```

The first line of the trace will be prefixed with
`${myObject.name}: ${myObject.message}`.

The optional `constructorOpt` argument accepts a function. If given, all frames
above `constructorOpt`, including `constructorOpt`, will be omitted from the
generated stack trace.

The `constructorOpt` argument is useful for hiding implementation
details of error generation from the user. For instance:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  // Create an error without stack trace to avoid calculating the stack trace twice.
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  const error = new Error();
  Error.stackTraceLimit = stackTraceLimit;

  // Capture the stack trace above function b
  Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
  throw error;
}

a();
```

###### Parameters

###### targetObject

`object`

###### constructorOpt?

`Function`

###### Returns

`void`

###### Inherited from

`Error.captureStackTrace`

##### prepareStackTrace()

> `static` **prepareStackTrace**(`err`, `stackTraces`): `any`

Defined in: node\_modules/@types/node/globals.d.ts:56

###### Parameters

###### err

`Error`

###### stackTraces

`CallSite`[]

###### Returns

`any`

###### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

###### Inherited from

`Error.prepareStackTrace`

## Interfaces

### FunCaptchaOptions

Defined in: [src/index.ts:161](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L161)

Options for solving Arkose Labs FunCaptcha.

#### Properties

##### data?

> `optional` **data?**: `string` \| `Record`\<`string`, `unknown`\>

Defined in: [src/index.ts:177](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L177)

Custom data payload.

##### pageurl

> **pageurl**: `string`

Defined in: [src/index.ts:169](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L169)

Full URL of the page containing FunCaptcha.

##### publickey

> **publickey**: `string`

Defined in: [src/index.ts:165](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L165)

FunCaptcha public key.

##### surl?

> `optional` **surl?**: `string`

Defined in: [src/index.ts:173](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L173)

Custom service URL (surl).

***

### GeeTestOptions

Defined in: [src/index.ts:183](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L183)

Options for solving GeeTest captcha.

#### Properties

##### apiServer?

> `optional` **apiServer?**: `string`

Defined in: [src/index.ts:199](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L199)

Optional custom api_server domain.

##### challenge

> **challenge**: `string`

Defined in: [src/index.ts:191](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L191)

GeeTest 'challenge' token.

##### gt

> **gt**: `string`

Defined in: [src/index.ts:187](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L187)

GeeTest 'gt' key.

##### pageurl

> **pageurl**: `string`

Defined in: [src/index.ts:195](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L195)

Full URL of the page containing GeeTest.

***

### GeeTestResult

Defined in: [src/index.ts:205](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L205)

Result returned for GeeTest captcha solutions.

#### Properties

##### challenge

> **challenge**: `string`

Defined in: [src/index.ts:206](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L206)

##### seccode

> **seccode**: `string`

Defined in: [src/index.ts:208](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L208)

##### validate

> **validate**: `string`

Defined in: [src/index.ts:207](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L207)

***

### ImageCaptchaOptions

Defined in: [src/index.ts:39](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L39)

Options for solving a normal image captcha.

#### Properties

##### body

> **body**: `string`

Defined in: [src/index.ts:43](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L43)

Base64 encoded image string.

##### calc?

> `optional` **calc?**: `0` \| `1`

Defined in: [src/index.ts:59](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L59)

0 = no math, 1 = requires calculation.

##### language?

> `optional` **language?**: `0` \| `1` \| `2`

Defined in: [src/index.ts:71](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L71)

0 = not specified, 1 = Cyrillic, 2 = Latin.

##### maxLen?

> `optional` **maxLen?**: `number`

Defined in: [src/index.ts:67](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L67)

Maximum number of characters.

##### minLen?

> `optional` **minLen?**: `number`

Defined in: [src/index.ts:63](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L63)

Minimum number of characters.

##### numeric?

> `optional` **numeric?**: `0` \| `1` \| `2` \| `3` \| `4`

Defined in: [src/index.ts:55](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L55)

0 = not specified, 1 = only numbers, 2 = only letters, 3 = only numbers OR only letters, 4 = both numbers and letters.

##### phrase?

> `optional` **phrase?**: `0` \| `1`

Defined in: [src/index.ts:47](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L47)

0 = single word, 1 = two or more words.

##### regsense?

> `optional` **regsense?**: `0` \| `1`

Defined in: [src/index.ts:51](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L51)

0 = case insensitive, 1 = case sensitive.

##### textinstructions?

> `optional` **textinstructions?**: `string`

Defined in: [src/index.ts:75](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L75)

Optional text instructions for the worker.

***

### RecaptchaV2Options

Defined in: [src/index.ts:91](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L91)

Options for solving Google reCAPTCHA V2.

#### Properties

##### dataS?

> `optional` **dataS?**: `string`

Defined in: [src/index.ts:107](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L107)

Optional 'data-s' parameter value for protected endpoints.

##### googlekey

> **googlekey**: `string`

Defined in: [src/index.ts:95](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L95)

Sitekey found in target page HTML.

##### invisible?

> `optional` **invisible?**: `boolean`

Defined in: [src/index.ts:103](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L103)

Whether the reCAPTCHA is invisible.

##### pageurl

> **pageurl**: `string`

Defined in: [src/index.ts:99](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L99)

Full URL of the page containing the reCAPTCHA.

***

### RecaptchaV3Options

Defined in: [src/index.ts:113](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L113)

Options for solving Google reCAPTCHA V3.

#### Properties

##### action?

> `optional` **action?**: `string`

Defined in: [src/index.ts:125](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L125)

Action parameter value.

##### googlekey

> **googlekey**: `string`

Defined in: [src/index.ts:117](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L117)

Sitekey found in target page HTML.

##### minScore?

> `optional` **minScore?**: `number`

Defined in: [src/index.ts:129](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L129)

Minimum required score (e.g. 0.3, 0.7, 0.9).

##### pageurl

> **pageurl**: `string`

Defined in: [src/index.ts:121](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L121)

Full URL of the page containing the reCAPTCHA.

***

### SolveCaptchaClientOptions

Defined in: [src/index.ts:9](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L9)

Configuration options for the SolveCaptchaClient.

#### Properties

##### apiKey

> **apiKey**: `string`

Defined in: [src/index.ts:13](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L13)

API key obtained from SolveCaptcha dashboard.

##### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [src/index.ts:17](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L17)

Base URL for the SolveCaptcha API. Defaults to https://api.solvecaptcha.com.

##### defaultPollingIntervalMs?

> `optional` **defaultPollingIntervalMs?**: `number`

Defined in: [src/index.ts:33](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L33)

Default polling interval in milliseconds. Defaults to 5000 ms.

##### defaultPollingTimeoutMs?

> `optional` **defaultPollingTimeoutMs?**: `number`

Defined in: [src/index.ts:29](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L29)

Default polling timeout in milliseconds for captcha resolution. Defaults to 120000 ms.

##### softId?

> `optional` **softId?**: `string` \| `number`

Defined in: [src/index.ts:25](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L25)

Optional partner/software ID.

##### timeout?

> `optional` **timeout?**: `number`

Defined in: [src/index.ts:21](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L21)

Request timeout in milliseconds. Defaults to 30000 ms.

***

### TextCaptchaOptions

Defined in: [src/index.ts:81](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L81)

Options for solving a text question captcha.

#### Properties

##### language?

> `optional` **language?**: `0` \| `1` \| `2`

Defined in: [src/index.ts:85](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L85)

0 = not specified, 1 = Cyrillic, 2 = Latin.

***

### TurnstileOptions

Defined in: [src/index.ts:135](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L135)

Options for solving Cloudflare Turnstile.

#### Properties

##### action?

> `optional` **action?**: `string`

Defined in: [src/index.ts:147](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L147)

Optional action parameter.

##### data?

> `optional` **data?**: `string`

Defined in: [src/index.ts:151](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L151)

Optional cData parameter.

##### pagedata?

> `optional` **pagedata?**: `string`

Defined in: [src/index.ts:155](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L155)

Optional pagedata parameter.

##### pageurl

> **pageurl**: `string`

Defined in: [src/index.ts:143](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L143)

Full URL of the page with the Turnstile widget.

##### sitekey

> **sitekey**: `string`

Defined in: [src/index.ts:139](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L139)

Turnstile sitekey.

## Variables

### DEFAULT\_SOFT\_ID

> `const` **DEFAULT\_SOFT\_ID**: `""` = `''`

Defined in: [src/index.ts:4](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L4)

**`Internal`**

***

### SOLVE\_CAPTCHA\_ERRORS

> `const` **SOLVE\_CAPTCHA\_ERRORS**: `Record`\<`string`, `string`\>

Defined in: [src/index.ts:214](https://github.com/TysikGG/api-kit/blob/1670ebdeb94706da0170e404cd9baa6f4088d210/solvecaptcha/js/src/index.ts#L214)

Known error descriptions for SolveCaptcha.
