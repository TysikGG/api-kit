from typing import Any


class CapGuruError(Exception):
    """Exception raised when an API call to CapGuru fails.

    Attributes:
        code: Error code string (e.g. ERROR_ZERO_BALANCE, ERROR_WRONG_USER_KEY).
        response_data: Raw response payload.
    """

    def __init__(
        self,
        message: str,
        code: str | None = None,
        response_data: Any = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.response_data = response_data
