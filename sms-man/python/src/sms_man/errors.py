from typing import Any


class SmsManError(Exception):
    """Exception raised by the SMS-MAN API client.

    Attributes:
        code: Error code string (e.g. wrong_token, no_numbers, BAD_KEY).
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
