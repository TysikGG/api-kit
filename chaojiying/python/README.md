# chaojiying

[![PyPI version](https://img.shields.io/pypi/v/chaojiying.svg)](https://pypi.org/project/chaojiying/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/pypi/pyversions/chaojiying.svg)](https://pypi.org/project/chaojiying/)

Modern, fully typed Python client library for the [Chaojiying](https://www.chaojiying.com) (超级鹰) CAPTCHA recognition API.

Official API documentation: <https://www.chaojiying.com/api-5.html>

---

## Features

- 🖼️ **Image & Coordinate Recognition** — Numbers, letters, calculations, Chinese characters, and click-coordinate challenges.
- 🔒 **Automatic Password Hashing** — Pass your plain password or pre-computed MD5 hash; the client handles MD5 hashing automatically.
- 🐍 **Modern Pythonic Design** — Type annotations, dataclass models (`ScoreResult`, `RecognizeResult`, `ReportErrorResult`), context manager support.
- 📦 **Bytes & Base64 Inputs** — Accepts `bytes`, file-like objects, or Base64 string directly.
- 💰 **Report Error & Refund** — Built-in `report_error()` to refund points for wrongly solved captchas.

---

## Installation

```bash
pip install chaojiying
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account points balance without consuming credits:

```python
import os
from chaojiying import Chaojiying

with Chaojiying(
    username=os.environ["CHAOJIYING_USER"],
    password=os.environ["CHAOJIYING_PASS"],
) as client:
    score = client.get_score()
    print(f"Available points: {score.tifen}")
    print(f"Locked points: {score.tifen_lock}")
```

---

## Usage Guide

### 1. Recognizing Standard 4-Digit CAPTCHA

Solve standard alphanumeric 4-digit verification images (`code_type=1004`):

```python
from chaojiying import Chaojiying

with open("captcha.jpg", "rb") as f:
    image_bytes = f.read()

with Chaojiying(username="your_user", password="your_pass") as client:
    result = client.recognize(image_bytes, code_type=1004)
    print(f"Recognized text: {result.pic_str}")
    print(f"Picture ID: {result.pic_id}")
```

### 2. Click-on-Image / Coordinate Recognition

For coordinate-based CAPTCHAs (e.g. click characters in sequence):

```python
# code_type 9004: click 4 Chinese characters in order
result = client.recognize(image_bytes, code_type=9004)
print(f"Click coordinates: {result.pic_str}")
# Output format: "124,156|245,88|90,210|310,140"
```

### 3. Reporting Incorrect Solutions for Points Refund

If a CAPTCHA was incorrectly solved by the platform, report its `pic_id` within the allowed time window to receive a refund:

```python
try:
    client.report_error(result.pic_id)
    print("Error reported successfully. Points refunded.")
except Exception as exc:
    print(f"Failed to report error: {exc}")
```

---

## Common Code Types (codetype)

| Code Type | Description |
| :--- | :--- |
| `1004` | 1–4 alphanumeric English letters / digits |
| `1005` | 1–5 alphanumeric English letters / digits |
| `1006` | 1–6 alphanumeric English letters / digits |
| `1902` | General English letters / digits (variable length) |
| `2004` | Chinese characters (1–4 characters) |
| `3004` | Math calculation (e.g. `3 + 5 = ?`) |
| `9004` | Coordinate click on 4 target characters |

---

## API Reference

### `Chaojiying` Class

#### Constructor

```python
Chaojiying(
    username: Optional[str] = None,
    password: Optional[str] = None,
    base_url: str = "https://upload.chaojiying.net",
    timeout: float = 60.0,
)
```

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `username` | `str` | `os.environ["CHAOJIYING_USER"]` | Account username. |
| `password` | `str` | `os.environ["CHAOJIYING_PASS"]` | Account password (plain text or MD5). |
| `base_url` | `str` | `"https://upload.chaojiying.net"` | Base URL for API. |
| `timeout` | `float` | `60.0` | Request timeout in seconds. |

#### Methods

- **`get_score() -> ScoreResult`** — Retrieves account points balance (`tifen`, `tifen_lock`).
- **`recognize(image: bytes | str, code_type: int | str, str_debug: Optional[str] = None) -> RecognizeResult`** — Solves captcha image. Returns `pic_id`, `pic_str`, `md5`.
- **`report_error(pic_id: str) -> ReportErrorResult`** — Reports incorrectly recognized captcha to refund points.

---

## Error Handling

When the Chaojiying API returns `err_no != 0`, `ChaojiyingError` is raised:

```python
from chaojiying import Chaojiying, ChaojiyingError

try:
    with Chaojiying(username="wrong", password="wrong") as client:
        client.get_score()
except ChaojiyingError as exc:
    print(f"Error Code: {exc.err_no}")
    print(f"Message: {exc.err_str}")
```

Common error codes:
- `-1001` — Insufficient points balance.
- `-1002` — Incorrect username or password.
- `-1003` — Account disabled or frozen.
- `-1005` — Unsupported code type.
- `-2001` — Image format or file corrupted.
- `-3001` — Recognition timeout.

---

## License

ISC
