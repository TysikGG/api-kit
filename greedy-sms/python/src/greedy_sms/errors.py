"""Exceptions and error handling for Greedy SMS."""

from __future__ import annotations

from typing import Any


class GreedySMSError(Exception):
    """Base exception for all Greedy SMS API errors."""

    def __init__(
        self,
        message: str,
        code: int | str = 500,
        error_code: str | None = None,
        reason_code: str | None = None,
        retry_after_seconds: int | None = None,
        fields: list[dict[str, str]] | None = None,
        details: dict[str, Any] | None = None,
        raw_response: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.error_code = error_code
        self.reason_code = reason_code
        self.retry_after_seconds = retry_after_seconds
        self.fields = fields or []
        self.details = details or {}
        self.raw_response = raw_response

    def __str__(self) -> str:
        prefix = f"[{self.code}] " if self.code else ""
        if self.error_code:
            prefix += f"({self.error_code}) "
        return f"{prefix}{self.message}"


class AuthenticationError(GreedySMSError):
    """Raised when API key is missing, invalid, or unauthorized (HTTP 401)."""

    def __init__(
        self,
        message: str = "Unauthorized: missing or invalid API key",
        raw_response: Any = None,
    ) -> None:
        super().__init__(message=message, code=401, raw_response=raw_response)


class ForbiddenError(GreedySMSError):
    """Raised when access is forbidden for the API key (HTTP 403)."""

    def __init__(self, message: str = "Forbidden", raw_response: Any = None) -> None:
        super().__init__(message=message, code=403, raw_response=raw_response)


class NotFoundError(GreedySMSError):
    """Raised when a requested resource or order is not found (HTTP 404)."""

    def __init__(self, message: str = "Resource not found", raw_response: Any = None) -> None:
        super().__init__(message=message, code=404, raw_response=raw_response)


class ConflictError(GreedySMSError):
    """Raised when an operation conflicts with current state (HTTP 409)."""

    def __init__(
        self,
        message: str = "Operation conflicts with current state",
        raw_response: Any = None,
    ) -> None:
        super().__init__(message=message, code=409, raw_response=raw_response)


class ValidationError(GreedySMSError):
    """Raised when request validation fails (HTTP 422)."""

    def __init__(
        self,
        message: str = "Request validation failed",
        fields: list[dict[str, str]] | None = None,
        details: dict[str, Any] | None = None,
        raw_response: Any = None,
    ) -> None:
        super().__init__(
            message=message,
            code=422,
            fields=fields,
            details=details,
            raw_response=raw_response,
        )


class RateLimitError(GreedySMSError):
    """Raised when rate limit is exceeded (HTTP 429)."""

    def __init__(
        self,
        message: str = "Request rate limit exceeded",
        retry_after_seconds: int | None = None,
        details: dict[str, Any] | None = None,
        raw_response: Any = None,
    ) -> None:
        super().__init__(
            message=message,
            code=429,
            error_code="RATE_LIMIT_EXCEEDED",
            retry_after_seconds=retry_after_seconds,
            details=details,
            raw_response=raw_response,
        )


class ServerError(GreedySMSError):
    """Raised on internal server error or service unavailability (HTTP 500/503)."""

    def __init__(
        self,
        message: str = "Server error",
        code: int = 500,
        raw_response: Any = None,
    ) -> None:
        super().__init__(message=message, code=code, raw_response=raw_response)


def create_greedy_sms_error(status: int, data: Any) -> GreedySMSError:
    """Creates a strongly typed error instance from HTTP status and response body."""
    if isinstance(data, dict) and data.get("status") == "error":
        msg = str(data.get("message") or f"API error [{data.get('code', status)}]")
        code = data.get("code", status)
        error_code = data.get("errorCode")
        reason_code = data.get("reasonCode")
        retry_after = data.get("retryAfterSeconds")
        fields = data.get("fields")
        details = data.get("details")

        if status == 401 or code == 401:
            return AuthenticationError(msg, raw_response=data)
        if status == 403 or code == 403:
            return ForbiddenError(msg, raw_response=data)
        if status == 404 or code == 404:
            return NotFoundError(msg, raw_response=data)
        if status == 409 or code == 409:
            return ConflictError(msg, raw_response=data)
        if status == 422 or code == 422:
            return ValidationError(msg, fields=fields, details=details, raw_response=data)
        if status == 429 or code == 429:
            return RateLimitError(
                msg, retry_after_seconds=retry_after, details=details, raw_response=data
            )
        if status in (500, 503):
            return ServerError(msg, code=status, raw_response=data)

        return GreedySMSError(
            message=msg,
            code=code,
            error_code=error_code,
            reason_code=reason_code,
            retry_after_seconds=retry_after,
            fields=fields,
            details=details,
            raw_response=data,
        )

    # Fallback string
    fallback = str(data) if data else f"HTTP {status}"
    if status == 401 or fallback in ("BAD_KEY", "NO_KEY"):
        return AuthenticationError(fallback, raw_response=data)
    return GreedySMSError(fallback, code=status, raw_response=data)
