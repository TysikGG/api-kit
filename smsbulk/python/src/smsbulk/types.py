from typing import Any

from typing_extensions import TypedDict


class BalanceResponse(TypedDict):
    balance: str
    currency: str


class Transaction(TypedDict, total=False):
    id: str
    amount: str
    currency: str
    type: str
    description: str | None
    createdAt: str


class TransactionListResponse(TypedDict):
    data: list[Transaction]
    nextCursor: str | None


class ServiceCatalogItem(TypedDict, total=False):
    code: str
    slug: str
    name: str
    nameLocalized: dict[str, str] | None
    category: str | None
    iconUrl: str | None
    countryCount: int
    totalStock: int
    minPrice: str


class ServicesResponse(TypedDict):
    data: list[ServiceCatalogItem]
    count: int


class CountryCatalogItem(TypedDict, total=False):
    isoCode: str
    seoSlug: str | None
    name: str
    nameLocalized: dict[str, str] | None
    flagEmoji: str | None


class CountriesResponse(TypedDict):
    data: list[CountryCatalogItem]
    count: int


class ServiceCountryItem(TypedDict, total=False):
    isoCode: str
    slug: str | None
    name: str
    nameLocalized: dict[str, str] | None
    flagEmoji: str | None
    price: str
    currency: str
    stock: int
    speedTier: str | None
    avgArrivalSeconds: int | None
    availability: str


class ServiceCountriesResponse(TypedDict):
    service: dict[str, str]
    countries: list[ServiceCountryItem]
    count: int


class Activation(TypedDict, total=False):
    id: str
    status: str
    phoneNumber: str
    smsCode: str | None
    purged: bool
    operator: str | None
    userCost: str
    currency: str
    service: dict[str, Any]
    country: dict[str, Any]
    createdAt: str
    expiresAt: str | None
    receivedAt: str | None
    cancelledAt: str | None
    completedAt: str | None
    cancellable: bool
    cancellableAt: str | None


class ActivationListResponse(TypedDict):
    data: list[Activation]
    nextCursor: str | None


class EmailDomainItem(TypedDict):
    name: str
    price: float
    count: int
    currency: str
    disabled: bool


class EmailActivation(TypedDict, total=False):
    id: str
    site: str
    domain: str
    emailAddress: str | None
    status: str
    otpValue: str | None
    htmlMessage: str | None
    userCost: str
    currency: str
    expiresAt: str | None
    receivedAt: str | None
    createdAt: str
    reorderBlockedAt: str | None


class EmailActivationListResponse(TypedDict):
    data: list[EmailActivation]
    nextCursor: str | None
