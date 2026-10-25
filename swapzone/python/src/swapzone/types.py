from typing import Any

from typing_extensions import TypedDict


class SupportedCurrency(TypedDict, total=False):
    name: str
    ticker: str
    network: str
    defaultAmount: float
    smartContract: str | None
    alias: list[str]
    hasExternalId: bool


class RateOffer(TypedDict, total=False):
    adapter: str
    from_: str
    fromNetwork: str
    to: str
    toNetwork: str
    amountFrom: float
    amountTo: float
    amountFromUSD: float
    amountToUSD: float
    quotaId: str
    minAmount: float
    maxAmount: float
    time: int
    accuracyRate: float


class TransactionResult(TypedDict, total=False):
    id: str
    quotaId: str
    status: str
    addressReceive: str
    addressDeposit: str
    extraIdReceive: str
    amountDeposit: float
    amountEstimated: float
    createdAt: str
    refundAddress: str
    refundExtraId: str
    payTill: str


class TransactionStatus(TypedDict, total=False):
    id: str
    status: str
    amountDeposit: float
    amountEstimated: float
    addressDeposit: str
    addressReceive: str
    hashDeposit: str | None
    hashReceive: str | None
    createdAt: str
    updatedAt: str


class ValidateAddressResult(TypedDict, total=False):
    result: bool
    message: str | None


class DEXBlockchain(TypedDict, total=False):
    chainId: int
    name: str
    nativeCurrency: dict[str, Any]
    rpcUrls: list[str]
    explorerUrls: list[str]
