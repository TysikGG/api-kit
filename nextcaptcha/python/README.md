# nextcaptcha

[![PyPI version](https://img.shields.io/pypi/v/nextcaptcha.svg)](https://pypi.org/project/nextcaptcha/)
[![Python versions](https://img.shields.io/pypi/pyversions/nextcaptcha.svg)](https://pypi.org/project/nextcaptcha/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Typed Python client for the [NextCaptcha API](https://nextcaptcha.com/apidocs). Supports the documented reCAPTCHA v2/v3/Enterprise (including high-score and mobile), Cloudflare Turnstile, and the hCaptcha and FunCaptcha task types submitted by the official NextCaptcha clients. Built on [HTTPX](https://www.python-httpx.org).

Official API documentation: <https://nextcaptcha.com/apidocs>

The import package and the distribution name are both `nextcaptcha`. The name is free on PyPI.

---

## Features

- 🧩 **Documented task types** — Helpers for reCAPTCHA v2, v2 Enterprise, v2 high-score Enterprise, v3, v3 high-score, mobile reCAPTCHA, and Turnstile (token and cf_clearance), plus hCaptcha, hCaptcha Enterprise, and FunCaptcha.
- ⏳ **Automated polling** — `wait_for_result()` and `solve()` poll until the solution is ready.
- ⚡ **get_token** — One-shot `0|TOKEN` / `1|ERROR_MSG` call on `https://api-v2.nextcaptcha.com/getToken`.
- 💰 **Balance tracking** — `get_balance()` reads the account balance and does not spend credit.
- 🏷️ **Developer id** — Every task request sends `softId` (the string field next to `clientKey` and `task`) so NextCaptcha can attribute developer revenue. Override it, or pass `""` to omit it.
- 🐍 **Modern Python** — Type annotations, context manager support (`with NextCaptcha(...) as client:`).
- 🚨 **Structured errors** — `NextCaptchaError` carries `error_id` and `error_code` for every documented API error.

---

## Installation

```bash
pip install nextcaptcha
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance. It does not submit tasks or spend credits.

```python
import os
from nextcaptcha import NextCaptcha

with NextCaptcha(os.environ["NEXTCAPTCHA_API_KEY"]) as client:
    balance = client.get_balance()
    print(f"Balance: {balance['balance']}")
```

---

## Usage Guide

### 1. High-Level Solve (Recommended)

`client.solve()` submits the task and waits until the solution is ready:

```python
import os
from nextcaptcha import NextCaptcha, recaptcha_v2

with NextCaptcha(os.environ["NEXTCAPTCHA_API_KEY"]) as client:
    solution = client.solve(recaptcha_v2(
        "https://www.google.com/recaptcha/api2/demo",
        "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
    ))
    print(solution["gRecaptchaResponse"])
```

### 2. Cloudflare Turnstile

```python
from nextcaptcha import NextCaptcha, turnstile_proxyless

with NextCaptcha(os.environ["NEXTCAPTCHA_API_KEY"]) as client:
    solution = client.solve(turnstile_proxyless("https://example.com/", "0x4XXXXXXXXXXXXXXXXX"))
    print("Turnstile token:", solution["token"])
```

### 3. Manual Task Lifecycle

```python
from nextcaptcha import NextCaptcha, recaptcha_v2

with NextCaptcha(os.environ["NEXTCAPTCHA_API_KEY"]) as client:
    task_id = client.create_task(recaptcha_v2(
        "https://www.google.com/recaptcha/api2/demo",
        "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
    ))
    result = client.get_task_result(task_id)
    if result["status"] == "ready":
        print("Solution:", result["solution"])
    else:
        print("Task is still processing...")
```

You can also pass a raw `dict`. `type` is required.

### 4. get_token

`get_token` submits the task and returns the token in one response. The body is plain text: `0|TOKEN` on success and `1|ERROR_MSG` on failure.

```python
token = client.get_token(recaptcha_v2(
    "https://www.google.com/recaptcha/api2/demo",
    "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
))
```

### 5. Developer software id

`create_task` and `get_token` send `softId` as a top-level string, next to `clientKey` and `task`. `get_balance` and `get_task_result` do not send it. The default is `DEFAULT_SOFT_ID`.

```python
from nextcaptcha import DEFAULT_SOFT_ID, NextCaptcha

print(DEFAULT_SOFT_ID)
# next_softId_b3bdc0a2f7035cc72e1d62d575469f449d

with NextCaptcha(os.environ["NEXTCAPTCHA_API_KEY"], soft_id="your_soft_id") as client:
    client.create_task(task, soft_id="")  # omit softId for this call
```

---

## Task Types

| Captcha | `type` | Helper |
| :--- | :--- | :--- |
| reCAPTCHA v2 proxyless | `RecaptchaV2TaskProxyless` | `recaptcha_v2` |
| reCAPTCHA v2 Enterprise (proxy) | `RecaptchaV2EnterpriseTask` | `recaptcha_v2_enterprise` |
| reCAPTCHA v2 Enterprise proxyless | `RecaptchaV2EnterpriseTaskProxyless` | `recaptcha_v2_enterprise_proxyless` |
| reCAPTCHA v2 Enterprise high score | `ReCaptchaV2HSEnterpriseTaskProxyLess` | `recaptcha_v2_hs_enterprise` |
| reCAPTCHA v3 (proxy) | `RecaptchaV3Task` | `recaptcha_v3` |
| reCAPTCHA v3 proxyless | `RecaptchaV3TaskProxyless` | `recaptcha_v3_proxyless` |
| reCAPTCHA v3 high score | `ReCaptchaV3HSTaskProxyLess` | `recaptcha_v3_hs` |
| reCAPTCHA mobile (proxy) | `ReCaptchaMobileTask` | `recaptcha_mobile` |
| reCAPTCHA mobile proxyless | `RecaptchaMobileTaskProxyless` | `recaptcha_mobile_proxyless` |
| Cloudflare Turnstile cf_clearance | `TurnstileTask` | `turnstile` |
| Cloudflare Turnstile token | `TurnstileTaskProxyless` | `turnstile_proxyless` |
| hCaptcha | `HCaptchaTask` / `HCaptchaTaskProxyless` | `hcaptcha` |
| hCaptcha Enterprise | `HCaptchaEnterpriseTask` | `hcaptcha_enterprise` |
| FunCaptcha | `FunCaptchaTask` / `FunCaptchaTaskProxyless` | `funcaptcha` |

Type strings match the JSON examples on the task pages, including the high-score `ReCaptcha…ProxyLess` and mobile `ReCaptchaMobileTask` casing. Proxy tasks take `proxyType` (`http`, `socks4`, `socks5`), `proxyAddress`, `proxyPort`, and optional `proxyLogin` / `proxyPassword`.

hCaptcha and FunCaptcha are advertised by NextCaptcha and implemented by the official clients. They are not listed in the current apidocs sidebar, which covers reCAPTCHA and Turnstile. Passing `proxyAddress` selects the proxy `type`; otherwise the helper uses the proxyless type.

The current task catalog does not document an image-to-text task. `ERROR_IMAGE_TYPE_NOT_SUPPORTED` is still mapped for responses that reject an image.

Parameter reference: <https://nextcaptcha.com/apidocs>

---

## Error Handling

When the API returns an error, the client raises `NextCaptchaError`:

```python
from nextcaptcha import NextCaptcha, NextCaptchaError

try:
    with NextCaptcha("invalid_key") as client:
        client.get_balance()
except NextCaptchaError as err:
    print(f"NextCaptcha error #{err.error_id} [{err.error_code}]: {err.message}")
```

Common error codes (full list: <https://nextcaptcha.com/apidocs/error-codes>):

- `ERROR_KEY_DOES_NOT_EXIST` — Account key does not exist or is malformed.
- `ERROR_ZERO_BALANCE` — Account has no funds.
- `ERROR_CAPTCHA_UNSOLVABLE` — The captcha could not be solved.
- `ERROR_TASK_NOT_SUPPORTED` / `ERROR_TASK_ABSENT` — Unknown or missing task.
- `ERROR_BAD_PARAMETERS` — A required field is missing or has the wrong shape.
- `ERROR_BAD_PROXY` — Proxy fields are wrong or the proxy could not be reached.
- `ERROR_RECAPTCHA_INVALID_SITEKEY` — The site key is invalid.
- `TIMEOUT` — `wait_for_result()` exceeded the configured timeout.

`NEXTCAPTCHA_ERRORS` maps every documented code to a short description. The API `errorDescription` is used when NextCaptcha sends one. `get_balance` returns `balance` as a string such as `"12.34"`; the client parses it to a float.

---

## Live Tests

Unit tests mock HTTP and always run. The live suite calls the real API and runs only when `NEXTCAPTCHA_API_KEY` is set. It only calls `get_balance` (a funded account check and an invalid key). It does not submit a solve.

```bash
cd nextcaptcha/python
uv sync
uv run pytest -m "not live"
NEXTCAPTCHA_API_KEY=your_key uv run pytest -m live
```

Do not commit API keys.

---

## License

[ISC](LICENSE) © api-kit contributors
