<a id="chaojiying.client"></a>

# chaojiying.client

<a id="chaojiying.client.Chaojiying"></a>

## Chaojiying Objects

```python
class Chaojiying()
```

Client for the Chaojiying (超级鹰) CAPTCHA recognition API.

**Attributes**:

- `username` - Chaojiying username.
- `base_url` - Base URL of the Chaojiying API.

<a id="chaojiying.client.Chaojiying.__init__"></a>

#### \_\_init\_\_

```python
def __init__(username: str | None = None,
             password: str | None = None,
             base_url: str | None = None,
             timeout: float = 60.0,
             user_agent: str | None = None) -> None
```

Initializes the Chaojiying client.

**Arguments**:

- `username` - Chaojiying username. Defaults to CHAOJIYING_USER environment variable.
- `password` - Chaojiying password. Defaults to CHAOJIYING_PASS environment variable.
- `base_url` - Base URL for the Chaojiying API. Defaults to https://upload.chaojiying.net.
- `timeout` - HTTP request timeout in seconds. Defaults to 60.0.
- `user_agent` - Custom User-Agent header string.
  

**Raises**:

- `ChaojiyingError` - If username or password is not provided.
  

**Examples**:

  >>> from chaojiying import Chaojiying
  >>> client = Chaojiying(username="my_user", password="my_password")
  >>> score = client.get_score()
  >>> print(score["tifen"])

<a id="chaojiying.client.Chaojiying.close"></a>

#### close

```python
def close() -> None
```

Closes the underlying HTTP client session.

<a id="chaojiying.client.Chaojiying.get_score"></a>

#### get\_score

```python
def get_score() -> ScoreResult
```

Retrieves user account remaining points (tifen) and locked points.

**Returns**:

  Dictionary containing err_no, err_str, tifen, and tifen_lock.
  

**Examples**:

  >>> score = client.get_score()
  >>> print(f"Available points: {score['tifen']}")

<a id="chaojiying.client.Chaojiying.recognize"></a>

#### recognize

```python
def recognize(image: bytes | str,
              code_type: int | str,
              str_debug: str | None = None) -> RecognizeResult
```

Recognizes a CAPTCHA image and returns the parsed result.

**Arguments**:

- `image` - Image data as raw bytes or Base64 string.
- `code_type` - CAPTCHA type ID (e.g. 1004 for 4-letter alphanumeric, 1902 for general).
- `str_debug` - Optional debug instructions string.
  

**Returns**:

  Dictionary containing err_no, err_str, pic_id, pic_str, and md5.
  

**Examples**:

  >>> with open("captcha.jpg", "rb") as f:
  ...     result = client.recognize(f.read(), code_type=1004)
  >>> print(result["pic_str"])

<a id="chaojiying.client.Chaojiying.report_error"></a>

#### report\_error

```python
def report_error(pic_id: str) -> ReportErrorResult
```

Reports an incorrect CAPTCHA solution to request a point refund.

Must be called within 3 minutes of receiving the picture ID.

**Arguments**:

- `pic_id` - Unique image ID returned by recognize (pic_id).
  

**Returns**:

  Dictionary containing err_no and err_str.
  

**Examples**:

  >>> client.report_error(result["pic_id"])

<a id="chaojiying.types"></a>

# chaojiying.types

<a id="chaojiying.types.ScoreResult"></a>

## ScoreResult Objects

```python
class ScoreResult(TypedDict)
```

Result of account score query.

<a id="chaojiying.types.RecognizeResult"></a>

## RecognizeResult Objects

```python
class RecognizeResult(TypedDict)
```

Result of CAPTCHA recognition.

<a id="chaojiying.types.ReportErrorResult"></a>

## ReportErrorResult Objects

```python
class ReportErrorResult(TypedDict)
```

Result of mistake report.

<a id="chaojiying.errors"></a>

# chaojiying.errors

<a id="chaojiying.errors.ChaojiyingError"></a>

## ChaojiyingError Objects

```python
class ChaojiyingError(Exception)
```

Exception raised when a Chaojiying API operation fails.

