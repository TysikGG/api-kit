# yescaptcha-client

[![PyPI version](https://img.shields.io/pypi/v/yescaptcha-client.svg)](https://pypi.org/project/yescaptcha-client/)
[![Python versions](https://img.shields.io/pypi/pyversions/yescaptcha-client.svg)](https://pypi.org/project/yescaptcha-client/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Modern, typed Python client for the [YesCaptcha Recognition API](https://docs.yescaptcha.com). Supports reCAPTCHA (v2/v3/Enterprise), hCaptcha, Cloudflare Turnstile, FunCaptcha, AWS WAF, and image captchas. Built on [HTTPX](https://www.python-httpx.org).

Official API documentation: <https://docs.yescaptcha.com>

---

## Features

- 🧩 **Multi-Captcha Support** — Solves reCAPTCHA v2/v3/Enterprise, hCaptcha, Turnstile, FunCaptcha, AWS WAF, and ImageToText.
- ⏳ **Automated Polling** — Built-in `wait_for_result()` and high-level `solve()` handle polling and timeouts seamlessly.
- 💰 **Balance Tracking** — Check main balance, software points, and invite rewards via `get_balance()`.
- 🐍 **Modern Python** — Fully type-annotated, Google-style docstrings, context manager support (`with YesCaptcha(...) as client:`).
- 🚨 **Structured Errors** — Clear `YesCaptchaError` exceptions with API error codes (`ERROR_ZERO_BALANCE`, `ERROR_KEY_DOES_NOT_EXIST`).

---

## Installation

```bash
pip install yescaptcha-client
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance. It does not submit tasks or spend credits.

```python
import os
from yescaptcha import YesCaptcha

client_key = os.environ["YESCAPTCHA_CLIENT_KEY"]

with YesCaptcha(client_key) as client:
    balance = client.get_balance()
    print(f"Balance: {balance['balance']} points")
```

---

## Usage Guide

### 1. High-Level Solve (Recommended)

`client.solve()` submits the task and waits until the solution is ready:

```python
import os
from yescaptcha import YesCaptcha

with YesCaptcha(os.environ["YESCAPTCHA_CLIENT_KEY"]) as client:
    # Solve Cloudflare Turnstile
    solution = client.solve({
        "type": "TurnstileTaskProxyless",
        "websiteURL": "https://example.com/",
        "websiteKey": "0x4AAAAAAAx...",
    })
    print("Turnstile Token:", solution["token"])
```

### 2. Solving reCAPTCHA v2

```python
with YesCaptcha(os.environ["YESCAPTCHA_CLIENT_KEY"]) as client:
    solution = client.solve({
        "type": "NoCaptchaTaskProxyless",
        "websiteURL": "https://google.com/recaptcha/api2/demo",
        "websiteKey": "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
    })
    print("gRecaptchaResponse:", solution["gRecaptchaResponse"])
```

### 3. Manual Task Lifecycle

```python
with YesCaptcha(os.environ["YESCAPTCHA_CLIENT_KEY"]) as client:
    # 1. Submit task
    task_id = client.create_task({
        "type": "TurnstileTaskProxyless",
        "websiteURL": "https://example.com/",
        "websiteKey": "0x4AAAAAAAx...",
    })
    print("Task ID:", task_id)

    # 2. Check result manually
    result = client.get_task_result(task_id)
    if result["status"] == "ready":
        print("Solution:", result["solution"])
    else:
        print("Task is still processing...")
```

---

## Error Handling

When the API returns an error, the client raises a `YesCaptchaError`:

```python
from yescaptcha import YesCaptcha, YesCaptchaError

try:
    with YesCaptcha("invalid_key") as client:
        client.get_balance()
except YesCaptchaError as err:
    print(f"YesCaptcha error #{err.error_id} [{err.error_code}]: {err.message}")
```

Common error codes:
- `ERROR_KEY_DOES_NOT_EXIST` — Account key does not exist.
- `ERROR_ZERO_BALANCE` — Account has 0 points remaining.
- `ERROR_NO_SLOT_AVAILABLE` — Concurrency limit exceeded.
- `TIMEOUT` — Polling in `wait_for_result()` exceeded the timeout duration.

---

## License

[ISC](LICENSE) © api-kit contributors
