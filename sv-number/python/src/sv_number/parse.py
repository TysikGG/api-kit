"""Response parsers for SV Number."""

from __future__ import annotations

from typing import Any

from .errors import SvNumberError
from .types import ActivationStatus, OrderedNumber


def parse_balance(raw: Any) -> float:
    """Parse balance from raw number or string."""
    if isinstance(raw, (int, float)):
        return float(raw)

    if isinstance(raw, str):
        text = raw.strip()
        if text.startswith("ACCESS_BALANCE:"):
            try:
                return float(text.split(":", 1)[1])
            except ValueError:
                pass
        try:
            return float(text)
        except ValueError:
            pass

    raise SvNumberError("UNEXPECTED_RESPONSE", raw)


def parse_access_number(raw: str) -> OrderedNumber:
    """Parse ACCESS_NUMBER response."""
    parts = str(raw).strip().split(":")
    if len(parts) < 3 or parts[0] != "ACCESS_NUMBER":
        raise SvNumberError("UNEXPECTED_RESPONSE", raw)

    return {
        "activation_id": parts[1],
        "phone_number": ":".join(parts[2:]),
    }


def parse_status(raw: str) -> ActivationStatus:
    """Parse STATUS_ response."""
    parts = str(raw).strip().split(":", 1)
    status = parts[0]
    if not status.startswith("STATUS_"):
        raise SvNumberError("UNEXPECTED_RESPONSE", raw)

    res: ActivationStatus = {"status": status}
    if len(parts) > 1:
        res["code"] = parts[1]
    return res
