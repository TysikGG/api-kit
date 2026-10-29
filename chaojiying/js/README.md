# chaojiying-client

[![npm version](https://img.shields.io/npm/v/chaojiying-client.svg)](https://www.npmjs.com/package/chaojiying-client)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/chaojiying-client.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org/)

Typed Node.js client for the [Chaojiying](https://www.chaojiying.com) (超级鹰) image-recognition API.

Official references:

- HTTP API: <https://www.chaojiying.com/api-5.html>
- Error codes: <https://www.chaojiying.com/api-23.html>
- Code types and prices: <https://www.chaojiying.com/price.html>
- Response MD5: <https://www.chaojiying.com/api-29.html>
- Text location (9800): <https://www.chaojiying.com/api-98.html>
- Graphic blocks (9900): <https://www.chaojiying.com/api-99.html>
- License plates (8601): <https://www.chaojiying.com/api-86.html>
- Free OCR v2: <https://www.chaojiying.com/api-88.html>

Recognition is one blocking HTTP call. The server answers when the result is ready (often milliseconds, up to the 60 second timeout when a person solves the image). There is no task id to poll.

## Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick start](#quick-start)
- [Code types](#code-types)
- [Recognize text](#recognize-text)
- [Click and puzzle coordinates](#click-and-puzzle-coordinates)
- [Color filter and character lookup](#color-filter-and-character-lookup)
- [Sliders, blocks, and plates](#sliders-blocks-and-plates)
- [Upload formats](#upload-formats)
- [Score and refunds](#score-and-refunds)
- [Free OCR](#free-ocr)
- [Errors](#errors)
- [Proxies, timeouts, retries](#proxies-timeouts-retries)
- [Response MD5](#response-md5)
- [TypeScript](#typescript)
- [Comparison](#comparison)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

## Features

- Every paid endpoint: `Processing.php`, `GetScore.php`, `ReportError.php`
- Free OCR v2 models 6, 8, and 9 on `api.chaojiying.com`
- Base64 (form or JSON) and multipart `userfile` uploads
- `len_min`, `time_add`, and `str_debug`, including `8a` and `8f` instruction builders
- Catalog of every code type on the public price table, plus plate type 8601
- Parsers for points, rectangles, `text,x,y` rows, and license plates
- Partner `softid` on recognize and report (override only if you ship your own software id)
- Password MD5 (`pass2`), optional `access_token`, custom base URL, timeout, proxy, retries
- One error class per documented `err_no`
- Response MD5 check (`softid + softkey + pic_id + pic_str`)

## Installation

```bash
npm install chaojiying-client
```

Node.js 18 or newer.

## Configuration

```typescript
import { Chaojiying } from "chaojiying-client";

const client = new Chaojiying({
  username: process.env.CHAOJIYING_USER,       // or CHAOJIYING_USER
  password: process.env.CHAOJIYING_PASS,       // plain text or 32-char MD5
  accessToken: process.env.CHAOJIYING_ACCESS_TOKEN,
  apiKey: process.env.CHAOJIYING_API_KEY,      // free OCR only
  baseURL: "https://upload.chaojiying.net",
  freeBaseURL: "https://api.chaojiying.com",
  timeoutMs: 60_000,
  userAgent: "chaojiying-client/0.1.0",
  proxy: "http://user:pass@127.0.0.1:8888",    // or { host, port, protocol, auth }
  retries: 2,
  retryDelayMs: 200,
  softId: undefined,                           // defaults to the built-in partner id
  softKey: undefined,                          // partner key, used only to verify md5
});
```

| Option | Default | Description |
| :--- | :--- | :--- |
| `username` | `CHAOJIYING_USER` | Account name. Required unless `accessToken` or `apiKey` is set. |
| `password` | `CHAOJIYING_PASS` | Plain text is MD5-hashed into `pass2`. A 32-hex string is sent as-is. |
| `accessToken` | `CHAOJIYING_ACCESS_TOKEN` | Sent as `access_token` when set. |
| `apiKey` | `CHAOJIYING_API_KEY` | `ak` query parameter for free OCR. |
| `baseURL` | `https://upload.chaojiying.net` | Paid host. Do not pin a single IP; the host rotates. |
| `freeBaseURL` | `https://api.chaojiying.com` | Free OCR host. |
| `timeoutMs` | `60000` | Per-request timeout. Human solves can use the whole minute. |
| `userAgent` | `chaojiying-client/0.1.0` | `User-Agent` header. |
| `proxy` | none | HTTP proxy URL or `{ host, port, protocol?, auth? }`. |
| `retries` | `2` | Extra attempts after a retryable failure. |
| `retryDelayMs` | `200` | Attempt n waits `n * retryDelayMs`. |
| `softId` | built-in partner id | Sent as `softid` on recognize and report. |
| `softKey` | built-in partner key | Used only by `verifyMd5`. Required when `softId` is overridden. |

Paid recognize retries connection failures and `err_no` -429 only. A timeout or HTTP 500 on a paid upload is not retried, because the server may already have billed the image. `getScore` and free OCR also retry timeouts and HTTP 5xx.

## Quick start

This call only reads the balance.

```typescript
import { Chaojiying } from "chaojiying-client";

const client = new Chaojiying({
  username: process.env.CHAOJIYING_USER!,
  password: process.env.CHAOJIYING_PASS!,
});

const score = await client.getScore();
console.log(score.tifen, score.tifen_lock);
```

Runnable copy: [`examples/quickstart.ts`](examples/quickstart.ts).

## Code types

Import `CodeType` or pass the numeric id. Full metadata is `CODE_TYPES`.

| Id | Constant | Result | Price (题分) |
| ---: | :--- | :--- | :--- |
| 1902 | `ALNUM_4_TO_6` | text | 10/12/15 |
| 1004–1010, 1012, 1020 | `ALNUM_1_TO_*` | text | 10–50 |
| 2001–2007 | `HAN_1` … `HAN_1_TO_7` | text | 10–70 |
| 3004–3008, 3012 | `ENGLISH_1_TO_*` | text | 10–30 |
| 4004–4008 | `DIGITS_1_TO_*` | text | 10–20 |
| 5000 | `MIXED_VARIABLE` | text | 2.5 / letter, 10 / character |
| 5108 | `ALNUM_SYMBOLS_8` | text | 22 |
| 5201 | `PINYIN_CALC_IDIOM` | text | 20 / 20 / 40 |
| 6001 | `CALCULATION` | text (the answer) | 15 |
| 6004 | `QUESTION` | text | 15 |
| 6900 | `MIXED_COLOR` | text | same as 5000; `8f` costs 8 |
| 9602 | `HORIZONTAL_PUZZLE` | two points | 36 |
| 9800 | `LOCATE_ALL_TEXT` | `text,x,y` | 6 / hit, min 28 |
| 9801 | `LOCATE_CHARS` | points, needs `8a` | 9 / hit, min 28 |
| 9900 | `BLOCKS` | rectangles | 8 / hit + 8 |
| 9901 / 9902 | `ONE_BLOCK_CENTER` / `TWO_BLOCK_CENTERS` | points | 16 / 24 |
| 9101–9104 | `CLICK_1` … `CLICK_4` | points | 16–40 |
| 9004–9006, 9008, 9009 | `CLICK_1_TO_*` | points | 40–80 |
| 8601 | `LICENSE_PLATE` | plates (resource pack) | pack |

`resultShape(codeType)` tells you which parser the client will attach.

## Recognize text

`err_no === 0` means the upload was billed, even if you later decide the text is wrong.

```typescript
import { readFile } from "node:fs/promises";
import { Chaojiying, CodeType } from "chaojiying-client";

const client = new Chaojiying({ username, password });
const image = await readFile("captcha.jpg");

const four = await client.recognize(image, CodeType.ALNUM_1_TO_4);
console.log(four.pic_str, four.pic_id);

const variable = await client.recognize(image, CodeType.ALNUM_4_TO_6, { lenMin: 4 });
const five = await client.recognize(image, CodeType.ALNUM_1_TO_5);
const six = await client.recognize(image, CodeType.ALNUM_1_TO_6);
const seven = await client.recognize(image, CodeType.ALNUM_1_TO_7);
const eight = await client.recognize(image, CodeType.ALNUM_1_TO_8);
const nine = await client.recognize(image, CodeType.ALNUM_1_TO_9);
const ten = await client.recognize(image, CodeType.ALNUM_1_TO_10);
const twelve = await client.recognize(image, CodeType.ALNUM_1_TO_12);
const twenty = await client.recognize(image, CodeType.ALNUM_1_TO_20);

const han1 = await client.recognize(image, CodeType.HAN_1);
const han2 = await client.recognize(image, CodeType.HAN_1_TO_2);
const han3 = await client.recognize(image, CodeType.HAN_1_TO_3);
const han4 = await client.recognize(image, CodeType.HAN_1_TO_4);
const han5 = await client.recognize(image, CodeType.HAN_1_TO_5);
const han6 = await client.recognize(image, CodeType.HAN_1_TO_6);
const han7 = await client.recognize(image, CodeType.HAN_1_TO_7);

const en4 = await client.recognize(image, CodeType.ENGLISH_1_TO_4);
const en5 = await client.recognize(image, CodeType.ENGLISH_1_TO_5);
const en6 = await client.recognize(image, CodeType.ENGLISH_1_TO_6);
const en7 = await client.recognize(image, CodeType.ENGLISH_1_TO_7);
const en8 = await client.recognize(image, CodeType.ENGLISH_1_TO_8);
const en12 = await client.recognize(image, CodeType.ENGLISH_1_TO_12);

const digits4 = await client.recognize(image, CodeType.DIGITS_1_TO_4);
const digits5 = await client.recognize(image, CodeType.DIGITS_1_TO_5);
const digits6 = await client.recognize(image, CodeType.DIGITS_1_TO_6);
const digits7 = await client.recognize(image, CodeType.DIGITS_1_TO_7);
const digits8 = await client.recognize(image, CodeType.DIGITS_1_TO_8);

const mixed = await client.recognize(image, CodeType.MIXED_VARIABLE);
const symbols = await client.recognize(image, CodeType.ALNUM_SYMBOLS_8);
const idiom = await client.recognize(image, CodeType.PINYIN_CALC_IDIOM);
const math = await client.recognize(image, CodeType.CALCULATION);
const question = await client.recognize(image, CodeType.QUESTION);
```

Give the worker more time with `timeAdd` (seconds):

```typescript
await client.recognize(image, 1004, { timeAdd: 20 });
```

A data URI is accepted. The `data:image/...;base64,` prefix and whitespace are removed before upload.

```typescript
await client.recognize("data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==", 1902);
```

## Click and puzzle coordinates

The origin is the top-left corner. Several points are separated by `|`.

```typescript
import { CodeType, horizontalDistance } from "chaojiying-client";

const ordered = await client.recognize(image, CodeType.CLICK_1_TO_4);
console.log(ordered.points); // [{ x, y }, ...]

await client.recognize(image, CodeType.CLICK_1);
await client.recognize(image, CodeType.CLICK_2);
await client.recognize(image, CodeType.CLICK_3);
await client.recognize(image, CodeType.CLICK_4);
await client.recognize(image, CodeType.CLICK_1_TO_5);
await client.recognize(image, CodeType.CLICK_1_TO_6);
await client.recognize(image, CodeType.CLICK_1_TO_8);
await client.recognize(image, CodeType.CLICK_1_TO_9);

const puzzle = await client.recognize(image, CodeType.HORIZONTAL_PUZZLE);
const [left, right] = puzzle.points ?? [];
if (left && right) console.log(horizontalDistance(left, right));
```

9100 types need the instruction painted on the image. 9004 returns 1 to 4 points. 9801 is the zero-second lookup when you already know the characters; see below.

## Color filter and character lookup

6900 reads mixed characters. The `8f` instruction keeps one color channel. Channels, in order, are red, green, blue, yellow, white, black (`ColorChannel`). Tolerance is 0–255. Leave the background at 255 unless the page is not white. Each `8f` call costs 8 extra points.

```typescript
import { CodeType, colorInstruction, ColorChannel } from "chaojiying-client";

const red = await client.recognize(image, CodeType.MIXED_COLOR, {
  strDebug: colorInstruction(ColorChannel.RED, 100, 255),
});
// equivalent strings: colorInstruction("red"), colorInstruction("红")
console.log(red.pic_str);
```

9801 returns coordinates of the characters you name, in that order. Without `8a` the server returns -10042. A malformed instruction returns -10043.

```typescript
import { clickInstruction } from "chaojiying-client";

const located = await client.recognize(image, CodeType.LOCATE_CHARS, {
  strDebug: clickInstruction(["查", "找", "的", "字"]),
});
console.log(located.points);
```

9800 returns every character and its coordinate. Crop away “请依次点击” if you do not want to pay for those glyphs.

```typescript
const all = await client.recognize(image, CodeType.LOCATE_ALL_TEXT);
console.log(all.text_locations); // [{ text, x, y }, ...]
```

Literal `\uXXXX` sequences in `pic_str` are decoded.

## Sliders, blocks, and plates

9900 returns rectangles `x1,y1,x2,y2` ordered by confidence. 9901 and 9902 return the center of the only block, or of the two blocks.

```typescript
const blocks = await client.recognize(image, CodeType.BLOCKS);
console.log(blocks.rectangles);

const one = await client.recognize(image, CodeType.ONE_BLOCK_CENTER);
const two = await client.recognize(image, CodeType.TWO_BLOCK_CENTERS);
console.log(one.points, two.points);
```

8601 is a prepaid resource pack, not ordinary 题分. Several plates are separated by `|`: `number,confidence,color,x1,y1,x2,y2`.

```typescript
const plates = await client.recognize(image, CodeType.LICENSE_PLATE);
for (const plate of plates.plates ?? []) {
  console.log(plate.number, plate.confidence, plate.color, plate.x1, plate.y1, plate.x2, plate.y2);
}
```

If `pic_str` is not in the expected shape, the raw string is still returned and the parsed field is omitted.

## Upload formats

Default upload is `file_base64` as `application/x-www-form-urlencoded` (the server requires the base64 to be URL-encoded; `URLSearchParams` does that).

```typescript
await client.recognize(bytes, 1004, { bodyFormat: "json" });
await client.postPic(bytes, 1004, { filename: "captcha.jpg" }); // multipart userfile
await client.postPicBase64(bytes, 1902);
await client.recognizeFile("captcha.jpg", 1004);
```

Paid images must be at most 1024KB. Free OCR allows 2MB. Empty and non-base64 strings are rejected locally with the same error classes the server uses (`InvalidImageError`, `MalformedBase64Error`, `ImageTooLargeError`).

## Score and refunds

```typescript
const score = await client.getScore();
await client.getBalance(); // alias

const solved = await client.recognize(image, 1004);
await client.reportError(solved.pic_id);
await client.report(solved.pic_id); // alias
```

Report rules from the official API:

- Call it only when you know the answer is wrong.
- The window is about three minutes after `pic_id` is issued.
- Some types return -10133 (`ReportNotSupportedError`).
- Reporting the same id twice returns -10132.
- A high error rate returns -1013 and can get the account restricted.
- Instruction points such as `8f` are not refunded.

`GetScore.php` does not send `softid`. Recognize and report do.

## Free OCR

Models on `https://api.chaojiying.com/ocr/v2/{model}?ak=`:

| Model | Also accepted | `pic_str` |
| ---: | :--- | :--- |
| 8 | `text`, `ocr` | characters |
| 6 | `calc`, `calculation` | arithmetic result |
| 9 | `blocks`, `rectangles` | `x1,y1,x2,y2` rectangles |

```typescript
import { FreeModel } from "chaojiying-client";

const client = new Chaojiying({ apiKey: process.env.CHAOJIYING_API_KEY });
const text = await client.recognizeFree(image, FreeModel.TEXT);
const calc = await client.recognizeFree(image, "calc");
const blocks = await client.recognizeFree(image, "blocks", { upload: "multipart" });
console.log(text.pic_str, calc.pic_str, blocks.rectangles);
```

This host does not use `softid` or the paid password. See [`examples/free-ocr.ts`](examples/free-ocr.ts).

## Errors

A non-zero `err_no` throws `ChaojiyingError`. Known codes use a subclass. `errNo`, `errStr`, and `responseBody` are set when the server sent them.

```typescript
import { ChaojiyingError, InsufficientPointsError } from "chaojiying-client";

try {
  await client.recognize(image, 1004);
} catch (error) {
  if (error instanceof InsufficientPointsError) {
    console.error("Recharge 题分", error.errNo, error.errStr);
  } else if (error instanceof ChaojiyingError) {
    console.error(error.message, error.responseBody);
  }
}
```

| err_no | Class | Official text | What to do |
| ---: | :--- | :--- | :--- |
| 0 | — | OK | Success |
| -1001 | `UserParameterError` | 用户参数异常 | Send a real username and password |
| -10012 | `AccessTokenError` | access_token异常 | Send a valid access token |
| -1002 | `UnknownUserError` | 无此用户名 | Use the Chaojiying account, not the developer account |
| -10023 | `PasswordError` | 用户名的密码出错 | Fix the password |
| -1004 | `CodeTypeError` | 类型参数错误 | Use a code type from the price table |
| -1005 | `InsufficientPointsError` | 无可用题分 | Recharge |
| -10052 | `NoResourcePackError` | 无可用资源包 | Buy the pack (8601) |
| -10061 | `InvalidImageError` | 不是有效的图片文件 | Upload a real bmp/jpg/png |
| -100612 | `Base64ParseError` | base64字符解析异常 | Raw base64, no data-URI prefix or whitespace |
| -10062 | `ImageTooLargeError` | 文件超大 1024k | Stay under 1024KB (2MB on free OCR) |
| -10064 | `UnrecognizableImageError` | 图片无法被识别 | Skip this image |
| -10071 | `IpWhitelistError` | IP受限 | Check the IP allow-list |
| -10072 | `IpBlacklistError` | IP受限 | Check the IP block-list |
| -2001 | `UploadError` | 上传图片出错 | Upload failed |
| -429 | `RateLimitError` | 请求过于频繁 | Retried when `retries > 0` |
| -1011 | `InvalidPictureIdError` | 图片ID异常 | Send a real `pic_id` |
| -1013 | `ErrorRateTooHighError` | 错误率太高 | Stop blind refunds |
| -10132 | `PictureAlreadyReportedError` | 此图片ID已报过 | Already refunded |
| -10133 | `ReportNotSupportedError` | no_access | This type cannot be reported |
| -10042 | `MissingClickInstructionError` | 缺少8a指令 | 9801 needs `{8a:.../8a}` |
| -10043 | `BadClickInstructionError` | 8a指令异常 | Half-width punctuation only |
| -3002 | `MalformedBase64Error` | base64字符异常 | Broken base64 payload |

`describeErrorCode(-1005)` returns the remedy string. `ERROR_CODES` is the full list.

Network failures throw `NetworkError` (`status`, `connectFailure`). Timeouts throw `TimeoutError`. A bad MD5 throws `ResponseIntegrityError` after the recognize call has already been billed. Missing configuration throws `MissingCredentialsError`.

## Proxies, timeouts, retries

```typescript
const client = new Chaojiying({
  username,
  password,
  proxy: "http://user:p%40ss@10.0.0.1:8888",
  timeoutMs: 90_000,
  retries: 4,
  retryDelayMs: 500,
});
```

[`examples/proxy-and-retries.ts`](examples/proxy-and-retries.ts) runs a balance check through a proxy.

There is no webhook and no callback URL. The HTTP response is the callback.

## Response MD5

The server MD5 is `md5(softid + softkey + pic_id + pic_str)` as 32 lowercase hex characters, with no separator. See <https://www.chaojiying.com/api-29.html>.

```typescript
import { computeResponseMd5, verifyResponseMd5, SOFT_ID, SOFT_KEY } from "chaojiying-client";

const result = await client.recognize(image, 1004, { verifyMd5: true });
verifyResponseMd5(result, SOFT_ID, SOFT_KEY);
computeResponseMd5(SOFT_ID, SOFT_KEY, result.pic_id, result.pic_str);
```

If you pass your own `softId`, also pass the matching `softKey`. The default partner id and key are `SOFT_ID` and `SOFT_KEY`. Do not clear them if you want the built-in attribution to stay on the request.

## TypeScript

The package ships declarations from `dist/index.d.ts`. Results are plain objects:

```typescript
import type { RecognizeResult, ScoreResult, Plate, Point, TextLocation, Rect } from "chaojiying-client";
```

`recognize` accepts `Buffer`, `Uint8Array`, `ArrayBuffer`, a base64 string, or a data URI.

## Comparison

| | chaojiying-client | npm `chaojiying` 0.1.1 | Official Python sample | Official Go sample |
| :--- | :--- | :--- | :--- | :--- |
| Typed results and code types | yes | one function | no | no |
| `pass2` MD5 | yes | caller hashes | yes | sends `pass` |
| Base64 and multipart | yes | base64 | both | base64 |
| Score | yes | no | no | yes |
| Refund | yes | no | yes | sample omits it |
| `len_min` | yes | no | no | yes |
| `str_debug`, `8a`, `8f` | yes | manual | no | no |
| Point, rectangle, plate parsers | yes | no | no | no |
| Response MD5 | yes | no | no | no |
| Free OCR v2 | yes | no | no | no |
| Proxy | yes | no | no | yes |
| Retries | yes | no | no | no |
| Error class per `err_no` | yes | no | no | no |
| Partner `softid` default | yes | empty string | caller supplies | caller supplies |

## FAQ

**Does this poll?** No. `Processing.php` blocks until the answer is ready. Set `timeoutMs` to at least 60000.

**Will a retry double-charge?** Paid recognize retries connection failures and -429 only. Timeouts and HTTP 500 on that call are not retried.

**Can I omit softid?** The default client always sends the partner software id on recognize and report. Override `softId` only when the request should be attributed to a different software id, and pass `softKey` if you verify MD5.

**Why did base64 fail with -3002 or -100612?** The field must be raw base64. This client strips a data-URI prefix and whitespace. Do not insert spaces or line breaks yourself.

**Is 95xx still a thing?** The type guide tells you to move slider and block tasks to 9900 and text location to 9800. Those 95xx ids are not on the current price table, so they are not in `CodeType`.

## Contributing

The library lives in the [api-kit](https://github.com/TysikGG/api-kit) monorepo under `chaojiying/js`.

```bash
npm install
npm test          # unit tests and coverage
npm run typecheck
npm run build
npm run test:live # CHAOJIYING_USER and CHAOJIYING_PASS; balance query only
```

Issues and pull requests go to the monorepo.

## License

ISC. See [LICENSE](LICENSE).
