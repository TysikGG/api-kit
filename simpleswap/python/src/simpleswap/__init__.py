"""SimpleSwap cryptocurrency exchange client (API v3)."""

from .client import (
    DEFAULT_BASE_URL,
    DEFAULT_USER_AGENT,
    SIMPLESWAP_API_KEY_HEADER,
    AsyncSimpleSwap,
    SimpleSwap,
    exchange_public_id,
)
from .errors import (
    SimpleSwapAuthError,
    SimpleSwapBadRequestError,
    SimpleSwapError,
    SimpleSwapForbiddenError,
    SimpleSwapNetworkError,
    SimpleSwapNotFoundError,
    SimpleSwapRateLimitError,
    SimpleSwapServerError,
    SimpleSwapTimeoutError,
    SimpleSwapValidationError,
)
from .types import (
    TERMINAL_EXCHANGE_STATUSES,
    CheckExchangeResult,
    EstimateResult,
    ExchangeOrder,
    ExchangeStatus,
    MarketRate,
    RangesResult,
    SimpleSwapCurrency,
)

__all__ = [
    "DEFAULT_BASE_URL",
    "DEFAULT_USER_AGENT",
    "SIMPLESWAP_API_KEY_HEADER",
    "TERMINAL_EXCHANGE_STATUSES",
    "AsyncSimpleSwap",
    "CheckExchangeResult",
    "EstimateResult",
    "ExchangeOrder",
    "ExchangeStatus",
    "MarketRate",
    "RangesResult",
    "SimpleSwap",
    "SimpleSwapAuthError",
    "SimpleSwapBadRequestError",
    "SimpleSwapCurrency",
    "SimpleSwapError",
    "SimpleSwapForbiddenError",
    "SimpleSwapNetworkError",
    "SimpleSwapNotFoundError",
    "SimpleSwapRateLimitError",
    "SimpleSwapServerError",
    "SimpleSwapTimeoutError",
    "SimpleSwapValidationError",
    "exchange_public_id",
]
