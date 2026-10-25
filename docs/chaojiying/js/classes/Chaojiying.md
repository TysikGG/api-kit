[**chaojiying-client**](../README.md)

***

[chaojiying-client](../README.md) / Chaojiying

# Class: Chaojiying

Client for interacting with the Chaojiying (超级鹰) CAPTCHA recognition API.

## Constructors

### Constructor

> **new Chaojiying**(`options?`): `Chaojiying`

Creates an instance of the Chaojiying client.

#### Parameters

##### options?

[`ChaojiyingOptions`](../interfaces/ChaojiyingOptions.md) = `{}`

#### Returns

`Chaojiying`

#### Example

```typescript
import { Chaojiying } from "chaojiying-client";

const client = new Chaojiying({
  username: "your_username",
  password: "your_password",
});
const score = await client.getScore();
console.log(`Remaining points: ${score.tifen}`);
```

## Methods

### getScore()

> **getScore**(): `Promise`\<[`ScoreResult`](../interfaces/ScoreResult.md)\>

Retrieves the remaining points / score balance for the user account.

#### Returns

`Promise`\<[`ScoreResult`](../interfaces/ScoreResult.md)\>

#### Example

```typescript
const score = await client.getScore();
console.log(`Available points: ${score.tifen}`);
```

***

### recognize()

> **recognize**(`image`, `codeType`, `options?`): `Promise`\<[`RecognizeResult`](../interfaces/RecognizeResult.md)\>

Recognizes a CAPTCHA image and returns the parsed solution.

#### Parameters

##### image

`string` \| `Uint8Array`\<`ArrayBufferLike`\> \| `Buffer`\<`ArrayBufferLike`\>

Image binary (Buffer/Uint8Array) or Base64 string.

##### codeType

`string` \| `number`

CAPTCHA type ID (e.g. 1004 for 4-letter alphanumeric, 1902 for general).

##### options?

[`RecognizeOptions`](../interfaces/RecognizeOptions.md)

Additional parameters such as debug instructions.

#### Returns

`Promise`\<[`RecognizeResult`](../interfaces/RecognizeResult.md)\>

#### Example

```typescript
import * as fs from "node:fs";

const img = fs.readFileSync("captcha.jpg");
const result = await client.recognize(img, 1004);
console.log(`Recognized code: ${result.pic_str}`);
```

***

### reportError()

> **reportError**(`picId`): `Promise`\<[`ReportErrorResult`](../interfaces/ReportErrorResult.md)\>

Reports an incorrectly solved CAPTCHA to request a point refund.
Must be called within 3 minutes of receiving the picture ID.

#### Parameters

##### picId

`string`

Picture ID returned by recognize (pic_id).

#### Returns

`Promise`\<[`ReportErrorResult`](../interfaces/ReportErrorResult.md)\>

#### Example

```typescript
await client.reportError(result.pic_id);
console.log("Reported mistake successfully");
```
