"""API and client errors for Grizzly SMS."""

from __future__ import annotations

import re
from typing import Any

_KNOWN_ERROR_CODES = frozenset(
    {
        "BAD_KEY",
        "BAD_ACTION",
        "BAD_SERVICE",
        "BAD_STATUS",
        "BAD_COUNTRY",
        "NO_BALANCE",
        "NO_NUMBERS",
        "NO_ACTIVATION",
        "NO_KEY",
        "ERROR_SQL",
        "SQL_ERROR",
        "SERVICE_UNAVAILABLE_REGION",
        "WRONG_MAX_PRICE",
        "USERS_IP_IS_NOT_ALLOWED",
        "INVALID_TIME",
        "NO_ID_RENT",
        "RENT_DIE",
        "SERVER_ERROR",
        "CANT_CANCEL",
        "ALREADY_FINISH",
        "ALREADY_CANCEL",
        "INCORECT_STATUS",
        "INCORRECT_STATUS",
        "INVALID_PHONE",
        "OPERATORS_NOT_FOUND",
        "OUT_OF_STOCK",
        "ORDER_ALREADY_EXISTS",
    }
)

RETRYABLE_API_CODES = frozenset({"ERROR_SQL", "SQL_ERROR", "SERVER_ERROR"})
RETRYABLE_HTTP_STATUSES = frozenset({408, 429, 500, 502, 503, 504})
MUTATING_ACTIONS = frozenset(
    {
        "getNumber",
        "getNumberV2",
        "setStatus",
        "getRentNumber",
        "continueRentNumber",
        "setRentStatus",
    }
)


class GrizzlySmsError(Exception):
    """Error for an API status string, an HTTP failure, or a client-side check.

    Known API codes also have subclasses. ``isinstance(error, GrizzlySmsError)``
    matches every subclass.

    Examples:
        try:
            sms.get_number("tg")
        except NoNumbersError:
            pass
    """

    def __init__(self, code: str, raw: Any = None) -> None:
        """Create an error.

        Args:
            code: Stable code such as ``NO_NUMBERS`` or ``BAD_KEY``.
            raw: Original response body. A non-empty string becomes the message.

        Examples:
            raise GrizzlySmsError("NO_NUMBERS", "NO_NUMBERS")
        """
        if raw is None:
            raw = code
        if isinstance(raw, str) and raw.strip():
            message = raw.strip()
        else:
            message = code
        super().__init__(message)
        self.code = code
        self.raw = raw


class BadKeyError(GrizzlySmsError):
    """``BAD_KEY``."""


class BadActionError(GrizzlySmsError):
    """``BAD_ACTION``."""


class BadServiceError(GrizzlySmsError):
    """``BAD_SERVICE``."""


class BadStatusError(GrizzlySmsError):
    """``BAD_STATUS``."""


class BadCountryError(GrizzlySmsError):
    """``BAD_COUNTRY``."""


class NoBalanceError(GrizzlySmsError):
    """``NO_BALANCE``."""


class NoNumbersError(GrizzlySmsError):
    """``NO_NUMBERS``."""


class NoActivationError(GrizzlySmsError):
    """``NO_ACTIVATION``."""


class NoKeyError(GrizzlySmsError):
    """``NO_KEY``."""


class ErrorSqlError(GrizzlySmsError):
    """``ERROR_SQL``."""


class SqlErrorError(GrizzlySmsError):
    """``SQL_ERROR``."""


class ServiceUnavailableRegionError(GrizzlySmsError):
    """``SERVICE_UNAVAILABLE_REGION``."""


class WrongMaxPriceError(GrizzlySmsError):
    """``WRONG_MAX_PRICE``."""


class UsersIpNotAllowedError(GrizzlySmsError):
    """``USERS_IP_IS_NOT_ALLOWED``."""


class ServiceProhibitedError(GrizzlySmsError):
    """A service the administration has blocked."""


class EmptyResponseError(GrizzlySmsError):
    """The API returned an empty body."""


class NetworkError(GrizzlySmsError):
    """The request did not receive an HTTP response."""


class GrizzlyTimeoutError(GrizzlySmsError):
    """``wait_for_code`` exceeded ``timeout_ms``. ``code`` is ``TIMEOUT``."""


class AbortedError(GrizzlySmsError):
    """The wait was aborted."""


class UnexpectedResponseError(GrizzlySmsError):
    """The body was not in a documented shape."""


class InvalidTimeError(GrizzlySmsError):
    """``INVALID_TIME``."""


class NoIdRentError(GrizzlySmsError):
    """``NO_ID_RENT``."""


class RentDieError(GrizzlySmsError):
    """``RENT_DIE``."""


class ServerError(GrizzlySmsError):
    """``SERVER_ERROR``."""


