# xmlstock

Python client for the [XMLStock](https://xmlstock.com) search engine proxy API. Provides synchronous HTTP access to Yandex XML Proxy, Yandex Live, Google XML Search, and Yandex Wordstat statistics.

[![PyPI version](https://img.shields.io/pypi/v/xmlstock.svg)](https://pypi.org/project/xmlstock/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Features

- **Yandex XML Proxy**: Perform automated search queries via official Yandex XML infrastructure.
- **Yandex Live**: Real-time SERP extraction for dynamic desktop and mobile positions.
- **Google XML Search**: Direct SERP extraction for Google with localization and country filtering.
- **Yandex Wordstat**: Keyword frequency, seasonal trends, and regional search volumes.
- **Balance & Limits**: Free account checks for funds, active packages, and remaining limits.
- **Clean Sync Client**: Synchronous API powered by `httpx` with context manager support.

---

## Installation

```bash
pip install xmlstock
```

---

## Quick Start

```python
import os
from xmlstock import XmlStockClient

client = XmlStockClient(
    user=os.getenv("XMLSTOCK_USER", "12345"),
    api_key=os.getenv("XMLSTOCK_KEY", "your_api_key"),
)

# Free balance check (does not consume search limits)
balance = client.get_balance()
print("Balance info:", balance)

client.close()
```

Or using context manager syntax:

```python
with XmlStockClient(user="12345", api_key="your_api_key") as client:
    balance = client.get_balance()
    print("Balance:", balance)
```

---

## Configuration

| Option | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `user` | `str \| int` | Yes | Your XMLStock User ID from dashboard profile. |
| `api_key` | `str` | Yes | Your secret API access key from dashboard. |
| `base_url` | `str` | No | API endpoint base URL. Defaults to `https://xmlstock.com`. |
| `timeout` | `float` | No | Request timeout in seconds. Defaults to `30.0`. |

---

## API Reference

### `get_balance()`

Retrieves current account balance, currency, remaining limits, and active packages. This call is free and does not spend search limits.

```python
balance = client.get_balance()
print("Balance:", balance)
```

### `search_yandex(query, ...)`

Queries Yandex search results via Yandex XML Proxy.

```python
xml = client.search_yandex(
    query="buy laptop",
    lr=213,           # Region: 213 = Moscow, 225 = Russia
    groupby=10,       # Results per page (up to 100)
    page=0,           # Page index (starts at 0)
    domain="ru",      # Domain zone
    filter="moderate",# "none" | "moderate" | "strict"
    device="desktop", # "desktop" | "mobile"
)
print("XML Results:", xml)
```

### `search_yandex_live(query, ...)`

Queries real-time live search results from Yandex.

```python
xml = client.search_yandex_live(
    query="flights to paris",
    lr=213,
    device="mobile",
)
```

### `search_google(query, ...)`

Queries Google search results with country and language controls.

```python
xml = client.search_google(
    query="best developer tools",
    domain="com",
    country="us",
    hl="en",
    safe="off",
)
```

### `get_wordstat(words, ...)`

Retrieves keyword search volumes and related queries from Yandex Wordstat.

```python
stats = client.get_wordstat(
    words=["seo automation", "serp tracker"],
    pagetype="words",  # "words" | "regions" | "dynamics"
)
print("Wordstat data:", stats)
```

---

## Error Handling

All client methods raise `XmlStockError` when an API error or network failure occurs.

```python
from xmlstock import XmlStockClient, XmlStockError

try:
    with XmlStockClient(user="12345", api_key="invalid_key") as client:
        xml = client.search_google("query")
except XmlStockError as error:
    print(f"XMLStock Error [{error.code}]: {error.message}")
    print(f"HTTP Status: {error.status}")
    print(f"Response: {error.response_data}")
```

---

## License

MIT
