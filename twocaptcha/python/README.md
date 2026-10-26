# 2captcha-client

Python client for the [2Captcha](https://2captcha.com/api-docs) recognition and solving API.

## Installation

```bash
pip install 2captcha-client
```

## Quick Start

```python
import os
from twocaptcha import TwoCaptchaClient

api_key = os.getenv("TWOCAPTCHA_API_KEY", "your-api-key")

with TwoCaptchaClient(api_key=api_key) as client:
    # Check balance
    balance = client.get_balance()
    print(f"Balance: ${balance}")

    # Solve Cloudflare Turnstile
    token = client.solve_turnstile(
        sitekey="0x4AAAAAAABnOYoqxxxxxx",
        pageurl="https://example.com",
    )
    print(f"Turnstile token: {token}")
```

## Features

- Full coverage of 2Captcha recognition challenges:
  - `solve_image(body, ...)`: Normal image and OCR captchas.
  - `solve_text(text)`: Text question captchas.
  - `solve_recaptcha_v2(googlekey, pageurl, ...)`: Google reCAPTCHA v2.
  - `solve_recaptcha_v3(googlekey, pageurl, ...)`: Google reCAPTCHA v3.
  - `solve_turnstile(sitekey, pageurl, ...)`: Cloudflare Turnstile CAPTCHA.
  - `solve_hcaptcha(sitekey, pageurl, ...)`: hCaptcha challenge.
  - `solve_funcaptcha(publickey, pageurl, ...)`: Arkose Labs FunCaptcha.
  - `solve_geetest(gt, challenge, pageurl, ...)`: GeeTest v3.
- Complete asynchronous task lifecycle (`create_task`, `get_task_result`, `wait_for_result`).
- Feedback reporting (`report_good`, `report_bad`).
- Account balance check (`get_balance`).
- Synchronous client with context manager support.

## License

ISC
