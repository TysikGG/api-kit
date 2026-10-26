"""Error classes for the FixedFloat API client."""

from typing import Any


class FixedFloatError(Exception):
    """Exception raised when a FixedFloat API request fails or returns an error."""

    def __init__(
        self,
        message: str,
        code: int = -1,
        data: Any | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.data = data

    def __str__(self) -> str:
        if self.code != -1:
            return f"[{self.code}] {self.message}"
        return self.message
