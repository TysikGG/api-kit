# capguru-client

[![PyPI version](https://img.shields.io/pypi/v/capguru-client.svg)](https://pypi.org/project/capguru-client/)
[![Python](https://img.shields.io/pypi/pyversions/capguru-client.svg)](https://pypi.org/project/capguru-client/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

Typed Python client for the [Cap.guru](https://cap.guru/) captcha API: RuCaptcha-compatible `in.php` / `res.php` and the Anti-Captcha-compatible JSON task API.

Official docs: <https://docs.cap.guru/en/>

---

## Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick start](#quick-start)
- [Token tasks](#token-tasks)
- [Image and text](#image-and-text)
- [Click, grid, and slider](#click-grid-and-slider)
- [Site presets](#site-presets)
- [JSON task API](#json-task-api)
- [Async client](#async-client)
- [Low-level tasks and reports](#low-level-tasks-and-reports)
- [Error handling](#error-handling)
- [Advanced usage](#advanced-usage)
- [Type hints](#type-hints)
- [Comparison](#comparison)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

## Features

- Token tasks: reCAPTCHA v2 (normal, invisible, Enterprise, `data-s`), reCAPTCHA v3, Cloudflare Turnstile, hCaptcha, FunCaptcha, GeeTest v3.
- Click and grid tasks: reCAPTCHA, hCaptcha, FunCaptcha, GeeTest, plus Binance, TikTok, Temu, AWS WAF, Bitget, Linkvertise, SeoFast, and World.cash.
- Slider coordinates parsed and scaled to the on-screen track (271px reference field).
- Image-to-text (`method=base64` and multipart `method=post`) with `vernet` presets, and text questions.
- Sync `CapGuruClient` and `AsyncCapGuruClient` (worker-thread wrapper with the same methods).
- Polling, `should_stop` cancellation, and retries for network failures, HTTP errors, and `ERROR_NO_SLOT_AVAILABLE`.
- Reports, balance, raw task helpers, and the JSON `/createTask` API.
- Every request forces `key`, `json=1`, and developer id `softguru=164125`.

## Installation

```bash
pip install capguru-client
```

Python 3.10+. Runtime dependency: `httpx`.

```python
from capguru import CapGuru, CapGuruClient, AsyncCapGuruClient
```

`CapGuru` aliases `CapGuruClient`. `AsyncCapGuru` aliases `AsyncCapGuruClient`.

## Configuration

```python
from capguru import CAPGURU_API2_URL, CapGuruClient

with CapGuruClient(
    api_key,
    base_url="https://api.cap.guru",  # or CAPGURU_API2_URL / CAPGURU_IPV6_URL
    timeout=30.0,  # HTTP timeout, seconds
    default_polling_timeout=120.0,  # solve helpers, seconds
    default_polling_interval=5.0,
    max_retries=0,
    retry_delay=0.0,
    headers={"X-Debug": "1"},
) as client:
    ...
```

| Argument | Default | Meaning |
| --- | --- | --- |
| `api_key` | required | Dashboard key. Empty string raises `MissingApiKeyError`. |
| `base_url` | `https://api.cap.guru` | Origin. Trailing slashes are removed. |
| `timeout` | `30` | httpx timeout in seconds. |
| `default_polling_timeout` | `120` | How long `solve_*` and `wait_for_result` poll. `0` is a single poll. |
| `default_polling_interval` | `5` | Delay between polls, in seconds. The first poll runs immediately. |
| `max_retries` | `0` | Extra attempts for `NETWORK_ERROR`, `HTTP_ERROR`, and `ERROR_NO_SLOT_AVAILABLE`. |
| `retry_delay` | `0` | Pause before each retry, in seconds. |
| `headers` | none | Extra request headers. |

Solve methods take polling controls as keyword-only arguments: `timeout`, `interval`, `on_not_ready`, `should_stop`. Times are seconds.

Token methods accept `cookies`, `user_agent`, `proxy` (`host:port` or `user:pass@host:port`), `proxy_type` (`HTTP`, `HTTPS`, `SOCKS4`, `SOCKS5`, sent as `proxytype`), and `extra`. `extra` is merged with `setdefault`, so explicit fields win. `key`, `json`, and `softguru` are applied last.

## Quick start

Balance only. This does not create a task.

```python
import os
from capguru import CapGuruClient

with CapGuruClient(os.environ["CAPGURU_API_KEY"]) as client:
    print(client.get_balance())
```

`balance()` is an alias. Runnable copy: [`examples/check.py`](examples/check.py).

## Token tasks

### reCAPTCHA v2

```python
token = client.solve_recaptcha_v2(
    "6Le-wvkSAAAAAPBMRTvw0Q4CeHg-tUnSQVwyYcxQ",
    "https://example.com/login",
    invisible=True,
    enterprise=False,
    data_s="optional-data-s",
)
```

### reCAPTCHA v3

```python
token = client.solve_recaptcha_v3(
    "6Le-wvkSAAAAAPBMRTvw0Q4CeHg-tUnSQVwyYcxQ",
    "https://example.com/checkout",
    action="checkout",
    min_score=0.3,
    enterprise=True,
)
```

Sends `version=v3` and `min_score`.

### Cloudflare Turnstile

```python
token = client.solve_turnstile(
    "0x4AAAAAAADnPIDROrmt1Wwj",
    "https://example.com/protected",
    action="login",
    data="optional-cdata",
)
```

### hCaptcha token

Cap.guru currently documents hCaptcha tokens as unavailable. `solve_hcaptcha` remains for the published parameters. Prefer `solve_hcaptcha_click` for image challenges.

```python
token = client.solve_hcaptcha(
    "10000000-ffff-ffff-ffff-000000000001",
    "https://example.com",
    invisible=True,
    data="rqdata-value",
)
```

### FunCaptcha token

```python
token = client.solve_funcaptcha(
    "ARKOSE-PUBLIC-KEY",
    "https://example.com",
    surl="https://client-api.arkoselabs.com",
    data="optional-blob",
)
```

### GeeTest v3 token

```python
result = client.solve_geetest(
    "gt-value",
    "challenge-value",
    "https://example.com",
    api_server="api.geetest.com",
)
# result.challenge, result.validate, result.seccode
```

JSON objects map `geetest_*` or plain keys. A non-JSON answer sets `validate` to the raw string and `seccode` to `{raw}|jordan`.

### Proxy

```python
token = client.solve_recaptcha_v2(
    googlekey,
    pageurl,
    proxy="user:pass@203.0.113.10:8080",
    proxy_type="HTTP",
    cookies="session=abc",
    user_agent="Mozilla/5.0",
)
```

[`examples/tokens.py`](examples/tokens.py).

## Image and text

### Base64 image

```python
import base64
from pathlib import Path
from capguru import VERNET

body = base64.b64encode(Path("captcha.png").read_bytes()).decode()
text = client.solve_image(
    body,
    phrase=0,
    regsense=1,
    numeric=1,
    calc=0,
    min_len=4,
    max_len=6,
    language=2,
    textinstructions="enter the blue characters",
    vernet=VERNET["MICROSOFT"],
)
```

| Argument | Meaning |
| --- | --- |
| `phrase` | `0` one word, `1` two or more words |
| `regsense` | `0` case insensitive, `1` case sensitive |
| `numeric` | `0` unspecified, `1` numbers, `2` letters, `3` numbers or letters |
| `calc` | `1` when the image is a math expression |
| `language` | `0` any, `1` Cyrillic, `2` Latin |
| `vernet` | Preset. `VERNET` maps names to `2`, `6`, `22`, `12`, `18`, `20`, `16`, `14`, `13`, `9`, `17`, `5` |

### Multipart file upload

```python
text = client.solve_image_file(
    Path("captcha.png").read_bytes(),
    filename="captcha.png",
    vernet=VERNET["GENERAL_V2"],
)
```

Posts `method=post`.

### Text question

```python
answer = client.solve_text("What is 2 + 2?", language=2)
```

[`examples/images.py`](examples/images.py).

## Click, grid, and slider

`solve_click` returns a `ClickSolution` dataclass: `raw`, optional `points` (`Point` with `x`, `y`, `w`), and optional `cells`.

```python
from capguru import CLICK

solution = client.solve_click(
    "Select all traffic lights",
    CLICK["RECAPTCHA"],
    body=image_b64,
)
```

`solve_coordinates` is an alias.

`CLICK` values: `recap`, `recap2`, `hcap`, `hcap2`, `geetest`, `geetest2`, `funcap`, `funcap2`, `temu`, `oth`.

### Typed image clicks

```python
client.solve_recaptcha_click("cars", image_b64, grid=True)  # recap2
client.solve_hcaptcha_click("boats", image_b64)
client.solve_funcaptcha_click("pick the animal", image_b64, grid=True)
client.solve_geetest_click("geetestv2", image_b64)
```

`TEXT_INSTRUCTIONS` includes `slider`, `geetestv2`, `geetesticonv4`, `five`, `three`, and `geetesticonhand`.

### Slider

```python
from capguru import scale_slider_offset, slider_offset

solution = client.solve_slider(body=background_b64, piece=piece_b64)
offset = slider_offset(solution)
if offset is not None:
    pixels = scale_slider_offset(offset, window_width=280, image_width=340)
```

`piece` is sent as `body1` and the background moves to `body0`. Default instruction is `slider` and default `click` is `geetest`. Omit `image_width` to scale with the 271px field (`DEFAULT_SLIDER_FIELD_WIDTH`).

[`examples/clicks.py`](examples/clicks.py).

## Site presets

```python
client.solve_binance(image_b64, object_name="dog")  # binance,dog
client.solve_binance(image_b64, textinstructions="binance,dog", grid=True)

client.solve_tiktok(variant="kolesso", body0=first_b64, body1=second_b64)
client.solve_tiktok(variant="question", question="select the letter A", body=image_b64)
# variants: kolesso, koleso, abc, slider, question. click=geetest

client.solve_aws(image_b64, instruction="Place a dot at the end of the car's path")
# prefixes Amazon, when missing. click=oth

client.solve_temu("Select the object that fits", body=image_b64)  # click=temu

client.solve_bitget(body=image_b64)  # geetesticonhand
client.solve_linkvertise("click the matching icon", body=image_b64)  # custom1221
client.solve_seofast("click the matching icon", body=image_b64)  # custom1222
client.solve_worldcash(body=image_b64)  # custom1224
```

[`examples/sites.py`](examples/sites.py).

## JSON task API

```python
task_id = client.create_json_task(
    {
        "type": "NoCaptchaTaskProxyless",
        "websiteURL": "https://example.com",
        "websiteKey": sitekey,
    },
    language_pool="en",
)
pending = client.get_json_task_result(task_id)  # None while processing
ready = client.wait_for_json_result(task_id)
solved = client.solve_json_task(
    {"type": "NoCaptchaTaskProxyless", "websiteURL": "https://example.com", "websiteKey": sitekey}
)
```

The body includes `clientKey`, `softId=164125`, and `softguru=164125`. `get_json_task_result` returns `None` for `processing`, `pending`, and RuCaptcha `CAPCHA_NOT_READY`. `read_solution_token(ready.solution)` reads `gRecaptchaResponse`, `token`, `text`, or `request`.

[`examples/json_task.py`](examples/json_task.py).

## Async client

`AsyncCapGuruClient` forwards every public method through `asyncio.to_thread`, so the event loop stays free and behavior matches the sync client (one shared HTTP implementation).

```python
import asyncio
from capguru import AsyncCapGuruClient


async def main() -> None:
    async with AsyncCapGuruClient(api_key) as client:
        print(await client.get_balance())
        token = await client.solve_turnstile(sitekey, pageurl, action="login")


asyncio.run(main())
```

[`examples/async_balance.py`](examples/async_balance.py).

## Low-level tasks and reports

```python
task_id = client.create_task(
    {
        "method": "userrecaptcha",
        "googlekey": sitekey,
        "pageurl": "https://example.com",
    }
)
once = client.get_task_result(task_id)  # None on CAPCHA_NOT_READY
text = client.wait_for_result(task_id, timeout=60, interval=3)

client.create_task_multipart({"method": "post", "vernet": 5}, image_bytes, "captcha.png")
client.report_good(task_id)
client.report_bad(task_id)
```

`report_correct` and `report_incorrect` alias the report methods. A recorded report returns `True`.

[`examples/reports.py`](examples/reports.py).

## Error handling

API failures raise `CapGuruError` with message `CapGuru error: CODE`. Known codes use a subclass. `PollingTimeoutError` is the timeout subclass (`code` `TIMEOUT`) so it does not shadow the builtin. Attributes: `code`, `description`, `response_data`.

```python
from capguru import CapGuruError, ZeroBalanceError

try:
    client.solve_image(body)
except ZeroBalanceError as exc:
    print(exc.description)
except CapGuruError as exc:
    print(exc.code, exc.response_data)
```

| Code | Class |
| --- | --- |
| `ERROR_WRONG_USER_KEY` | `WrongUserKeyError` |
| `ERROR_KEY_DOES_NOT_EXIST` | `KeyDoesNotExistError` |
| `ERROR_ZERO_BALANCE` | `ZeroBalanceError` |
| `ERROR_TOO_BIG_CAPTCHA_FILESIZE` | `TooBigCaptchaError` |
| `ERROR_UPLOAD` | `UploadError` |
| `ERROR_IMAGE_TYPE_NOT_SUPPORTED` | `ImageTypeNotSupportedError` |
| `ERROR_CAPTCHA_UNSOLVABLE` | `CaptchaUnsolvableError` |
| `ERROR_NO_SLOT_AVAILABLE` | `NoSlotAvailableError` (retryable) |
| `ERROR_PAGEURL` | `PageUrlError` |
| `ERROR_GOOGLEKEY` | `GoogleKeyError` |
| `ERROR_RECAPTCHA_INVALID_DOMAIN` | `RecaptchaInvalidDomainError` |
| `ERROR_RECAPTCHA_INVALID_SITEKEY` | `RecaptchaInvalidSitekeyError` |
| `ERROR_HKEY` | `HCaptchaKeyError` |
| `CAPCHA_NOT_READY` | `CapGuruError` (`get_task_result` returns `None`) |
| `ERROR_NO_SUCH_CAPCHA_ID` | `NoSuchCaptchaIdError` |
| `ERROR_WRONG_CAPTCHA_ID` | `WrongCaptchaIdError` |
| `notpic` | `NotPicError` |
| `ERROR_GEETTEST_GT` | `GeeTestGtError` |
| `ERROR_GEETTEST_challenge` | `GeeTestChallengeError` |
| `ERROR_CAPTCHA_BAD_GT_OR_CNANNEL` | `GeeTestBadGtError` |
| `ERROR_PROXY_CONNECTION_FAILED` | `ProxyConnectionError` |
| `MISSING_API_KEY` | `MissingApiKeyError` |
| `PARSE_ERROR` | `ParseError` |
| `INVALID_RESPONSE` | `InvalidResponseError` |
| `NETWORK_ERROR` | `NetworkError` (retryable) |
| `HTTP_ERROR` | `HttpError` (retryable) |
| `TIMEOUT` | `PollingTimeoutError` |
| `ABORTED` | `AbortedError` |

Plain-text bodies (`OK|id`, `ERROR_*`, `CAPCHA_NOT_READY`, a bare balance) are accepted alongside JSON. Descriptions live in `ERROR_CODE_DESCRIPTIONS`.

## Advanced usage

### Callbacks and cancellation

```python
import time


def on_not_ready(info: dict) -> None:
    print(info["task_id"], info["attempt"], info["elapsed"])


deadline = time.monotonic() + 30

token = client.solve_turnstile(
    sitekey,
    pageurl,
    timeout=90,
    interval=2,
    on_not_ready=on_not_ready,
    should_stop=lambda: time.monotonic() > deadline,
)
```

`should_stop` is checked at the start of each poll, after `on_not_ready`, and after sleep. A stop raises `AbortedError`.

### Retries

```python
client = CapGuruClient(api_key, max_retries=2, retry_delay=1.0)
```

`RETRYABLE_ERROR_CODES` is `NETWORK_ERROR`, `HTTP_ERROR`, and `ERROR_NO_SLOT_AVAILABLE`.

### Manual poll loop

```python
task_id = client.create_task({"method": "base64", "body": body, "vernet": 6})
answer = client.get_task_result(task_id)
while answer is None:
    time.sleep(5)
    answer = client.get_task_result(task_id)
```

[`examples/advanced.py`](examples/advanced.py).

## Type hints

Result dataclasses: `GeeTestResult`, `Point`, `ClickSolution`, `JsonTaskResult`.

Constants: `DEFAULT_SOFTGURU`, `CAPGURU_API_URL`, `CAPGURU_API2_URL`, `CAPGURU_IPV6_URL`, `CLICK`, `VERNET`, `TEXT_INSTRUCTIONS`, `DEFAULT_SLIDER_FIELD_WIDTH`.

Parsers you can call directly: `parse_click_answer`, `parse_geetest`, `read_solution_token`, `slider_offset`, `scale_slider_offset`.

## Comparison

| Capability | capguru-client | @captcha-libs/capguru | capguru (npm / PyPI) | capguru-mcp |
| --- | --- | --- | --- | --- |
| Raw HTTP API | Yes | Yes (JS) | No. Puppeteer or Playwright helpers | MCP server |
| reCAPTCHA v2/v3 and Turnstile tokens | Yes | Yes | Browser flow | Tool wrapper |
| Click family, TikTok, Binance, Temu, AWS, and the other site presets | Yes | Partial task classes | No | Partial |
| Slider scaling, multipart upload, `vernet` | Yes | Coordinates / image task | No | No |
| JSON `/createTask` | Yes | No | No | No |
| Sync and async Python, typed errors, reports, retries | Yes | JS polling | No | No |
| `softguru` developer id `164125` | Yes | No | n/a | n/a |

## FAQ

**Does `get_balance` spend credit?** No. It calls `res.php?action=getbalance`.

**Why is `softguru` always 164125?** It is this library's developer id, applied after user parameters. The JSON API also sends `softId`.

**Can I use api2 or IPv6?** Pass `base_url=CAPGURU_API2_URL` or `CAPGURU_IPV6_URL`.

**What does `timeout=0` do?** One poll, then `PollingTimeoutError` if the task is not ready.

**Are live tests safe?** `tests/test_live.py` is marked `live`, skipped unless `CAPGURU_API_KEY` is set, and only reads the balance.

## Contributing

```bash
cd capguru/python
uv sync
uv run ruff check .
uv run ruff format --check .
uv run pytest -m "not live"    # coverage fail-under 95%
```

## License

ISC. See [LICENSE](LICENSE).
