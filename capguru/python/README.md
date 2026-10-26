# capguru-client

Python client for the [CapGuru](https://cap.guru/api-docs/) AI-powered and human-assisted CAPTCHA solving API.

## Installation

```bash
pip install capguru-client
```

## Quick Start

```python
import os
from capguru import CapGuruClient

api_key = os.getenv("CAPGURU_API_KEY", "your-api-key")

with CapGuruClient(api_key=api_key) as client:
    # Check balance
    balance = client.get_balance()
    print(f"Balance: ${balance:.2f}")

    # Solve Cloudflare Turnstile
    token = client.solve_turnstile(
        sitekey="0x4AAAAAAABnOYoqxxxxxx",
        pageurl="https://example.com",
    )
    print(f"Turnstile token: {token}")
```

## Features

- Full coverage of CapGuru recognition challenges:
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
- Account balance checking (`get_balance`).
- Synchronous client with context manager support.

## License

ISC
