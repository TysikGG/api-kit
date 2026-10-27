# capmonster-client

[![PyPI version](https://img.shields.io/pypi/v/capmonster-client.svg)](https://pypi.org/project/capmonster-client/)
[![Python versions](https://img.shields.io/pypi/pyversions/capmonster-client.svg)](https://pypi.org/project/capmonster-client/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Typed Python client for the [CapMonster Cloud API](https://docs.capmonster.cloud). Supports reCAPTCHA v2/v3/Enterprise, Cloudflare Turnstile (including Challenge and Waiting Room), GeeTest, ImageToText, ComplexImage, DataDome, Amazon AWS WAF, TenDI (Tencent), Binance, and the other task types documented by CapMonster Cloud. Built on [HTTPX](https://www.python-httpx.org).

Official API documentation: <https://docs.capmonster.cloud>

The import package is `capmonster`. The distribution name is `capmonster-client` so it does not collide with other projects on PyPI.

---

## Features

- 🧩 **Documented task types** — Helpers for reCAPTCHA v2/v3/Enterprise, Turnstile, GeeTest, ImageToText, ComplexImage, DataDome, Amazon WAF, TenDI, Binance, FunCaptcha, hCaptcha, Basilisk, Imperva, Prosopo, Yidun, MTCaptcha, Altcha, Friendly Captcha, Temu, Castle, TSPD, Hunt, and Alibaba.
- ⏳ **Automated polling** — `wait_for_result()` and `solve()` poll until the solution is ready. `CAPTCHA_NOT_READY` stays in the processing state.
- 💰 **Balance tracking** — `get_balance()` reads the account balance and does not spend credit.
- 🏷️ **Developer id** — `softId` is omitted until you set it. CapMonster's developer program is still pending, so `DEFAULT_SOFT_ID` is empty.
- 🐍 **Modern Python** — Type annotations, context manager support (`with CapMonster(...) as client:`).
- 🚨 **Structured errors** — `CapMonsterError` carries `error_id` and `error_code` for every documented API error.

---

## Installation

```bash
pip install capmonster-client
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance. It does not submit tasks or spend credits.

```python
import os
from capmonster import CapMonster

with CapMonster(os.environ["CAPMONSTER_API_KEY"]) as client:
    balance = client.get_balance()
    print(f"Balance: {balance['balance']}")
```

---

## Usage Guide

### 1. High-Level Solve (Recommended)

`client.solve()` submits the task and waits until the solution is ready:

```python
import os
from capmonster import CapMonster, turnstile

with CapMonster(os.environ["CAPMONSTER_API_KEY"]) as client:
    solution = client.solve(turnstile("https://example.com/", "0x4AAAAAAA..."))
    print("Turnstile token:", solution["token"])
```

### 2. Solving reCAPTCHA v2

```python
from capmonster import CapMonster, recaptcha_v2

with CapMonster(os.environ["CAPMONSTER_API_KEY"]) as client:
    solution = client.solve(recaptcha_v2(
        "https://lessons.zennolab.com/captchas/recaptcha/v2_simple.php?level=high",
        "6Lcg7CMUAAAAANphynKgn9YAgA4tQ2KI_iqRyTwd",
    ))
    print(solution["gRecaptchaResponse"])
```

### 3. Manual Task Lifecycle

```python
from capmonster import CapMonster, turnstile

with CapMonster(os.environ["CAPMONSTER_API_KEY"]) as client:
    task_id = client.create_task(turnstile("https://example.com/", "0x4AAAAAAA..."))
    result = client.get_task_result(task_id)
    if result["status"] == "ready":
        print("Solution:", result["solution"])
    else:
        print("Task is still processing...")
```

You can also pass a raw `dict`. `type` is required. Custom captchas (DataDome, TenDI, and the others listed below) also require `class`.

### 4. Developer software id

`create_task` sends `softId` only when it is set:

```python
from capmonster import DEFAULT_SOFT_ID, CapMonster

print(DEFAULT_SOFT_ID)  # ""

with CapMonster(os.environ["CAPMONSTER_API_KEY"], soft_id=12345) as client:
    ...
```

TODO: replace `DEFAULT_SOFT_ID` in `src/capmonster/client.py` once CapMonster assigns a numeric id.

---

## Task Types

| Captcha | `type` | `class` | Helper |
| :--- | :--- | :--- | :--- |
| reCAPTCHA v2 | `RecaptchaV2Task` | | `recaptcha_v2` |
| reCAPTCHA v2 Enterprise | `RecaptchaV2EnterpriseTask` | | `recaptcha_v2_enterprise` |
| reCAPTCHA v3 | `RecaptchaV3TaskProxyless` | | `recaptcha_v3` |
| reCAPTCHA v3 Enterprise | `RecaptchaV3EnterpriseTask` | | `recaptcha_v3_enterprise` |
| Cloudflare Turnstile / Challenge / Waiting Room | `TurnstileTask` | | `turnstile` |
| GeeTest v3 / v4 | `GeeTestTask` | | `geetest` |
| ImageToText | `ImageToTextTask` | | `image_to_text` |
| ComplexImage (click, grid, recognition) | `ComplexImageTask` | `recaptcha`, `hcaptcha`, `funcaptcha`, `recognition` | `complex_image` |
| DataDome | `CustomTask` | `DataDome` | `datadome` |
| TenDI (Tencent) | `CustomTask` | `TenDI` | `tendi` |
| Amazon AWS WAF | `AmazonTask` | | `amazon` |
| Binance | `BinanceTask` | | `binance` |
| FunCaptcha | `FunCaptchaTask` | | `funcaptcha` |
| hCaptcha | `HCaptchaTask` | | `hcaptcha` |
| Basilisk | `CustomTask` | `Basilisk` | `basilisk` |
| Imperva (Incapsula) | `CustomTask` | `Imperva` | `imperva` |
| Prosopo | `ProsopoTask` | | `prosopo` |
| Yidun | `YidunTask` | | `yidun` |
| MTCaptcha | `MTCaptchaTask` | | `mtcaptcha` |
| Altcha | `CustomTask` | `altcha` | `altcha` |
| Friendly Captcha | `CustomTask` | `friendly` | `friendly_captcha` |
| Temu | `CustomTask` | `Temu` | `temu` |
| Castle | `CustomTask` | `Castle` | `castle` |
| TSPD | `CustomTask` | `tspd` | `tspd` |
| Hunt | `CustomTask` | `HUNT` | `hunt` |
| Alibaba | `CustomTask` | `alibaba` | `alibaba` |

Legacy aliases `NoCaptchaTask`, `NoCaptchaTaskProxyless`, `RecaptchaV2TaskProxyless`, and `HCaptchaTaskProxyless` are accepted on the `type` field. Current docs use `RecaptchaV2Task` with proxy fields omitted when CapMonster's own proxies are enough.

TenDI is the Tencent captcha documented by CapMonster. It is not a Tenable product.

Parameter reference: <https://docs.capmonster.cloud/docs/captchas/>

---

## Error Handling

When the API returns an error, the client raises `CapMonsterError`:

```python
from capmonster import CapMonster, CapMonsterError

try:
    with CapMonster("invalid_key") as client:
        client.get_balance()
except CapMonsterError as err:
    print(f"CapMonster error #{err.error_id} [{err.error_code}]: {err.message}")
```

Common error codes (full list: <https://docs.capmonster.cloud/docs/api/api-errors/>):

- `ERROR_KEY_DOES_NOT_EXIST` — Account key does not exist or is malformed.
- `ERROR_ZERO_BALANCE` — Account has no funds. Returned by `create_task`, not by `get_balance`.
- `ERROR_CAPTCHA_UNSOLVABLE` — The captcha could not be solved. Unsolved tasks are not charged.
- `CAPTCHA_NOT_READY` — Still solving. `get_task_result` maps this to `status: "processing"`.
- `ERROR_TASK_NOT_SUPPORTED` / `ERROR_NO_SUCH_METHOD` — Unknown `type`.
- `ERROR_INVALID_TASK` / `ERROR_TASK_ABSENT` — Task payload is missing or invalid.
- `ERROR_TOO_MUCH_REQUESTS` — Poll `get_task_result` no more than once every 2 seconds. The default interval is 3 seconds.
- `TIMEOUT` — `wait_for_result()` exceeded the configured timeout.

`CAPMONSTER_ERRORS` maps every documented code to a short description. The API `errorDescription` is used when CapMonster sends one.

---

## Live Tests

Unit tests mock HTTP and always run. The live suite calls the real API and runs only when `CAPMONSTER_API_KEY` is set. It checks balance, an invalid key, and `ERROR_ZERO_BALANCE` on `create_task`.

`create_task` is sent only when the account balance is exactly `0`. A funded key skips that assertion so the suite does not spend credit.

```bash
cd capmonster/python
uv sync
uv run pytest -m "not live"
CAPMONSTER_API_KEY=your_key uv run pytest -m live
```

Do not commit API keys.

---

## License

[ISC](LICENSE) © api-kit contributors
