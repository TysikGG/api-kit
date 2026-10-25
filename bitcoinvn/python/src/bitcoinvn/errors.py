"""Errors returned by the BitcoinVN API and transport failures."""

from __future__ import annotations

from typing import Any


class BitcoinVnError(Exception):
    """HTTP error envelope from BitcoinVN, or a transport failure.

    Responses with status 4xx or 5xx use ``error.message`` and ``error.code``.
    ``code`` equals the HTTP status. ``retry_after`` is set from the
    ``X-RateLimit-Retry-After`` header when it is present. A transport failure
    uses ``status`` 0 and ``code`` 0.

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
    ) -> None:
        """Create an error.

        Args:
            message: Text from ``error.message``, or a transport message.
            status: HTTP status, or 0 when the request was not sent.
            code: API ``error.code``, or ``status`` when the body has no envelope.
            raw: Original response body.
            details: ``error.details`` when the API sent validation details.
            retry_after: Seconds from ``X-RateLimit-Retry-After``.

        Examples:
            raise BitcoinVnError("Pair does not exist.", status=404, code=404)
        """
        super().__init__(message)
        self.status = status
        self.code = code
        self.raw = message if raw is None else raw
        self.details = details
        self.retry_after = retry_after
