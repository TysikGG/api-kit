from typing_extensions import TypedDict


class StealthEXCurrency(TypedDict, total=False):
    symbol: str
    name: str
    network: str
    image: str
    has_extra_id: bool
    extra_id: str | None
    address_explorer: str
    tx_explorer: str
    validation_address: str | None
    validation_extra: str | None
    warnings_from: list[str]
    warnings_to: list[str]


class RangeResult(TypedDict, total=False):
    min_amount: str | None
    max_amount: str | None


class MinAmountResult(TypedDict):
    min_amount: str


class EstimateResult(TypedDict, total=False):
    estimated_amount: str
    rate_id: str | None
    valid_until: str | None


class ExchangeDetails(TypedDict, total=False):
    id: str
    type: str
    timestamp: str
    updated_at: str
    currency_from: str
    currency_to: str
    amount_from: str
    amount_to: str
    address_from: str
    address_to: str
    extra_id_from: str | None
    extra_id_to: str | None
    tx_from: str | None
    tx_to: str | None
    status: str
    refund_address: str | None
    refund_extra_id: str | None
