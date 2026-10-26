# solvecaptcha-client

Python client for the [SolveCaptcha API](https://solvecaptcha.com/captcha-solver-api).

## Features

- Solves normal image captchas, text questions, Google reCAPTCHA (v2/v3), Cloudflare Turnstile, FunCaptcha, and GeeTest
- Built-in polling mechanism with configurable timeouts and intervals
- Support for feedback reporting (`report_good`, `report_bad`)
- Built with `httpx` with synchronous request handling, strict types, and Google-style docstrings

## Installation

```bash
pip install solvecaptcha-client
```

## Quick Start

```python
import os
from solvecaptcha import SolveCaptchaClient

client = SolveCaptchaClient(api_key=os.environ["SOLVECAPTCHA_API_KEY"])

# Check account balance
balance = client.get_balance()
print(f"Current balance: ${balance:.4f}")
```

## Solving Captchas

### Image Captcha

```python
from solvecaptcha import SolveCaptchaClient

client = SolveCaptchaClient(api_key="YOUR_API_KEY")

solution = client.solve_image(
    body="iVBORw0KGgoAAAANSUhEUgAA...",  # Base64-encoded image
    numeric=4,  # Both numbers and letters
)

print(f"Solved text: {solution}")
```

### Google reCAPTCHA V2

```python
token = client.solve_recaptcha_v2(
    googlekey="6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
    pageurl="https://example.com/login",
)

print(f"reCAPTCHA token: {token}")
```

### Cloudflare Turnstile

```python
token = client.solve_turnstile(
    sitekey="0x4AAAAAAABnEBq1w7gYv_m-",
    pageurl="https://example.com/protected",
)

print(f"Turnstile token: {token}")
```

## API Methods

- `get_balance() -> float` — Returns account balance in USD.
- `solve_image(...) -> str` — Solves an image captcha from base64 data.
- `solve_text(text, language?) -> str` — Solves a text question captcha.
- `solve_recaptcha_v2(...) -> str` — Solves Google reCAPTCHA V2.
- `solve_recaptcha_v3(...) -> str` — Solves Google reCAPTCHA V3.
- `solve_turnstile(...) -> str` — Solves Cloudflare Turnstile.
- `solve_funcaptcha(...) -> str` — Solves Arkose Labs FunCaptcha.
- `solve_geetest(...) -> GeeTestResult` — Solves GeeTest.
- `create_task(params) -> str` — Submits a task to `/in.php` and returns task ID.
- `get_task_result(task_id) -> str | None` — Checks task resolution status.
- `wait_for_result(task_id, timeout?, interval?) -> str` — Polls until task is solved.
- `report_good(task_id) -> bool` — Submits positive accuracy feedback.
- `report_bad(task_id) -> bool` — Submits incorrect solution report.

## License

ISC
