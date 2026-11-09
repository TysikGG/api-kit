# steelproxy

[![PyPI version](https://img.shields.io/pypi/v/steelproxy.svg)](https://pypi.org/project/steelproxy/)
[![Python versions](https://img.shields.io/pypi/pyversions/steelproxy.svg)](https://pypi.org/project/steelproxy/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Modern, typed Python client for the [Steel Proxy](https://api.steelproxy.com/docs) Reseller and Franchise API. Automate proxy sales (datacenter, residential, rotating mobile/residential) through your bots, websites, and external marketplaces. Built on [HTTPX](https://www.python-httpx.org).

Official API documentation: <https://api.steelproxy.com/docs>

---

## Features

- 🌐 **Full Catalog Support** — Access proxy types (`server`, `residential`, `rotation`), locations, day terms, and discounted reseller prices.
- 🚀 **Instant Proxy Allocation** — Order proxies programmatically and receive ready-to-use HTTP and SOCKS5 connection credentials.
- 🔄 **Order Management & Extensions** — List past orders, check expiration, and extend proxy lease duration by 1, 2, 3, or 6 months.
- ⚡ **Marketplace Webhooks** — Webhook order creation and URL generator compatible with BOT-T and marketplace platforms.
- 🐍 **Modern Python** — Fully type-annotated with Google-style docstrings, typed dicts, and context manager support (`with SteelProxy(...) as client:`).
- 🚨 **Structured Errors** — Clear exceptions (`SteelProxyPaymentRequiredError`, `SteelProxyConflictError`, `SteelProxyNotFoundError`, etc.).

---

## Installation

```bash
pip install steelproxy
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account's available proxy catalog and order count. It does not order proxies or spend balance.

```python
import os
from steelproxy import SteelProxy

api_key = os.environ["STEELPROXY_API_KEY"]

with SteelProxy(api_key) as client:
    # 1. Fetch available proxy types
    types = client.get_proxy_types()
    print("Available proxy types:", types)

    # 2. Fetch available locations
    locations = client.get_locations()
    print(f"Available nodes: {len(locations)}")

    # 3. Inspect orders count (read-only)
    orders = client.get_orders(page=1, page_size=5)
    print(f"Total orders: {orders['total']}")
```

---

## Usage Guide

### 1. Exploring the Catalog

```python
import os
from steelproxy import SteelProxy

with SteelProxy(os.environ["STEELPROXY_API_KEY"]) as client:
    # Get available proxy categories
    types = client.get_proxy_types()

    # Get locations for residential proxies
    locations = client.get_locations(proxy_type="residential")
    for loc in locations:
        print(f"Node #{loc['node_id']}: {loc['title']} ({loc['country_code']}) - Terms: {loc['terms_days']} days")

    # Get reseller wholesale prices
    prices = client.get_prices(country_code="US")
    for p in prices:
        print(f"{p['proxy_type']} {p['country_code']} node #{p['node_id']}: {p['price']} {p['currency']}")
```

### 2. Ordering Proxies

> [!WARNING]
> Creating orders charges your Steel Proxy reseller balance.

```python
import os
from steelproxy import ProxyType, RotationMode, SteelProxy

with SteelProxy(os.environ["STEELPROXY_API_KEY"]) as client:
    # Static residential proxies
    order = client.create_order(
        proxy_type=ProxyType.RESIDENTIAL,
        node_id=5,
        term_days=7,
        quantity=2,
        buyer_reference="order-8841",
    )
    print(f"Order #{order['order_id']} created. Price: {order['price']} {order['currency']}")
    for proxy in order["proxies"]:
        print("HTTP:", proxy["connection_string_http"])
        print("SOCKS5:", proxy["connection_string_socks5"])

    # Rotating proxies with periodic timer
    rotating_order = client.create_order(
        proxy_type=ProxyType.ROTATION,
        node_id=12,
        term_days=30,
        quantity=1,
        rotation_mode=RotationMode.TIMER,
        timer_interval_minutes=10,
    )
    print("Rotate link:", rotating_order["proxies"][0].get("rotate_link"))
```

### 3. Retrieving and Listing Orders

```python
import os
from steelproxy import SteelProxy

with SteelProxy(os.environ["STEELPROXY_API_KEY"]) as client:
    # Inspect a single order
    order = client.get_order(118432)
    print(f"Status: {order['status']}, expires at: {order['expires_at']}")

    # List orders with pagination
    orders_list = client.get_orders(page=1, page_size=20)
    print(f"Total orders: {orders_list['total']}")
```

### 4. Extending an Order

```python
import os
from steelproxy import SteelProxy

with SteelProxy(os.environ["STEELPROXY_API_KEY"]) as client:
    ext = client.extend_order(118432, months=1)
    print(f"Extended until: {ext['expires_at']}")
    print(f"Balance after: {ext['balance_after']} {ext['currency']}")
```

### 5. Webhook Integration for External Marketplaces

Generate static webhook URLs for automated sales platforms:

```python
import os
from steelproxy import ProxyType, SteelProxy

with SteelProxy(os.environ["STEELPROXY_API_KEY"]) as client:
    webhook_url = client.build_webhook_url(
        proxy_type=ProxyType.RESIDENTIAL,
        country_code="US",
        term_days=7,
    )
    print("Paste into marketplace webhook settings:", webhook_url)
```

---

## Error Handling

All client errors inherit from `SteelProxyError`, with specific subclasses for common HTTP status codes:

```python
import os
from steelproxy import (
    SteelProxy,
    SteelProxyConflictError,
    SteelProxyError,
    SteelProxyNotFoundError,
    SteelProxyPaymentRequiredError,
    SteelProxyUnauthorizedError,
)

with SteelProxy("invalid-key") as client:
    try:
        client.create_order(
            proxy_type="server",
            node_id=1,
            term_days=30,
            quantity=10,
        )
    except SteelProxyPaymentRequiredError:
        print("Insufficient balance on reseller account")
    except SteelProxyConflictError:
        print("Out of stock: no available proxies on this node")
    except SteelProxyUnauthorizedError:
        print("Invalid or missing API key")
    except SteelProxyError as err:
        print(f"Steel Proxy API error [{err.status_code}]: {err.message}")
```

---

## Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `api_key` | `str \| None` | `os.environ.get("STEELPROXY_API_KEY")` | Reseller API key from Telegram bot |
| `base_url` | `str \| None` | `https://api.steelproxy.com/v1` | Custom base URL for the API |
| `timeout` | `float` | `30.0` | Request timeout in seconds |
| `user_agent` | `str \| None` | `steelproxy/0.1.0` | Custom User-Agent header |

---

## License

[ISC](LICENSE)
