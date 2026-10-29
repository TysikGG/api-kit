# chaojiying

[![PyPI version](https://img.shields.io/pypi/v/chaojiying.svg)](https://pypi.org/project/chaojiying/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/pypi/pyversions/chaojiying.svg)](https://pypi.org/project/chaojiying/)

Typed Python client for the [Chaojiying](https://www.chaojiying.com) (超级鹰) image-recognition API. Synchronous (`Chaojiying`) and asynchronous (`AsyncChaojiying`) clients share one API.

Official references:

- HTTP API: <https://www.chaojiying.com/api-5.html>
- Error codes: <https://www.chaojiying.com/api-23.html>
- Code types and prices: <https://www.chaojiying.com/price.html>
- Response MD5: <https://www.chaojiying.com/api-29.html>
- Text location (9800): <https://www.chaojiying.com/api-98.html>
- Graphic blocks (9900): <https://www.chaojiying.com/api-99.html>
- License plates (8601): <https://www.chaojiying.com/api-86.html>
- Free OCR v2: <https://www.chaojiying.com/api-88.html>

Recognition is one blocking HTTP call. There is no task id to poll. Human solves can use the full 60 second timeout.

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
- [Async](#async)
- [Errors](#errors)
- [Proxies, timeouts, retries](#proxies-timeouts-retries)
- [Response MD5](#response-md5)
- [Type hints](#type-hints)
- [Comparison](#comparison)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

## Features

- Every paid endpoint: `Processing.php`, `GetScore.php`, `ReportError.php`
- Free OCR v2 models 6, 8, and 9
- Base64 (form or JSON) and multipart `userfile` uploads
- `len_min`, `time_add`, and `str_debug`, plus `8a` and `8f` builders
- Catalog of the public price table and plate type 8601
- Parsers for points, rectangles, `text,x,y` rows, and plates
- Partner `softid` on recognize and report
- Sync and async clients, proxies, retries, per-code error classes
- Results support both `result["pic_str"]` and `result.pic_str`

## Installation

```bash
pip install chaojiying
```

Python 3.10 or newer. The HTTP stack is `httpx`.

## Configuration

```python
from chaojiying import Chaojiying

with Chaojiying(
    username=None,              # CHAOJIYING_USER
    password=None,              # CHAOJIYING_PASS; plain text or 32-char MD5
    base_url="https://upload.chaojiying.net",
    timeout=60.0,
    user_agent="chaojiying-client/0.1.0",
    proxy="http://user:pass@127.0.0.1:8888",
    retries=2,
    retry_delay=0.2,
    soft_id=None,               # built-in partner id
    soft_key=None,              # partner key, md5 checks only
    access_token=None,          # CHAOJIYING_ACCESS_TOKEN
    api_key=None,               # CHAOJIYING_API_KEY, free OCR
    free_base_url="https://api.chaojiying.com",
) as client:
    ...
```

| Parameter | Default | Description |
| :--- | :--- | :--- |
| `username` | `CHAOJIYING_USER` | Required unless `access_token` or `api_key` is set. |
| `password` | `CHAOJIYING_PASS` | Hashed to `pass2` unless it is already 32 hex characters. |
| `base_url` | `https://upload.chaojiying.net` | Paid host. The host rotates addresses; do not pin an IP. |
| `timeout` | `60` | Seconds per request. |
| `user_agent` | `chaojiying-client/0.1.0` | `User-Agent` header. |
| `proxy` | none | URL passed to httpx. |
| `retries` | `2` | Extra attempts after a retryable failure. |
| `retry_delay` | `0.2` | Attempt n sleeps `n * retry_delay` seconds. |
| `soft_id` | built-in partner id | `softid` on recognize and report. |
| `soft_key` | built-in partner key | MD5 verification only. |
| `access_token` | `CHAOJIYING_ACCESS_TOKEN` | Sent as `access_token`. |
| `api_key` | `CHAOJIYING_API_KEY` | `ak` for free OCR. Enough on its own to construct a client. |
| `free_base_url` | `https://api.chaojiying.com` | Free OCR host. |

Paid recognize retries connection failures and `err_no` -429. It does not retry timeouts or HTTP 500, because the server may already have billed the image. Score and free OCR also retry timeouts and HTTP 5xx.

## Quick start

```python
import os
from chaojiying import Chaojiying

with Chaojiying(
    username=os.environ["CHAOJIYING_USER"],
    password=os.environ["CHAOJIYING_PASS"],
) as client:
    score = client.get_score()
    print(score.tifen, score["tifen_lock"])
```

[`examples/quickstart.py`](examples/quickstart.py) is the same check.

## Code types

`CodeType` holds the numeric ids. `CODE_TYPES` is the metadata list. `result_shape(code_type)` is `"text"`, `"points"`, `"rectangles"`, `"text-locations"`, or `"plates"`.

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
| 6001 | `CALCULATION` | the computed answer | 15 |
| 6004 | `QUESTION` | text | 15 |
| 6900 | `MIXED_COLOR` | text | same as 5000; `8f` costs 8 |
| 9602 | `HORIZONTAL_PUZZLE` | two points | 36 |
| 9800 | `LOCATE_ALL_TEXT` | `text,x,y` | 6 / hit, min 28 |
| 9801 | `LOCATE_CHARS` | points, needs `8a` | 9 / hit, min 28 |
| 9900 | `BLOCKS` | rectangles | 8 / hit + 8 |
| 9901 / 9902 | one / two block centers | points | 16 / 24 |
| 9101–9104 | `CLICK_1` … `CLICK_4` | points | 16–40 |
| 9004–9006, 9008, 9009 | `CLICK_1_TO_*` | points | 40–80 |
| 8601 | `LICENSE_PLATE` | plates (resource pack) | pack |

## Recognize text

A response with `err_no == 0` is already billed.

```python
from chaojiying import Chaojiying, CodeType

with open("captcha.jpg", "rb") as handle:
    image = handle.read()

with Chaojiying(username="user", password="pass") as client:
    four = client.recognize(image, CodeType.ALNUM_1_TO_4)
    print(four.pic_str, four["pic_id"])

    client.recognize(image, CodeType.ALNUM_4_TO_6, len_min=4)
    client.recognize(image, CodeType.ALNUM_1_TO_5)
    client.recognize(image, CodeType.ALNUM_1_TO_6)
    client.recognize(image, CodeType.ALNUM_1_TO_7)
    client.recognize(image, CodeType.ALNUM_1_TO_8)
    client.recognize(image, CodeType.ALNUM_1_TO_9)
    client.recognize(image, CodeType.ALNUM_1_TO_10)
    client.recognize(image, CodeType.ALNUM_1_TO_12)
    client.recognize(image, CodeType.ALNUM_1_TO_20)

    client.recognize(image, CodeType.HAN_1)
    client.recognize(image, CodeType.HAN_1_TO_2)
    client.recognize(image, CodeType.HAN_1_TO_3)
    client.recognize(image, CodeType.HAN_1_TO_4)
    client.recognize(image, CodeType.HAN_1_TO_5)
    client.recognize(image, CodeType.HAN_1_TO_6)
    client.recognize(image, CodeType.HAN_1_TO_7)

    client.recognize(image, CodeType.ENGLISH_1_TO_4)
    client.recognize(image, CodeType.ENGLISH_1_TO_5)
    client.recognize(image, CodeType.ENGLISH_1_TO_6)
    client.recognize(image, CodeType.ENGLISH_1_TO_7)
    client.recognize(image, CodeType.ENGLISH_1_TO_8)
    client.recognize(image, CodeType.ENGLISH_1_TO_12)

    client.recognize(image, CodeType.DIGITS_1_TO_4)
    client.recognize(image, CodeType.DIGITS_1_TO_5)
    client.recognize(image, CodeType.DIGITS_1_TO_6)
    client.recognize(image, CodeType.DIGITS_1_TO_7)
    client.recognize(image, CodeType.DIGITS_1_TO_8)

    client.recognize(image, CodeType.MIXED_VARIABLE)
    client.recognize(image, CodeType.ALNUM_SYMBOLS_8)
    client.recognize(image, CodeType.PINYIN_CALC_IDIOM)
    client.recognize(image, CodeType.CALCULATION)
    client.recognize(image, CodeType.QUESTION, time_add=20)
```

The third positional argument is `str_debug`, matching the original method. `len_min` and `time_add` follow it.

Bytes, `bytearray`, a binary file object, a base64 string, or a data URI all work. The client strips a `data:image/...;base64,` prefix and whitespace.

```python
client.recognize("data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==", 1902)
```

## Click and puzzle coordinates

```python
from chaojiying import CodeType, horizontal_distance

ordered = client.recognize(image, CodeType.CLICK_1_TO_4)
print(ordered.points)  # [{"x": ..., "y": ...}, ...]

client.recognize(image, CodeType.CLICK_1)
client.recognize(image, CodeType.CLICK_2)
client.recognize(image, CodeType.CLICK_3)
client.recognize(image, CodeType.CLICK_4)
client.recognize(image, CodeType.CLICK_1_TO_5)
client.recognize(image, CodeType.CLICK_1_TO_6)
client.recognize(image, CodeType.CLICK_1_TO_8)
client.recognize(image, CodeType.CLICK_1_TO_9)

puzzle = client.recognize(image, CodeType.HORIZONTAL_PUZZLE)
if len(puzzle.get("points") or []) == 2:
    print(horizontal_distance(puzzle.points[0], puzzle.points[1]))
```

## Color filter and character lookup

6900 plus `{8f:index,tolerance,background/8f}` keeps one color. Index order is red, green, blue, yellow, white, black. Each `8f` costs 8 extra points.

```python
from chaojiying import CodeType, ColorChannel, color_instruction

red = client.recognize(
    image,
    CodeType.MIXED_COLOR,
    color_instruction(ColorChannel.RED, 100, 255),
)
# color_instruction("green") and color_instruction("蓝") also work
print(red.pic_str)
```

9801 needs `{8a:字,符/8a}`. Missing it returns -10042. Bad punctuation returns -10043.

```python
from chaojiying import click_instruction

located = client.recognize(
    image,
    CodeType.LOCATE_CHARS,
    click_instruction(["查", "找", "的", "字"]),
)
print(located.points)
```

9800 returns every glyph. Crop instructional text out of the bitmap if you do not want to pay for it.

```python
all_text = client.recognize(image, CodeType.LOCATE_ALL_TEXT)
print(all_text.text_locations)  # [{"text", "x", "y"}, ...]
```

## Sliders, blocks, and plates

```python
blocks = client.recognize(image, CodeType.BLOCKS)
print(blocks.rectangles)  # x1, y1, x2, y2

client.recognize(image, CodeType.ONE_BLOCK_CENTER)
client.recognize(image, CodeType.TWO_BLOCK_CENTERS)

plates = client.recognize(image, CodeType.LICENSE_PLATE)
for plate in plates.plates:
    print(plate["number"], plate["confidence"], plate["color"])
```

8601 uses a resource pack. A row is `number,confidence,color,x1,y1,x2,y2`. If parsing fails, `pic_str` is still present and the parsed key is absent.

## Upload formats

```python
client.recognize(image, 1004, body_format="json")
client.post_pic(image, 1004, filename="captcha.jpg")       # multipart userfile
client.post_pic_base64(image, 1902)                        # file_base64
client.recognize_file("captcha.jpg", 1004)
```

Paid images are limited to 1024KB. Free OCR allows 2MB. Oversized, empty, and invalid base64 inputs raise before the request.

## Score and refunds

```python
score = client.get_score()
client.get_balance()  # alias

solved = client.recognize(image, 1004)
client.report_error(solved.pic_id)
client.report(solved.pic_id)  # alias
```

Report only when the answer is wrong, within about three minutes. Some types return -10133. A second report of the same id returns -10132. A high error rate returns -1013. `8f` instruction points are not refunded. `GetScore.php` does not send `softid`; recognize and report do.

[`examples/report_error.py`](examples/report_error.py) sends one id from the command line.

## Free OCR

| Model | Names | `pic_str` |
| ---: | :--- | :--- |
| 8 | `text`, `ocr` | characters |
| 6 | `calc`, `calculation` | arithmetic result |
| 9 | `blocks`, `rectangles` | rectangles |

```python
from chaojiying import Chaojiying, FreeModel

with Chaojiying(api_key="your-api-key") as client:
    text = client.recognize_free(image, FreeModel.TEXT)
    calc = client.recognize_free(image, "calc")
    blocks = client.recognize_free(image, "blocks", upload="multipart")
    print(text.pic_str, calc.pic_str, blocks.rectangles)
```

[`examples/free_ocr.py`](examples/free_ocr.py) uses the async client.

## Async

```python
import asyncio
from chaojiying import AsyncChaojiying, CodeType

async def main() -> None:
    async with AsyncChaojiying(username="user", password="pass") as client:
        score = await client.get_balance()
        result = await client.recognize(image, CodeType.ALNUM_1_TO_4, len_min=4)
        await client.report_error(result.pic_id)
        print(score.tifen, result.pic_str)

asyncio.run(main())
```

`AsyncChaojiying` has the same methods: `get_score`, `get_balance`, `recognize`, `post_pic`, `post_pic_base64`, `recognize_file`, `report_error`, `report`, `recognize_free`. Close with `await client.aclose()` if you are not using `async with`.

## Errors

```python
from chaojiying import ChaojiyingError, InsufficientPointsError

try:
    client.recognize(image, 1004)
except InsufficientPointsError as exc:
    print(exc.err_no, exc.err_str)
except ChaojiyingError as exc:
    print(exc, exc.response_body)
```

`str(exc)` is `[err_no] message` when a code is present.

| err_no | Class | Official text | What to do |
| ---: | :--- | :--- | :--- |
| 0 | — | OK | Success |
| -1001 | `UserParameterError` | 用户参数异常 | Send a real username and password |
| -10012 | `AccessTokenError` | access_token异常 | Send a valid access token |
| -1002 | `UnknownUserError` | 无此用户名 | Use the Chaojiying account |
| -10023 | `PasswordError` | 用户名的密码出错 | Fix the password |
| -1004 | `CodeTypeError` | 类型参数错误 | Use a price-table code type |
| -1005 | `InsufficientPointsError` | 无可用题分 | Recharge |
| -10052 | `NoResourcePackError` | 无可用资源包 | Buy the pack (8601) |
| -10061 | `InvalidImageError` | 不是有效的图片文件 | Upload a real image |
| -100612 | `Base64ParseError` | base64字符解析异常 | Raw base64 only |
| -10062 | `ImageTooLargeError` | 文件超大 1024k | 1024KB paid, 2MB free |
| -10064 | `UnrecognizableImageError` | 图片无法被识别 | Skip the image |
| -10071 | `IpWhitelistError` | IP受限 | IP allow-list |
| -10072 | `IpBlacklistError` | IP受限 | IP block-list |
| -2001 | `UploadError` | 上传图片出错 | Upload failed |
| -429 | `RateLimitError` | 请求过于频繁 | Retried when `retries > 0` |
| -1011 | `InvalidPictureIdError` | 图片ID异常 | Send a real pic_id |
| -1013 | `ErrorRateTooHighError` | 错误率太高 | Stop blind refunds |
| -10132 | `PictureAlreadyReportedError` | 此图片ID已报过 | Already refunded |
| -10133 | `ReportNotSupportedError` | no_access | Type cannot be reported |
| -10042 | `MissingClickInstructionError` | 缺少8a指令 | 9801 needs `{8a:.../8a}` |
| -10043 | `BadClickInstructionError` | 8a指令异常 | Half-width punctuation |
| -3002 | `MalformedBase64Error` | base64字符异常 | Broken base64 |

`describe_error_code(-1005)` returns the remedy. `ERROR_CODES` is the full table.

`NetworkError` carries `status` and `connect_failure`. `TimeoutError` is a timeout. `ResponseIntegrityError` means the MD5 check failed after billing. `MissingCredentialsError` means configuration was incomplete.

## Proxies, timeouts, retries

```python
with Chaojiying(
    proxy="http://user:pass@10.0.0.1:8888",
    timeout=90,
    retries=4,
    retry_delay=0.5,
) as client:
    print(client.get_score().tifen)
```

[`examples/proxy_and_retries.py`](examples/proxy_and_retries.py) does that balance check. There is no webhook. The HTTP response is the result.

## Response MD5

`md5(softid + softkey + pic_id + pic_str)`, 32 lowercase hex, no separator.

```python
from chaojiying import SOFT_ID, SOFT_KEY, compute_response_md5, verify_response_md5

result = client.recognize(image, 1004, verify_md5=True)
verify_response_md5(result, SOFT_ID, SOFT_KEY)
compute_response_md5(SOFT_ID, SOFT_KEY, result.pic_id, result.pic_str)
```

A custom `soft_id` needs the matching `soft_key` for this check. The default partner id and key stay on the request unless you override them.

## Type hints

```python
from chaojiying import RecognizeResult, ScoreResult, ReportErrorResult

def show(result: RecognizeResult) -> str:
    return result.pic_str
```

`RecognizeResult`, `ScoreResult`, and `ReportErrorResult` are dict subclasses, so existing `result["pic_str"]` code keeps working.

## Comparison

| | chaojiying | Official Python sample | npm `chaojiying` 0.1.1 | Official Go sample |
| :--- | :--- | :--- | :--- | :--- |
| Sync and async | yes | sync only | promises | sync |
| Typed results and code types | yes | no | thin | no |
| `pass2` MD5 | yes | yes | caller hashes | sends `pass` |
| Base64 and multipart | yes | both | base64 | base64 |
| Score | yes | no | no | yes |
| Refund | yes | yes | no | omitted |
| `len_min` | yes | no | no | yes |
| `8a` / `8f` helpers | yes | no | no | no |
| Parsers and MD5 | yes | no | no | no |
| Free OCR v2 | yes | no | no | no |
| Proxy and retries | yes | no | no | proxy only |
| Error class per code | yes | no | no | no |
| Partner `softid` default | yes | caller supplies | empty | caller supplies |

## FAQ

**Does this poll?** No. Set `timeout` to at least 60 seconds.

**Will a retry double-charge?** Paid recognize retries connection failures and -429 only.

**Can I drop softid?** The client sends the partner software id on recognize and report. Pass `soft_id` only to attribute the call to a different software id.

**Why -3002 / -100612?** `file_base64` must be raw base64. This client removes a data-URI prefix and whitespace.

**What happened to 95xx?** The type guide points sliders and blocks at 9900 and text location at 9800. Those legacy ids are not in `CodeType`.

## Contributing

The package lives in the [api-kit](https://github.com/TysikGG/api-kit) monorepo under `chaojiying/python`.

```bash
uv sync
uv run ruff check .
uv run pytest -m "not live"   # coverage is part of this command
uv run pytest -m live         # CHAOJIYING_USER and CHAOJIYING_PASS; balance only
```

## License

ISC. See [LICENSE](LICENSE).
