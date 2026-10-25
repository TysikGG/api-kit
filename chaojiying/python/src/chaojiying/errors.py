from typing import Any


class ChaojiyingError(Exception):
    """Exception raised when a Chaojiying API operation fails."""

    def __init__(
        self,
        message: str,
        err_no: int | None = None,
        err_str: str | None = None,
        response_body: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.err_no = err_no
        self.err_str = err_str
        self.response_body = response_body

    def __str__(self) -> str:
        if self.err_no is not None:
            return f"[{self.err_no}] {self.message}"
        return self.message
