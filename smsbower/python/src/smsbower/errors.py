"""Exceptions for the SMSBower client."""

from typing import Any


class SmsBowerError(Exception):
    """Base exception for all SMSBower client errors."""

    def __init__(
        self,
        message: str,
        code: str | None = None,
        response_body: Any | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.response_body = response_body
