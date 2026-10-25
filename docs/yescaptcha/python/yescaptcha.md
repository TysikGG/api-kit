<a id="yescaptcha.client"></a>

# yescaptcha.client

Client for the YesCaptcha recognition API.

<a id="yescaptcha.client.YesCaptcha"></a>

## YesCaptcha Objects

```python
class YesCaptcha()
```

Client for the YesCaptcha recognition API.

**Arguments**:

- `client_key` - YesCaptcha client key.
- `base_url` - Custom API base URL (defaults to `https://api.yescaptcha.com`).
- `timeout` - Request timeout in seconds (defaults to 30.0).
  

**Examples**:

  >>> from yescaptcha import YesCaptcha
  >>> with YesCaptcha("your_client_key") as client:
  ...     balance = client.get_balance()

<a id="yescaptcha.client.YesCaptcha.close"></a>

#### close

```python
def close() -> None
```

Close the underlying HTTP client.

<a id="yescaptcha.client.YesCaptcha.get_balance"></a>

#### get\_balance

```python
def get_balance() -> YesCaptchaBalance
```

Retrieve account balance details.

**Returns**:

  Dictionary with balance amounts.
  

**Examples**:

  >>> with YesCaptcha("your_key") as client:
  ...     balance = client.get_balance()
  ...     print(balance["balance"])

<a id="yescaptcha.client.YesCaptcha.create_task"></a>

#### create\_task

```python
def create_task(task: Mapping[str, Any]) -> str
```

Submit a new captcha recognition task.

Automatically attaches the application software identifier (``softID``).

**Arguments**:

- `task` - Task dictionary (must include ``type``, e.g. ``NoCaptchaTaskProxyless``).
  

**Returns**:

  The submitted task ID.
  

**Examples**:

  >>> with YesCaptcha("your_key") as client:
  ...     task_id = client.create_task({
  ...         "type": "TurnstileTaskProxyless",
  ...         "websiteURL": "https://example.com",
  ...         "websiteKey": "0x4AAAAAAA...",
  ...     })

<a id="yescaptcha.client.YesCaptcha.get_task_result"></a>

#### get\_task\_result

```python
def get_task_result(task_id: str) -> TaskResult
```

Query the status and solution of a submitted task.

**Arguments**:

- `task_id` - Task identifier returned by ``create_task``.
  

**Returns**:

  Dictionary containing ``status`` and optional ``solution``.
  

**Examples**:

  >>> with YesCaptcha("your_key") as client:
  ...     res = client.get_task_result(task_id)
  ...     if res["status"] == "ready":
  ...         print(res["solution"])

<a id="yescaptcha.client.YesCaptcha.wait_for_result"></a>

#### wait\_for\_result

```python
def wait_for_result(task_id: str,
                    *,
                    timeout: float = 120.0,
                    interval: float = 3.0) -> dict[str, Any]
```

Poll ``get_task_result`` until the solution is ready.

**Arguments**:

- `task_id` - Task identifier.
- `timeout` - Maximum wait time in seconds (defaults to 120.0).
- `interval` - Delay between poll attempts in seconds (defaults to 3.0).
  

**Returns**:

  The solution dictionary.
  

**Raises**:

- `YesCaptchaError` - If polling times out or task fails.

<a id="yescaptcha.client.YesCaptcha.solve"></a>

#### solve

```python
def solve(task: Mapping[str, Any],
          *,
          timeout: float = 120.0,
          interval: float = 3.0) -> dict[str, Any]
```

Submit a task and wait for its solution.

**Arguments**:

- `task` - Task dictionary.
- `timeout` - Maximum wait time in seconds.
- `interval` - Delay between poll attempts in seconds.
  

**Returns**:

  The solution dictionary.
  

**Examples**:

  >>> with YesCaptcha("your_key") as client:
  ...     solution = client.solve({
  ...         "type": "TurnstileTaskProxyless",
  ...         "websiteURL": "https://example.com",
  ...         "websiteKey": "0x4AAAAAAA...",
  ...     })
  ...     print(solution["token"])

<a id="yescaptcha.types"></a>

# yescaptcha.types

Type definitions for the YesCaptcha API client.

<a id="yescaptcha.types.YesCaptchaBalance"></a>

## YesCaptchaBalance Objects

```python
class YesCaptchaBalance(TypedDict)
```

Account balance details.

<a id="yescaptcha.types.TaskResult"></a>

## TaskResult Objects

```python
class TaskResult(TypedDict)
```

Result returned by getTaskResult.

<a id="yescaptcha.types.RawApiResponse"></a>

## RawApiResponse Objects

```python
class RawApiResponse(TypedDict)
```

Envelope returned by YesCaptcha endpoints.

<a id="yescaptcha.errors"></a>

# yescaptcha.errors

Error types for the YesCaptcha API client.

<a id="yescaptcha.errors.YesCaptchaError"></a>

## YesCaptchaError Objects

```python
class YesCaptchaError(Exception)
```

Exception raised for API errors or failed requests.

**Arguments**:

- `message` - Human-readable error description.
- `error_id` - Numeric error ID returned by YesCaptcha (0 is success).
- `error_code` - String code (e.g. `ERROR_KEY_DOES_NOT_EXIST`).
- `status_code` - HTTP status code or 0 for client/transport errors.
- `response` - Raw response body, if available.

