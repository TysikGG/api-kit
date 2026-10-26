<a id="capguru.client"></a>

# capguru.client

<a id="capguru.client.CapGuruClient"></a>

## CapGuruClient Objects

```python
class CapGuruClient()
```

Client for the CapGuru AI and human-assisted captcha solving API.

**Arguments**:

- `api_key` - CapGuru API key.
- `base_url` - Base URL for CapGuru API. Defaults to "https://api.cap.guru".
- `timeout` - HTTP request timeout in seconds. Defaults to 30.0.
- `default_polling_timeout` - Default wait time in seconds for resolution. Defaults to 120.0.
- `default_polling_interval` - Default polling interval in seconds. Defaults to 5.0.
  

**Examples**:

  >>> from capguru import CapGuruClient
  >>> client = CapGuruClient(api_key="your_api_key")
  >>> balance = client.get_balance()

<a id="capguru.client.CapGuruClient.close"></a>

#### close

```python
def close() -> None
```

Closes the underlying HTTP client session.

<a id="capguru.client.CapGuruClient.get_balance"></a>

#### get\_balance

```python
def get_balance() -> float
```

Retrieves account balance.

**Returns**:

  Current balance as a float.
  

**Examples**:

  >>> balance = client.get_balance()
  >>> print(balance)
  100.0

<a id="capguru.client.CapGuruClient.solve_image"></a>

#### solve\_image

```python
def solve_image(body: str,
                phrase: int | None = None,
                regsense: int | None = None,
                numeric: int | None = None,
                calc: int | None = None,
                min_len: int | None = None,
                max_len: int | None = None,
                language: int | None = None,
                textinstructions: str | None = None) -> str
```

Solves a normal image captcha from base64 data.

**Arguments**:

- `body` - Base64-encoded image string.
- `phrase` - 0 = single word, 1 = multiple words.
- `regsense` - 0 = case-insensitive, 1 = case-sensitive.
- `numeric` - 0 = any, 1 = digits only, 2 = letters only, 3 = alphanumeric.
- `calc` - 0 = normal, 1 = math operation.
- `min_len` - Minimum text length.
- `max_len` - Maximum text length.
- `language` - Language flag (0 = all, 1 = Cyrillic, 2 = Latin).
- `textinstructions` - Optional instructions text for workers.
  

**Returns**:

  Recognized captcha text solution.
  

**Examples**:

  >>> text = client.solve_image(body="iVBORw0KGgoAAA...")

<a id="capguru.client.CapGuruClient.solve_text"></a>

#### solve\_text

```python
def solve_text(text: str, language: int | None = None) -> str
```

Solves a question-based text captcha.

**Arguments**:

- `text` - Question text.
- `language` - Language flag (0 = all, 1 = Cyrillic, 2 = Latin).
  

**Returns**:

  Answer to the question.
  

**Examples**:

  >>> ans = client.solve_text("If tomorrow is Saturday, what day is today?")

<a id="capguru.client.CapGuruClient.solve_recaptcha_v2"></a>

#### solve\_recaptcha\_v2

```python
def solve_recaptcha_v2(googlekey: str,
                       pageurl: str,
                       invisible: bool = False,
                       data_s: str | None = None,
                       enterprise: bool = False) -> str
```

Solves Google reCAPTCHA v2.

**Arguments**:

- `googlekey` - Sitekey string.
- `pageurl` - Full URL of target page.
- `invisible` - True for invisible reCAPTCHA.
- `data_s` - Optional data-s token parameter.
- `enterprise` - True for reCAPTCHA Enterprise.
  

**Returns**:

  g-recaptcha-response token string.
  

**Examples**:

  >>> token = client.solve_recaptcha_v2("6Le-wvkSAAAA...", "https://example.com")

<a id="capguru.client.CapGuruClient.solve_recaptcha_v3"></a>

#### solve\_recaptcha\_v3

```python
def solve_recaptcha_v3(googlekey: str,
                       pageurl: str,
                       action: str | None = None,
                       min_score: float | None = None) -> str
```

Solves Google reCAPTCHA v3.

**Arguments**:

- `googlekey` - Sitekey string.
- `pageurl` - Full URL of target page.
- `action` - Widget action parameter.
- `min_score` - Minimum required score (0.1 to 0.9).
  

**Returns**:

  Token string.
  

**Examples**:

  >>> token = client.solve_recaptcha_v3("6LdyC2cUAAAA...", "https://example.com")

<a id="capguru.client.CapGuruClient.solve_turnstile"></a>

#### solve\_turnstile

```python
def solve_turnstile(sitekey: str,
                    pageurl: str,
                    action: str | None = None,
                    data: str | None = None) -> str
```

Solves Cloudflare Turnstile.

**Arguments**:

- `sitekey` - Turnstile sitekey.
- `pageurl` - Target page URL.
- `action` - Optional action string.
- `data` - Optional cData payload string.
  

