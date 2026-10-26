"""Data types for the VAK-SMS API."""

from dataclasses import dataclass


@dataclass
class VakNumber:
    """Represents an acquired temporary phone number."""

    id_num: str
    tel: str
    service: str | None = None
    rent: bool = False


@dataclass
class CountNumber:
    """Stock count and pricing for a service."""

    service: str
    count: int
    price: float | None = None


@dataclass
class CountryOperator:
    """Supported country and list of available mobile operators."""

    country_name: str
    country_code: str
    operator_list: list[str]
