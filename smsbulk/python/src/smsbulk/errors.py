from typing import Any


class SMSBulkError(Exception):
    """Exception raised when an SMSBulk API call fails."""

    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        code: str | None = None,
        response_body: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.response_body = response_body

    def __str__(self) -> str:
        if self.status_code:
            return f"[{self.status_code}] {self.message}"
        return self.message