class CantCancelError(GrizzlySmsError):
    """``CANT_CANCEL``."""


class AlreadyFinishError(GrizzlySmsError):
    """``ALREADY_FINISH``."""


class AlreadyCancelError(GrizzlySmsError):
    """``ALREADY_CANCEL``."""


class IncorrectStatusError(GrizzlySmsError):
    """``INCORECT_STATUS`` or ``INCORRECT_STATUS``."""


class InvalidPhoneError(GrizzlySmsError):
    """``INVALID_PHONE``."""


class OperatorsNotFoundError(GrizzlySmsError):
    """``OPERATORS_NOT_FOUND``."""


class OutOfStockError(GrizzlySmsError):
    """``OUT_OF_STOCK``."""


class OrderAlreadyExistsError(GrizzlySmsError):
    """``ORDER_ALREADY_EXISTS``."""


class HttpStatusError(GrizzlySmsError):
    """HTTP status from the API host. ``code`` is ``HTTP_<status>``."""

    def __init__(self, status: int, raw: Any = None) -> None:
        super().__init__(f"HTTP_{status}", raw)
        self.status = status


_ERROR_TYPES: dict[str, type[GrizzlySmsError]] = {
    "BAD_KEY": BadKeyError,
    "BAD_ACTION": BadActionError,
    "BAD_SERVICE": BadServiceError,
    "BAD_STATUS": BadStatusError,
    "BAD_COUNTRY": BadCountryError,
    "NO_BALANCE": NoBalanceError,
    "NO_NUMBERS": NoNumbersError,
    "NO_ACTIVATION": NoActivationError,
    "NO_KEY": NoKeyError,
    "ERROR_SQL": ErrorSqlError,
    "SQL_ERROR": SqlErrorError,
    "SERVICE_UNAVAILABLE_REGION": ServiceUnavailableRegionError,
    "WRONG_MAX_PRICE": WrongMaxPriceError,
    "USERS_IP_IS_NOT_ALLOWED": UsersIpNotAllowedError,
    "SERVICE_PROHIBITED": ServiceProhibitedError,
    "EMPTY_RESPONSE": EmptyResponseError,
    "NETWORK": NetworkError,
    "TIMEOUT": GrizzlyTimeoutError,
    "ABORTED": AbortedError,
    "UNEXPECTED_RESPONSE": UnexpectedResponseError,
    "INVALID_TIME": InvalidTimeError,
    "NO_ID_RENT": NoIdRentError,
    "RENT_DIE": RentDieError,
    "SERVER_ERROR": ServerError,
    "CANT_CANCEL": CantCancelError,
    "ALREADY_FINISH": AlreadyFinishError,
    "ALREADY_CANCEL": AlreadyCancelError,
    "INCORECT_STATUS": IncorrectStatusError,
    "INCORRECT_STATUS": IncorrectStatusError,
    "INVALID_PHONE": InvalidPhoneError,
    "OPERATORS_NOT_FOUND": OperatorsNotFoundError,
    "OUT_OF_STOCK": OutOfStockError,
    "ORDER_ALREADY_EXISTS": OrderAlreadyExistsError,
}


def error_from(code: str, raw: Any = None) -> GrizzlySmsError:
    """Build the subclass for a known code.

    Examples:
        error = error_from("NO_NUMBERS", "NO_NUMBERS")
    """
    kind = _ERROR_TYPES.get(code, GrizzlySmsError)
    return kind(code, raw)


def assert_not_api_error(data: Any) -> None:
    if isinstance(data, dict):
        status = data.get("status")
        error = data.get("error")
        if status == "error" and isinstance(error, str) and error.strip():
            text = error.strip()
            code = (text.split(":")[0] or text).strip()
            raised = code if code in _KNOWN_ERROR_CODES else text
            raise error_from(raised, data)
        return

    if not isinstance(data, str):
        return

    text = data.strip()
    if not text:
        raise EmptyResponseError("EMPTY_RESPONSE", data)

    if re.search(r"prohibited for sale", text, re.IGNORECASE):
        raise ServiceProhibitedError("SERVICE_PROHIBITED", text)

    code = (text.split(":")[0] or text).strip()
    if text.startswith("ACCESS_") or text.startswith("STATUS_"):
        return
    if text in _KNOWN_ERROR_CODES or code in _KNOWN_ERROR_CODES:
        raised = text if text in _KNOWN_ERROR_CODES else code
        raise error_from(raised, text)


def is_retryable_api_body(data: Any) -> bool:
    if isinstance(data, str):
        code = (data.strip().split(":")[0] or "").strip()
        return code in RETRYABLE_API_CODES
    if isinstance(data, dict):
        error = data.get("error")
        if isinstance(error, str):
            code = (error.strip().split(":")[0] or "").strip()
            return code in RETRYABLE_API_CODES
    return False
