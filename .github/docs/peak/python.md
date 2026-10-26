# Peak — Python

The `peak-client` library calls the [Peak Solutions CAPTCHA Solving API](https://peak.fo/docs). Solve Cloudflare Turnstile widgets and Cloudflare 5-second challenges with a single API call.

```sh
pip install peak-client
```

Check the client without performing a solve:

```python
import os
from peak import Peak

api_key = os.environ["PEAK_API_KEY"]

with Peak(api_key) as client:
    balance = client.get_balance()
    print("Peak balance:", balance)
```

Source: `peak/python/examples/check.py`.

The generated method reference is in [.github/docs/peak/python/peak.md](python/peak.md).
