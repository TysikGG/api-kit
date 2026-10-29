"""Errors raised by the Give-SMS client."""

from __future__ import annotations

from typing import Any


class GiveSmsError(Exception):
    """Base error for transport failures and API responses.

    Attributes:
        code: Handler symbol (``NO_NUMBERS``) or native numeric status.
        response_data: Raw response body or handler detail after the colon.
        reason: Native ``reason`` field when the API sends one.
        message: Same text as ``str(exc)``.
    """

    def __init__(
        self,
        message: str,
        code: str | int | None = None,
        response_data: Any = None,
        reason: str | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.response_data = response_data
        self.reason = reason


class GiveSmsTimeoutError(GiveSmsError):
    """Polling deadline or HTTP timeout."""

    def __init__(self, message: str = "Timed out waiting for Give-SMS") -> None:
        super().__init__(message, code="TIMEOUT")


class GiveSmsAbortError(GiveSmsError):
    """Wait cancelled by the caller."""

    def __init__(self, message: str = "Operation aborted") -> None:
        super().__init__(message, code="ABORTED")


class NetworkError(GiveSmsError):
    """DNS, connection, or other transport failure."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="NETWORK")


class BadKeyError(GiveSmsError):
    """``BAD_KEY``."""


class NoKeyError(GiveSmsError):
    """``NO_KEY``."""


class ErrorSqlError(GiveSmsError):
    """``ERROR_SQL``."""


class BadActionError(GiveSmsError):
    """``BAD_ACTION``."""


class BadServiceError(GiveSmsError):
    """``BAD_SERVICE``."""


class NoActivationError(GiveSmsError):
    """``NO_ACTIVATION``."""


class BadStatusError(GiveSmsError):
    """``BAD_STATUS``."""


class NoBalanceError(GiveSmsError):
    """``NO_BALANCE``."""


class NoNumbersError(GiveSmsError):
    """``NO_NUMBERS``."""


class WrongServiceError(GiveSmsError):
    """``WRONG_SERVICE``."""


class BadCountryError(GiveSmsError):
    """``BAD_COUNTRY``."""


class TemporaryBannedError(GiveSmsError):
    """``YOU_TEMPORARY_BANNED``."""


class WrongMaxPriceError(GiveSmsError):
    """``WRONG_MAX_PRICE``. ``response_data`` is the minimum price when present."""


class TooManyActiveOrdersError(GiveSmsError):
    """``TOO_MANY_ACTIVE_ORDERS``."""


class TooManyAttemptsError(GiveSmsError):
    """``TOO_MANY_ATTEMPTS``."""


class NumberUnavailableError(GiveSmsError):
    """``NUMBER_UNAVAILABLE``."""


class AlreadyActiveError(GiveSmsError):
    """``ALREADY_ACTIVE``."""


class BadDurationError(GiveSmsError):
    """``BAD_DURATION``."""


class PriceChangedError(GiveSmsError):
    """``PRICE_CHANGED``."""


class ResendRequiredError(GiveSmsError):
    """Handler ``STATUS_WAIT_RESEND`` — resend the SMS, then set status ``6``."""


class ApiStatus400Error(GiveSmsError):
    """Native status 400. For ``getcode`` / ``wrongcode`` this is a wait, not an error."""


class ApiStatus401Error(GiveSmsError):
    """Status 401 — API key missing or invalid."""


class ApiStatus402Error(GiveSmsError):
    """Status 402 — rent country parameter is invalid."""


class ApiStatus404Error(GiveSmsError):
    """Status 404 — unknown method, or the rent country / order was not found."""


class ApiStatus500Error(GiveSmsError):
    """Status 500 — processing error, no numbers, or the order expired."""


class ApiStatus501Error(GiveSmsError):
    """Status 501 — ``wrongcode`` method parameter was rejected."""


class ApiStatus502Error(GiveSmsError):
    """Status 502 — unknown service, or a retryable internal error."""


class ApiStatus503Error(GiveSmsError):
    """Status 503 — unknown operator, or a rent server error."""


class ApiStatus504Error(GiveSmsError):
    """Status 504 — not enough balance, or a bad rent period type."""


class ApiStatus505Error(GiveSmsError):
    """Status 505 — unknown country, or the order was not found."""


class ApiStatus506Error(GiveSmsError):
    """Status 506 — missing ``order_id``, or a bad rent period."""


class ApiStatus507Error(GiveSmsError):
    """Status 507 — reactivation refused, the account is banned, or maintenance."""


class ApiStatus508Error(GiveSmsError):
    """Status 508 — reactivation ``duration`` is missing or invalid."""


class ApiStatus509Error(GiveSmsError):
    """Status 509 — too many active orders."""


HANDLER_ERROR_CLASSES: dict[str, type[GiveSmsError]] = {
    "BAD_KEY": BadKeyError,
    "NO_KEY": NoKeyError,
    "ERROR_SQL": ErrorSqlError,
    "BAD_ACTION": BadActionError,
    "BAD_SERVICE": BadServiceError,
    "NO_ACTIVATION": NoActivationError,
    "BAD_STATUS": BadStatusError,
    "NO_BALANCE": NoBalanceError,
    "NO_NUMBERS": NoNumbersError,
    "WRONG_SERVICE": WrongServiceError,
    "BAD_COUNTRY": BadCountryError,
    "YOU_TEMPORARY_BANNED": TemporaryBannedError,
    "WRONG_MAX_PRICE": WrongMaxPriceError,
    "TOO_MANY_ACTIVE_ORDERS": TooManyActiveOrdersError,
    "TOO_MANY_ATTEMPTS": TooManyAttemptsError,
    "NUMBER_UNAVAILABLE": NumberUnavailableError,
    "ALREADY_ACTIVE": AlreadyActiveError,
    "BAD_DURATION": BadDurationError,
    "PRICE_CHANGED": PriceChangedError,
}

API_STATUS_ERRORS: dict[int, type[GiveSmsError]] = {
    400: ApiStatus400Error,
    401: ApiStatus401Error,
    402: ApiStatus402Error,
    404: ApiStatus404Error,
    500: ApiStatus500Error,
    501: ApiStatus501Error,
    502: ApiStatus502Error,
    503: ApiStatus503Error,
    504: ApiStatus504Error,
    505: ApiStatus505Error,
    506: ApiStatus506Error,
    507: ApiStatus507Error,
    508: ApiStatus508Error,
    509: ApiStatus509Error,
}


def handler_error(text: str) -> GiveSmsError | None:
    """Return a handler error for ``text``, or ``None`` when it is a normal response."""
    for code in sorted(HANDLER_ERROR_CLASSES, key=len, reverse=True):
        if text == code or text.startswith(f"{code}:"):
            detail = text[len(code) + 1 :] if text.startswith(f"{code}:") else text
            cls = HANDLER_ERROR_CLASSES[code]
            return cls(f"API error: {text}", code=code, response_data=detail)
    return None


def api_status_error(
    status: int,
    message: str,
    response_data: Any = None,
    reason: str | None = None,
) -> GiveSmsError:
    cls = API_STATUS_ERRORS.get(status, GiveSmsError)
    return cls(message, code=status, response_data=response_data, reason=reason)
