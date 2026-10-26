# SV Number — Python

The `sv-number` library calls the [SV Number SMS Verification API](https://sms-verification-number.com/en/api-sms-activate/).

```sh
pip install sv-number
```

Check the client without renting numbers:

```python
import os
from sv_number import SvNumber

api_key = os.environ["SV_NUMBER_API_KEY"]

with SvNumber(api_key) as client:
    balance = client.get_balance()
    print("SV Number balance:", balance)
```

Source: `sv-number/python/examples/check.py`.

The generated method reference is in [.github/docs/sv-number/python/sv_number.md](python/sv_number.md).
