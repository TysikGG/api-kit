"""Error types for the Peak API client."""

from __future__ import annotations

from typing import Any


class ErrorCode:
    """Stable identifiers for documented Peak failures."""

    PEAK_ERROR = "peak_error"
    MISSING_API_KEY = "missing_api_key"
    UNAUTHORIZED = "unauthorized"
    INSUFFICIENT_BALANCE = "insufficient_balance"
    PACKAGE_EXHAUSTED = "package_solves_exhausted"
    BAD_REQUEST = "bad_request"
    RATE_LIMITED = "rate_limited"
    TASK_DISABLED = "task_disabled"
    UPSTREAM = "upstream"
    SOLVE_FAILED = "solve_failed"
    PROXY_CONNECTION_FAILED = "proxy_connection_failed"
    REQUEST_TIMED_OUT = "request_timed_out"
    IP_BLOCKED = "ip_blocked"
    NO_WAF_CHALLENGE = "no_waf_challenge"
    INVALID_SITEKEY = "invalid_sitekey"
    TURNSTILE_FLAGGED = "turnstile_flagged"
    UNSUPPORTED_USER_AGENT = "unsupported_user_agent"
    NETWORK = "network"
    RETRY_TIMEOUT = "retry_timeout"


_MESSAGE_CODES: list[tuple[str, str]] = [
    ("missing api key", ErrorCode.MISSING_API_KEY),
    ("invalid api key", ErrorCode.UNAUTHORIZED),
    ("expired api key", ErrorCode.UNAUTHORIZED),
    ("api key", ErrorCode.UNAUTHORIZED),
    ("unauthorized", ErrorCode.UNAUTHORIZED),
    ("authentication", ErrorCode.UNAUTHORIZED),
    ("package solves exhausted", ErrorCode.PACKAGE_EXHAUSTED),
    ("insufficient balance", ErrorCode.INSUFFICIENT_BALANCE),
    ("exhausted", ErrorCode.PACKAGE_EXHAUSTED),
    ("rate limit", ErrorCode.RATE_LIMITED),
    ("disabled", ErrorCode.TASK_DISABLED),
    ("no solver", ErrorCode.TASK_DISABLED),
    ("proxy connection failed", ErrorCode.PROXY_CONNECTION_FAILED),
    ("ip address is blocked", ErrorCode.IP_BLOCKED),
    ("no waf challenge", ErrorCode.NO_WAF_CHALLENGE),
    ("invalid sitekey", ErrorCode.INVALID_SITEKEY),
    ("flagged", ErrorCode.TURNSTILE_FLAGGED),
    ("unsupported user agent", ErrorCode.UNSUPPORTED_USER_AGENT),
    ("request timed out", ErrorCode.REQUEST_TIMED_OUT),
    ("timed out", ErrorCode.REQUEST_TIMED_OUT),
]

_AUTH_CODES = {ErrorCode.MISSING_API_KEY, ErrorCode.UNAUTHORIZED}
_BALANCE_CODES = {ErrorCode.INSUFFICIENT_BALANCE, ErrorCode.PACKAGE_EXHAUSTED}


class PeakError(Exception):
    """Exception raised for API errors or failed requests.

    Args:
        message: Human-readable error description.
        status_code: HTTP status code, or 0 for a local or transport failure.
        response: Raw response body, if available.
        code: Stable error code. See ``ErrorCode``.
    """

    def __init__(
        self,
        message: str,
        status_code: int = 0,
        response: Any = None,
        *,
        code: str = ErrorCode.PEAK_ERROR,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.response = response
        self.code = code

    @property
    def status(self) -> int:
        """Alias of ``status_code``."""
        return self.status_code

    @property
    def data(self) -> Any:
        """Alias of ``response``."""
        return self.response

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}(message={self.message!r}, "
            f"status_code={self.status_code}, code={self.code!r})"
        )


class AuthenticationError(PeakError):
    """HTTP 401, or a message that says the API key is missing, invalid, or expired."""


class InsufficientBalanceError(PeakError):
    """HTTP 402, insufficient pay-per-solve balance, or a used-up package."""


class BadRequestError(PeakError):
    """HTTP 400, or a request the client rejected before sending. Not retried."""


class RateLimitError(PeakError):
    """HTTP 429. Safe to retry after a delay."""


class TaskDisabledError(PeakError):
    """HTTP 503, or a message that the task type is disabled or has no capacity."""


class ServiceUnavailableError(TaskDisabledError):
    """HTTP 503 when the body does not name a specific disabled task."""


class UpstreamError(PeakError):
    """HTTP 502 from Peak or the target site."""


class SolveError(PeakError):
    """A solve was attempted and failed. Peak does not bill these responses."""


class RetryTimeoutError(PeakError):
    """The retry budget elapsed before a retryable call succeeded."""

    def __init__(self, message: str = "Retry timeout exceeded", response: Any = None) -> None:
        super().__init__(message, 0, response, code=ErrorCode.RETRY_TIMEOUT)


def _code_from_message(message: str) -> str | None:
    lowered = message.lower()
    for needle, code in _MESSAGE_CODES:
        if needle in lowered:
            return code
    return None


def classify_error(message: str, status: int, response: Any = None) -> PeakError:
    """Map an API message and HTTP status onto a ``PeakError`` subclass."""
    from_message = _code_from_message(message)

    if status == 401 or (from_message in _AUTH_CODES):
        code = from_message if from_message in _AUTH_CODES else ErrorCode.UNAUTHORIZED
        return AuthenticationError(message, status or 401, response, code=code)

    if status == 402 or (from_message in _BALANCE_CODES):
        code = from_message if from_message in _BALANCE_CODES else ErrorCode.INSUFFICIENT_BALANCE
        return InsufficientBalanceError(message, status or 402, response, code=code)

    if status == 400:
        return BadRequestError(message, status, response, code=ErrorCode.BAD_REQUEST)

    if status == 429 or from_message == ErrorCode.RATE_LIMITED:
        return RateLimitError(message, status or 429, response, code=ErrorCode.RATE_LIMITED)

    if status == 503 or from_message == ErrorCode.TASK_DISABLED:
        if status == 503 and from_message != ErrorCode.TASK_DISABLED:
            return ServiceUnavailableError(
                message, status, response, code=ErrorCode.TASK_DISABLED
            )
        return TaskDisabledError(
            message, status or 503, response, code=ErrorCode.TASK_DISABLED
        )

    if status == 502:
        return UpstreamError(message, status, response, code=ErrorCode.UPSTREAM)

    if status == 200 or (from_message and from_message != ErrorCode.REQUEST_TIMED_OUT):
        return SolveError(
            message,
            status or 200,
            response,
            code=from_message or ErrorCode.SOLVE_FAILED,
        )

    if from_message == ErrorCode.REQUEST_TIMED_OUT or status == 0:
        code = (
            ErrorCode.REQUEST_TIMED_OUT
            if from_message == ErrorCode.REQUEST_TIMED_OUT
            else ErrorCode.NETWORK
        )
        return PeakError(message, status, response, code=code)

    return PeakError(message, status, response, code=from_message or ErrorCode.PEAK_ERROR)


def is_retryable(err: BaseException) -> bool:
    """True when sending the same call again cannot double-bill a successful solve."""
    if not isinstance(err, PeakError):
        return False
    if isinstance(err, (AuthenticationError, InsufficientBalanceError, BadRequestError)):
        return False
    if isinstance(err, RetryTimeoutError):
        return False
    return True
