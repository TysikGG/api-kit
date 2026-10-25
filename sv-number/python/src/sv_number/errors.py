"""Error types for the SV Number API client."""

from __future__ import annotations

from typing import Any

KNOWN_ERROR_CODES = {
    "BAD_KEY",
    "BAD_ACTION",
    "BAD_SERVICE",
    "BAD_STATUS",
    "NO_NUMBERS",
    "NO_BALANCE",
    "WRONG_ACTIVATION_ID",
    "STATUS_CANCEL",
    "ERROR_SQL",
}


class SvNumberError(Exception):
    """Exception raised for SV Number API errors.

    Args:
        code: Error code string (e.g. `BAD_KEY`, `NO_NUMBERS`).
        raw: Raw response body, if available.
    """

    def __init__(self, code: str, raw: Any = None) -> None:
        super().__init__(raw if isinstance(raw, str) and raw.strip() else code)
        self.code = code
        self.raw = raw

    def __repr__(self) -> str:
        return f"SvNumberError(code={self.code!r}, raw={self.raw!r})"


def assert_not_api_error(data: Any) -> None:
    """Check text data for known error codes."""
    if not isinstance(data, str):
        return

    text = data.strip()
    if not text:
        raise SvNumberError("EMPTY_RESPONSE", data)

    code = text.split(":", 1)[0].strip() if ":" in text else text
    if text.startswith("ACCESS_") or text.startswith("STATUS_"):
        return

    if text in KNOWN_ERROR_CODES or code in KNOWN_ERROR_CODES:
        raise SvNumberError(text if text in KNOWN_ERROR_CODES else code, text)
