# Chaojiying — Python

The `chaojiying-client` package provides a Python client for the [Chaojiying (超级鹰)](https://www.chaojiying.com/api-5.html) CAPTCHA recognition API.

```sh
pip install chaojiying-client
```

## Quick Check

Check account balance (remaining points) without submitting any CAPTCHAs:

```python
import os
from chaojiying import Chaojiying

client = Chaojiying(
    username=os.environ["CHAOJIYING_USER"],
    password=os.environ["CHAOJIYING_PASS"],
)

score = client.get_score()
print(f"Current points: {score['tifen']}")
```

Source: `chaojiying/python/examples/quickstart.py`.

The generated method reference is in [docs/chaojiying/python/chaojiying.md](python/chaojiying.md).
