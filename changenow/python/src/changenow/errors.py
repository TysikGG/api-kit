from typing import Any


class ChangeNowError(Exception):
    """Exception raised when a ChangeNOW API operation fails.

    Specialized subclasses remain instances of ``ChangeNowError``.
    """

    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        code: str | None = None,
        response_body: Any = None,
        field: str | None = None,
        field_errors: dict[str, Any] | None = None,
        help: str | None = None,
        retry_after: float | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.response_body = response_body
        self.field = field
        self.field_errors = field_errors
        self.help = help
        self.retry_after = retry_after

    def __str__(self) -> str:
        if self.status_code is not None:
            return f"[{self.status_code}] {self.message}"
        return self.message


class ChangeNowNetworkError(ChangeNowError):
    """The request never received an HTTP response."""


class ChangeNowValidationError(ChangeNowError):
    """HTTP 400, or a version-3 code that means the request has to change."""


class ChangeNowAmountError(ChangeNowValidationError):
    """``AMOUNT_OUT_OF_RANGE``."""


class ChangeNowAddressError(ChangeNowValidationError):
    """``INVALID_ADDRESS``."""


class ChangeNowAssetError(ChangeNowValidationError):
    """``UNKNOWN_ASSET``, ``UNKNOWN_NETWORK``, or ``AMBIGUOUS_ASSET``."""


class ChangeNowPairError(ChangeNowValidationError):
    """``PAIR_NOT_AVAILABLE``."""


class ChangeNowRateError(ChangeNowValidationError):
    """``RATE_UNAVAILABLE``, including an expired rate id."""


class ChangeNowAuthError(ChangeNowError):
    """HTTP 401 or ``AUTHENTICATION_REQUIRED``."""


class ChangeNowForbiddenError(ChangeNowError):
    """HTTP 403 or ``NOT_ALLOWED``."""


class ChangeNowNotFoundError(ChangeNowError):
    """HTTP 404 or ``NOT_FOUND``."""


class ChangeNowRateLimitError(ChangeNowError):
    """HTTP 429 or ``RATE_LIMITED``."""


class ChangeNowServerError(ChangeNowError):
    """HTTP 5xx, ``UPSTREAM_UNAVAILABLE``, or ``INTERNAL_ERROR``."""


class ChangeNowTimeoutError(ChangeNowError):
    """A wait helper exceeded its timeout."""


_CODE_CLASS: dict[str, type[ChangeNowError]] = {
    "MISSING_PARAMETER": ChangeNowValidationError,
    "INVALID_PARAMETER": ChangeNowValidationError,
    "UNKNOWN_PARAMETER": ChangeNowValidationError,
    "METHOD_NOT_ALLOWED": ChangeNowValidationError,
    "UNSUPPORTED_MEDIA_TYPE": ChangeNowValidationError,
    "AMOUNT_OUT_OF_RANGE": ChangeNowAmountError,
    "INVALID_ADDRESS": ChangeNowAddressError,
    "UNKNOWN_ASSET": ChangeNowAssetError,
    "UNKNOWN_NETWORK": ChangeNowAssetError,
    "AMBIGUOUS_ASSET": ChangeNowAssetError,
    "PAIR_NOT_AVAILABLE": ChangeNowPairError,
    "RATE_UNAVAILABLE": ChangeNowRateError,
    "AUTHENTICATION_REQUIRED": ChangeNowAuthError,
    "NOT_ALLOWED": ChangeNowForbiddenError,
    "NOT_FOUND": ChangeNowNotFoundError,
    "RATE_LIMITED": ChangeNowRateLimitError,
    "UPSTREAM_UNAVAILABLE": ChangeNowServerError,
    "INTERNAL_ERROR": ChangeNowServerError,
}

CHANGENOW_ERROR_CODES = tuple(_CODE_CLASS)


def create_error(
    message: str,
    status_code: int | None = None,
    code: str | None = None,
    response_body: Any = None,
    field: str | None = None,
    field_errors: dict[str, Any] | None = None,
    help: str | None = None,
    retry_after: float | None = None,
) -> ChangeNowError:
    """Build the subclass that matches ``code`` or the HTTP status."""
    cls: type[ChangeNowError] = ChangeNowError
    if code in _CODE_CLASS:
        cls = _CODE_CLASS[code]
    elif status_code in (400, 422):
        cls = ChangeNowValidationError
    elif status_code == 401:
        cls = ChangeNowAuthError
    elif status_code == 403:
        cls = ChangeNowForbiddenError
    elif status_code == 404:
        cls = ChangeNowNotFoundError
    elif status_code == 429:
        cls = ChangeNowRateLimitError
    elif status_code is not None and status_code >= 500:
        cls = ChangeNowServerError
    return cls(
        message,
        status_code=status_code,
        code=code,
        response_body=response_body,
        field=field,
        field_errors=field_errors,
        help=help,
        retry_after=retry_after,
    )
