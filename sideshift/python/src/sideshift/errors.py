from typing import Any


class SideShiftError(Exception):
    """Exception raised by the SideShift client when an API call fails.

    Attributes:
        code: Error code returned by SideShift (e.g. BAD_USER_INPUT, NOT_FOUND).
        status_code: HTTP status code.
        response_data: Raw JSON payload or response text.
    """

    def __init__(
        self,
        message: str,
        code: str | None = None,
        status_code: int | None = None,
        response_data: Any = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.status_code = status_code
        self.response_data = response_data
