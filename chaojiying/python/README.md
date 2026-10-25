# chaojiying-client

Python client for the [Chaojiying (超级鹰)](https://www.chaojiying.com) CAPTCHA recognition API.

API Documentation: [https://www.chaojiying.com/api-5.html](https://www.chaojiying.com/api-5.html)

## Features

- **Full Typing**: Comprehensive TypedDict annotations for all responses and parameters.
- **Image Flexibility**: Accepts raw `bytes` or Base64 `str` (including data URIs).
- **Secure Password Hashing**: Computes 32-character lowercase hex MD5 hashes automatically.
- **Context Manager**: Supports `with Chaojiying(...) as client:` for clean resource management.
- **Error Handling**: Custom `ChaojiyingError` surfacing error codes (`err_no`) and message details (`err_str`).
- **Environment Auto-discovery**: Automatically uses `CHAOJIYING_USER` and `CHAOJIYING_PASS`.

## Installation

```bash
pip install chaojiying-client
```

## Quick Start

```python
import os
from chaojiying import Chaojiying

client = Chaojiying(
    username=os.environ["CHAOJIYING_USER"],
    password=os.environ["CHAOJIYING_PASS"],
)

# Query current account balance
score = client.get_score()
print(f"Points remaining: {score['tifen']}")

# Recognize an image captcha (e.g. 1004 for 4-letter alphanumeric)
with open("captcha.jpg", "rb") as f:
    result = client.recognize(f.read(), code_type=1004)
    print(f"Solved text: {result['pic_str']}")

# If result is wrong, report within 3 minutes for point refund
# client.report_error(result["pic_id"])
```

## API Overview

### Account

- `client.get_score()`: Get account remaining points (`tifen`) and locked points (`tifen_lock`).

### CAPTCHA Solving

- `client.recognize(image, code_type, str_debug=None)`: Solve a CAPTCHA image and return `pic_str` and `pic_id`.
- `client.report_error(pic_id)`: Report an incorrect recognition result to request point refund (valid within 3 minutes).

## License

ISC
