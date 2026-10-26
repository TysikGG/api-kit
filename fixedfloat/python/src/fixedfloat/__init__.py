"""FixedFloat API v2 client library."""

from .client import DEFAULT_REFCODE, FixedFloat
from .errors import FixedFloatError
from .types import (
    Currency,
    EmergencyChoice,
    ExchangeDirection,
    Order,
    OrderSide,
    OrderTime,
    OrderTx,
    OrderType,
    PriceResult,
    PriceSide,
    QrResult,
)

__all__ = [
    "DEFAULT_REFCODE",
    "Currency",
    "EmergencyChoice",
    "ExchangeDirection",
    "FixedFloat",
    "FixedFloatError",
    "Order",
    "OrderSide",
    "OrderTime",
    "OrderTx",
    "OrderType",
    "PriceResult",
    "PriceSide",
    "QrResult",
]
