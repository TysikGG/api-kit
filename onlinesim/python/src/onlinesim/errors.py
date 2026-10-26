from typing import Any


class OnlineSimError(Exception):
    """Exception raised by the OnlineSIM API client.

    Attributes:
        code: Error response string or status code (e.g. ERROR_WRONG_KEY, NO_NUMBER).
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
