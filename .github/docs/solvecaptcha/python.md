# SolveCaptcha — Python

The `solvecaptcha-client` package provides a Python client for the [SolveCaptcha API](https://solvecaptcha.com/captcha-solver-api).

```sh
pip install solvecaptcha-client
```

## Quick Check

Check account balance without submitting any captchas:

```python
import os
from solvecaptcha import SolveCaptchaClient

api_key = os.environ["SOLVECAPTCHA_API_KEY"]

with SolveCaptchaClient(api_key=api_key) as client:
    balance = client.get_balance()
    print(f"Balance: ${balance:.4f}")
```

Source: `solvecaptcha/python/examples/quickstart.py`.

The generated method reference is in [.github/docs/solvecaptcha/python/solvecaptcha.md](python/solvecaptcha.md).
