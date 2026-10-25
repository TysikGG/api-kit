"""Type definitions for the SV Number API client."""

from __future__ import annotations

from typing import TypedDict


class OrderedNumber(TypedDict):
    """Details of an ordered virtual number."""

    activation_id: str
    phone_number: str


class ActivationStatus(TypedDict, total=False):
    """Status of an activation."""

    status: str
    code: str


class ServiceCostItem(TypedDict):
    """Service pricing and availability item."""

    id: str
    name: str
    price: float
    quantity: int
