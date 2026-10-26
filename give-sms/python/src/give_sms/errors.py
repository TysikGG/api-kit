from typing import Any


class GiveSmsError(Exception):
    """Exception raised by the Give-SMS API client.

    Attributes:
        code: HTTP status code or API error code.
        response_data: Raw response data from the API if available.
    """

    def __init__(
        self,
        message: str,
        code: str | int | None = None,
        response_data: Any = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.response_data = response_data
