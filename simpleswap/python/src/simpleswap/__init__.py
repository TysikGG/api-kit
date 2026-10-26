"""SimpleSwap cryptocurrency exchange client (API v3)."""

from .client import SimpleSwap
from .errors import SimpleSwapError
from .types import (
    CheckExchangeResult,
    EstimateResult,
    ExchangeOrder,
    RangesResult,
    SimpleSwapCurrency,
)

__all__ = [
    "CheckExchangeResult",
    "EstimateResult",
    "ExchangeOrder",
    "RangesResult",
    "SimpleSwap",
    "SimpleSwapCurrency",
    "SimpleSwapError",
]
