"""Type definitions and data models for HeroSMS."""

from enum import IntEnum
from typing import Any, TypedDict


class ActivationStatusCode(IntEnum):
    """Activation status codes for set_status action."""

    SMS_SENT = 1
    """Inform that SMS was sent / ready to receive code."""

    REQUEST_RESEND = 3
    """Request SMS resend."""

    COMPLETE = 6
    """Complete activation (code received and confirmed)."""

    CANCEL = 8
    """Cancel activation and refund money."""


class ParsedNumberResponse(TypedDict):
    """Parsed response from get_number."""

    activation_id: int
    phone_number: str


class ParsedStatusResponse(TypedDict, total=False):
    """Parsed response from get_status."""

    status: str
    code: str | None


class GetNumberV2Response(TypedDict, total=False):
    """Response from get_number_v2 endpoint."""

    activationId: str
    phoneNumber: str
    activationCost: float
    currency: int
    countryCode: int
    countryPhoneCode: int
    canGetAnotherSms: bool
    activationTime: str
    activationEndTime: str
    activationOperator: str


class SmsInfo(TypedDict):
    """SMS information in activation status."""

    dateTime: str
    code: str
    text: str


class CallInfo(TypedDict):
    """Call verification details."""

    from_: str
    text: str
    code: str
    dateTime: str
    url: str
    parsingCount: int


class ActivationStatusV2(TypedDict):
    """Response from get_status_v2 endpoint."""

    verificationType: int
    sms: SmsInfo
    call: CallInfo


class ActiveActivation(TypedDict):
    """Single active activation record."""

    activationId: str
    serviceCode: str
    phoneNumber: str
    activationCost: float
    activationStatus: str
    smsCode: str | None
    smsText: str | None
    activationTime: str
    discount: str
    repeated: str
    countryCode: str
    countryName: str
    canGetAnotherSms: str
    currency: str


class ActiveActivationsResponse(TypedDict):
    """Response from get_active_activations endpoint."""

    status: str
    data: list[ActiveActivation]


class ActivationHistoryItem(TypedDict):
    """Historical activation record."""

    id: str
    date: str
    phone: str
    sms: str
    cost: float
    status: str
    currency: int


class Country(TypedDict):
    """Country metadata."""

    id: int
    rus: str
    eng: str
    chn: str
    visible: int
    retry: int


class Service(TypedDict):
    """Service catalog item."""

    code: str
    name: str


class ServicesListResponse(TypedDict):
    """Response from get_services_list endpoint."""

    status: str
    services: list[Service]


class OperatorsResponse(TypedDict):
    """Response from get_operators endpoint."""

    status: str
    countryOperators: dict[str, list[str]]


class PriceInfo(TypedDict):
    """Price information for a service."""

    cost: float
    count: int
    physicalCount: int


class TopCountryInfo(TypedDict, total=False):
    """Top country information."""

    physicalTotalCount: int
    physicalCountForDefaultPrice: int
    physicalPriceMap: dict[str, float]
    retail_price: float
    country: int
    price: float
    count: int


class OtpItem(TypedDict, total=False):
    """Individual received message or call entry."""

    id: str
    phoneFrom: str
    code: str | None
    text: str | None
    service: str
    date: str
    type: str


class GetAllSmsResponse(TypedDict):
    """Response from get_all_sms endpoint."""

    data: list[OtpItem]
    meta: dict[str, Any]


class RentPriceCount(TypedDict):
    """Rent pricing and available quantity."""

    price: float
    count: int


class RentServiceInfo(TypedDict):
    """Rental service info."""

    quantity: int
    price: float
    retail_price: float


class GetRentServicesAndCountriesResponse(TypedDict):
    """Response from get_rent_services_and_countries endpoint."""

    operators: dict[str, str]
    services: dict[str, RentServiceInfo]


class ReactivationPriceResponse(TypedDict):
    """Response from get_reactivation_price endpoint."""

    data: dict[str, Any]
