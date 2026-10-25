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
        "SERVICE_UNAVAILABLE_REGION",
        "WRONG_MAX_PRICE",
    }
)


class GrizzlySmsError(Exception):
    """Error for an API status string, an HTTP failure, or a client-side check.

    Examples:
        try:
            sms.get_number("tg")
        except GrizzlySmsError as error:
            if error.code == "NO_NUMBERS":
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


def assert_not_api_error(data: Any) -> None:
    if not isinstance(data, str):
        return

    text = data.strip()
    if not text:
        raise GrizzlySmsError("EMPTY_RESPONSE", data)

    if re.search(r"prohibited for sale", text, re.IGNORECASE):
        raise GrizzlySmsError("SERVICE_PROHIBITED", text)

    code = (text.split(":")[0] or text).strip()
    if text.startswith("ACCESS_") or text.startswith("STATUS_"):
        return
    if text in _KNOWN_ERROR_CODES or code in _KNOWN_ERROR_CODES:
        raised = text if text in _KNOWN_ERROR_CODES else code
        raise GrizzlySmsError(raised, text)
