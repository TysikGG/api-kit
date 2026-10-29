# capmonster-client

[![PyPI version](https://img.shields.io/pypi/v/capmonster-client.svg)](https://pypi.org/project/capmonster-client/)
[![Python versions](https://img.shields.io/pypi/pyversions/capmonster-client.svg)](https://pypi.org/project/capmonster-client/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Typed Python client for the [CapMonster Cloud](https://capmonster.cloud/) recognition API. Sync (`CapMonster`) and async (`AsyncCapMonster`) clients share the same methods. Built on [HTTPX](https://www.python-httpx.org/).

Official docs: <https://docs.capmonster.cloud>

Import the package as `capmonster`. The distribution name is `capmonster-client` so it does not collide with other PyPI projects.

## Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick start](#quick-start)
- [API methods](#api-methods)
- [Task types](#task-types)
- [Error handling](#error-handling)
- [Advanced usage](#advanced-usage)
- [Type hints](#type-hints)
- [Comparison](#comparison)
- [FAQ](#faq)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Features

- Every documented task: reCAPTCHA v2/v3/Enterprise, Turnstile, Cloudflare Challenge (token and `cf_clearance`), Waiting Room, GeeTest v3/v4, ImageToText, ComplexImage, DataDome, Amazon WAF, Binance, FunCaptcha, hCaptcha, Basilisk, Imperva, Prosopo, Yidun, MTCaptcha, Altcha, Friendly Captcha, Temu, Castle, TSPD, Hunt, TenDI, and Alibaba.
- `get_balance`, `get_user_agent`, `create_task`, `get_task_result`, `wait_for_result` (`join_task_result`), `solve`, and `solve_detailed`.
- Reports: `report_incorrect_image_captcha`, `report_incorrect_token_captcha`, and `report_incorrect_recaptcha`.
- Polling with timeout, interval, initial delay, max attempts, a cancel callback, and `on_poll`. `CAPTCHA_NOT_READY` stays in the processing state.
- Optional retries for transient network failures and retryable API codes.
- Customer proxies and CapMonster's built-in proxies when proxy fields are omitted.
- `callback_url`, `nocache`, recognition threshold, and module name, including the documented client-key suffixes.
- `soft_id` is omitted until you set it. `DEFAULT_SOFT_ID` stays empty while the developer program is pending.
- A subclass of `CapMonsterError` for every documented error code.

## Installation

```bash
pip install capmonster-client
```

Python 3.10 or newer.

## Configuration

```python
from capmonster import CapMonster

with CapMonster(
    "your_client_key",
    base_url="https://api.capmonster.cloud",
    timeout=30.0,
    soft_id="",
    retries=0,
    retry_delay=1.0,
    user_agent_url="https://capmonster.cloud/api/useragent/actual",
    nocache=False,
    recognizing_threshold=None,
    module_name=None,
) as client:
    print(client.get_balance())
```

`AsyncCapMonster` takes the same keyword arguments and uses `httpx.AsyncClient`. Pass `http_client` to reuse a client you already own. This class closes a client only when it created it.

| Argument | Default | Purpose |
| :--- | :--- | :--- |
| `client_key` | required | Dashboard API key. Sent as `clientKey`. |
| `base_url` | `https://api.capmonster.cloud` | JSON API origin. |
| `timeout` | `30` seconds | Per-request HTTP timeout. |
| `soft_id` | `""` | Developer software id. Omitted when empty or `0`. |
| `retries` | `0` | Extra attempts for transient failures. |
| `retry_delay` | `1` second | Base retry delay. Attempt n waits `n * retry_delay`. |
| `user_agent_url` | `https://capmonster.cloud/api/useragent/actual` | URL used by `get_user_agent()`. |
| `nocache` | `False` | Appends `__nocache` to the client key. |
| `recognizing_threshold` | `None` | Appends `__recognizingthreshold_{n}` to the client key. |
| `module_name` | `None` | Appends `__moduleName` to the client key. |
| `http_client` | new HTTPX client | Inject a client in tests. |

## Quick start

```python
import os
from capmonster import CapMonster

with CapMonster(os.environ["CAPMONSTER_API_KEY"]) as client:
    print(client.get_balance())
    print(client.get_user_agent())
```

Async:

```python
import asyncio
import os
from capmonster import AsyncCapMonster

async def main() -> None:
    async with AsyncCapMonster(os.environ["CAPMONSTER_API_KEY"]) as client:
        print(await client.get_balance())

asyncio.run(main())
```

Balance and the User-Agent do not create a captcha task.

## API methods

Names below are the sync client. Await the same names on `AsyncCapMonster`.

### get_balance

`POST /getBalance`. Returns `{"balance": float}`. A zero balance is not an error. `create_task` returns `ERROR_ZERO_BALANCE` when the account cannot pay.

### get_user_agent

`GET https://capmonster.cloud/api/useragent/actual`. Returns the Windows User-Agent CapMonster currently supports. Send that same string on the task and on the target site.

### create_task

`POST /createTask`. Returns an `int` task id. `softId` is included only when it is set. `callback_url` receives the same JSON body as `get_task_result`.

```python
from capmonster import turnstile

task_id = client.create_task(
    turnstile("https://example.com/", "0x4AAAAAAA..."),
    callback_url="https://example.com/capmonster-callback",
)
```

### get_task_result

`POST /getTaskResult`. `status` is `processing` or `ready`. `CAPTCHA_NOT_READY` is returned as processing instead of raised. Poll at least 2 seconds apart, at most 120 times per task. The default interval is 3 seconds.

### wait_for_result

`join_task_result` is an alias.

```python
solution = client.wait_for_result(
    task_id,
    timeout=120,
    interval=3,
    initial_delay=0,
    max_attempts=120,
    on_poll=lambda update: print(update["attempt"], update["status"]),
    cancel=lambda: False,
)
```

### solve and solve_detailed

`solve` returns the solution dict. `solve_detailed` returns `{"taskId", "solution"}`.

```python
solved = client.solve_detailed(task, timeout=180, callback_url="https://example.com/hook")
```

### Reports

```python
client.report_incorrect_image_captcha(task_id)
client.report_incorrect_token_captcha(task_id)
client.report_incorrect_recaptcha(task_id)
```

`report_incorrect_image` and `report_incorrect_token` are aliases. `/reportIncorrectRecaptcha` is sent to its own path. A successful report is `{"status": "success"}`.

## Task types

Helpers set `type` and, when the docs require `CustomTask`, `class`. Extra keyword arguments are forwarded unchanged.

| Captcha | Helper |
| :--- | :--- |
| reCAPTCHA v2 | `recaptcha_v2` |
| reCAPTCHA v2 proxyless alias | `recaptcha_v2_proxyless` |
| NoCaptcha aliases | `no_captcha`, `no_captcha_proxyless` |
| reCAPTCHA v2 Enterprise | `recaptcha_v2_enterprise` |
| reCAPTCHA v3 | `recaptcha_v3` |
| reCAPTCHA v3 Enterprise | `recaptcha_v3_enterprise` |
| Turnstile | `turnstile` |
| Challenge token / cookie | `turnstile_challenge_token`, `turnstile_challenge_cookie` |
| Waiting Room | `turnstile_waiting_room` |
| GeeTest | `geetest`, `geetest_v3`, `geetest_v4` |
| ImageToText | `image_to_text` |
| Complex image | `complex_image`, `complex_recaptcha`, `complex_hcaptcha`, `complex_funcaptcha`, `complex_recognition` |
| DataDome | `datadome` |
| TenDI | `tendi` |
| Amazon WAF | `amazon` |
| Binance | `binance` |
| FunCaptcha | `funcaptcha` |
| hCaptcha | `hcaptcha`, `hcaptcha_proxyless` |
| Basilisk | `basilisk` |
| Imperva | `imperva` |
| Prosopo | `prosopo` |
| Yidun | `yidun` |
| MTCaptcha | `mtcaptcha` |
| Altcha | `altcha` |
| Friendly Captcha | `friendly_captcha` |
| Temu | `temu` |
| Castle | `castle` |
| TSPD | `tspd` |
| Hunt | `hunt` |
| Alibaba | `alibaba` |

`with_proxy(task, proxyType="http", proxyAddress="1.2.3.4", proxyPort=8080, proxyLogin="user", proxyPassword="secret")` copies proxy fields onto a task.

### reCAPTCHA v2

```python
from capmonster import recaptcha_v2

solution = client.solve(recaptcha_v2(
    "https://lessons.zennolab.com/captchas/recaptcha/v2_simple.php?level=high",
    "6Lcg7CMUAAAAANphynKgn9YAgA4tQ2KI_iqRyTwd",
    isInvisible=False,
    userAgent=client.get_user_agent(),
    nocache=True,
))
print(solution["gRecaptchaResponse"])
```

Built-in proxies are used when proxy fields are omitted. `recaptchaDataSValue` is the `data-s` attribute.

### reCAPTCHA v2 Enterprise

```python
from capmonster import recaptcha_v2_enterprise

client.solve(recaptcha_v2_enterprise(
    "https://example.com/enterprise",
    "6Le...",
    apiDomain="www.recaptcha.net",
    enterprisePayload={"s": "data-s-value"},
    pageAction="login",
))
```

### reCAPTCHA v3 and v3 Enterprise

```python
from capmonster import recaptcha_v3, recaptcha_v3_enterprise

client.solve(recaptcha_v3(
    "https://example.com/",
    "6Le...",
    pageAction="login",
    minScore=0.7,
))
client.solve(recaptcha_v3_enterprise(
    "https://example.com/",
    "6Le...",
    minScore=0.7,
    pageAction="submit",
))
```

`isEnterprise=True` on `recaptcha_v3` is solved like the Enterprise task. v3 uses CapMonster proxies.

### Cloudflare Turnstile, Challenge, and Waiting Room

```python
from capmonster import (
    turnstile,
    turnstile_challenge_cookie,
    turnstile_challenge_token,
    turnstile_waiting_room,
)

user_agent = client.get_user_agent()
client.solve(turnstile("https://example.com/", "0x4AAAAAAA...", userAgent=user_agent))

client.solve(turnstile_challenge_token(
    "https://example.com/",
    "0x4AAAAAAA...",
    pageAction="managed",
    userAgent=user_agent,
))

client.solve(turnstile_challenge_cookie(
    "https://example.com/",
    "xxxxxx",
    htmlPageBase64=html_base64,
    userAgent=user_agent,
    proxyType="http",
    proxyAddress="1.2.3.4",
    proxyPort=8080,
    proxyLogin="user",
    proxyPassword="secret",
))

client.solve(turnstile_waiting_room(
    "https://example.com/",
    "xxxxxx",
    htmlPageBase64=html_base64,
    userAgent=user_agent,
    proxyType="http",
    proxyAddress="1.2.3.4",
    proxyPort=8080,
    proxyLogin="user",
    proxyPassword="secret",
))
```

Challenge cookie and Waiting Room return `cf_clearance` and require your proxy. Waiting Room HTML must contain "Waiting Room powered by Cloudflare".

### GeeTest v3 and v4

v3 needs a fresh `challenge` taken before the widget initializes. v4 uses `gt` as `captcha_id`.

```python
from capmonster import geetest_v3, geetest_v4

client.solve(geetest_v3("https://example.com/", "gt-public-key", "fresh-challenge"))
client.solve(geetest_v4("https://example.com/", "captcha-id"))
```

### ImageToText

`body` is a single-line base64 image, at least 100 bytes and at most 50 KB. `recognizingThreshold` is 0–100. Below the threshold the task ends as `ERROR_CAPTCHA_UNSOLVABLE` and is not charged.

```python
from capmonster import image_to_text

solution = client.solve(image_to_text(
    base64_image,
    capMonsterModule="yandex",
    recognizingThreshold=80,
    case=True,
    numeric=0,
    math=False,
))
print(solution["text"])
```

The same threshold and module can be appended to the key: `API_KEY__solvemedia__recognizingthreshold_70`. Set `module_name` and `recognizing_threshold` on the client for that form.

### ComplexImage

```python
from capmonster import complex_recaptcha

client.solve(complex_recaptcha(
    imageUrls=["https://example.com/grid.jpg"],
    metadata={"Task": "Select all traffic lights", "Grid": "3x3"},
    websiteURL="https://example.com/",
))
```

`complex_hcaptcha`, `complex_funcaptcha`, and `complex_recognition` set the other classes. `complex_image("recaptcha", ...)` is the generic form.

### DataDome, FunCaptcha, and Imperva

These flows need your proxy. Whitelist `65.21.190.34` when the proxy uses IP authorization.

```python
from capmonster import datadome, funcaptcha, imperva

client.solve(datadome(
    "https://example.com/",
    {"datadomeCookie": "datadome=...", "captchaUrl": "https://geo.captcha-delivery.com/captcha/"},
    userAgent=client.get_user_agent(),
    proxyType="http",
    proxyAddress="1.2.3.4",
    proxyPort=8080,
    proxyLogin="user",
    proxyPassword="secret",
))

client.solve(funcaptcha(
    "https://example.com/",
    "EX72CCFB-26EX-40E5-91E6-85EX70BE98ED",
    funcaptchaApiJSSubdomain="client-api.arkoselabs.com",
    data='{"blob":"blob-value"}',
    userAgent=client.get_user_agent(),
    proxyType="http",
    proxyAddress="1.2.3.4",
    proxyPort=8080,
    proxyLogin="user",
    proxyPassword="secret",
))

client.solve(imperva(
    "https://example.com/",
    {
        "incapsulaScriptUrl": "https://example.com/_Incapsula_Resource?...",
        "incapsulaCookies": "visid_incap_...=...",
    },
    userAgent=client.get_user_agent(),
    proxyType="http",
    proxyAddress="1.2.3.4",
    proxyPort=8080,
    proxyLogin="user",
    proxyPassword="secret",
))
```

FunCaptcha `data` is the blob JSON. Do not load the iframe before reading `blob`. The subdomain is the host only, without `https://`.

### Amazon WAF, Binance, and TenDI

TenDI is the Tencent captcha. It is not a Tenable product.

```python
from capmonster import amazon, binance, tendi

client.solve(amazon(
    "https://example.com/",
    "website-key",
    cookieSolution=True,
    context="context",
    iv="iv",
))
client.solve(binance(
    "https://accounts.binance.com/en/login",
    "website-key",
    "validate-id",
    userAgent=client.get_user_agent(),
))
client.solve(tendi(
    "https://example.com/",
    "189123456",
    userAgent=client.get_user_agent(),
))
```

### Basilisk, Prosopo, Yidun, MTCaptcha, Altcha, Friendly Captcha

```python
from capmonster import altcha, basilisk, friendly_captcha, mtcaptcha, prosopo, yidun

client.solve(basilisk("https://example.com/", "key"))
client.solve(prosopo("https://example.com/", "key"))
client.solve(yidun("https://example.com/", "key", userAgent=client.get_user_agent()))
client.solve(mtcaptcha("https://example.com/", "key", pageAction="login"))
client.solve(altcha(
    "https://example.com/",
    "key",
    {"challenge": "c", "iterations": "1000", "salt": "s", "signature": "sig"},
))
client.solve(friendly_captcha(
    "https://example.com/",
    "key",
    {"apiGetLib": "https://example.com/friendly.js"},
))
```

### Temu, Castle, TSPD, Hunt, Alibaba

```python
from capmonster import alibaba, castle, hunt, temu, tspd

client.solve(temu("https://www.temu.com/", {"cookie": "session=..."}))
client.solve(castle(
    "https://example.com/",
    "key",
    {"wUrl": "https://example.com/w", "swUrl": "https://example.com/sw"},
))
client.solve(tspd(
    "https://example.com/",
    client.get_user_agent(),
    {"tspdCookie": "cookie", "htmlPageBase64": html_base64},
))
client.solve(hunt("https://example.com/", {"apiGetLib": "https://example.com/hunt.js"}))
client.solve(alibaba("https://example.com/", {"sceneId": "scene", "prefix": "prefix"}))
```

A raw dict with `type` (and `class` for custom captchas) is also a valid task.

## Error handling

```python
from capmonster import CapMonsterError
from capmonster.errors import ZeroBalanceError

try:
    client.solve(task)
except ZeroBalanceError as err:
    print(err.error_code, err.message)
except CapMonsterError as err:
    print(err.error_id, err.error_code, err.status_code, err.response)
```

| Code | Meaning |
| :--- | :--- |
| `ERROR_KEY_DOES_NOT_EXIST` | API key missing or malformed |
| `ERROR_PROXY_CREDENTIALS_INVALID_CHARACTER` | Proxy login or password contains `%` |
| `ERROR_ZERO_BALANCE` | Not enough funds to create a task |
| `ERROR_TOO_BIG_CAPTCHA_FILESIZE` | Image larger than 50 KB |
| `ERROR_ZERO_CAPTCHA_FILESIZE` | Image smaller than 100 bytes |
| `ERROR_NO_SUCH_CAPCHA_ID` / `WRONG_CAPTCHA_ID` | Unknown or expired task id |
| `ERROR_CAPTCHA_UNSOLVABLE` | Could not solve. Not charged |
| `CAPTCHA_NOT_READY` | Still solving. Not raised by `get_task_result` |
| `ERROR_IP_NOT_ALLOWED` | IP is not on the key allow list |
| `ERROR_IP_BANNED` | IP temporarily blocked. Do not retry immediately |
| `ERROR_NO_SUCH_METHOD` | Unknown task type |
| `ERROR_TOO_MUCH_REQUESTS` | Poll slower. At least 2 seconds between result calls |
| `ERROR_DOMAIN_NOT_ALLOWED` | Domain cannot be solved |
| `ERROR_TOKEN_EXPIRED` | Challenge or token expired. Create a new task |
| `ERROR_RECAPTCHA_INVALID_SITEKEY` | Bad `websiteKey` |
| `ERROR_RECAPTCHA_INVALID_DOMAIN` | `websiteURL` must be a full `http(s)` URL and match the site key |
| `ERROR_RECAPTCHA_TIMEOUT` | Solve window elapsed |
| `ERROR_IP_BLOCKED` | IP blocked after many failed requests |
| `ERROR_PROXY_CONNECT_REFUSED` | Proxy refused the connection |
| `ERROR_PROXY_BANNED` | Target site blocked the proxy |
| `ERROR_PROXY_MISSING` | Proxy fields or `proxyType` are wrong |
| `ERROR_PROXY_NOT_AUTHORISED` | Proxy username or password rejected |
| `ERROR_PROXY_READ_TIMEOUT` | Proxy read timed out |
| `ERROR_TASK_NOT_SUPPORTED` | `type` is unsupported |
| `ERROR_TASK_ABSENT` | Task object missing or JSON invalid |
| `ERROR_WRONG_USERAGENT` | User-Agent is not the one CapMonster supports |
| `ERROR_SERVICE_NOT_AVAILABLE` | Service or callback URL unavailable |
| `ERROR_INVALID_TASK` | Task fields are present but invalid. Read `errorDescription` |
| `TIMEOUT` | Local poll timeout |
| `ABORTED` | Cancel callback returned true |
| `MISSING_CLIENT_KEY` | Constructor received an empty key |
| `EMPTY_USER_AGENT` | User-Agent endpoint returned an empty body |

`CAPMONSTER_ERRORS` maps each code to that description. `CAPMONSTER_ERROR_CLASSES` maps each code to its subclass. The API `errorDescription` wins when CapMonster sends one.

Retries, when `retries` is greater than 0, apply to `ERROR_SERVICE_NOT_AVAILABLE`, `ERROR_TOO_MUCH_REQUESTS`, `ERROR_PROXY_CONNECT_REFUSED`, `ERROR_PROXY_READ_TIMEOUT`, HTTP 429/502/503/504, and network failures. Balance, key, and task errors are not retried.

## Advanced usage

### Proxies

Omit proxy fields to use CapMonster's built-in proxies. FunCaptcha, DataDome, Waiting Room, and the Challenge cookie flow require your proxy. `proxyType` is `http`, `https`, `socks4`, or `socks5`. Do not use transparent proxies or a proxy on the local machine.

### Timeouts and cancellation

`timeout` on the constructor is the HTTP timeout. `timeout` on `solve` / `wait_for_result` is how long to poll, in seconds.

```python
client.solve(task, timeout=90, interval=3, initial_delay=2, max_attempts=40, cancel=should_stop)
```

Async cancellation also works by cancelling the task. `await asyncio.sleep` inside the poll loop raises `CancelledError`.

### Callbacks

```python
client.create_task(task, callback_url="https://example.com/capmonster")
```

CapMonster `POST`s the `get_task_result` payload to that URL. Respond within 2 seconds.

### Developer id

`DEFAULT_SOFT_ID` is `""`. Requests omit `softId` until the CapMonster developer program assigns one. Numeric strings are sent as integers.

## Type hints

The public helpers return `dict[str, Any]` so new API fields do not require a release. `CapMonsterBalance`, `TaskResult`, and `RawApiResponse` are `TypedDict`s. `TASK_TYPES` and `TASK_CLASSES` list the documented strings. Solutions are dicts: reCAPTCHA uses `gRecaptchaResponse`, Turnstile uses `token` or `cf_clearance`, ImageToText uses `text`, GeeTest v3 uses `challenge` / `validate` / `seccode`, and GeeTest v4 uses `captcha_id`, `lot_number`, `pass_token`, `gen_time`, and `captcha_output`.

## Comparison

| | capmonster-client | capmonstercloudclient | capmonster_python |
| :--- | :--- | :--- | :--- |
| Sync and async | Both, same method names | Async | Both, `_async` suffix |
| Documented task types | Full current list plus legacy aliases | Official request classes | Most types plus a vanilla payload |
| `get_user_agent` | Yes | Not in the public README | Yes |
| Incorrect-solution reports | Image, token, and recaptcha paths | Not in the public README | Image and token |
| Error class per API code | Yes | No | No |
| HTTP retries separate from polling | Yes | Poll loop | `max_retries` is the poll budget |
| `softId` left unset by default | Yes | Varies | No |

## FAQ

**Does get_balance spend credit?** No. `get_user_agent` does not either.

**Why is soft_id empty?** The developer program has not issued an id. The field is omitted so requests stay valid. Set `soft_id` when you have one.

**The site rejected the token.** Call `report_incorrect_token(task_id)`, then create a new task with `nocache=True` and the same proxy and User-Agent you will use to submit the token.

**How often should I poll?** At least every 2 seconds, no more than 120 times per task. The default interval is 3 seconds and the default timeout is 120 seconds.

**Which User-Agent do I send?** The string from `get_user_agent()`, not a Chrome version string you build yourself.

## Examples

| File | What it does |
| :--- | :--- |
| `examples/check.py` | Balance and User-Agent. Needs `CAPMONSTER_API_KEY` |
| `examples/get_user_agent.py` | User-Agent only |
| `examples/solve_recaptcha_v2.py` | One paid reCAPTCHA v2 solve |
| `examples/solve_turnstile.py` | Async Turnstile solve |
| `examples/solve_image.py` | One paid ImageToText solve |
| `examples/report_incorrect.py` | Solve, then report when `REPORT=1` |
| `examples/proxy_retry.py` | Proxy fields and retries |

```bash
uv run python examples/get_user_agent.py
CAPMONSTER_API_KEY=... uv run python examples/check.py
```

## Tests

```bash
uv sync
uv run ruff check .
uv run pytest -m "not live"    # mocked HTTP, coverage gate
CAPMONSTER_API_KEY=... uv run pytest -m live
```

Unit tests mock HTTP. The live tests check balance, the current User-Agent, an invalid key, and `ERROR_ZERO_BALANCE` on `create_task` only when the balance is exactly 0. A funded key does not submit a paid task.

## Contributing

Issues and pull requests belong on the [api-kit](https://github.com/TysikGG/api-kit) repository, in `capmonster/python`. Keep `DEFAULT_SOFT_ID` empty until CapMonster assigns an id. Run `uv run ruff check .` and `uv run pytest -m "not live"` before opening a PR.

## License

[ISC](LICENSE) © api-kit contributors
