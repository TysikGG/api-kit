"""Error definitions for the SolveCaptcha client."""

from typing import Any

ERROR_DESCRIPTIONS: dict[str, str] = {
    "ERROR_WRONG_USER_KEY": "API key is invalid or formatted incorrectly",
    "ERROR_KEY_DOES_NOT_EXIST": "API key not found in SolveCaptcha system",
    "ERROR_ZERO_BALANCE": "Account balance is zero or depleted",
    "ERROR_NO_SLOT_AVAILABLE": "No idle workers available at the moment",
    "ERROR_ZERO_CAPTCHA_FILESIZE": "Uploaded image file size is 0 bytes",
    "ERROR_TOO_BIG_CAPTCHA_FILESIZE": "Uploaded image exceeds maximum size limit (100 KB)",
    "ERROR_WRONG_FILE_EXTENSION": "File extension is not supported",
    "ERROR_IMAGE_TYPE_NOT_SUPPORTED": "Image format cannot be loaded or is corrupted",
    "ERROR_IP_NOT_ALLOWED": "Your IP address is not whitelisted or is blocked",
    "IP_BANNED": "Your IP address has been temporarily banned due to excessive failed attempts",
    "ERROR_CAPTCHA_UNSOLVABLE": "Worker could not solve the submitted captcha",
    "ERROR_BAD_DUPLICATES": "Maximum duplicate requests limit reached",
    "REPORT_NOT_RECORDED": "Feedback report could not be recorded",
}


class SolveCaptchaError(Exception):
    """Exception raised when a SolveCaptcha API request or task fails."""

    def __init__(
        self,
        message: str,
        code: str | None = None,
        response_body: Any | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.response_body = response_body
