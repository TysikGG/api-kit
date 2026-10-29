"""Cap.guru error types.

API spellings are preserved, including ``CAPCHA_NOT_READY`` and the GeeTest
codes published with their original typos.
"""

from __future__ import annotations

from typing import Any

ERROR_CODE_DESCRIPTIONS: dict[str, str] = {
    "ERROR_WRONG_USER_KEY": "Invalid API key.",
    "ERROR_KEY_DOES_NOT_EXIST": "Invalid API key.",
    "ERROR_ZERO_BALANCE": "Balance is zero or negative. Top up the account.",
    "ERROR_TOO_BIG_CAPTCHA_FILESIZE": "The captcha image exceeds the maximum upload size.",
    "ERROR_UPLOAD": "The service failed to load the image.",
    "ERROR_IMAGE_TYPE_NOT_SUPPORTED": "The image type is not supported.",
    "ERROR_CAPTCHA_UNSOLVABLE": "The service could not solve the captcha.",
    "ERROR_NO_SLOT_AVAILABLE": "No free slots. Too many tasks are queued or the service is busy.",
    "ERROR_PAGEURL": "The page URL is invalid.",
    "ERROR_GOOGLEKEY": "The reCAPTCHA site key is invalid.",
    "ERROR_RECAPTCHA_INVALID_DOMAIN": "The reCAPTCHA page URL is invalid.",
    "ERROR_RECAPTCHA_INVALID_SITEKEY": "The reCAPTCHA site key is invalid.",
    "ERROR_HKEY": "The hCaptcha site key is invalid.",
    "CAPCHA_NOT_READY": "The solution is not ready yet. Poll again in a few seconds.",
    "ERROR_NO_SUCH_CAPCHA_ID": "Task ID was not found.",
    "ERROR_WRONG_CAPTCHA_ID": "Task ID was not found.",
    "notpic": "The object in the image was not found.",
    "ERROR_GEETTEST_GT": "GeeTest gt value is empty.",
    "ERROR_GEETTEST_challenge": "GeeTest challenge value is empty.",
    "ERROR_CAPTCHA_BAD_GT_OR_CNANNEL": "GeeTest gt or challenge is invalid.",
    "ERROR_PROXY_CONNECTION_FAILED": "The supplied proxy could not be used.",
    "MISSING_API_KEY": "API key is required.",
    "PARSE_ERROR": "The response could not be parsed.",
    "INVALID_RESPONSE": "The API returned an unexpected payload.",
    "NETWORK_ERROR": "The HTTP request failed.",
    "HTTP_ERROR": "The API returned an HTTP error.",
    "TIMEOUT": "Polling exceeded the configured timeout.",
    "ABORTED": "Polling was aborted.",
}

RETRYABLE_ERROR_CODES = frozenset({"NETWORK_ERROR", "HTTP_ERROR", "ERROR_NO_SLOT_AVAILABLE"})


