**2captcha-client**

***

# 2captcha-client

## Classes

### TwoCaptchaClient

Defined in: src/index.ts:294

Client for interacting with the 2Captcha solving API.

#### Constructors

##### Constructor

> **new TwoCaptchaClient**(`options`): [`TwoCaptchaClient`](#twocaptchaclient)

Defined in: src/index.ts:312

Creates an instance of TwoCaptchaClient.

###### Parameters

###### options

`string` \| [`TwoCaptchaOptions`](#twocaptchaoptions)

Configuration options or API key string.

###### Returns

[`TwoCaptchaClient`](#twocaptchaclient)

###### Example

```typescript
import { TwoCaptchaClient } from '2captcha-client';

const client = new TwoCaptchaClient({ apiKey: 'YOUR_API_KEY' });
```

#### Methods

##### createTask()

> **createTask**(`params`): `Promise`\<`string`\>

Defined in: src/index.ts:588

Submits a low-level task directly to /in.php.

###### Parameters

###### params

`Record`\<`string`, `unknown`\>

Task parameters.

###### Returns

`Promise`\<`string`\>

Assigned numeric task ID string.

###### Example

```typescript
const taskId = await client.createTask({
  method: 'userrecaptcha',
  googlekey: '6Le-wvkSAAAAAPBMRTvw0Q4CeHg-tUnSQVwyYcxQ',
  pageurl: 'https://example.com',
});
```

##### getBalance()

> **getBalance**(): `Promise`\<`number`\>

Defined in: src/index.ts:338

Retrieves current account balance in USD.

###### Returns

`Promise`\<`number`\>

Current account balance.

###### Example

```typescript
const balance = await client.getBalance();
console.log(`Balance: $${balance}`);
```

##### getTaskResult()

> **getTaskResult**(`taskId`): `Promise`\<`string` \| `null`\>

Defined in: src/index.ts:635

Checks the status and gets the result of a submitted task.

###### Parameters

###### taskId

`string`

Task ID returned by createTask.

###### Returns

`Promise`\<`string` \| `null`\>

Solution string, or null if captcha is still being solved.

###### Example

```typescript
const solution = await client.getTaskResult('123456');
```

##### reportBad()

> **reportBad**(`taskId`): `Promise`\<`boolean`\>

Defined in: src/index.ts:702

Reports an incorrectly solved captcha for refund / feedback.

###### Parameters

###### taskId

`string`

Task ID of the wrongly solved captcha.

###### Returns

`Promise`\<`boolean`\>

True if report accepted.

###### Example

```typescript
await client.reportBad('123456');
```

##### reportGood()

> **reportGood**(`taskId`): `Promise`\<`boolean`\>

Defined in: src/index.ts:686

Reports a correctly solved captcha.

###### Parameters

###### taskId

`string`

Task ID of the correctly solved captcha.

###### Returns

`Promise`\<`boolean`\>

True if report accepted.

###### Example

```typescript
await client.reportGood('123456');
```

##### solveFunCaptcha()

> **solveFunCaptcha**(`options`): `Promise`\<`string`\>

Defined in: src/index.ts:527

Solves Arkose Labs FunCaptcha.

###### Parameters

###### options

[`FunCaptchaOptions`](#funcaptchaoptions)

FunCaptcha parameters.

###### Returns

`Promise`\<`string`\>

FunCaptcha token string.

###### Example

```typescript
const token = await client.solveFunCaptcha({
  publickey: '69A21A01-CC43-44CC-A7DC-3DAE72037121',
  pageurl: 'https://example.com',
});
```

##### solveGeeTest()

> **solveGeeTest**(`options`): `Promise`\<[`GeeTestResult`](#geetestresult)\>

Defined in: src/index.ts:555

Solves GeeTest v3.

###### Parameters

###### options

[`GeeTestOptions`](#geetestoptions)

GeeTest parameters.

###### Returns

`Promise`\<[`GeeTestResult`](#geetestresult)\>

Structured GeeTest result with challenge, validate, and seccode.

###### Example

```typescript
const result = await client.solveGeeTest({
  gt: 'f2ae6113d0774a87640498b049303a2c',
  challenge: '839b6748430a7d97e889396e95c1a704',
  pageurl: 'https://example.com',
});
```

##### solveHCaptcha()

> **solveHCaptcha**(`options`): `Promise`\<`string`\>

Defined in: src/index.ts:500

Solves hCaptcha challenge.

###### Parameters

###### options

[`HCaptchaOptions`](#hcaptchaoptions)

hCaptcha parameters.

###### Returns

`Promise`\<`string`\>

Token string for hCaptcha verification.

###### Example

```typescript
const token = await client.solveHCaptcha({
  sitekey: '4c672d35-0701-42b2-88c3-78380b0db560',
  pageurl: 'https://example.com',
});
```

##### solveImage()

> **solveImage**(`options`): `Promise`\<`string`\>

Defined in: src/index.ts:359

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
const text = await client.solveImage({ body: 'iVBORw0KGgoAAA...' });
console.log(`Solved text: ${text}`);
```

##### solveRecaptchaV2()

> **solveRecaptchaV2**(`options`): `Promise`\<`string`\>

Defined in: src/index.ts:415

Solves Google reCAPTCHA v2.

###### Parameters

###### options

[`RecaptchaV2Options`](#recaptchav2options)

reCAPTCHA v2 parameters.

###### Returns

`Promise`\<`string`\>

Solved token string (g-recaptcha-response).

###### Example

```typescript
const token = await client.solveRecaptchaV2({
  googlekey: '6Le-wvkSAAAAAPBMRTvw0Q4CeHg-tUnSQVwyYcxQ',
  pageurl: 'https://example.com/login',
});
```

##### solveRecaptchaV3()

> **solveRecaptchaV3**(`options`): `Promise`\<`string`\>

Defined in: src/index.ts:445

Solves Google reCAPTCHA v3.

###### Parameters

###### options

[`RecaptchaV3Options`](#recaptchav3options)

reCAPTCHA v3 parameters.

###### Returns

`Promise`\<`string`\>

Solved token string.

###### Example

```typescript
const token = await client.solveRecaptchaV3({
  googlekey: '6LdyC2cUAAAAACGuDKpXeDorzYbe8tDno10xTUXn',
  pageurl: 'https://example.com',
  action: 'verify',
  minScore: 0.5,
});
```

##### solveText()

> **solveText**(`text`, `options?`): `Promise`\<`string`\>

Defined in: src/index.ts:391

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

Defined in: src/index.ts:473

Solves Cloudflare Turnstile captcha.

###### Parameters

###### options

[`TurnstileOptions`](#turnstileoptions)

Turnstile parameters.

###### Returns

`Promise`\<`string`\>

Token string for Turnstile verification.

###### Example

```typescript
const token = await client.solveTurnstile({
  sitekey: '0x4AAAAAAABnOYoqxxxxxx',
  pageurl: 'https://example.com',
});
```

##### waitForResult()

> **waitForResult**(`taskId`, `options?`): `Promise`\<`string`\>

Defined in: src/index.ts:656

Polls /res.php until the captcha is solved or the timeout is exceeded.

###### Parameters

###### taskId

`string`

Task ID returned by createTask.

###### options?

[`PollingOptions`](#pollingoptions)

Polling options (timeout and interval).

###### Returns

`Promise`\<`string`\>

Solved captcha response string.

***

### TwoCaptchaError

Defined in: src/index.ts:278

Custom error thrown by the TwoCaptcha client.

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new TwoCaptchaError**(`message`, `code?`, `responseData?`): [`TwoCaptchaError`](#twocaptchaerror)

Defined in: src/index.ts:282

###### Parameters

###### message

`string`

###### code?

`string`

###### responseData?

`unknown`

###### Returns

[`TwoCaptchaError`](#twocaptchaerror)

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

Defined in: src/index.ts:279

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

##### responseData?

> `readonly` `optional` **responseData?**: `unknown`

Defined in: src/index.ts:280

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

Defined in: src/index.ts:204

Options for solving Arkose Labs FunCaptcha.

#### Properties

##### data?

> `optional` **data?**: `string`

Defined in: src/index.ts:223

Additional data parameter as string.

##### pageurl

> **pageurl**: `string`

Defined in: src/index.ts:213

The full URL of the page where captcha is displayed.

##### publickey

> **publickey**: `string`

Defined in: src/index.ts:208

The public key of the FunCaptcha.

##### surl?

> `optional` **surl?**: `string`

Defined in: src/index.ts:218

The surl parameter (service URL).

***

### GeeTestOptions

Defined in: src/index.ts:229

Options for solving GeeTest v3.

#### Properties

##### apiServer?

> `optional` **apiServer?**: `string`

Defined in: src/index.ts:248

API server subdomain (e.g. api.geetest.com).

##### challenge

> **challenge**: `string`

Defined in: src/index.ts:238

The challenge key from the target site.

##### gt

> **gt**: `string`

Defined in: src/index.ts:233

The gt key from the target site.

##### pageurl

> **pageurl**: `string`

Defined in: src/index.ts:243

The full URL of the page where captcha is displayed.

***

### GeeTestResult

Defined in: src/index.ts:254

GeeTest resolution result.

#### Properties

##### challenge

> **challenge**: `string`

Defined in: src/index.ts:255

##### seccode

> **seccode**: `string`

Defined in: src/index.ts:257

##### validate

> **validate**: `string`

Defined in: src/index.ts:256

***

### HCaptchaOptions

Defined in: src/index.ts:179

Options for solving hCaptcha.

#### Properties

##### data?

> `optional` **data?**: `string`

Defined in: src/index.ts:198

Optional custom data parameter (rqdata).

##### invisible?

> `optional` **invisible?**: `0` \| `1`

Defined in: src/index.ts:193

Set to 1 for invisible hCaptcha.

##### pageurl

> **pageurl**: `string`

Defined in: src/index.ts:188

The full URL of the page where captcha is displayed.

##### sitekey

> **sitekey**: `string`

Defined in: src/index.ts:183

The hCaptcha sitekey.

***

### ImageCaptchaOptions

Defined in: src/index.ts:39

Options for solving a normal image captcha.

#### Properties

##### body

> **body**: `string`

Defined in: src/index.ts:43

Base64 encoded image string.

##### calc?

> `optional` **calc?**: `0` \| `1`

Defined in: src/index.ts:63

0 = not specified, 1 = math operation required.

##### language?

> `optional` **language?**: `0` \| `1` \| `2`

Defined in: src/index.ts:78

Language code (0 = all, 1 = cyrillic, 2 = latin).

##### maxLen?

> `optional` **maxLen?**: `number`

Defined in: src/index.ts:73

Maximum required text length.

##### minLen?

> `optional` **minLen?**: `number`

Defined in: src/index.ts:68

Minimum required text length.

##### numeric?

> `optional` **numeric?**: `0` \| `1` \| `2` \| `3`

Defined in: src/index.ts:58

0 = not specified, 1 = numbers only, 2 = letters only, 3 = numbers or letters.

##### phrase?

> `optional` **phrase?**: `0` \| `1`

Defined in: src/index.ts:48

0 = single word, 1 = two or more words.

##### regsense?

> `optional` **regsense?**: `0` \| `1`

Defined in: src/index.ts:53

0 = case insensitive, 1 = case sensitive.

##### textinstructions?

> `optional` **textinstructions?**: `string`

Defined in: src/index.ts:83

Text instructions for workers.

***

### PollingOptions

Defined in: src/index.ts:263

Options for waiting for captcha resolution.

#### Properties

##### intervalMs?

> `optional` **intervalMs?**: `number`

Defined in: src/index.ts:272

Interval in milliseconds between status checks.

##### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: src/index.ts:267

Maximum total time in milliseconds to wait before timing out.

***

### RecaptchaV2Options

Defined in: src/index.ts:99

Options for solving reCAPTCHA v2.

#### Properties

##### dataS?

> `optional` **dataS?**: `string`

Defined in: src/index.ts:118

Additional data-s parameter value.

##### enterprise?

> `optional` **enterprise?**: `0` \| `1`

Defined in: src/index.ts:123

Enterprise payload parameter.

##### googlekey

> **googlekey**: `string`

Defined in: src/index.ts:103

The google sitekey found in page source.

##### invisible?

> `optional` **invisible?**: `0` \| `1`

Defined in: src/index.ts:113

Set to 1 for invisible reCAPTCHA.

##### pageurl

> **pageurl**: `string`

Defined in: src/index.ts:108

The full URL of the page where captcha is displayed.

***

### RecaptchaV3Options

Defined in: src/index.ts:129

Options for solving reCAPTCHA v3.

#### Properties

##### action?

> `optional` **action?**: `string`

Defined in: src/index.ts:143

Action parameter specified on the target site.

##### googlekey

> **googlekey**: `string`

Defined in: src/index.ts:133

The google sitekey found in page source.

##### minScore?

> `optional` **minScore?**: `number`

Defined in: src/index.ts:148

Desired minimum score threshold between 0.1 and 0.9.

##### pageurl

> **pageurl**: `string`

Defined in: src/index.ts:138

The full URL of the page where captcha is displayed.

***

### TextCaptchaOptions

Defined in: src/index.ts:89

Options for solving a text question captcha.

#### Properties

##### language?

> `optional` **language?**: `0` \| `1` \| `2`

Defined in: src/index.ts:93

Language code (0 = all, 1 = cyrillic, 2 = latin).

***

### TurnstileOptions

Defined in: src/index.ts:154

Options for solving Cloudflare Turnstile.

#### Properties

##### action?

> `optional` **action?**: `string`

Defined in: src/index.ts:168

Optional Turnstile action parameter.

##### data?

> `optional` **data?**: `string`

Defined in: src/index.ts:173

Optional Turnstile cData parameter.

##### pageurl

> **pageurl**: `string`

Defined in: src/index.ts:163

The full URL of the page where captcha is displayed.

##### sitekey

> **sitekey**: `string`

Defined in: src/index.ts:158

The Turnstile sitekey found in page source.

***

### TwoCaptchaOptions

Defined in: src/index.ts:9

Configuration options for the TwoCaptcha client.

#### Properties

##### apiKey

> **apiKey**: `string`

Defined in: src/index.ts:13

API key obtained from 2Captcha dashboard.

##### baseUrl?

> `optional` **baseUrl?**: `string`

Defined in: src/index.ts:18

Base URL for the 2Captcha API. Defaults to https://2captcha.com.

##### defaultPollingIntervalMs?

> `optional` **defaultPollingIntervalMs?**: `number`

Defined in: src/index.ts:33

Polling interval in milliseconds. Defaults to 5000 ms.

##### defaultPollingTimeoutMs?

> `optional` **defaultPollingTimeoutMs?**: `number`

Defined in: src/index.ts:28

Polling timeout in milliseconds for captcha resolution. Defaults to 120000 ms.

##### timeout?

> `optional` **timeout?**: `number`

Defined in: src/index.ts:23

Request timeout in milliseconds. Defaults to 30000 ms.

## Variables

### DEFAULT\_SOFT\_ID

> `const` **DEFAULT\_SOFT\_ID**: `"5920"` = `'5920'`

Defined in: src/index.ts:4

**`Internal`**

***

### TwoCaptcha

> `const` **TwoCaptcha**: *typeof* [`TwoCaptchaClient`](#twocaptchaclient) = `TwoCaptchaClient`

Defined in: src/index.ts:745
