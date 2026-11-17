"""Type definitions for the Greedy SMS API."""

from __future__ import annotations

from typing import Any, TypedDict


class HealthResponse(TypedDict):
    """API health status response."""

    status: str


class UserPurchases(TypedDict):
    """User purchases counters."""

    activations: int
    rents: int


class UserDiscount(TypedDict):
    """User personal link discount level."""

    level: str
    percent: float


class UserInfo(TypedDict):
    """User account details."""

    id: str
    purchases: UserPurchases
    discount: UserDiscount
    balance: float
    referralBalance: float


class PaginatedResponse(TypedDict):
    """Pagination metadata container."""

    total: int
    totalPages: int
    pageSize: int
    nextPage: int
    prevPage: int


class OperatorCountryInfo(TypedDict):
    """Telecom operators for a country."""

    country: str
    operators: list[str]


class CountryTitle(TypedDict):
    """Localized country title."""

    rus: str
    eng: str


class CountryItem(TypedDict, total=False):
    """Country catalog entry."""

    id: int
    title: CountryTitle
    image: str | None


class GetCountriesResponse(PaginatedResponse):
    """Response containing countries catalog."""

    countries: list[CountryItem]


class ServiceItem(TypedDict):
    """Service catalog item."""

    id: str
    name: str


class GetServicesResponse(PaginatedResponse):
    """Response containing services catalog."""

    services: list[ServiceItem]


class PriceServiceItem(TypedDict):
    """Service price and inventory info."""

    name: str
    count: int
    price: float


class PriceCountryItem(TypedDict):
    """Prices grouped by country."""

    country: int
    services: list[PriceServiceItem]


class GetPricesResponse(PaginatedResponse):
    """Response containing pricing details."""

    countries: list[PriceCountryItem]


class NumberStatusItem(TypedDict):
    """Available number count item."""

    id: str
    count: int


class GetNumbersStatusResponse(PaginatedResponse):
    """Response containing available number counts."""

    numbers: list[NumberStatusItem]


class TopCountryPriceItem(TypedDict):
    """Top country price item."""

    country: int
    price: float


class TopCountryFullItem(TypedDict):
    """Top country full entry."""

    id: int
    count: int
    price: float


class GetTopCountriesResponse(PaginatedResponse):
    """Response containing top countries."""

    countries: list[TopCountryFullItem]


class OrderedNumber(TypedDict):
    """Details of ordered virtual phone number."""

    activationId: int
    phone: str
    price: float


class ActivationStatusResponse(TypedDict):
    """Activation status response."""

    status: str


class ActivationHistorySmsItem(TypedDict):
    """SMS item in activation history."""

    code: str
    date: str


class ActivationHistoryItem(TypedDict, total=False):
    """History entry for activation."""

    id: int
    sourceId: int
    source: str
    canManageViaApi: bool
    date: str
    phone: str
    service: str
    country: int
    sms: list[ActivationHistorySmsItem]
    price: float
    status: str | int


class GetHistoryResponse(PaginatedResponse):
    """History list response."""

    activations: list[ActivationHistoryItem]


class RentItem(TypedDict, total=False):
    """Rental order entry."""

    id: int
    sourceId: int
    source: str
    canManageViaApi: bool
    date: str
    phone: str
    service: str
    country: int
    price: float
    endDate: str
    status: str | int
    sms: list[dict[str, Any]]


class GetRentListResponse(PaginatedResponse):
    """List of active and past rentals."""

    rents: list[RentItem]


class RentSmsItem(TypedDict):
    """SMS received on rental number."""

    phone: str
    text: str
    date: str


class GetRentStatusResponse(PaginatedResponse):
    """Rental status and received messages."""

    sms: list[RentSmsItem]


class OrderedRentNumber(TypedDict, total=False):
    """Ordered rental number response."""

    rentId: int
    phone: str
    price: float
    endDate: str
    lockCancelTime: str | None


class ContinuedRentNumber(TypedDict):
    """Continued rental number response."""

    rentId: int
    phone: str
    price: float
    endDate: str


class MailDomainItem(TypedDict):
    """Disposable email domain entry."""

    name: str
    cost: float
    count: int


class MailPriceQuote(TypedDict):
    """Disposable email price quote."""

    cost: float
    domain: str
    url: str


class OrderedMailDomain(TypedDict):
    """Purchased disposable email response."""

    id: int
    email: str
    price: float
    site: str
    status: str


class MailStatusResponse(TypedDict):
    """Email order status and verification code."""

    email: str
    site: str
    status: str
    message: str
    value: str


class CancelMailOrderResponse(TypedDict):
    """Mail cancellation response."""

    balance: float
    status: str


class MailOrderItem(TypedDict):
    """Mail order entry."""

    id: int
    email: str
    site: str
    price: float
    status: str
    date: str


class GetMailOrdersResponse(PaginatedResponse):
    """List of mail orders."""

    orders: list[MailOrderItem]


class PublicApiErrorPayload(TypedDict, total=False):
    """Structured error response from API."""

    status: str
    code: int | str
    errorCode: str | None
    reasonCode: str | None
    providerCode: str | None
    message: str
    retryAfterSeconds: int | None
    fields: list[dict[str, str]] | None
    details: dict[str, Any] | None
