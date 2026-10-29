"""Webhook signature checks for BitcoinVN order deliveries."""

from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

from bitcoinvn.errors import BitcoinVnError, BitcoinVnUnauthorizedError


def webhook_signature(raw_body: bytes | str, api_key: str) -> str:
    """Lowercase hex HMAC-SHA256 of the exact webhook body.

    BitcoinVN signs account-order deliveries with the API key. Guest orders are unsigned.

    Examples:
        signature = webhook_signature(raw, api_key)
    """
    body = raw_body.encode("utf-8") if isinstance(raw_body, str) else raw_body
    return hmac.new(api_key.encode("utf-8"), body, hashlib.sha256).hexdigest()


def verify_webhook_signature(
    raw_body: bytes | str,
    signature: str | None,
    api_key: str,
) -> bool:
    """Return whether ``X-Signature`` matches the raw body.

    Returns ``False`` when the signature or key is missing, the length differs,
    or the digest differs. The comparison is case-insensitive and does not raise.

    Examples:
        ok = verify_webhook_signature(raw, header, api_key)
    """
    if not signature or not api_key:
        return False
    expected = webhook_signature(raw_body, api_key)
    candidate = signature.strip().lower()
    if len(candidate) != len(expected):
        return False
    return hmac.compare_digest(expected, candidate)


def read_webhook(
    raw_body: bytes | str,
    signature: str | None = None,
    api_key: str | None = None,
    *,
    require_signature: bool = False,
) -> tuple[dict[str, Any], bool]:
    """Parse a webhook body into an order mapping and a verified flag.

    Set ``require_signature`` when the order was created with an API key.
    Guest deliveries have no signature; confirm them with ``get_order`` before
    crediting a payment.

    Examples:
        order, verified = read_webhook(raw, signature, api_key, require_signature=True)
    """
    text = raw_body.decode("utf-8") if isinstance(raw_body, bytes) else raw_body
    verified = verify_webhook_signature(text, signature, api_key) if api_key else False
    if require_signature and not verified:
        raise BitcoinVnUnauthorizedError(
            "Webhook signature did not match",
            status=401,
            code=401,
            raw=text,
        )
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise BitcoinVnError(
            "Webhook body was not JSON",
            status=0,
            code=0,
            raw=text,
            details=str(exc),
        ) from exc
    if not isinstance(payload, dict):
        raise BitcoinVnError(
            "Webhook body was not an order object",
            status=0,
            code=0,
            raw=payload,
        )
    return payload, verified
