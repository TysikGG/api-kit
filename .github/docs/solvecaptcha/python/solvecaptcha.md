<a id="solvecaptcha.client"></a>

# solvecaptcha.client

SolveCaptcha API client implementation.

<a id="solvecaptcha.client.SolveCaptchaClient"></a>

## SolveCaptchaClient Objects

```python
class SolveCaptchaClient()
```

Client for the SolveCaptcha human and AI captcha solving service.

**Arguments**:

- `api_key` - SolveCaptcha API key.
- `base_url` - Base URL of the API. Defaults to https://api.solvecaptcha.com.
- `timeout` - HTTP request timeout in seconds. Defaults to 30.0.
- `soft_id` - Optional software/partner identifier.
- `default_polling_timeout` - Default timeout in seconds when waiting for solutions.
- `default_polling_interval` - Default interval in seconds between status polls.
  

**Examples**:

  >>> from solvecaptcha import SolveCaptchaClient
  >>> client = SolveCaptchaClient(api_key="your_api_key")
  >>> balance = client.get_balance()
  >>> print(balance)

<a id="solvecaptcha.client.SolveCaptchaClient.close"></a>

#### close

```python
def close() -> None
```

Closes the underlying HTTP client session.

<a id="solvecaptcha.client.SolveCaptchaClient.get_balance"></a>

#### get\_balance

```python
def get_balance() -> float
```

Retrieves the current account balance in USD.

**Returns**:

  The account balance as a float.
  

**Raises**:

- `SolveCaptchaError` - If the server returns an error or unexpected response.
  

**Examples**:

  >>> client = SolveCaptchaClient(api_key="key")
  >>> balance = client.get_balance()
  >>> print(f"Balance: ${balance:.4f}")

<a id="solvecaptcha.client.SolveCaptchaClient.solve_image"></a>

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

Solves a normal image-based captcha from base64 data.

**Arguments**:

- `body` - Base64-encoded image string.
- `phrase` - 0 = single word, 1 = multiple words.
- `regsense` - 0 = case-insensitive, 1 = case-sensitive.
- `numeric` - Character set constraint (0..4).
- `calc` - 1 if math calculation is required.
- `min_len` - Minimum character length.
- `max_len` - Maximum character length.
- `language` - 0 = default, 1 = Cyrillic, 2 = Latin.
- `textinstructions` - Instructions for human worker.
  

**Returns**:

  Solved text from the image.
  

**Raises**:

- `SolveCaptchaError` - If submission fails or times out.
  

**Examples**:

  >>> client = SolveCaptchaClient(api_key="key")
  >>> text = client.solve_image(body="iVBORw0KGgoAAAANSUhEUgAA...")
  >>> print("Captcha text:", text)

<a id="solvecaptcha.client.SolveCaptchaClient.solve_text"></a>

#### solve\_text

```python
def solve_text(text: str, language: int | None = None) -> str
```

Solves a text question captcha.

**Arguments**:

- `text` - Question string to solve.
- `language` - 0 = default, 1 = Cyrillic, 2 = Latin.
  

**Returns**:

  Text answer to the question.
  

**Examples**:

  >>> client = SolveCaptchaClient(api_key="key")
  >>> answer = client.solve_text("If tomorrow is Saturday, what day is today?")
  >>> print("Answer:", answer)

<a id="solvecaptcha.client.SolveCaptchaClient.solve_recaptcha_v2"></a>

#### solve\_recaptcha\_v2

```python
def solve_recaptcha_v2(googlekey: str,
                       pageurl: str,
                       invisible: bool = False,
                       data_s: str | None = None) -> str
```

Solves Google reCAPTCHA V2.

**Arguments**:

- `googlekey` - Sitekey extracted from target page.
- `pageurl` - Full URL of the page with the reCAPTCHA.
- `invisible` - True if widget is invisible.
- `data_s` - Optional 'data-s' parameter value.
  

**Returns**:

  reCAPTCHA token solution string.
  

**Examples**:

  >>> client = SolveCaptchaClient(api_key="key")
  >>> token = client.solve_recaptcha_v2(
  ...     googlekey="6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
  ...     pageurl="https://example.com/login",
  ... )

<a id="solvecaptcha.client.SolveCaptchaClient.solve_recaptcha_v3"></a>

#### solve\_recaptcha\_v3

```python
def solve_recaptcha_v3(googlekey: str,
                       pageurl: str,
                       action: str | None = None,
                       min_score: float | None = None) -> str
```

Solves Google reCAPTCHA V3.

**Arguments**:

- `googlekey` - Sitekey extracted from target page.
- `pageurl` - Full URL of the page.
- `action` - Action parameter string.
- `min_score` - Minimum required score threshold (e.g. 0.7).
  

**Returns**:

  reCAPTCHA token solution string.
  

**Examples**:

  >>> client = SolveCaptchaClient(api_key="key")
  >>> token = client.solve_recaptcha_v3(
  ...     googlekey="6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
  ...     pageurl="https://example.com/page",
  ...     action="verify",
  ... )

<a id="solvecaptcha.client.SolveCaptchaClient.solve_turnstile"></a>

#### solve\_turnstile

```python
def solve_turnstile(sitekey: str,
                    pageurl: str,
                    action: str | None = None,
                    data: str | None = None,
                    pagedata: str | None = None) -> str
```

