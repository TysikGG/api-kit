# peak-client

[![PyPI version](https://img.shields.io/pypi/v/peak-client.svg)](https://pypi.org/project/peak-client/)
[![Python versions](https://img.shields.io/pypi/pyversions/peak-client.svg)](https://pypi.org/project/peak-client/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Python client for the [Peak Solutions](https://peak.fo) CAPTCHA solving API. One call solves Cloudflare Turnstile (with your proxy or through Peak's pool), the Cloudflare 5-second challenge, or an AWS WAF mobile-SDK token. `Peak` is synchronous. `AsyncPeak` has the same methods. Both use HTTPX.

Official API reference: <https://peak.fo/docs>

Requires Python 3.10+.

---

## Table of contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick start](#quick-start)
- [Cloudflare Turnstile](#cloudflare-turnstile)
- [Cloudflare 5-second challenge](#cloudflare-5-second-challenge)
- [AWS WAF](#aws-waf)
- [Balance](#balance)
- [Raw solve](#raw-solve)
- [Async client](#async-client)
- [Error handling](#error-handling)
- [Advanced usage](#advanced-usage)
- [Type hints](#type-hints)
- [Comparison](#comparison)
- [FAQ](#faq)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Turnstile, proxyless and proxied.** No proxy sends `TurnstileTaskProxyLess`. A proxy sends `turnstiletask`, with optional `action` and `cdata`.
- **Cloudflare 5-second challenge.** Cookies, headers, form attributes, and `cf_rt`, plus `build_clearance_request()` for the follow-up POST.
- **AWS WAF mobile SDK.** `awswaftask` for `ios` (the default) and `android`. Peak has shipped this task as disabled; the call still goes out and raises `TaskDisabledError` when the platform says so.
- **Both balance shapes.** Pay-per-solve `balance`, and package fields from the older (`package`) and current (`package_name`, `remaining_solves`, `total_solves`, `allowed_tasks`) responses.
- **An error class per status.** `AuthenticationError`, `InsufficientBalanceError`, `BadRequestError`, `RateLimitError`, `TaskDisabledError`, `UpstreamError`, and `SolveError`. All of them subclass `PeakError`.
- **Retries with a deadline.** The default is one attempt. Extra attempts run only for unpaid or transient failures.
- **Sync and async.** `with Peak(...)` and `async with AsyncPeak(...)`.
- **Attribution stays put.** Every solve body includes the library `appId`. That value is not configurable.

Peak bills only successful solves. A `200` with `success: false` is not charged.

---

## Installation

```bash
pip install peak-client
```

HTTPX is the only runtime dependency.

---

## Configuration

```python
from peak import Peak

with Peak(
    "pk_...",
    base_url="https://api.peak.fo",
    timeout=60,
    http_proxy="http://user:pass@10.0.0.1:8888",
    retries=2,
    retry_delay=1.0,
    retry_timeout=30,
    on_result=lambda event: print(event["task_type"], event["data"]),
) as client:
    balance = client.get_balance()
```

The API key is the first argument and is trimmed. An empty key raises `PeakError` before any socket is opened. `Peak` is a context manager and closes its HTTPX client on the way out. `close()` is safe to call twice.

| Argument | Default | Description |
| :--- | :--- | :--- |
| `api_key` | required | Dashboard key, `pk_...`. Sent as `X-API-Key`. |
| `base_url` | `https://api.peak.fo` | API origin. A trailing slash is removed. |
| `timeout` | `60` | Per-request timeout in seconds. |
| `http_proxy` | unset | HTTP or HTTPS proxy used only to reach the API. `socks5://` is rejected here. |
| `retries` | `0` | Extra attempts after a retryable failure. |
| `retry_delay` | `1.0` | Seconds between those attempts. |
| `retry_timeout` | unset | Wall-clock budget for the whole loop, in seconds. |
| `on_result` | unset | Called after each successful solve with `{"task_type", "data"}`. |

The same retry and callback keywords exist on each method. A value passed to the method wins over the client default.

There is no task id and no poll interval. `POST /solve` returns the token or the clearance in that response. `timeout` is how long one attempt may take.

---

## Quick start

This only reads the balance. It does not solve anything and does not spend credit.

```python
import os
from peak import Peak, format_balance

with Peak(os.environ["PEAK_API_KEY"]) as client:
    balance = client.get_balance()
    print(format_balance(balance))
```

`format_balance` prints `$12.5` for pay-per-solve keys. For a package it prints the name, remaining solves when present, and days left.

---

## Cloudflare Turnstile

Submit `result["token"]` as the form field `cf-turnstile-response`. The page URL must be absolute `http` or `https`. A missing trailing slash on the path is added for you. The query string stays: `https://example.com/a?x=1` is sent as `https://example.com/a/?x=1`.

### Proxyless

Peak solves through its own pool (`TurnstileTaskProxyLess`). Use this when the site accepts the token from any IP.

```python
with Peak(os.environ["PEAK_API_KEY"]) as client:
    result = client.solve_turnstile(
        "https://example.com/",
        "0x4AAAAAAADnPIDROrmt1Wwj",
    )
    print(result["token"])
```

Runnable file: [`examples/turnstile_proxyless.py`](examples/turnstile_proxyless.py).

### With your proxy

Sites that bind the token to the solver IP need `turnstiletask` and your proxy. The string form is `http://user:pass@ip:port`. `https`, `socks4`, `socks5`, and `socks5h` are passed through. `action` and `cdata` must match the widget when the widget sets them. Empty strings are omitted.

```python
from peak import format_proxy

proxy = format_proxy({
    "protocol": "socks5",
    "host": "2001:db8::1",
    "port": 1080,
    "username": "user",
    "password": "p:q",
})

with Peak(os.environ["PEAK_API_KEY"]) as client:
    result = client.solve_turnstile(
        "https://example.com/",
        "0x4AAAAAAADnPIDROrmt1Wwj",
        proxy=proxy,
        action="login",
        cdata="session-42",
    )
    print(result["token"])
```

A plain string works too: `proxy="http://user:pass@1.2.3.4:8080"`.

Runnable file: [`examples/turnstile_proxy.py`](examples/turnstile_proxy.py).

### Explicit task type

`task_type` replaces the automatic choice.

```python
client.solve_turnstile(
    "https://example.com/",
    "0x4AAAAAAADnPIDROrmt1Wwj",
    proxy="http://user:pass@1.2.3.4:8080",
    task_type="turnstiletask",
)
```

| Argument | Task when `task_type` is omitted |
| :--- | :--- |
| `proxy` omitted or `""` | `TurnstileTaskProxyLess` |
| `proxy` set | `turnstiletask` |

---

## Cloudflare 5-second challenge

`solve_cloudflare_5s` sends `cloudflare5stask`. The proxy has to be sticky: Cloudflare checks that one IP carries the whole session. Only a Windows Chrome user-agent is accepted. Pass `WINDOWS_CHROME_USER_AGENT` or omit `user_agent` and let Peak choose. `html` is optional pre-fetched page HTML.

`solve_cloudflare_waf` is an alias with the same signature. That is the name on the official Python SDK.

```python
import os
from peak import WINDOWS_CHROME_USER_AGENT, Peak, build_clearance_request

target = "https://example.com/"
proxy = os.environ["PEAK_PROXY"]

with Peak(os.environ["PEAK_API_KEY"]) as client:
    solution = client.solve_cloudflare_5s(
        target,
        proxy,
        user_agent=WINDOWS_CHROME_USER_AGENT,
        html="<html>...</html>",
    )

request = build_clearance_request(target, solution)
```

Then, through the same sticky proxy:

1. Apply `solution["cookies"]` (`cf_clearance`, and `__cf_bm` when present).
2. POST `solution["attributes"]` as `application/x-www-form-urlencoded` to the target URL.
3. Set `Referer` to `{url}?__cf_chl_tk={cf_rt}`.
4. Keep the `user-agent` from `solution["headers"]` on later requests.

`build_clearance_request` returns `url`, `method`, `headers`, `body`, `cookies`, `cookie_header`, `referer`, and `user_agent`. `clearance_user_agent(solution)` returns only the user-agent.

Runnable file: [`examples/cloudflare_5s.py`](examples/cloudflare_5s.py).

---

## AWS WAF

`solve_aws_waf` sends `awswaftask`. This is the mobile SDK challenge, not a browser page. `os` defaults to `"ios"`. Any other value raises `BadRequestError` before the request. `sdk_url` is not given a trailing slash. The page `url` is.

```python
result = client.solve_aws_waf(
    "https://app.example.com/",
    "https://xxx.edge.sdk.awswaf.com/xxx/xxx",
    "http://user:pass@1.2.3.4:8080",
    "ExampleApp/1.0 (iOS 17.0)",
    os="ios",
)
print(result["token"])
```

The official `peakfo` 1.1.0 client documents this task as switched off. Expect `TaskDisabledError` until Peak enables it. A disabled response is not billed.

Runnable file: [`examples/aws_waf.py`](examples/aws_waf.py).

---

## Balance

`GET /balance`. No credit is spent.

```python
balance = client.get_balance()
if balance["type"] == "pay_per_solve":
    print(balance["balance"])
else:
    name = balance.get("package_name") or balance.get("package")
    print(name, balance.get("days_remaining"), balance.get("remaining_solves"))
```

Pay-per-solve keys return `type` and `balance`. Current package keys return `package_name`, `remaining_solves`, `total_solves`, `allowed_tasks`, `expires_at`, and `days_remaining`. Older package keys used `package` instead of `package_name`. `format_balance` understands both.

Per-call retries, still without spending credit:

```python
client.get_balance(retries=2, retry_delay=0.25)
```

---

## Raw solve

`solve` posts your mapping and then sets `appId` to the library id. A value already in the mapping is replaced.

```python
data = client.solve({
    "task_type": "TurnstileTaskProxyLess",
    "url": "https://example.com/",
    "sitekey": "0x4AAAAAAADnPIDROrmt1Wwj",
})
```

Pass retries as keywords, not as keys inside the mapping. Keys inside the mapping are sent to Peak.

```python
client.solve(task, retries=2, on_result=lambda event: print(event["task_type"]))
```

The call hook runs first, then the client hook, unless they are the same object.

---

## Async client

`AsyncPeak` mirrors `Peak`. Use it from `asyncio`.

```python
import asyncio
import os
from peak import AsyncPeak

async def main() -> None:
    async with AsyncPeak(os.environ["PEAK_API_KEY"], retries=2) as client:
        balance = await client.get_balance()
        token = await client.solve_turnstile(
            "https://example.com/",
            "0x4AAAAAAADnPIDROrmt1Wwj",
        )
        print(balance, token["token"])

asyncio.run(main())
```

`await client.aclose()` and `await client.close()` both close the HTTPX client. The async methods are `get_balance`, `solve_turnstile`, `solve_cloudflare_5s`, `solve_cloudflare_waf`, `solve_aws_waf`, and `solve`.

Runnable file: [`examples/async_balance.py`](examples/async_balance.py). It only reads the balance.

---

## Error handling

Failures raise `PeakError` or a subclass. `status_code` is the HTTP status, or `0` for a local or transport failure. `status` is an alias. `response` is the raw body, and `data` is an alias. `code` is a string from `ErrorCode`.

```python
from peak import (
    AuthenticationError,
    BadRequestError,
    InsufficientBalanceError,
    Peak,
    PeakError,
    RateLimitError,
    RetryTimeoutError,
    SolveError,
    TaskDisabledError,
    UpstreamError,
)

try:
    client.solve_turnstile("https://example.com/", "0x4...")
except AuthenticationError:
    ...  # 401, or the body says the API key is missing or invalid
except InsufficientBalanceError:
    ...  # 402, insufficient balance, or package solves exhausted
except BadRequestError:
    ...  # 400, or the client rejected the arguments
except RateLimitError:
    ...  # 429
except TaskDisabledError:
    ...  # 503, or "disabled" / "no solver"
except UpstreamError:
    ...  # 502
except SolveError as err:
    ...  # unpaid solve failure
except RetryTimeoutError:
    ...  # the retry budget ran out
except PeakError as err:
    print(err.status_code, err.code, err.message)
```

`ServiceUnavailableError` subclasses `TaskDisabledError`. A 503 whose text does not say the task is disabled uses `ServiceUnavailableError`. Either class matches `except TaskDisabledError`.

Runnable file: [`examples/errors.py`](examples/errors.py).

### HTTP statuses

| Status | Class | Meaning |
| :--- | :--- | :--- |
| `200` and `success: false` | `SolveError`, or a more specific class if the message says so | Solve failed. Not billed. |
| `400` | `BadRequestError` | Missing or invalid fields. |
| `401` | `AuthenticationError` | API key missing, invalid, or expired. |
| `402` | `InsufficientBalanceError` | Not enough balance, or the package is used up. |
| `429` | `RateLimitError` | Rate limit. |
| `502` | `UpstreamError` | Peak or the target could not complete the call. |
| `503` | `TaskDisabledError` or `ServiceUnavailableError` | Task disabled or no solver capacity. |

### Documented error messages

| Message | `code` | Class | What to do |
| :--- | :--- | :--- | :--- |
| `missing API key` | `missing_api_key` | `AuthenticationError` | Send `X-API-Key`. |
| `insufficient balance` | `insufficient_balance` | `InsufficientBalanceError` | Top up, or buy a package. |
| `package solves exhausted` | `package_solves_exhausted` | `InsufficientBalanceError` | Buy another package. |
| `Proxy connection failed` | `proxy_connection_failed` | `SolveError` | Check `http://user:pass@ip:port`. |
| `Request timed out` | `request_timed_out` | `SolveError` | Use a faster proxy, closer to the target. |
| `IP address is blocked by CloudFlare` | `ip_blocked` | `SolveError` | Switch to a cleaner proxy IP. |
| `No WAF challenge detected` | `no_waf_challenge` | `SolveError` | The page has no challenge, or the URL is wrong. |
| `Invalid sitekey` | `invalid_sitekey` | `SolveError` | The sitekey is scoped to the domain. |
| `Turnstile challenge was flagged` | `turnstile_flagged` | `SolveError` | Use a proxy with a cleaner reputation. |
| `Unsupported user agent` | `unsupported_user_agent` | `SolveError` | Windows Chrome only, on the 5-second task. |

A phrase about the key or the balance wins over a generic HTTP 200 or 400.

Local checks (blank URL, bad scheme, empty sitekey, bad `os`, empty proxy, SOCKS in `http_proxy`) raise `BadRequestError` with status `0` and do not call the network.

HTTPX timeouts use status `0` and `code` `request_timed_out`. Other transport errors, including a closed client, use `network`.

### What gets retried

| Error | Retried |
| :--- | :--- |
| `SolveError` | yes |
| `RateLimitError` | yes |
| `TaskDisabledError` / `ServiceUnavailableError` | yes |
| `UpstreamError` | yes |
| Network `PeakError` (status 0) | yes |
| `AuthenticationError` | no |
| `InsufficientBalanceError` | no |
| `BadRequestError` | no |
| `RetryTimeoutError` | no |

A success is returned immediately, so the loop cannot buy the same token twice. `retries=2` means one try plus two more.

```python
with Peak(api_key, retries=2, retry_delay=0.5, retry_timeout=15) as client:
    token = client.solve_turnstile(url, sitekey)
```

If the budget expires, the error is `RetryTimeoutError`. See [`examples/retries.py`](examples/retries.py), which only reads the balance.

---

## Advanced usage

### Proxies

| Argument | Who connects | Protocols |
| :--- | :--- | :--- |
| `http_proxy` on the client | This process, to `api.peak.fo` | `http`, `https` |
| `proxy` on a solve | Peak's worker, to the target site | `http`, `https`, `socks4`, `socks5`, `socks5h` |

The 5-second challenge needs a sticky proxy, and the clearance POST has to use that same proxy. A proxied Turnstile token has to be submitted from that IP.

### Timeouts

`timeout` bounds one HTTP call, in seconds. `retry_timeout` bounds the whole loop, including sleeps. Leave it unset to bound the loop only by `retries` and the per-call timeout.

### Callbacks

The public API has no webhook field. `on_result` is local and runs only after `success: true`.

```python
client.solve_turnstile(
    "https://example.com/",
    "0x4AAAAAAADnPIDROrmt1Wwj",
    on_result=lambda event: print(event["task_type"]),
)
```

### Task constants

```python
from peak import (
    TASK_AWS_WAF,
    TASK_CLOUDFLARE_5S,
    TASK_TURNSTILE,
    TASK_TURNSTILE_PROXYLESS,
)

assert TASK_TURNSTILE == "turnstiletask"
assert TASK_TURNSTILE_PROXYLESS == "TurnstileTaskProxyLess"
assert TASK_CLOUDFLARE_5S == "cloudflare5stask"
assert TASK_AWS_WAF == "awswaftask"
```

---

## Type hints

The package is typed and is checked by the annotations in `src/peak`. `PeakClient` is an alias of `Peak`, matching the official SDK name.

| Name | Role |
| :--- | :--- |
| `Peak`, `AsyncPeak`, `PeakClient` | Clients. |
| `BalanceData`, `PayPerSolveBalance`, `PackageBalance` | Balance TypedDicts. |
| `TurnstileResult`, `Cloudflare5sResult`, `AwsWafResult` | Solve results. |
| `ProxyConfig`, `SolveEvent`, `ClearanceRequest` | Helpers. |
| `PeakError` and the subclasses, `ErrorCode` | Errors. |
| `format_proxy`, `format_balance`, `build_clearance_request` | Helpers. |
| `APP_ID`, `WINDOWS_CHROME_USER_AGENT` | Constants. |

`PackageBalance` marks every field optional except the way you read it at runtime: check `type` first. That keeps both the legacy and the current JSON valid.

---

## Comparison

Public clients reviewed for this package: [`peakfo` on PyPI 1.1.0](https://pypi.org/project/peakfo/) (official Python), [`peakfo` on npm 1.0.0](https://www.npmjs.com/package/peakfo) (official JavaScript), and [`github.com/PeakFO/peakfo-go`](https://github.com/PeakFO/peakfo-go). Integrations such as `playwright-turnstile`, `scrapy-turnstile`, and `cloudscraper-turnstile` solve one challenge inside another framework. They are not general API clients.

| | peak-client | peakfo PyPI 1.1.0 | peakfo npm 1.0.0 | peakfo-go |
| :--- | :--- | :--- | :--- | :--- |
| Turnstile with proxy | yes | yes | yes | yes |
| Turnstile proxyless | yes | yes | no (always `turnstiletask`) | not in the Feb 2026 client |
| `action` / `cdata` | yes | yes | yes | partial |
| 5-second challenge | yes | yes | yes | yes |
| `user_agent` and `html` | yes | yes | no | partial |
| AWS WAF | yes | yes (documented disabled) | yes | yes |
| Sync client | yes | yes (`requests`) | no | yes, with context |
| Async client | yes | no | yes (and browser `fetch`) | no |
| Error class per HTTP status | 400, 401, 402, 429, 502, 503, 200 | 401, 402, disabled, else solve | message keywords | sentinel errors |
| Retries and a deadline | yes | no | no | caller uses context |
| Clearance POST helper | yes | no | no | no |
| Proxy object helper | yes | no | no | no |
| HTTP proxy to the API | yes | no | no | caller transport |
| Custom base URL and timeout | yes | yes | yes | yes |
| Library `appId` on every solve | always | optional `app_id` argument | no | no |
| Both package balance shapes | typed | raw dict | loose | raw struct |

---

## FAQ

**Does a retry charge me twice?**
No. Only failed or unpaid calls are retried. `success: true` returns immediately.

**Where is task polling?**
Peak does not mint a task id. The solve response is the result. `timeout` is the wait.

**Can I set my own `appId`?**
No. The client writes the library id on every solve and replaces a body field of the same name. A referral link (`https://peak.fo/?ref=...`) is a dashboard feature, not a request field.

**Is there a report or refund method?**
The public API documents `POST /solve` and `GET /balance`. Failed solves are not billed. There is no report endpoint.

**Is there a webhook?**
No. `on_result` runs in-process.

**Why did AWS WAF raise `TaskDisabledError`?**
The official client still exposes the method and documents the task as disabled. That exception is the current platform response.

**Which URL form does Peak want?**
An absolute URL whose path ends with `/`. The client adds the slash and leaves the query alone.

---

## Examples

| File | Calls the network | Spends credit |
| :--- | :--- | :--- |
| [`examples/check.py`](examples/check.py) | balance only | no |
| [`examples/retries.py`](examples/retries.py) | balance only | no |
| [`examples/async_balance.py`](examples/async_balance.py) | balance only | no |
| [`examples/errors.py`](examples/errors.py) | balance with your key, or a dummy key | no |
| [`examples/turnstile_proxyless.py`](examples/turnstile_proxyless.py) | solve | yes, if it succeeds |
| [`examples/turnstile_proxy.py`](examples/turnstile_proxy.py) | solve | yes, if it succeeds |
| [`examples/cloudflare_5s.py`](examples/cloudflare_5s.py) | solve | yes, if it succeeds |
| [`examples/aws_waf.py`](examples/aws_waf.py) | solve | yes, if it succeeds |

```bash
PEAK_API_KEY=pk_... uv run python examples/check.py
```

---

## Contributing

Issues and pull requests: <https://github.com/TysikGG/api-kit> (`peak/python`).

```bash
cd peak/python
uv sync
uv run ruff check .
uv run pytest -m "not live"   # mocked HTTP, coverage gate at 95%
uv run pytest -m live         # skipped unless PEAK_API_KEY is set; balance only
```

Please leave `APP_ID` in `src/peak/constants.py` as it is. Solves are attributed to that developer id.

---

## License

[ISC](LICENSE) © api-kit contributors