**Returns**:

  Turnstile verification token.
  

**Examples**:

  >>> token = client.solve_turnstile("0x4AAAA...", "https://example.com")

<a id="capguru.client.CapGuruClient.solve_hcaptcha"></a>

#### solve\_hcaptcha

```python
def solve_hcaptcha(sitekey: str,
                   pageurl: str,
                   invisible: bool = False,
                   data: str | None = None) -> str
```

Solves hCaptcha.

**Arguments**:

- `sitekey` - Target hCaptcha sitekey.
- `pageurl` - Target page URL.
- `invisible` - True for invisible hCaptcha.
- `data` - Custom rqdata string if required.
  

**Returns**:

  hCaptcha response token.
  

**Examples**:

  >>> token = client.solve_hcaptcha("4c672d35-...", "https://example.com")

<a id="capguru.client.CapGuruClient.solve_funcaptcha"></a>

#### solve\_funcaptcha

```python
def solve_funcaptcha(publickey: str,
                     pageurl: str,
                     surl: str | None = None,
                     data: str | None = None) -> str
```

Solves Arkose Labs FunCaptcha.

**Arguments**:

- `publickey` - Public key string.
- `pageurl` - Full page URL.
- `surl` - FunCaptcha service URL.
- `data` - Custom payload data string.
  

**Returns**:

  FunCaptcha resolution token.
  

**Examples**:

  >>> token = client.solve_funcaptcha("69A21A01-...", "https://example.com")

<a id="capguru.client.CapGuruClient.solve_geetest"></a>

#### solve\_geetest

```python
def solve_geetest(gt: str,
                  challenge: str,
                  pageurl: str,
                  api_server: str | None = None) -> GeeTestResult
```

Solves GeeTest v3.

**Arguments**:

- `gt` - GeeTest gt key.
- `challenge` - GeeTest challenge string.
- `pageurl` - Target page URL.
- `api_server` - Optional api_server subdomain.
  

**Returns**:

  GeeTestResult with challenge, validate, and seccode.
  

**Examples**:

  >>> res = client.solve_geetest("gt_key", "challenge_str", "https://example.com")

<a id="capguru.client.CapGuruClient.create_task"></a>

#### create\_task

```python
def create_task(params: dict[str, Any]) -> str
```

Submits a raw task to /in.php.

**Arguments**:

- `params` - Task parameters dictionary.
  

**Returns**:

  Assigned task ID string.
  

**Examples**:

  >>> task_id = client.create_task({"method": "userrecaptcha", ...})

<a id="capguru.client.CapGuruClient.get_task_result"></a>

#### get\_task\_result

```python
def get_task_result(task_id: str) -> str | None
```

Checks status of a task without blocking.

**Arguments**:

- `task_id` - Task ID.
  

**Returns**:

  Solution string or None if still solving.
  

**Examples**:

  >>> res = client.get_task_result("123456")

<a id="capguru.client.CapGuruClient.wait_for_result"></a>

#### wait\_for\_result

```python
def wait_for_result(task_id: str,
                    timeout: float | None = None,
                    interval: float | None = None) -> str
```

Blocks and polls /res.php until the captcha is solved.

**Arguments**:

- `task_id` - Task ID returned by create_task.
- `timeout` - Maximum seconds to wait.
- `interval` - Polling frequency in seconds.
  

**Returns**:

  Solved token or text.
  

**Examples**:

  >>> res = client.wait_for_result("123456")

<a id="capguru.client.CapGuruClient.report_good"></a>

#### report\_good

```python
def report_good(task_id: str) -> bool
```

Reports a correctly solved captcha.

**Arguments**:

- `task_id` - Task ID.
  

**Returns**:

  True if report was accepted.
  

**Examples**:

  >>> client.report_good("123456")

<a id="capguru.client.CapGuruClient.report_bad"></a>

#### report\_bad

```python
def report_bad(task_id: str) -> bool
```

Reports an incorrectly solved captcha.

**Arguments**:

- `task_id` - Task ID.
  

**Returns**:

  True if report was accepted.
  

**Examples**:

  >>> client.report_bad("123456")

<a id="capguru.types"></a>

# capguru.types

<a id="capguru.types.GeeTestResult"></a>

## GeeTestResult Objects

```python
@dataclass
class GeeTestResult()
```

Result of GeeTest captcha resolution.

**Attributes**:

- `challenge` - GeeTest challenge string.
- `validate` - GeeTest validate string.
- `seccode` - GeeTest seccode string.

<a id="capguru.errors"></a>

# capguru.errors

<a id="capguru.errors.CapGuruError"></a>

## CapGuruError Objects

```python
class CapGuruError(Exception)
```

Exception raised when an API call to CapGuru fails.

**Attributes**:

- `code` - Error code string (e.g. ERROR_ZERO_BALANCE, ERROR_WRONG_USER_KEY).
- `response_data` - Raw response payload.

