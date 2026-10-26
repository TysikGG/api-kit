from typing import Any


class SimpleSwapError(Exception):
    """Exception raised when a SimpleSwap API operation fails."""

    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        trace_id: str | None = None,
        response_body: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.trace_id = trace_id
        self.response_body = response_body

    def __str__(self) -> str:
        if self.status_code is not None:
            return f"[{self.status_code}] {self.message}"
        return self.message
