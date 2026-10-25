"""Types for the BitcoinVN exchange API.

Response dictionaries keep the JSON names from the OpenAPI spec.
"""

from __future__ import annotations

from typing import Any, Literal, TypedDict

OrderStatus = Literal[
    "new",
    "pending",
    "settle_data_error",
    "on_hold",
    "processing",
    "completed",
    "canceled",
]


class HealthStatus(TypedDict):
    """Body of ``GET /api/health``."""

    status: Literal["ok"]


class AssetRequired(TypedDict):
    """Required asset fields from ``GET /api/info``."""

    id: str
    name: str
    exchangeFee: float
    bridgeFee: float
    tags: list[str]


class Asset(AssetRequired, total=False):
    """Asset record. ``sameAs`` is set when the asset aliases another asset."""

    sameAs: str | None


class SettleDataField(TypedDict):
    """One external payout field on a transfer method."""

    name: str
    required: bool


class TransferMethodRequired(TypedDict):
    """Required transfer-method fields."""

    enabled: bool
    id: str
    asset: str
    decimals: int
    depositEnabled: bool
    settleEnabled: bool
    internalBalance: bool
    tags: list[str]


class TransferMethod(TransferMethodRequired, total=False):
    """Transfer method. Use ``id`` exactly as returned by ``GET /api/info``."""

    settleDataFields: list[SettleDataField]
    batched: bool
    predictedSettleWaitTime: int
    network: str | None
    extraLabel: str | None
    networkFee: float
    depositFee: float
    settleFee: float
    exchangeFee: float
    exchangeBalanceIndex: float
    infoUrl: str | None
    minOrderSize: float | None
    maxOrderSize: float | None
    invoice: bool
    warning: str
    tokenId: str | None
    details: dict[str, Any] | None


class Info(TypedDict):
    """Public catalogs from ``GET /api/info``."""

    assets: dict[str, Asset]
    transferMethods: dict[str, TransferMethod]


class PairRequired(TypedDict):
    """Required pair fields."""

    rate: float
    min: float


class Pair(PairRequired, total=False):
    """Rate and deposit range. ``max`` below ``min`` means no valid range."""

    max: float | None


class Ticker(TypedDict):
    """Public rate and 24-hour volume."""

    rate: float
    volume24h: float


class AddressValidationRequired(TypedDict):
    """Required address-validation field."""

    valid: bool


class AddressValidation(AddressValidationRequired, total=False):
    """Result of ``GET /api/addresses/validate``."""

    error: str | None


class QuoteRequired(TypedDict):
    """Required quote fields."""

    depositMethod: str
    settleMethod: str


class Quote(QuoteRequired, total=False):
    """Quote from ``POST /api/quotes`` or nested on an order."""

    id: str
    depositAmount: float | None
    depositFee: float
    settleAmount: float | None
    settleFee: float
    rate: float
    rawRate: float
    createdAt: str
    expiresAt: str
    accepted: bool
    markupRate: float | None


class OrderRequired(TypedDict):
    """Required order fields."""

    id: str
    shortId: str
    status: OrderStatus
    depositMethod: str
    depositAsset: str
    depositFee: float
    depositData: dict[str, Any]
    settleMethod: str
    settleAsset: str
    settleFee: float
    settleData: dict[str, Any]
    depositMin: float
    createdAt: str
    expiresAt: str


class Order(OrderRequired, total=False):
    """Order object returned by the order endpoints and by order webhooks."""

    customOrderId: str
    depositAmount: float | None
    depositConfsRequired: int | None
    depositTxns: list[str]
    settleAmount: float | None
    settleTxns: list[str]
    settleReceiptUrl: str
    settleProof: dict[str, Any] | None
    rate: float
    depositMax: float
    quote: Quote
    adminMessage: str | None


class LedgerItemRequired(TypedDict):
    """Required ledger fields."""

    id: str
    asset: str
    value: float
    createdAt: str


class LedgerItem(LedgerItemRequired, total=False):
    """One balance-history row."""

    note: str


class VaultRequired(TypedDict):
    """Required staking-offer fields."""

    id: str
    asset: str
    distribution: float
    supplyTarget: float
    staked: float
    latestApr: float
    latestFullyDilutedApr: float


class Vault(VaultRequired, total=False):
    """Staking offer from ``GET /api/staking``."""

    tvl: float
    unstakingFee: float


class BooleanConfiguration(TypedDict):
    """Staking preference body."""

    value: bool


class EnsResolution(TypedDict):
    """Signed ENS resolution. Times are Unix seconds."""

    name: str
    address: str
    transferMethod: str
    networkId: str
    networkName: str
    chainId: int
    resolvedAt: int
    expiresAt: int
    ensResolutionToken: str


# Available balances keyed by asset id.
Balances = dict[str, float]
