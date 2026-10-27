"""Error types for the NextCaptcha API client."""

from __future__ import annotations

from typing import Any

# Documented codes: https://nextcaptcha.com/apidocs/error-codes
NEXTCAPTCHA_ERRORS: dict[str, str] = {
    "ERROR_KEY_DOES_NOT_EXIST": (
        "Your API key is incorrect. Copy it from the client or developer area in the control panel"
    ),
    "ERROR_ZERO_BALANCE": "Your account balance is zero",
    "ERROR_IP_NOT_ALLOWED": (
        "The request was made from an IP address that is not in your trusted IP list"
    ),
    "ERROR_CAPTCHA_UNSOLVABLE": (
        "The captcha could not be solved, often because of a proxy or network failure. "
        "You can try again"
    ),
    "ERROR_NO_SUCH_METHOD": "A method that does not exist in the API was requested",
    "ERROR_IMAGE_TYPE_NOT_SUPPORTED": (
        "The image cannot be processed because the format or size is incorrect, "
        "or the image is corrupted"
    ),
    "ERROR_NO_SUCH_CAPCHA_ID": "The captcha id you provided is incorrect",
    "ERROR_IP_BLOCKED": "Your IP address has been banned due to inappropriate use of the API",
    "ERROR_TASK_ABSENT": "The createTask request did not include a task object",
    "ERROR_TASK_NOT_SUPPORTED": (
        "The task type is not supported by the API, or the type field is incorrect"
    ),
    "ERROR_RECAPTCHA_INVALID_SITEKEY": "The reCAPTCHA sitekey value you provided is invalid",
    "ERROR_ACCOUNT_SUSPENDED": "Your account has been suspended due to improper use of the API",
    "ERROR_BAD_PARAMETERS": (
        "A required captcha parameter is missing, or the parameter format is incorrect "
        "for this task type"
    ),
    "ERROR_BAD_PROXY": "The proxy parameters are incorrect or the proxy connection failed",
    "ERROR_UNKNOWN": "Unknown error",
    "TIMEOUT": "Polling timed out before the captcha was solved",
    "MISSING_CLIENT_KEY": "Client key is required",
}


class NextCaptchaError(Exception):
    """Exception raised for API errors or failed requests.

    Args:
        message: Human-readable error description.
        error_id: Numeric error ID returned by NextCaptcha (0 is success).
        error_code: String code (e.g. `ERROR_KEY_DOES_NOT_EXIST`).
        status_code: HTTP status code or 0 for client/transport errors.
        response: Raw response body, if available.
    """

    def __init__(
        self,
        message: str,
        error_id: int = 0,
        error_code: str | None = None,
        status_code: int = 0,
        response: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.error_id = error_id
        self.error_code = error_code
        self.status_code = status_code
        self.response = response

    def __repr__(self) -> str:
        return (
            f"NextCaptchaError(message={self.message!r}, "
            f"error_id={self.error_id}, error_code={self.error_code!r})"
        )


def describe_error(
    error_code: str | None,
    error_description: str | None,
    error_id: int,
) -> str:
    """Prefer the API description, then the local catalog, then the raw code."""
    if error_description:
        return error_description
    if error_code and error_code in NEXTCAPTCHA_ERRORS:
        return NEXTCAPTCHA_ERRORS[error_code]
    if error_code:
        return error_code
    return f"API error #{error_id}"
