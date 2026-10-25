<a id="peak.client"></a>

# peak.client

Client for the Peak Solutions CAPTCHA solving API.

<a id="peak.client.Peak"></a>

## Peak Objects

```python
class Peak()
```

Client for the Peak CAPTCHA solving API.

**Arguments**:

- `api_key` - Peak API key (`pk_...`).
- `base_url` - Custom API base URL (defaults to `https://api.peak.fo`).
- `timeout` - Request timeout in seconds (defaults to 60.0).
  

**Examples**:

  >>> from peak import Peak
  >>> with Peak("pk_...") as client:
  ...     balance = client.get_balance()

<a id="peak.client.Peak.close"></a>

#### close

```python
def close() -> None
```

Close the underlying HTTP client.

<a id="peak.client.Peak.get_balance"></a>

#### get\_balance

```python
def get_balance() -> BalanceData
```

Retrieve current account balance or package status.

**Returns**:

  Balance data for pay-per-solve or package accounts.
  

**Examples**:

  >>> with Peak("pk_...") as client:
  ...     balance = client.get_balance()
  ...     print(balance["type"])

<a id="peak.client.Peak.solve_turnstile"></a>

#### solve\_turnstile

```python
def solve_turnstile(url: str,
                    sitekey: str,
                    *,
                    proxy: str | None = None,
                    action: str | None = None,
                    cdata: str | None = None) -> TurnstileResult
```

Solve a Cloudflare Turnstile challenge.

Uses ``TurnstileTaskProxyLess`` when proxy is omitted, or
``turnstiletask`` when a proxy is provided.

**Arguments**:

- `url` - Target page URL (recommended with trailing slash).
- `sitekey` - Turnstile sitekey.
- `proxy` - Proxy in ``http://user:pass@ip:port`` format.
- `action` - Turnstile action parameter.
- `cdata` - Turnstile cdata parameter.
  

**Returns**:

  Dictionary containing the ``token`` string.
  

**Examples**:

  >>> with Peak("pk_...") as client:
  ...     res = client.solve_turnstile("https://example.com/", "0x4AAAAAAA...")
  ...     print(res["token"])

<a id="peak.client.Peak.solve_cloudflare_5s"></a>

#### solve\_cloudflare\_5s

```python
def solve_cloudflare_5s(url: str,
                        proxy: str,
                        *,
                        user_agent: str | None = None,
                        html: str | None = None) -> Cloudflare5sResult
```

Solve a Cloudflare 5-second challenge (WAF / Under Attack mode).

**Arguments**:

- `url` - Target page URL (must end with trailing slash ``/``).
- `proxy` - Sticky proxy in ``http://user:pass@ip:port`` format.
- `user_agent` - Windows Chrome user-agent string.
- `html` - Pre-fetched HTML string to skip initial fetch.
  

**Returns**:

  Dictionary with cookies, headers, attributes, and ``cf_rt``.
  

**Examples**:

  >>> with Peak("pk_...") as client:
  ...     res = client.solve_cloudflare_5s("https://example.com/", "http://user:pass@ip:port")
  ...     print(res["cookies"])

<a id="peak.client.Peak.solve"></a>

#### solve

```python
def solve(task: Mapping[str, Any]) -> Any
```

Send a raw solve request with any task payload.

Automatically attaches the application identifier.

**Arguments**:

- `task` - Task dictionary containing task parameters.
  

**Returns**:

  Extracted ``data`` field from the API response.

<a id="peak.types"></a>

# peak.types

Type definitions for the Peak API client.

<a id="peak.types.PayPerSolveBalance"></a>

## PayPerSolveBalance Objects

```python
class PayPerSolveBalance(TypedDict)
```

Pay-per-solve balance details.

<a id="peak.types.PackageBalance"></a>

## PackageBalance Objects

```python
class PackageBalance(TypedDict)
```

Package / subscription balance details.

<a id="peak.types.TurnstileResult"></a>

## TurnstileResult Objects

```python
class TurnstileResult(TypedDict)
```

Result of solving a Cloudflare Turnstile challenge.

<a id="peak.types.Cloudflare5sAttributes"></a>

## Cloudflare5sAttributes Objects

```python
class Cloudflare5sAttributes(TypedDict)
```

Challenge form attributes to POST to target URL.

<a id="peak.types.Cloudflare5sResult"></a>

## Cloudflare5sResult Objects

```python
class Cloudflare5sResult(TypedDict)
```

Result of solving a Cloudflare 5-second challenge.

<a id="peak.types.RawApiResponse"></a>

## RawApiResponse Objects

```python
class RawApiResponse(TypedDict)
```

Envelope returned by Peak API endpoints.

<a id="peak.errors"></a>

# peak.errors

Error types for the Peak API client.

<a id="peak.errors.PeakError"></a>

## PeakError Objects

```python
class PeakError(Exception)
```

Exception raised for API errors or failed requests.

**Arguments**:

- `message` - Human-readable error description.
- `status_code` - HTTP status code or 0 for client/transport errors.
- `response` - Raw response body, if available.

