from typing import TypedDict


class ChangeNowCurrency(TypedDict, total=False):
    ticker: str
    name: str
    image: str
    hasExternalId: bool
    isExtraIdSupported: bool
    isFiat: bool
    featured: bool
    isStable: bool
    supportsFixedRate: bool
    network: str
    tokenContract: str | None
    buy: bool
    sell: bool
    legacyTicker: str


class AvailablePair(TypedDict, total=False):
    fromCurrency: str
    fromNetwork: str
    toCurrency: str
    toNetwork: str
    flow: dict[str, bool]


class MinAmountResult(TypedDict, total=False):
    fromCurrency: str
    fromNetwork: str
    toCurrency: str
    toNetwork: str
    flow: str
    minAmount: float


class RangeResult(TypedDict, total=False):
    fromCurrency: str
    fromNetwork: str
    toCurrency: str
    toNetwork: str
    flow: str
    minAmount: float
    maxAmount: float | None


class EstimatedAmount(TypedDict, total=False):
    fromCurrency: str
    fromNetwork: str
    toCurrency: str
    toNetwork: str
    flow: str
    type: str
    rateId: str | None
    validUntil: str | None
    transactionSpeedForecast: str | None
    warningMessage: str | None
    depositFee: float
    withdrawalFee: float
    userId: str | int | None
    fromAmount: float
    toAmount: float


class CreatedExchange(TypedDict, total=False):
    id: str
    fromAmount: float | str
    toAmount: float | str
    flow: str
    type: str
    payinAddress: str
    payoutAddress: str
    payinExtraId: str | None
    payoutExtraId: str | None
    fromCurrency: str
    fromNetwork: str
    toCurrency: str
    toNetwork: str
    refundAddress: str | None
    refundExtraId: str | None
    payoutExtraIdName: str | None
    rateId: str | None
    validUntil: str | None


class ExchangeStatus(TypedDict, total=False):
    id: str
    status: str
    actionsAvailable: bool
    fromCurrency: str
    fromNetwork: str
    toCurrency: str
    toNetwork: str
    expectedAmountFrom: float | None
    expectedAmountTo: float | None
    amountFrom: float | None
    amountTo: float | None
    payinAddress: str
    payoutAddress: str
    payinExtraId: str | None
    payoutExtraId: str | None
    refundAddress: str | None
    refundExtraId: str | None
    createdAt: str
    updatedAt: str
    validUntil: str | None
    depositReceivedAt: str | None
    payinHash: str | None
    payoutHash: str | None
    fromLegacyTicker: str
    toLegacyTicker: str
    refundHash: str | None
    refundAmount: float | None
    userId: str | int | None
    payload: dict[str, str] | str | None


class AddressValidation(TypedDict, total=False):
    result: bool
    message: str | None
    isActivated: bool | None


class NamedAddress(TypedDict, total=False):
    currency: str
    chain: str
    address: str
    protocol: str


class UserAddressesResult(TypedDict, total=False):
    success: bool
    addresses: list[NamedAddress]
    message: str
    error: str


class NetworkFeeResult(TypedDict, total=False):
    estimatedFee: dict[str, object]


class MarketEstimate(TypedDict, total=False):
    fromCurrency: str
    toCurrency: str
    type: str
    fromAmount: float
    toAmount: float


class PartnerExchange(TypedDict, total=False):
    createdAt: str
    exchangeId: str | None
    requestId: str
    status: str
    flow: str
    partnerInfo: dict[str, object]
    payin: dict[str, object]
    payout: dict[str, object]


class ExchangesPage(TypedDict, total=False):
    count: int
    exchanges: list[PartnerExchange]


class ExchangeActions(TypedDict, total=False):
    error: str | None
    refund: dict[str, object]


class ContinueExchangeResult(TypedDict, total=False):
    result: bool | dict[str, object]


class RefundExchangeResult(TypedDict):
    result: bool


class PrivateTransferEstimate(TypedDict, total=False):
    currency: str
    network: str
    fromAmount: float | str
    toAmount: float | str
    rateId: str
    validUntil: str
    warningMessage: str | None


class CreatedPrivateTransfer(TypedDict, total=False):
    id: str
    currency: str
    network: str
    fromAmount: float | str
    toAmount: float | str
    payinAddress: str
    payoutAddress: str
    payinExtraId: str | None
    payoutExtraId: str | None
    refundAddress: str | None
    refundExtraId: str | None
