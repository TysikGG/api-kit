from typing import Any, TypedDict


class BalanceInfo(TypedDict, total=False):
    balance: float
    currency: str
    raw: Any
