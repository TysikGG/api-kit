from typing import Literal, TypedDict

RateType = Literal["float", "fixed"]
SortOrder = Literal["asc", "desc"]
TransactionStatus = Literal[
    "wait",
    "confirmation",
    "confirmed",
    "exchanging",
    "sending",
    "success",
    "overdue",
    "refund",
    "refunded",
]


class Network(TypedDict, total=False):
    network: str
    name: str
    shortName: str | None
    notes: str | None
    addressRegex: str | None
    isDefault: bool
    blockExplorer: str | None
    memoNeeded: bool
    memoName: str | None
    memoRegex: str | None
    precision: int
    decimal: int | None
    contract: str | None
    icon: str | None


class Currency(TypedDict, total=False):
    code: str
    name: str
    icon: str
    notes: str | None
    networks: list[Network]


class Rate(TypedDict, total=False):
    fromAmount: float
    toAmount: float
    rate: float
    message: str | None
    minAmount: float
    withdrawMin: float
    maxAmount: float


class TransactionCoin(TypedDict, total=False):
    coinCode: str
    coinName: str
    network: str
    networkName: str
    networkShortName: str | None
    icon: str | None
    memoName: str | None
    contract: str | None


class TransactionHash(TypedDict, total=False):
    hash: str | None
    link: str | None


class Transaction(TypedDict, total=False):
    id: str
    amount: float
    amountTo: float
    coinFrom: TransactionCoin
    coinTo: TransactionCoin
    comment: str | None
    createdAt: str
    depositAddress: str
    depositExtraId: str | None
    withdrawalAddress: str
    withdrawalExtraId: str | None
    hashIn: TransactionHash
    hashOut: TransactionHash
    rate: float
    rateType: str
    refundAddress: str | None
    refundExtraId: str | None
    status: str
    source: str


class PaginatedCurrencies(TypedDict):
    data: list[Currency]
    count: int


class PaginatedNetworks(TypedDict):
    data: list[Network]
    count: int


class PaginatedTransactions(TypedDict):
    data: list[Transaction]
    count: int
