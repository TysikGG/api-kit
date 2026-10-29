"""Exchange-page links, status helpers, and webhook shape checks."""

from typing import Any
from urllib.parse import urlencode

from .errors import ChangeNowValidationError

EXCHANGE_STATUSES = (
    "new",
    "waiting",
    "confirming",
    "exchanging",
    "sending",
    "finished",
    "failed",
    "refunded",
    "verifying",
    "expired",
    "refunding",
    "rejected",
)

TERMINAL_EXCHANGE_STATUSES = ("finished", "failed", "refunded", "expired", "rejected")
_TERMINAL = set(TERMINAL_EXCHANGE_STATUSES)


def is_terminal_exchange_status(status: str | None) -> bool:
    """Return whether polling should stop for this status string."""
    return status in _TERMINAL


def split_asset_id(asset: str) -> dict[str, str]:
    """Split a catalogue id ``ticker.network``.

    A value with no dot is treated as a native asset whose network equals the ticker.
    """
    trimmed = asset.strip()
    dot = trimmed.find(".")
    if dot <= 0 or dot == len(trimmed) - 1:
        return {"currency": trimmed, "network": trimmed}
    return {"currency": trimmed[:dot], "network": trimmed[dot + 1 :]}


def build_exchange_link(
    from_ticker: str,
    to_ticker: str,
    *,
    amount: float | str | None = None,
    amount_to: float | str | None = None,
    fixed_rate: bool = False,
    fiat_mode: bool = False,
    recipient_address: str | None = None,
    recipient_extra_id: str | None = None,
    backup_address: str | None = None,
    utm_source: str | None = None,
    utm_medium: str | None = None,
    utm_campaign: str | None = None,
    utm_content: str | None = None,
    utm_term: str | None = None,
    lang: str | None = None,
) -> str:
    """Build a prefilled https://changenow.io/exchange link. The link creates no order.

    Only parameters the site documents are included. ``utm_source`` is omitted unless
    you set it. Partner API attribution stays the API key header, not this link.
    """
    if not from_ticker or not to_ticker:
        raise ChangeNowValidationError("build_exchange_link requires from and to tickers")
    prefix = f"/{lang}" if lang and lang != "en" else ""
    query: dict[str, str] = {"from": from_ticker, "to": to_ticker}
    if amount not in (None, ""):
        query["amount"] = str(amount)
    if amount_to not in (None, ""):
        query["amountTo"] = str(amount_to)
    if fixed_rate:
        query["fixedRate"] = "true"
    if fiat_mode:
        query["fiatMode"] = "true"
    if recipient_address:
        query["recipientAddress"] = recipient_address
    if recipient_extra_id:
        query["recipientExtraId"] = recipient_extra_id
    if backup_address:
        query["backupAddress"] = backup_address
    tracking = {
        "utm_source": utm_source,
        "utm_medium": utm_medium,
        "utm_campaign": utm_campaign,
        "utm_content": utm_content,
        "utm_term": utm_term,
    }
    for key, value in tracking.items():
        if value:
            query[key] = value
    return f"https://changenow.io{prefix}/exchange?{urlencode(query)}"


def parse_exchange_webhook(body: Any) -> dict[str, Any]:
    """Normalize a partner webhook body. The public payload is not signed."""
    if not isinstance(body, dict):
        raise ChangeNowValidationError("Exchange webhook body must be an object")
    exchange_id = body.get("id") or body.get("exchangeId") or body.get("requestId")
    if not isinstance(exchange_id, str) or not exchange_id:
        raise ChangeNowValidationError("Exchange webhook body is missing an exchange id")
    status = body.get("status")
    if status is not None and not isinstance(status, str):
        raise ChangeNowValidationError("Exchange webhook status must be a string")
    parsed = dict(body)
    parsed["id"] = exchange_id
    return parsed
