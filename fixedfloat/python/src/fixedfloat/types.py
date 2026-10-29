"""Data models and type definitions for FixedFloat API."""

from dataclasses import dataclass, field
from typing import Any, Literal

from .parse import order_status_text

OrderType = Literal["fixed", "float"]
ExchangeDirection = Literal["from", "to"]
EmergencyChoice = Literal["EXCHANGE", "REFUND"]
OrderStatus = Literal["NEW", "PENDING", "EXCHANGE", "WITHDRAW", "DONE", "EXPIRED", "EMERGENCY"]
PriceErrorCode = Literal[
    "MAINTENANCE_FROM",
    "MAINTENANCE_TO",
    "OFFLINE_FROM",
    "OFFLINE_TO",
    "RESERVE_FROM",
    "RESERVE_TO",
    "LIMIT_MIN",
    "LIMIT_MAX",
]


@dataclass
class Currency:
    """Represents a cryptocurrency supported by FixedFloat."""

    code: str
    coin: str
    network: str
    name: str
    recv: int
    send: int
    tag: str | None = None
    logo: str = ""
    color: str = ""
    priority: int = 0
    contract: str | None = None


@dataclass
class PriceSide:
    """Details of one side (from or to) in a price quote."""

    code: str
    network: str
    coin: str
    amount: str
    rate: str
    min: str
    max: str
    precision: int | None = None
    usd: str | None = None
    btc: str | None = None


@dataclass
class PriceCurrency:
    """Send/receive availability included when a quote is requested with ``ccies=True``."""

    code: str
    recv: bool
    send: bool


@dataclass
class PriceResult:
    """Calculated exchange price result."""

    from_side: PriceSide
    to_side: PriceSide
    errors: list[str] | None = None
    ccies: list[PriceCurrency] | None = None

    @property
    def exchangeable(self) -> bool:
        """True when FixedFloat did not attach quote errors."""
        return not self.errors


@dataclass
class OrderTx:
    """Transaction details for an order deposit or payout."""

    id: str | None = None
    amount: str | None = None
    fee: str | None = None
    ccyfee: str | None = None
    time_reg: int | None = None
    time_block: int | None = None
    confirmations: int | None = None


@dataclass
class OrderSide:
    """Deposit, receive, or refund side information in an order."""

    code: str
    network: str
    coin: str
    amount: str
    address: str | None = None
    extra_id: str | None = None
    tx: OrderTx | None = None
    name: str | None = None
    alias: str | None = None
    tag: str | None = None
    address_mix: str | None = None
    req_confirmations: int | None = None
    max_confirmations: int | None = None


@dataclass
class OrderTime:
    """Timestamps associated with an order."""

    reg: int
    start: int | None = None
    finish: int | None = None
    update: int | None = None
    expiration: int | None = None
    left: int | None = None


@dataclass
class OrderEmergency:
    """Emergency block attached to an order."""

    status: list[str] = field(default_factory=list)
    choice: str | None = None
    repeat: bool | None = None


@dataclass
class Order:
    """Exchange order details."""

    id: str
    type: str
    status: str
    time: OrderTime
    from_side: OrderSide
    to_side: OrderSide
    token: str
    email: str | None = None
    back: OrderSide | None = None
    emergency: OrderEmergency | None = None

    @property
    def status_text(self) -> str:
        """Human-readable label for :attr:`status`."""
        return order_status_text(self.status)


@dataclass
class QrCode:
    """One QR image returned by ``POST /qr``."""

    title: str
    src: str
    checked: bool = False


@dataclass
class QrResult:
    """QR code result for a deposit address.

    ``src`` is the default (checked) image, or the first image, so existing callers
    that read ``result.src`` keep working. ``codes`` is the full list from the API.
    """

    src: str
    raw: Any | None = None
    title: str | None = None
    checked: bool | None = None
    codes: list[QrCode] = field(default_factory=list)


@dataclass
class RateItem:
    """One currency pair from the public XML rates export."""

    from_ccy: str
    to_ccy: str
    in_amount: str
    out_amount: str
    amount: str
    to_fee: str
    min_amount: str
    max_amount: str
