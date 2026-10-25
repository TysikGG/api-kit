# peak-client

[![PyPI version](https://img.shields.io/pypi/v/peak-client.svg)](https://pypi.org/project/peak-client/)
[![Python versions](https://img.shields.io/pypi/pyversions/peak-client.svg)](https://pypi.org/project/peak-client/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Modern, typed Python client for the [Peak Solutions CAPTCHA Solving API](https://peak.fo/docs). Solve Cloudflare Turnstile widgets and Cloudflare 5-second challenges (WAF / Under Attack Mode) with a single API call. Built on [HTTPX](https://www.python-httpx.org).

Official API documentation: <https://peak.fo/docs>

---

## Features

- ⚡ **Cloudflare Turnstile** — Solves Turnstile challenges in under 1 second using proxyless or proxied modes.
- 🛡️ **Cloudflare 5s Challenge** — Automated WAF clearance providing cookies, headers, and form-attributes for session continuation.
- 💰 **Account Balance** — Real-time tracking of pay-per-solve credits and package subscription days remaining.
- 🐍 **Modern Python** — Type-annotated, Google-style docstrings, context manager support (`with Peak(...) as client:`).
- 🚨 **Clear Exceptions** — Structured `PeakError` exceptions with status codes and API error messages.

---

## Installation

```bash
pip install peak-client
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance. It does not perform solves or spend credits.

```python
import os
from peak import Peak

api_key = os.environ["PEAK_API_KEY"]

with Peak(api_key) as client:
    balance = client.get_balance()
    if balance["type"] == "pay_per_solve":
        print(f"Balance: ${balance['balance']}")
    else:
        print(f"Package: {balance['package']}, Days remaining: {balance['days_remaining']}")
```

---

## Usage Guide

### 1. Solving Cloudflare Turnstile (Proxyless)

For sites that accept the Turnstile verification token from any IP address:

```python
import os
from peak import Peak

with Peak(os.environ["PEAK_API_KEY"]) as client:
    res = client.solve_turnstile(
        url="https://example.com/",
        sitekey="0x4AAAAAAAx...",
    )
    print(f"cf-turnstile-response token: {res['token']}")
```

### 2. Solving Cloudflare Turnstile (With Proxy)

For sites that validate the solve origin matches the requesting IP address:

```python
with Peak(os.environ["PEAK_API_KEY"]) as client:
    res = client.solve_turnstile(
        url="https://example.com/",
        sitekey="0x4AAAAAAAx...",
        proxy="http://user:pass@1.2.3.4:8080",
        action="login",
    )
    print(f"Token: {res['token']}")
```

### 3. Solving Cloudflare 5-Second Challenge (WAF)

Solves the Cloudflare challenge page and returns session credentials:

```python
target_url = "https://example.com/"
proxy = "http://user:pass@1.2.3.4:8080"

with Peak(os.environ["PEAK_API_KEY"]) as client:
    solution = client.solve_cloudflare_5s(
        url=target_url,
        proxy=proxy,
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
    )

    # Step 1: Apply clearance cookies to your session
    print("Clearance cookies:", solution["cookies"])

    # Step 2: Use the exact user-agent
    print("User-Agent:", solution["headers"]["user-agent"])

    # Step 3: Set Referer header with challenge token
    referer = f"{target_url}?__cf_chl_tk={solution['cf_rt']}"
    print("Referer:", referer)

    # Step 4: POST solution["attributes"] as form-data to the target URL
    print("Form attributes:", solution["attributes"])
```

---

## Error Handling

When an error occurs, the client raises a `PeakError`:

```python
from peak import Peak, PeakError

try:
    with Peak("invalid_key") as client:
        client.get_balance()
except PeakError as err:
    print(f"Peak error [HTTP {err.status_code}]: {err.message}")
```

Common status codes:
- `200` with non-fatal error: solve attempt failed (not billed).
- `400`: missing or invalid parameters.
- `401`: missing, invalid, or expired API key.
- `402`: insufficient account balance.
- `429`: rate limit reached.
- `502`: target site unreachable or timed out.

---

## License

[ISC](LICENSE) © api-kit contributors
