"""Error types for the Peak API client."""

from __future__ import annotations

from typing import Any


class PeakError(Exception):
    """Exception raised for API errors or failed requests.

    Args:
        message: Human-readable error description.
        status_code: HTTP status code or 0 for client/transport errors.
        response: Raw response body, if available.
    """

    def __init__(
        self,
        message: str,
        status_code: int = 0,
        response: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.response = response

    def __repr__(self) -> str:
        return f"PeakError(message={self.message!r}, status_code={self.status_code})"
