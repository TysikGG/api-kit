"""Error types for the CapMonster Cloud API client."""

from __future__ import annotations

from typing import Any

# Documented codes: https://docs.capmonster.cloud/docs/api/api-errors/
CAPMONSTER_ERRORS: dict[str, str] = {
    "ERROR_KEY_DOES_NOT_EXIST": "API key not found or provided in an incorrect format",
    "ERROR_PROXY_CREDENTIALS_INVALID_CHARACTER": (
        "Proxy login or password contains an invalid character"
    ),
    "ERROR_ZERO_BALANCE": "Insufficient funds on the account to solve captchas",
    "ERROR_TOO_BIG_CAPTCHA_FILESIZE": (
        "The uploaded image exceeds the maximum allowed size of 50 KB"
    ),
    "ERROR_ZERO_CAPTCHA_FILESIZE": "The image size is too small (less than 100 bytes)",
    "ERROR_NO_SUCH_CAPCHA_ID": "Captcha task id was not found",
    "WRONG_CAPTCHA_ID": "Captcha task id is missing, expired, or invalid",
    "ERROR_CAPTCHA_UNSOLVABLE": (
        "The captcha could not be solved. Unsolved tasks are not charged"
    ),
    "CAPTCHA_NOT_READY": "The task is still being solved",
    "ERROR_IP_NOT_ALLOWED": "Requests from this IP with the current key are denied",
    "ERROR_IP_BANNED": "The IP address has been temporarily blocked due to invalid requests",
    "ERROR_NO_SUCH_METHOD": "An incorrect task type was specified",
    "ERROR_TOO_MUCH_REQUESTS": "The allowed request limit has been exceeded",
    "ERROR_DOMAIN_NOT_ALLOWED": "Solving captchas from this domain is forbidden",
    "ERROR_TOKEN_EXPIRED": "The provided token or challenge has expired",
    "ERROR_RECAPTCHA_INVALID_SITEKEY": "An invalid websiteKey was provided",
    "ERROR_RECAPTCHA_INVALID_DOMAIN": (
        "The domain does not match the sitekey, or websiteURL is not a full http(s) URL"
    ),
    "ERROR_RECAPTCHA_TIMEOUT": "The captcha solving time has expired",
    "ERROR_IP_BLOCKED": "Access from this IP is blocked due to a high number of failed requests",
    "ERROR_PROXY_CONNECT_REFUSED": "The proxy server refused the connection",
    "ERROR_PROXY_BANNED": "The specified proxy is blocked by the target website",
    "ERROR_PROXY_MISSING": "Proxy parameters are missing or proxyType is incorrect",
    "ERROR_PROXY_NOT_AUTHORISED": "Proxy login or password is incorrect",
    "ERROR_PROXY_READ_TIMEOUT": "The response timed out while using the proxy",
    "ERROR_TASK_NOT_SUPPORTED": "The specified task type is unsupported or invalid",
    "ERROR_TASK_ABSENT": "The task object is missing or the JSON is invalid",
    "ERROR_WRONG_USERAGENT": "An invalid User-Agent was provided",
    "ERROR_SERVICE_NOT_AVAILABLE": "The service is temporarily unavailable",
    "ERROR_INVALID_TASK": "The task is syntactically valid but contains invalid data",
    "TIMEOUT": "Polling timed out before the captcha was solved",
    "ABORTED": "The operation was aborted",
    "MISSING_CLIENT_KEY": "Client key is required",
    "EMPTY_USER_AGENT": "The user-agent endpoint returned an empty body",
}

# Transport and API codes that are safe to retry. CAPTCHA_NOT_READY is polled, not retried.
RETRYABLE_ERROR_CODES = (
    "ERROR_SERVICE_NOT_AVAILABLE",
    "ERROR_TOO_MUCH_REQUESTS",
    "ERROR_PROXY_READ_TIMEOUT",
    "ERROR_PROXY_CONNECT_REFUSED",
)
RETRYABLE_HTTP_STATUSES = (429, 502, 503, 504)


