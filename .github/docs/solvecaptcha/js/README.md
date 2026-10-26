**solvecaptcha**

***

# solvecaptcha

## Classes

### SolveCaptchaClient

Defined in: [src/index.ts:257](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L257)

Client for the SolveCaptcha human and AI captcha solving service.

#### Constructors

##### Constructor

> **new SolveCaptchaClient**(`options`): [`SolveCaptchaClient`](#solvecaptchaclient)

Defined in: [src/index.ts:278](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L278)

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

Defined in: [src/index.ts:545](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L545)

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

Defined in: [src/index.ts:317](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L317)

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

Defined in: [src/index.ts:595](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L595)

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

Defined in: [src/index.ts:664](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L664)

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

Defined in: [src/index.ts:646](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L646)

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

Defined in: [src/index.ts:485](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L485)

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

Defined in: [src/index.ts:516](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L516)

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

Defined in: [src/index.ts:342](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L342)

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

Defined in: [src/index.ts:400](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L400)

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

Defined in: [src/index.ts:429](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L429)

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

Defined in: [src/index.ts:375](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L375)

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

Defined in: [src/index.ts:457](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L457)

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

Defined in: [src/index.ts:617](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L617)

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

Defined in: [src/index.ts:235](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L235)

Error thrown by the SolveCaptcha client when API requests or solving tasks fail.

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new SolveCaptchaError**(`message`, `code?`, `responseBody?`): [`SolveCaptchaError`](#solvecaptchaerror)

Defined in: [src/index.ts:245](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L245)

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

Defined in: [src/index.ts:239](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L239)

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

Defined in: [src/index.ts:243](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L243)

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

Defined in: [src/index.ts:163](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L163)

Options for solving Arkose Labs FunCaptcha.

#### Properties

##### data?

> `optional` **data?**: `string` \| `Record`\<`string`, `unknown`\>

Defined in: [src/index.ts:179](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L179)

Custom data payload.

##### pageurl

> **pageurl**: `string`

Defined in: [src/index.ts:171](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L171)

Full URL of the page containing FunCaptcha.

##### publickey

> **publickey**: `string`

Defined in: [src/index.ts:167](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L167)

FunCaptcha public key.

##### surl?

> `optional` **surl?**: `string`

Defined in: [src/index.ts:175](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L175)

Custom service URL (surl).

***

### GeeTestOptions

Defined in: [src/index.ts:185](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L185)

Options for solving GeeTest captcha.

#### Properties

##### apiServer?

> `optional` **apiServer?**: `string`

Defined in: [src/index.ts:201](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L201)

Optional custom api_server domain.

##### challenge

> **challenge**: `string`

Defined in: [src/index.ts:193](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L193)

GeeTest 'challenge' token.

##### gt

> **gt**: `string`

Defined in: [src/index.ts:189](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L189)

GeeTest 'gt' key.

##### pageurl

> **pageurl**: `string`

Defined in: [src/index.ts:197](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L197)

Full URL of the page containing GeeTest.

***

### GeeTestResult

Defined in: [src/index.ts:207](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L207)

Result returned for GeeTest captcha solutions.

#### Properties

##### challenge

> **challenge**: `string`

Defined in: [src/index.ts:208](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L208)

##### seccode

> **seccode**: `string`

Defined in: [src/index.ts:210](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L210)

##### validate

> **validate**: `string`

Defined in: [src/index.ts:209](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L209)

***

### ImageCaptchaOptions

Defined in: [src/index.ts:41](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L41)

Options for solving a normal image captcha.

#### Properties

##### body

> **body**: `string`

Defined in: [src/index.ts:45](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L45)

Base64 encoded image string.

##### calc?

> `optional` **calc?**: `0` \| `1`

Defined in: [src/index.ts:61](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L61)

0 = no math, 1 = requires calculation.

##### language?

> `optional` **language?**: `0` \| `1` \| `2`

Defined in: [src/index.ts:73](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L73)

0 = not specified, 1 = Cyrillic, 2 = Latin.

##### maxLen?

> `optional` **maxLen?**: `number`

Defined in: [src/index.ts:69](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L69)

Maximum number of characters.

##### minLen?

> `optional` **minLen?**: `number`

Defined in: [src/index.ts:65](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L65)

Minimum number of characters.

##### numeric?

> `optional` **numeric?**: `0` \| `1` \| `2` \| `3` \| `4`

Defined in: [src/index.ts:57](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L57)

0 = not specified, 1 = only numbers, 2 = only letters, 3 = only numbers OR only letters, 4 = both numbers and letters.

##### phrase?

> `optional` **phrase?**: `0` \| `1`

Defined in: [src/index.ts:49](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L49)

0 = single word, 1 = two or more words.

##### regsense?

> `optional` **regsense?**: `0` \| `1`

Defined in: [src/index.ts:53](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L53)

0 = case insensitive, 1 = case sensitive.

##### textinstructions?

> `optional` **textinstructions?**: `string`

Defined in: [src/index.ts:77](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L77)

Optional text instructions for the worker.

***

### RecaptchaV2Options

Defined in: [src/index.ts:93](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L93)

Options for solving Google reCAPTCHA V2.

#### Properties

##### dataS?

> `optional` **dataS?**: `string`

Defined in: [src/index.ts:109](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L109)

Optional 'data-s' parameter value for protected endpoints.

##### googlekey

> **googlekey**: `string`

Defined in: [src/index.ts:97](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L97)

Sitekey found in target page HTML.

##### invisible?

> `optional` **invisible?**: `boolean`

Defined in: [src/index.ts:105](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L105)

Whether the reCAPTCHA is invisible.

##### pageurl

> **pageurl**: `string`

Defined in: [src/index.ts:101](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L101)

Full URL of the page containing the reCAPTCHA.

***

### RecaptchaV3Options

Defined in: [src/index.ts:115](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L115)

Options for solving Google reCAPTCHA V3.

#### Properties

##### action?

> `optional` **action?**: `string`

Defined in: [src/index.ts:127](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L127)

Action parameter value.

##### googlekey

> **googlekey**: `string`

Defined in: [src/index.ts:119](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L119)

Sitekey found in target page HTML.

##### minScore?

> `optional` **minScore?**: `number`

Defined in: [src/index.ts:131](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L131)

Minimum required score (e.g. 0.3, 0.7, 0.9).

##### pageurl

> **pageurl**: `string`

Defined in: [src/index.ts:123](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L123)

Full URL of the page containing the reCAPTCHA.

***

### SolveCaptchaClientOptions

Defined in: [src/index.ts:11](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L11)

Configuration options for the SolveCaptchaClient.

#### Properties

##### apiKey

> **apiKey**: `string`

Defined in: [src/index.ts:15](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L15)

API key obtained from SolveCaptcha dashboard.

##### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [src/index.ts:19](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L19)

Base URL for the SolveCaptcha API. Defaults to https://api.solvecaptcha.com.

##### defaultPollingIntervalMs?

> `optional` **defaultPollingIntervalMs?**: `number`

Defined in: [src/index.ts:35](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L35)

Default polling interval in milliseconds. Defaults to 5000 ms.

##### defaultPollingTimeoutMs?

> `optional` **defaultPollingTimeoutMs?**: `number`

Defined in: [src/index.ts:31](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L31)

Default polling timeout in milliseconds for captcha resolution. Defaults to 120000 ms.

##### softId?

> `optional` **softId?**: `string` \| `number`

Defined in: [src/index.ts:27](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L27)

Optional partner/software ID.

##### timeout?

> `optional` **timeout?**: `number`

Defined in: [src/index.ts:23](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L23)

Request timeout in milliseconds. Defaults to 30000 ms.

***

### TextCaptchaOptions

Defined in: [src/index.ts:83](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L83)

Options for solving a text question captcha.

#### Properties

##### language?

> `optional` **language?**: `0` \| `1` \| `2`

Defined in: [src/index.ts:87](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L87)

0 = not specified, 1 = Cyrillic, 2 = Latin.

***

### TurnstileOptions

Defined in: [src/index.ts:137](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L137)

Options for solving Cloudflare Turnstile.

#### Properties

##### action?

> `optional` **action?**: `string`

Defined in: [src/index.ts:149](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L149)

Optional action parameter.

##### data?

> `optional` **data?**: `string`

Defined in: [src/index.ts:153](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L153)

Optional cData parameter.

##### pagedata?

> `optional` **pagedata?**: `string`

Defined in: [src/index.ts:157](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L157)

Optional pagedata parameter.

##### pageurl

> **pageurl**: `string`

Defined in: [src/index.ts:145](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L145)

Full URL of the page with the Turnstile widget.

##### sitekey

> **sitekey**: `string`

Defined in: [src/index.ts:141](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L141)

Turnstile sitekey.

## Variables

### DEFAULT\_SOFT\_ID

> `const` **DEFAULT\_SOFT\_ID**: `""` = `''`

Defined in: [src/index.ts:6](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L6)

Default software/affiliate identifier (empty if none assigned).

***

### SOLVE\_CAPTCHA\_ERRORS

> `const` **SOLVE\_CAPTCHA\_ERRORS**: `Record`\<`string`, `string`\>

Defined in: [src/index.ts:216](https://github.com/TysikGG/api-kit/blob/c2d915256c081352f45d822ad08041a2d00353b1/solvecaptcha/js/src/index.ts#L216)

Known error descriptions for SolveCaptcha.