class CapGuruError(Exception):
    """Base error for every Cap.guru client failure."""

    def __init__(
        self,
        message: str,
        code: str | None = None,
        response_data: Any = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.response_data = response_data
        self.description = ERROR_CODE_DESCRIPTIONS.get(code) if code else None


class WrongUserKeyError(CapGuruError):
    """ERROR_WRONG_USER_KEY."""


class KeyDoesNotExistError(CapGuruError):
    """ERROR_KEY_DOES_NOT_EXIST."""


class ZeroBalanceError(CapGuruError):
    """ERROR_ZERO_BALANCE."""


class TooBigCaptchaError(CapGuruError):
    """ERROR_TOO_BIG_CAPTCHA_FILESIZE."""


class UploadError(CapGuruError):
    """ERROR_UPLOAD."""


class ImageTypeNotSupportedError(CapGuruError):
    """ERROR_IMAGE_TYPE_NOT_SUPPORTED."""


class CaptchaUnsolvableError(CapGuruError):
    """ERROR_CAPTCHA_UNSOLVABLE."""


class NoSlotAvailableError(CapGuruError):
    """ERROR_NO_SLOT_AVAILABLE."""


class PageUrlError(CapGuruError):
    """ERROR_PAGEURL."""


class GoogleKeyError(CapGuruError):
    """ERROR_GOOGLEKEY."""


class RecaptchaInvalidDomainError(CapGuruError):
    """ERROR_RECAPTCHA_INVALID_DOMAIN."""


class RecaptchaInvalidSitekeyError(CapGuruError):
    """ERROR_RECAPTCHA_INVALID_SITEKEY."""


class HCaptchaKeyError(CapGuruError):
    """ERROR_HKEY."""


class NoSuchCaptchaIdError(CapGuruError):
    """ERROR_NO_SUCH_CAPCHA_ID."""


class WrongCaptchaIdError(CapGuruError):
    """ERROR_WRONG_CAPTCHA_ID."""


class NotPicError(CapGuruError):
    """notpic."""


class GeeTestGtError(CapGuruError):
    """ERROR_GEETTEST_GT."""


class GeeTestChallengeError(CapGuruError):
    """ERROR_GEETTEST_challenge."""


class GeeTestBadGtError(CapGuruError):
    """ERROR_CAPTCHA_BAD_GT_OR_CNANNEL."""


class ProxyConnectionError(CapGuruError):
    """ERROR_PROXY_CONNECTION_FAILED."""


class MissingApiKeyError(CapGuruError):
    """MISSING_API_KEY."""


class ParseError(CapGuruError):
    """PARSE_ERROR."""


class InvalidResponseError(CapGuruError):
    """INVALID_RESPONSE."""


class NetworkError(CapGuruError):
    """NETWORK_ERROR."""


class HttpError(CapGuruError):
    """HTTP_ERROR."""


class PollingTimeoutError(CapGuruError):
    """TIMEOUT while waiting for a task."""


class AbortedError(CapGuruError):
    """ABORTED polling."""


_BY_CODE: dict[str, type[CapGuruError]] = {
    "ERROR_WRONG_USER_KEY": WrongUserKeyError,
    "ERROR_KEY_DOES_NOT_EXIST": KeyDoesNotExistError,
    "ERROR_ZERO_BALANCE": ZeroBalanceError,
    "ERROR_TOO_BIG_CAPTCHA_FILESIZE": TooBigCaptchaError,
    "ERROR_UPLOAD": UploadError,
    "ERROR_IMAGE_TYPE_NOT_SUPPORTED": ImageTypeNotSupportedError,
    "ERROR_CAPTCHA_UNSOLVABLE": CaptchaUnsolvableError,
    "ERROR_NO_SLOT_AVAILABLE": NoSlotAvailableError,
    "ERROR_PAGEURL": PageUrlError,
    "ERROR_GOOGLEKEY": GoogleKeyError,
    "ERROR_RECAPTCHA_INVALID_DOMAIN": RecaptchaInvalidDomainError,
    "ERROR_RECAPTCHA_INVALID_SITEKEY": RecaptchaInvalidSitekeyError,
    "ERROR_HKEY": HCaptchaKeyError,
    "ERROR_NO_SUCH_CAPCHA_ID": NoSuchCaptchaIdError,
    "ERROR_WRONG_CAPTCHA_ID": WrongCaptchaIdError,
    "notpic": NotPicError,
    "ERROR_GEETTEST_GT": GeeTestGtError,
    "ERROR_GEETTEST_challenge": GeeTestChallengeError,
    "ERROR_CAPTCHA_BAD_GT_OR_CNANNEL": GeeTestBadGtError,
    "ERROR_PROXY_CONNECTION_FAILED": ProxyConnectionError,
    "MISSING_API_KEY": MissingApiKeyError,
    "PARSE_ERROR": ParseError,
    "INVALID_RESPONSE": InvalidResponseError,
    "NETWORK_ERROR": NetworkError,
    "HTTP_ERROR": HttpError,
    "TIMEOUT": PollingTimeoutError,
    "ABORTED": AbortedError,
}


def capguru_error(message: str, code: str | None = None, response_data: Any = None) -> CapGuruError:
    """Build the subclass that matches ``code`` when one exists."""
    cls = _BY_CODE.get(code or "", CapGuruError)
    return cls(message, code=code, response_data=response_data)


def api_error(code: str, response_data: Any = None) -> CapGuruError:
    """Build an error whose message is ``CapGuru error: <code>``."""
    return capguru_error(f"CapGuru error: {code}", code=code, response_data=response_data)