class CapMonsterError(Exception):
    """Exception raised for API errors or failed requests.

    Args:
        message: Human-readable error description.
        error_id: Numeric error ID returned by CapMonster Cloud (0 is success).
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
            f"CapMonsterError(message={self.message!r}, "
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
    if error_code and error_code in CAPMONSTER_ERRORS:
        return CAPMONSTER_ERRORS[error_code]
    if error_code:
        return error_code
    return f"API error #{error_id}"


def _subclass(name: str) -> type[CapMonsterError]:
    return type(name, (CapMonsterError,), {})


KeyDoesNotExistError = _subclass("KeyDoesNotExistError")
ProxyCredentialsInvalidCharacterError = _subclass("ProxyCredentialsInvalidCharacterError")
ZeroBalanceError = _subclass("ZeroBalanceError")
TooBigCaptchaFileSizeError = _subclass("TooBigCaptchaFileSizeError")
ZeroCaptchaFileSizeError = _subclass("ZeroCaptchaFileSizeError")
NoSuchCaptchaIdError = _subclass("NoSuchCaptchaIdError")
WrongCaptchaIdError = _subclass("WrongCaptchaIdError")
CaptchaUnsolvableError = _subclass("CaptchaUnsolvableError")
CaptchaNotReadyError = _subclass("CaptchaNotReadyError")
IpNotAllowedError = _subclass("IpNotAllowedError")
IpBannedError = _subclass("IpBannedError")
NoSuchMethodError = _subclass("NoSuchMethodError")
TooMuchRequestsError = _subclass("TooMuchRequestsError")
DomainNotAllowedError = _subclass("DomainNotAllowedError")
TokenExpiredError = _subclass("TokenExpiredError")
RecaptchaInvalidSitekeyError = _subclass("RecaptchaInvalidSitekeyError")
RecaptchaInvalidDomainError = _subclass("RecaptchaInvalidDomainError")
RecaptchaTimeoutError = _subclass("RecaptchaTimeoutError")
IpBlockedError = _subclass("IpBlockedError")
ProxyConnectRefusedError = _subclass("ProxyConnectRefusedError")
ProxyBannedError = _subclass("ProxyBannedError")
ProxyMissingError = _subclass("ProxyMissingError")
ProxyNotAuthorisedError = _subclass("ProxyNotAuthorisedError")
ProxyReadTimeoutError = _subclass("ProxyReadTimeoutError")
TaskNotSupportedError = _subclass("TaskNotSupportedError")
TaskAbsentError = _subclass("TaskAbsentError")
WrongUserAgentError = _subclass("WrongUserAgentError")
ServiceNotAvailableError = _subclass("ServiceNotAvailableError")
InvalidTaskError = _subclass("InvalidTaskError")
TimeoutError = _subclass("TimeoutError")
AbortedError = _subclass("AbortedError")
MissingClientKeyError = _subclass("MissingClientKeyError")
EmptyUserAgentError = _subclass("EmptyUserAgentError")

CAPMONSTER_ERROR_CLASSES: dict[str, type[CapMonsterError]] = {
    "ERROR_KEY_DOES_NOT_EXIST": KeyDoesNotExistError,
    "ERROR_PROXY_CREDENTIALS_INVALID_CHARACTER": ProxyCredentialsInvalidCharacterError,
    "ERROR_ZERO_BALANCE": ZeroBalanceError,
    "ERROR_TOO_BIG_CAPTCHA_FILESIZE": TooBigCaptchaFileSizeError,
    "ERROR_ZERO_CAPTCHA_FILESIZE": ZeroCaptchaFileSizeError,
    "ERROR_NO_SUCH_CAPCHA_ID": NoSuchCaptchaIdError,
    "WRONG_CAPTCHA_ID": WrongCaptchaIdError,
    "ERROR_CAPTCHA_UNSOLVABLE": CaptchaUnsolvableError,
    "CAPTCHA_NOT_READY": CaptchaNotReadyError,
    "ERROR_IP_NOT_ALLOWED": IpNotAllowedError,
    "ERROR_IP_BANNED": IpBannedError,
    "ERROR_NO_SUCH_METHOD": NoSuchMethodError,
    "ERROR_TOO_MUCH_REQUESTS": TooMuchRequestsError,
    "ERROR_DOMAIN_NOT_ALLOWED": DomainNotAllowedError,
    "ERROR_TOKEN_EXPIRED": TokenExpiredError,
    "ERROR_RECAPTCHA_INVALID_SITEKEY": RecaptchaInvalidSitekeyError,
    "ERROR_RECAPTCHA_INVALID_DOMAIN": RecaptchaInvalidDomainError,
    "ERROR_RECAPTCHA_TIMEOUT": RecaptchaTimeoutError,
    "ERROR_IP_BLOCKED": IpBlockedError,
    "ERROR_PROXY_CONNECT_REFUSED": ProxyConnectRefusedError,
    "ERROR_PROXY_BANNED": ProxyBannedError,
    "ERROR_PROXY_MISSING": ProxyMissingError,
    "ERROR_PROXY_NOT_AUTHORISED": ProxyNotAuthorisedError,
    "ERROR_PROXY_READ_TIMEOUT": ProxyReadTimeoutError,
    "ERROR_TASK_NOT_SUPPORTED": TaskNotSupportedError,
    "ERROR_TASK_ABSENT": TaskAbsentError,
    "ERROR_WRONG_USERAGENT": WrongUserAgentError,
    "ERROR_SERVICE_NOT_AVAILABLE": ServiceNotAvailableError,
    "ERROR_INVALID_TASK": InvalidTaskError,
    "TIMEOUT": TimeoutError,
    "ABORTED": AbortedError,
    "MISSING_CLIENT_KEY": MissingClientKeyError,
    "EMPTY_USER_AGENT": EmptyUserAgentError,
}


def create_error(
    message: str,
    error_id: int = 0,
    error_code: str | None = None,
    status_code: int = 0,
    response: Any = None,
) -> CapMonsterError:
    """Build a code-specific CapMonsterError subclass, or the base class."""
    cls = CAPMONSTER_ERROR_CLASSES.get(error_code or "", CapMonsterError)
    return cls(message, error_id, error_code, status_code, response)


def is_retryable(err: BaseException) -> bool:
    """True when another attempt may succeed without changing the request."""
    if not isinstance(err, CapMonsterError):
        return False
    if err.error_code in RETRYABLE_ERROR_CODES:
        return True
    if not err.error_code and err.status_code in RETRYABLE_HTTP_STATUSES:
        return True
    if not err.error_code and err.status_code == 0 and err.error_id == 0:
        return True
    return False
