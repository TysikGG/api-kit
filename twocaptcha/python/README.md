# 2captcha-client

[![PyPI version](https://img.shields.io/pypi/v/2captcha-client.svg)](https://pypi.org/project/2captcha-client/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/pypi/pyversions/2captcha-client.svg)](https://pypi.org/project/2captcha-client/)

Modern, fully typed Python client library for the [2Captcha](https://2captcha.com) human-powered and AI CAPTCHA solving API.

Official API documentation: <https://2captcha.com/api-docs>

---

## Features

- ⚡ **All Captcha Types Supported** — Cloudflare Turnstile, Google reCAPTCHA v2 / v3 / Enterprise, hCaptcha, Arkose Labs FunCaptcha, GeeTest v3, normal image captchas, and text questions.
- 🔄 **Built-in Polling** — High-level solve methods like `solve_turnstile()` and `solve_recaptcha_v2()` automatically poll until solved.
- 🐍 **Modern Pythonic Design** — Type annotations, dataclasses, context manager support (`with TwoCaptchaClient(...) as client:`), and custom exceptions.
- 🛠️ **Task Control** — Low-level `create_task()` and `get_task_result()` for async background workers and message queues.
- ⚖️ **Accuracy Reports** — `report_good()` and `report_bad()` for solving quality feedback and automated credit refunds.

---

## Installation

```bash
pip install 2captcha-client
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only queries your account balance. It does not create tasks or consume credits.

```python
import os
from twocaptcha import TwoCaptchaClient

client = TwoCaptchaClient(api_key=os.environ["TWOCAPTCHA_API_KEY"])

balance = client.get_balance()
print(f"Current 2Captcha balance: ${balance:.2f} USD")
```

---

## Usage Guide

### 1. Solving Cloudflare Turnstile

Solve Cloudflare Turnstile challenges and retrieve the verification token:

```python
from twocaptcha import TwoCaptchaClient

with TwoCaptchaClient(api_key="your_api_key") as client:
    token = client.solve_turnstile(
        sitekey="0x4AAAAAAADnPIDROrmt1Wwj",
        pageurl="https://example.com/login",
        action="login",  # optional
    )
    print("Turnstile token:", token)
```

### 2. Solving Google reCAPTCHA v2 & v3

Solve checkbox or invisible reCAPTCHA v2, or score-based reCAPTCHA v3:

```python
with TwoCaptchaClient(api_key="your_api_key") as client:
    # reCAPTCHA v2
    token_v2 = client.solve_recaptcha_v2(
        googlekey="6Le-wvkSAAAAAPBMRTvw0Q4CeHg-tUnSQVwyYcxQ",
        pageurl="https://example.com/protected",
        invisible=0,
    )
    print("reCAPTCHA v2 token:", token_v2)

    # reCAPTCHA v3
    token_v3 = client.solve_recaptcha_v3(
        googlekey="6LdyC2cUAAAAABlzY2Hg-tUnSQVwyYcxQ",
        pageurl="https://example.com/checkout",
        action="checkout",
        min_score=0.7,
    )
    print("reCAPTCHA v3 token:", token_v3)
```

### 3. Solving Normal Image CAPTCHA

Solve distorted image captchas by passing a base64-encoded string:

```python
import base64
from twocaptcha import TwoCaptchaClient

with open("captcha.png", "rb") as f:
    b64_image = base64.b64encode(f.read()).decode("utf-8")

with TwoCaptchaClient(api_key="your_api_key") as client:
    solution_text = client.solve_image(
        body=b64_image,
        numeric=1,  # numbers only
        min_len=4,
        max_len=6,
    )
    print("Solved captcha text:", solution_text)
```

### 4. Low-Level Task Flow

For asynchronous background tasks or task queues:

```python
import time
from twocaptcha import TwoCaptchaClient

with TwoCaptchaClient(api_key="your_api_key") as client:
    # 1. Create task
    task_id = client.create_task({
        "method": "turnstile",
        "sitekey": "0x4AAAAAAADnPIDROrmt1Wwj",
        "pageurl": "https://example.com",
    })
    print(f"Task submitted: {task_id}")

    # 2. Poll manually or wait
    token = None
    for _ in range(30):
        time.sleep(5)
        token = client.get_task_result(task_id)
        if token:
            break

    if token:
        print("Solved:", token)
        client.report_good(task_id)
    else:
        print("Failed to resolve in time.")
```

---

## API Reference

### `TwoCaptchaClient`

#### Constructor

```python
TwoCaptchaClient(
    api_key: str,
    base_url: str = "https://2captcha.com",
    timeout: float = 30.0,
    default_polling_timeout: float = 120.0,
    default_polling_interval: float = 5.0,
)
```

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `api_key` | `str` | **Required** | Your 2Captcha API key. |
| `base_url` | `str` | `"https://2captcha.com"` | Custom API base URL. |
| `timeout` | `float` | `30.0` | HTTP request timeout in seconds. |
| `default_polling_timeout` | `float` | `120.0` | Max seconds to wait for resolution. |
| `default_polling_interval` | `float` | `5.0` | Seconds between status checks. |

#### Methods

- **`get_balance() -> float`** — Returns current balance in USD.
- **`solve_turnstile(sitekey, pageurl, action=None, data=None) -> str`** — Solves Cloudflare Turnstile.
- **`solve_recaptcha_v2(googlekey, pageurl, invisible=0, data_s=None, enterprise=0) -> str`** — Solves reCAPTCHA v2.
- **`solve_recaptcha_v3(googlekey, pageurl, action=None, min_score=None) -> str`** — Solves reCAPTCHA v3.
- **`solve_hcaptcha(sitekey, pageurl, invisible=0, data=None) -> str`** — Solves hCaptcha.
- **`solve_funcaptcha(publickey, pageurl, surl=None, data=None) -> str`** — Solves Arkose FunCaptcha.
- **`solve_geetest(gt, challenge, pageurl, api_server=None) -> GeeTestResult`** — Solves GeeTest v3.
- **`solve_image(body, phrase=0, regsense=0, numeric=0, calc=0, min_len=None, max_len=None, language=None, textinstructions=None) -> str`** — Solves base64 image.
- **`solve_text(text, language=None) -> str`** — Solves text question captcha.
- **`create_task(params: dict) -> str`** — Sends raw task payload to `/in.php` and returns task ID.
- **`get_task_result(task_id: str) -> str | None`** — Checks task status, returns token or `None` if not ready.
- **`wait_for_result(task_id: str, timeout_sec=None, interval_sec=None) -> str`** — Polls until solved.
- **`report_good(task_id: str) -> bool`** — Marks solution as correct.
- **`report_bad(task_id: str) -> bool`** — Marks solution as incorrect to receive a credit refund.

---

## Error Handling

When an API error occurs, `TwoCaptchaError` is raised:

```python
from twocaptcha import TwoCaptchaClient, TwoCaptchaError

try:
    with TwoCaptchaClient(api_key="invalid_key") as client:
        client.get_balance()
except TwoCaptchaError as exc:
    print(f"Error Code: {exc.code}")
    print(f"Message: {exc.message}")
```

Common error codes:
- `ERROR_WRONG_USER_KEY` — Provided API key is incorrect.
- `ERROR_KEY_DOES_NOT_EXIST` — Invalid API key.
- `ERROR_ZERO_BALANCE` — Insufficient funds on account.
- `ERROR_NO_SLOT_AVAILABLE` — Solving queue currently congested.
- `CAPCHA_NOT_READY` — Resolution in progress.
- `TIMEOUT` — Maximum polling wait duration exceeded.

---

## License

ISC
