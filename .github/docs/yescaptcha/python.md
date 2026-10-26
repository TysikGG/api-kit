# YesCaptcha — Python

The `yescaptcha-client` library calls the [YesCaptcha Recognition API](https://docs.yescaptcha.com). Supports reCAPTCHA, hCaptcha, Cloudflare Turnstile, FunCaptcha, and AWS WAF.

```sh
pip install yescaptcha-client
```

Check the client without submitting a task:

```python
import os
from yescaptcha import YesCaptcha

client_key = os.environ["YESCAPTCHA_CLIENT_KEY"]

with YesCaptcha(client_key) as client:
    balance = client.get_balance()
    print("YesCaptcha balance:", balance["balance"])
```

Source: `yescaptcha/python/examples/check.py`.

The generated method reference is in [.github/docs/yescaptcha/python/yescaptcha.md](python/yescaptcha.md).
