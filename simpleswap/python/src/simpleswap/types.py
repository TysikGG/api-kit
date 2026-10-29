from typing_extensions import TypedDict


class SimpleSwapCurrency(TypedDict, total=False):
    ticker: str
    network: str
    name: str
    image: str
    precision: int
    contractAddress: str | None
    enabled: bool
    isFiat: bool
    isAvailableFixed: bool
    isAvailableFloat: bool
    hasExtraId: bool
    extraId: str
    validationAddress: str | None
    validationExtra: str | None
    addressExplorer: str
    txExplorer: str
    confirmationsFrom: str | int
    legacySymbol: str
    warningsFrom: list[str]
    warningsTo: list[str]


class EstimateResult(TypedDict, total=False):
    estimatedAmount: str
    rateId: str | None
    validUntil: str | None


class RangesResult(TypedDict, total=False):
    min: str | None
    max: str | None


class CheckExchangeResult(TypedDict, total=False):
    canCreate: bool


class ExchangeOrder(TypedDict, total=False):
    id: str
    publicId: str
    type: str
    status: str
    tickerFrom: str
    tickerTo: str
    networkFrom: str
    networkTo: str
    amountFrom: str
    amountTo: str
    addressFrom: str
    addressTo: str
    extraIdFrom: str | None
    extraIdTo: str | None
    userRefundAddress: str
    userRefundExtraId: str
    txFrom: str | None
    txTo: str | None
    createdAt: str
    updatedAt: str
    validUntil: str | None


class MarketRate(TypedDict, total=False):
    tickerFrom: str
    networkFrom: str
    tickerTo: str
    networkTo: str
    min: str | None
    max: str | None
    rate: str
    minerFee: str
    reserve: str
    untilTime: str
    rateId: str


class ExchangeStatus:
    """Known exchange status strings. The API may return additional values."""

    WAITING = "waiting"
    CONFIRMING = "confirming"
    EXCHANGING = "exchanging"
    SENDING = "sending"
    FINISHED = "finished"
    FAILED = "failed"
    REFUNDED = "refunded"
    EXPIRED = "expired"
    VERIFYING = "verifying"


TERMINAL_EXCHANGE_STATUSES: frozenset[str] = frozenset(
    {
        ExchangeStatus.FINISHED,
        ExchangeStatus.FAILED,
        ExchangeStatus.REFUNDED,
        ExchangeStatus.EXPIRED,
    }
)
