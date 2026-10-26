from typing import Any


class TwoCaptchaError(Exception):
    """Exception raised when an API call to 2Captcha fails.

    Attributes:
        code: Error code string (e.g. ERROR_ZERO_BALANCE, ERROR_KEY_DOES_NOT_EXIST).
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
