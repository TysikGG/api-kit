# 2Captcha — Python

The `2captcha-client` package provides a Python client for the [2Captcha API](https://2captcha.com/api-docs).

```sh
pip install 2captcha-client
```

## Quick Check

Check account balance and solve a Turnstile challenge:

```python
import os
from twocaptcha import TwoCaptchaClient

api_key = os.environ["TWOCAPTCHA_API_KEY"]

with TwoCaptchaClient(api_key=api_key) as client:
    balance = client.get_balance()
    print(f"Balance: ${balance:.2f}")

    token = client.solve_turnstile(
        sitekey="0x4AAAAAAABnOYoqxxxxxx",
        pageurl="https://example.com",
    )
    print(f"Turnstile token: {token}")
```

Source: `twocaptcha/python/examples/check.py`.

The generated method reference is in [.github/docs/twocaptcha/python/twocaptcha.md](python/twocaptcha.md).