Solves Cloudflare Turnstile captcha.

**Arguments**:

- `sitekey` - Turnstile sitekey.
- `pageurl` - URL of the protected page.
- `action` - Optional action parameter.
- `data` - Optional cData parameter.
- `pagedata` - Optional pagedata parameter.
  

**Returns**:

  Turnstile token solution string.
  

**Examples**:

  >>> client = SolveCaptchaClient(api_key="key")
  >>> token = client.solve_turnstile(
  ...     sitekey="0x4AAAAAAABnEBq1w7gYv_m-",
  ...     pageurl="https://example.com",
  ... )

<a id="solvecaptcha.client.SolveCaptchaClient.solve_funcaptcha"></a>

#### solve\_funcaptcha

```python
def solve_funcaptcha(publickey: str,
                     pageurl: str,
                     surl: str | None = None,
                     data: dict[str, Any] | str | None = None) -> str
```

Solves Arkose Labs FunCaptcha.

**Arguments**:

- `publickey` - Public key of the widget.
- `pageurl` - URL containing the FunCaptcha.
- `surl` - Custom service URL.
- `data` - Additional data payload.
  

**Returns**:

  FunCaptcha solution token.
  

**Examples**:

  >>> client = SolveCaptchaClient(api_key="key")
  >>> token = client.solve_funcaptcha(
  ...     publickey="69A21A01-CC43-44CC-A7DC-3E088835E78D",
  ...     pageurl="https://example.com/signup",
  ... )

<a id="solvecaptcha.client.SolveCaptchaClient.solve_geetest"></a>

#### solve\_geetest

```python
def solve_geetest(gt: str,
                  challenge: str,
                  pageurl: str,
                  api_server: str | None = None) -> GeeTestResult
```

Solves GeeTest captcha.

**Arguments**:

- `gt` - GeeTest 'gt' token.
- `challenge` - GeeTest 'challenge' token.
- `pageurl` - URL of the page containing GeeTest.
- `api_server` - Optional custom api_server domain.
  

**Returns**:

  GeeTestResult with challenge, validate, and seccode.
  

**Examples**:

  >>> client = SolveCaptchaClient(api_key="key")
  >>> res = client.solve_geetest(
  ...     gt="022397c99c9d64352069eab73bc373d7",
  ...     challenge="3049170ffb08bb6b907572ca35489f07",
  ...     pageurl="https://example.com/geetest",
  ... )
  >>> print(res.validate)

<a id="solvecaptcha.client.SolveCaptchaClient.create_task"></a>

#### create\_task

```python
def create_task(params: dict[str, Any]) -> str
```

Submits a captcha solving task to /in.php.

**Arguments**:

- `params` - Parameters specifying captcha type and payload.
  

**Returns**:

  Task ID string.
  

**Raises**:

- `SolveCaptchaError` - If task submission is rejected.

<a id="solvecaptcha.client.SolveCaptchaClient.get_task_result"></a>

#### get\_task\_result

```python
def get_task_result(task_id: str) -> str | None
```

Checks the resolution status of an active task.

**Arguments**:

- `task_id` - Task ID returned by create_task.
  

**Returns**:

  Solution string or None if still processing.

<a id="solvecaptcha.client.SolveCaptchaClient.wait_for_result"></a>

#### wait\_for\_result

```python
def wait_for_result(task_id: str,
                    timeout: float | None = None,
                    interval: float | None = None) -> str
```

Polls until a task is solved or timeout occurs.

**Arguments**:

- `task_id` - Task ID.
- `timeout` - Maximum seconds to wait.
- `interval` - Polling frequency in seconds.
  

**Returns**:

  Solved captcha response string.
  

**Raises**:

- `SolveCaptchaError` - If timed out or task encounters an error.

<a id="solvecaptcha.client.SolveCaptchaClient.report_good"></a>

#### report\_good

```python
def report_good(task_id: str) -> bool
```

Reports a correctly solved captcha.

**Arguments**:

- `task_id` - Task ID.
  

**Returns**:

  True if report was recorded.

<a id="solvecaptcha.client.SolveCaptchaClient.report_bad"></a>

#### report\_bad

```python
def report_bad(task_id: str) -> bool
```

Reports an incorrectly solved captcha.

**Arguments**:

- `task_id` - Task ID.
  

**Returns**:

  True if report was recorded.

<a id="solvecaptcha.types"></a>

# solvecaptcha.types

Data types and models for the SolveCaptcha API.

<a id="solvecaptcha.types.GeeTestResult"></a>

## GeeTestResult Objects

```python
@dataclass
class GeeTestResult()
```

Result for GeeTest captcha solutions.

<a id="solvecaptcha.types.CaptchaTask"></a>

## CaptchaTask Objects

```python
@dataclass
class CaptchaTask()
```

Represents an ongoing captcha solving task.

<a id="solvecaptcha.errors"></a>

# solvecaptcha.errors

Error definitions for the SolveCaptcha client.

<a id="solvecaptcha.errors.SolveCaptchaError"></a>

## SolveCaptchaError Objects

```python
class SolveCaptchaError(Exception)
```

Exception raised when a SolveCaptcha API request or task fails.

