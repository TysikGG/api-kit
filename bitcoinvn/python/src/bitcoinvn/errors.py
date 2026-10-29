"""Errors returned by the BitcoinVN API and transport failures."""

from __future__ import annotations

from typing import Any


class BitcoinVnError(Exception):
    """HTTP error envelope from BitcoinVN, or a transport failure.

    Responses with status 4xx or 5xx use ``error.message`` and ``error.code``.
    ``code`` equals the HTTP status. ``retry_after``, ``limit``, and
    ``remaining`` come from the ``X-RateLimit-*`` headers when they are present.
    A transport failure uses ``status`` 0 and ``code`` 0.

    Subclasses identify the common status codes. ``except BitcoinVnError``
    still matches every subclass.

    Examples:
        try:
            client.get_ticker("BTC", "USDT")
        except BitcoinVnError as error:
            if error.code == 404:
                pass
    """

    def __init__(
        self,
        message: str,
        *,
        status: int,
        code: int,
        raw: Any = None,
        details: Any = None,
        retry_after: int | None = None,
        limit: int | None = None,
        remaining: int | None = None,
    ) -> None:
        """Create an error.

        Args:
            message: Text from ``error.message``, or a transport message.
            status: HTTP status, or 0 when the request was not sent.
            code: API ``error.code``, or ``status`` when the body has no envelope.
            raw: Original response body.
            details: ``error.details`` when the API sent validation details.
            retry_after: Seconds from ``X-RateLimit-Retry-After``.
            limit: Requests allowed in the current window.
            remaining: Requests left in the current window.

        Examples:
            raise BitcoinVnError("Pair does not exist.", status=404, code=404)
        """
        super().__init__(message)
        self.status = status
        self.code = code
        self.raw = message if raw is None else raw
        self.details = details
        self.retry_after = retry_after
        self.limit = limit
        self.remaining = remaining


class BitcoinVnTransportError(BitcoinVnError):
    """The request did not receive an HTTP response. ``status`` and ``code`` are 0."""


class BitcoinVnTimeoutError(BitcoinVnError):
    """``wait_for_order`` reached its deadline before a requested status."""

    def __init__(self, message: str, *, order: Any = None) -> None:
        super().__init__(message, status=0, code=0, raw=order)
        self.order = order


class BitcoinVnBadRequestError(BitcoinVnError):
    """HTTP 400. The body, query, or payout details were rejected."""


class BitcoinVnUnauthorizedError(BitcoinVnError):
    """HTTP 401. The key is missing, disabled, suspended, or outside its IP allowlist."""


class BitcoinVnForbiddenError(BitcoinVnError):
    """HTTP 403. The key is read-only, or it does not own the order."""


class BitcoinVnNotFoundError(BitcoinVnError):
    """HTTP 404. The order, asset, pair, or certificate was not found."""


class BitcoinVnConflictError(BitcoinVnError):
    """HTTP 409. The order state does not allow this action."""


class BitcoinVnUnprocessableEntityError(BitcoinVnError):
    """HTTP 422. The address or ENS name could not be resolved."""


class BitcoinVnRateLimitError(BitcoinVnError):
    """HTTP 429. The client IP exceeded the endpoint budget."""


class BitcoinVnMaintenanceError(BitcoinVnError):
    """HTTP 503. The API is in maintenance, or order guarantee issuance failed."""


class BitcoinVnServerError(BitcoinVnError):
    """Any other HTTP 5xx response."""


_ERROR_TYPES: dict[int, type[BitcoinVnError]] = {
    400: BitcoinVnBadRequestError,
    401: BitcoinVnUnauthorizedError,
    403: BitcoinVnForbiddenError,
    404: BitcoinVnNotFoundError,
    409: BitcoinVnConflictError,
    422: BitcoinVnUnprocessableEntityError,
    429: BitcoinVnRateLimitError,
    503: BitcoinVnMaintenanceError,
}


def error_class_for_status(status: int) -> type[BitcoinVnError]:
    """Return the error class for an HTTP status."""
    mapped = _ERROR_TYPES.get(status)
    if mapped is not None:
        return mapped
    if status >= 500:
        return BitcoinVnServerError
    return BitcoinVnError
