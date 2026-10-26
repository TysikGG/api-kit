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
    confirmationsFrom: str
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
