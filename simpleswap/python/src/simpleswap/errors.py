from typing import Any


class SimpleSwapError(Exception):
    """Exception raised when a SimpleSwap API operation fails."""

    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        trace_id: str | None = None,
        response_body: Any = None,
        *,
        code: str | int | None = None,
        retryable: bool = False,
        retry_after: float | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.trace_id = trace_id
        self.response_body = response_body
        self.code = code
        self.retryable = retryable
        self.retry_after = retry_after

    def __str__(self) -> str:
        if self.status_code is not None:
            return f"[{self.status_code}] {self.message}"
        return self.message


class SimpleSwapBadRequestError(SimpleSwapError):
    """HTTP 400. The pair, amount, address, or another parameter was rejected."""


class SimpleSwapAuthError(SimpleSwapError):
    """HTTP 401. The API key is missing or not valid."""


class SimpleSwapForbiddenError(SimpleSwapError):
    """HTTP 403. The key is not allowed to call this operation."""


class SimpleSwapNotFoundError(SimpleSwapError):
    """HTTP 404. The currency, pair, or exchange id was not found."""


class SimpleSwapValidationError(SimpleSwapError):
    """HTTP 422. The body or query failed validation."""


class SimpleSwapRateLimitError(SimpleSwapError):
    """HTTP 429. The public API allows 50 requests per 10 seconds."""


class SimpleSwapServerError(SimpleSwapError):
    """HTTP 5xx. SimpleSwap failed while handling the request."""


class SimpleSwapNetworkError(SimpleSwapError):
    """DNS, connection, or timeout failure before a response arrived."""

    def __init__(self, message: str, *, code: str | None = None, response_body: Any = None) -> None:
        super().__init__(message, code=code, response_body=response_body, retryable=True)


class SimpleSwapTimeoutError(SimpleSwapError):
    """``wait_for_exchange`` did not see a matching status before the timeout."""

    def __init__(self, message: str, *, response_body: Any = None) -> None:
        super().__init__(message, response_body=response_body, retryable=False)


_STATUS_CLASS: dict[int, type[SimpleSwapError]] = {
    400: SimpleSwapBadRequestError,
    401: SimpleSwapAuthError,
    403: SimpleSwapForbiddenError,
    404: SimpleSwapNotFoundError,
    422: SimpleSwapValidationError,
    429: SimpleSwapRateLimitError,
}


def is_retryable_status(status_code: int | None) -> bool:
    return status_code in (408, 429) or (status_code is not None and status_code >= 500)


def parse_retry_after(value: Any, now: float | None = None) -> float | None:
    """Reads a Retry-After header into seconds. Invalid values return None."""
    import time
    from email.utils import parsedate_to_datetime

    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        pass
    try:
        moment = parsedate_to_datetime(text).timestamp()
    except (TypeError, ValueError, IndexError, OverflowError):
        return None
    clock = time.time() if now is None else now
    return max(0.0, moment - clock)


def error_from_response(
    status_code: int | None,
    data: Any,
    *,
    headers: Any = None,
    fallback: str = "SimpleSwap API error",
) -> SimpleSwapError:
    message = fallback
    trace_id = None
    code: str | int | None = None
    if isinstance(data, dict):
        raw_trace = data.get("traceId")
        trace_id = raw_trace if isinstance(raw_trace, str) else None
        raw_code = data.get("code")
        if isinstance(raw_code, (str, int)):
            code = raw_code
        raw_message = data.get("message")
        raw_error = data.get("error")
        if isinstance(raw_message, str) and raw_message:
            message = raw_message
        elif isinstance(raw_error, str) and raw_error:
            message = raw_error
    elif isinstance(data, str) and data.strip():
        message = data.strip()

    retry_after = None
    if headers is not None:
        header = None
        try:
            header = headers.get("retry-after")
        except AttributeError:
            header = None
        retry_after = parse_retry_after(header)

    cls = _STATUS_CLASS.get(status_code or 0, SimpleSwapError)
    if status_code is not None and status_code >= 500:
        cls = SimpleSwapServerError
    return cls(
        message,
        status_code=status_code,
        trace_id=trace_id,
        response_body=data,
        code=code,
        retryable=is_retryable_status(status_code),
        retry_after=retry_after,
    )


def unwrap_payload(data: Any, status_code: int | None = None) -> Any:
    """Returns ``result`` or raises when the body is an error envelope."""
    if isinstance(data, dict):
        err = data.get("error")
        failed = err is True or (isinstance(err, str) and "result" not in data)
        if failed:
            raise error_from_response(status_code, data, fallback="SimpleSwap error")
        if "result" in data:
            return data["result"]
    return data
