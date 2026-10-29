"""Python client for the BitcoinVN exchange API.

The production base URL is https://bitcoinvn.io. Official OpenAPI:
https://bitcoinvn.io/api/doc.json

Public reads do not need a key. Account calls send ``X-API-KEY`` when
``api_key`` is set. Order creation always includes the JSON field ``referrer``.

Examples:
    from bitcoinvn import BitcoinVn

    client = BitcoinVn()
    ticker = client.get_ticker("BTC", "USDT")
"""

from bitcoinvn.client import (
    DEFAULT_WAIT_STATUSES,
    LEDGER_PAGE_SIZE,
    ORDER_STATUSES,
    ORDERS_PAGE_SIZE,
    REFERRER,
    AsyncBitcoinVn,
    BitcoinVn,
)
from bitcoinvn.errors import (
    BitcoinVnBadRequestError,
    BitcoinVnConflictError,
    BitcoinVnError,
    BitcoinVnForbiddenError,
    BitcoinVnMaintenanceError,
    BitcoinVnNotFoundError,
    BitcoinVnRateLimitError,
    BitcoinVnServerError,
    BitcoinVnTimeoutError,
    BitcoinVnTransportError,
    BitcoinVnUnauthorizedError,
    BitcoinVnUnprocessableEntityError,
)
from bitcoinvn.types import (
    AddressValidation,
    Asset,
    Balances,
    BooleanConfiguration,
    EnsResolution,
    HealthStatus,
    Info,
    LedgerItem,
    Order,
    OrderStatus,
    Pair,
    Quote,
    Ticker,
    TransferMethod,
    Vault,
)
from bitcoinvn.webhook import read_webhook, verify_webhook_signature, webhook_signature

__all__ = [
    "DEFAULT_WAIT_STATUSES",
    "LEDGER_PAGE_SIZE",
    "ORDER_STATUSES",
    "ORDERS_PAGE_SIZE",
    "REFERRER",
    "AddressValidation",
    "Asset",
    "AsyncBitcoinVn",
    "Balances",
    "BitcoinVn",
    "BitcoinVnBadRequestError",
    "BitcoinVnConflictError",
    "BitcoinVnError",
    "BitcoinVnForbiddenError",
    "BitcoinVnMaintenanceError",
    "BitcoinVnNotFoundError",
    "BitcoinVnRateLimitError",
    "BitcoinVnServerError",
    "BitcoinVnTimeoutError",
    "BitcoinVnTransportError",
    "BitcoinVnUnauthorizedError",
    "BitcoinVnUnprocessableEntityError",
    "BooleanConfiguration",
    "EnsResolution",
    "HealthStatus",
    "Info",
    "LedgerItem",
    "Order",
    "OrderStatus",
    "Pair",
    "Quote",
    "Ticker",
    "TransferMethod",
    "Vault",
    "read_webhook",
    "verify_webhook_signature",
    "webhook_signature",
]

__version__ = "0.1.0"
