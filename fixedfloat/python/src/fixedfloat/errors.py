"""Error classes for the FixedFloat API client."""

from typing import Any


class FixedFloatError(Exception):
    """Exception raised when a FixedFloat API request fails or returns an error."""

    def __init__(
        self,
        message: str,
        code: int = -1,
        data: Any | None = None,
        *,
        retryable: bool = False,
        status: int | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.data = data
        self.retryable = retryable
        self.status = status

    def __str__(self) -> str:
        if self.code != -1:
            return f"[{self.code}] {self.message}"
        return self.message


class FixedFloatApiError(FixedFloatError):
    """FixedFloat returned a non-zero ``code`` in the JSON envelope."""


class FixedFloatHttpError(FixedFloatError):
    """The HTTP layer failed before a usable FixedFloat envelope was returned."""

    def __init__(
        self,
        message: str,
        status: int,
        data: Any | None = None,
        *,
        retryable: bool = False,
    ) -> None:
        super().__init__(message, code=status, data=data, retryable=retryable, status=status)


class FixedFloatAuthError(FixedFloatError):
    """API key or signature was rejected (HTTP 401 or 403)."""

    def __init__(
        self,
        message: str,
        code: int = 401,
        data: Any | None = None,
        *,
        status: int | None = None,
    ) -> None:
        super().__init__(message, code=code, data=data, retryable=False, status=status or 401)


class FixedFloatRateLimitError(FixedFloatError):
    """Per-minute weight limit was hit (HTTP 429).

    ``/create`` costs 50 weight units. Every other method costs 1. The cap is 250 per minute.
    """

    def __init__(
        self,
        message: str,
        code: int = 429,
        data: Any | None = None,
        *,
        status: int = 429,
    ) -> None:
        super().__init__(message, code=code, data=data, retryable=True, status=status)


class FixedFloatNetworkError(FixedFloatError):
    """DNS, connection, or other transport failure."""

    def __init__(self, message: str) -> None:
        super().__init__(message, retryable=True)


class FixedFloatTimeoutError(FixedFloatError):
    """A single HTTP call timed out, or order polling exceeded its deadline."""

    def __init__(self, message: str, *, retryable: bool = True) -> None:
        super().__init__(message, retryable=retryable)
