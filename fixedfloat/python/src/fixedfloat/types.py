"""Data models and type definitions for FixedFloat API."""

from dataclasses import dataclass
from typing import Any, Literal

OrderType = Literal["fixed", "float"]
ExchangeDirection = Literal["from", "to"]
EmergencyChoice = Literal["EXCHANGE", "REFUND"]


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


@dataclass
class PriceResult:
    """Calculated exchange price result."""

    from_side: PriceSide
    to_side: PriceSide
    errors: list[str] | None = None


@dataclass
class OrderTx:
    """Transaction details for an order deposit or payout."""

    id: str | None = None
    amount: str | None = None
    fee: str | None = None
    ccyfee: str | None = None
    time_reg: int | None = None
    confirmations: int | None = None


@dataclass
class OrderSide:
    """Deposit or receive side information in an order."""

    code: str
    network: str
    coin: str
    amount: str
    address: str | None = None
    extra_id: str | None = None
    tx: OrderTx | None = None


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


@dataclass
class QrResult:
    """QR code result for deposit address."""

    src: str
    raw: dict[str, Any] | None = None
