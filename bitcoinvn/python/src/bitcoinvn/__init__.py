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

from bitcoinvn.client import REFERRER, BitcoinVn
from bitcoinvn.errors import BitcoinVnError
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

__all__ = [
    "REFERRER",
    "AddressValidation",
    "Asset",
    "Balances",
    "BitcoinVn",
    "BitcoinVnError",
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
]

__version__ = "0.1.0"
