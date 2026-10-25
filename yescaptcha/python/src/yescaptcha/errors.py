"""Error types for the YesCaptcha API client."""

from __future__ import annotations

from typing import Any


class YesCaptchaError(Exception):
    """Exception raised for API errors or failed requests.

    Args:
        message: Human-readable error description.
        error_id: Numeric error ID returned by YesCaptcha (0 is success).
        error_code: String code (e.g. `ERROR_KEY_DOES_NOT_EXIST`).
        status_code: HTTP status code or 0 for client/transport errors.
        response: Raw response body, if available.
    """

    def __init__(
        self,
        message: str,
        error_id: int = 0,
        error_code: str | None = None,
        status_code: int = 0,
        response: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.error_id = error_id
        self.error_code = error_code
        self.status_code = status_code
        self.response = response

    def __repr__(self) -> str:
        return (
            f"YesCaptchaError(message={self.message!r}, "
            f"error_id={self.error_id}, error_code={self.error_code!r})"
        )
