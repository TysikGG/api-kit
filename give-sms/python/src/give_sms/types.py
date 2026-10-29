"""Response models for the Give-SMS client."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ApiEnvelope:
    """Parsed JSON envelope. Unwrapped payloads use status ``200`` and the body as ``data``."""

    status: int
    data: Any
    raw: Any = None


@dataclass
class ActivationNumber:
    """Ordered phone number.

    Attributes:
        id: Order id.
        number: Phone number without a leading ``+``.
        start_time: ISO start time from the native API, when present.
        phone: Same value as ``number`` when the API sent ``phone``.
        order_id: Native ``order_id`` when present.
    """

    id: str | int
    number: str
    start_time: str | None = None
    phone: str | None = None
    order_id: str | int | None = None


@dataclass
class CodeResult:
    """One ``getcode`` / ``wrongcode`` result.

    ``status`` is ``WAIT`` when the API returns status 400 (the SMS is not here yet).
    ``status`` is ``OK`` when an SMS payload arrived and the body has no status field.
    """

    status: str
    code: str | None = None
    extra: Any = None
    full_sms: str | None = None
    phone: str | None = None
    received_date: str | None = None
    sender: str | None = None
    sms_id: str | int | None = None
    phone_pass: str | None = None
    message: str | None = None
    advice: str | None = None


@dataclass
class HandlerStatusResult:
    """Handler ``getStatus`` result."""

    status: str
    code: str | None = None
    raw: str | None = None


@dataclass
class RentOrder:
    """Number rented for weeks or months."""

    order_id: str | int
    phone: str
    country_code: str | None = None
    end_time: str | None = None
    end_time_timestamp: int | None = None
    start_timestamp: int | None = None
    orders_count: int | None = None
    order_ids: list[Any] | None = None
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class RentSmsMessage:
    """One SMS delivered to a rented number."""

    date: str | None = None
    text: str | None = None
    timestamp: int | None = None
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class RentSmsList:
    """``getsms`` payload."""

    messages: list[RentSmsMessage]
    message: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class RentProlongResult:
    """``prolong`` payload."""

    message: str | None = None
    order_id: str | int | None = None
    days: int | None = None
    price: float | None = None
    rent_at: int | None = None
    rent_at_formatted: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)
