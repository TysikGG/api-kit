"""Type definitions for the SMSBower API."""

from dataclasses import dataclass


@dataclass
class ActivationNumber:
    """Represents an acquired virtual phone number."""

    id: str
    number: str


@dataclass
class ActivationStatus:
    """Status of an activation."""

    status: str
    code: str | None = None


@dataclass
class ServiceItem:
    """Supported SMSBower service item."""

    code: str
    name: str


@dataclass
class CountryItem:
    """Country metadata item."""

    id: str
    rus: str | None = None
    eng: str | None = None
    chn: str | None = None
