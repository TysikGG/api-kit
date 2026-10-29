"""Response objects returned by the Grizzly SMS clients."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal, TypedDict


class ActivationAction:
    """Status values passed to ``set_status``.

    ``CANCEL`` is ``8``. ``CANCEL_ALT`` is the documented alternate ``-1``.

    Examples:
        from grizzly_sms import ActivationAction

        ActivationAction.COMPLETE
    """

    READY = 1
    RETRY = 3
    COMPLETE = 6
    CANCEL = 8
    CANCEL_ALT = -1


@dataclass(frozen=True)
class OrderedNumber:
    """Number returned by ``get_number``."""

    activation_id: str
    phone_number: str


@dataclass(frozen=True)
class OrderedNumberV2:
    """Number returned by ``get_number_v2``."""

    activation_id: str
    phone_number: str
    activation_cost: float
    currency: float
    country_code: str
    can_get_another_sms: bool
    activation_time: str
    activation_cancel: str | None = None
    activation_end: str | None = None


@dataclass(frozen=True)
class ActivationStatus:
    """Plain-text activation status from ``get_status``."""

    status: str
    code: str | None = None


@dataclass(frozen=True)
class ReceivedCode:
    """Code delivered by ``wait_for_code``."""

    code: str
    status: str = "STATUS_OK"


@dataclass(frozen=True)
class PriceQuote:
    """One country/service row from ``find_prices``."""

    country: str
    service: str
    cost: float
    count: float


@dataclass(frozen=True)
class ServiceInfo:
    """One row from ``get_services``."""

    code: str
    name: str


@dataclass(frozen=True)
class CountryInfo:
    """One row from ``get_countries``."""

    id: int
    rus: str | None = None
    eng: str | None = None
    chn: str | None = None
    tur: str | None = None
    spa: str | None = None
    hin: str | None = None
    ara: str | None = None
    fra: str | None = None
    visible: int | None = None
    retry: int | None = None


@dataclass(frozen=True)
class ActiveActivation:
    """One open activation from ``get_active_activations``."""

    activation_id: str
    phone_number: str
    service_code: str
    country_code: str
    activation_cost: float
    country_name: str | None = None
    currency: float | None = None
    activation_status: Any = None
    activation_time: str | None = None
    can_get_another_sms: bool | None = None
    discount: str | None = None
    repeated: str | None = None
    sms_code: str | None = None
    sms_text: str | None = None


@dataclass(frozen=True)
class CryptoWallet:
    """Deposit address from ``get_wallet``."""

    wallet_address: str


@dataclass(frozen=True)
class PartnerStatus:
    """JSON status returned by a partner push."""

    status: str
    error: str | None = None


class PartnerGetServicesRequest(TypedDict):
    """Inbound ``GET_SERVICES`` body sent by Grizzly to the partner server.

    Examples:
        body: PartnerGetServicesRequest = {"action": "GET_SERVICES", "key": partner_key}
    """

    action: Literal["GET_SERVICES"]
    key: str


class PartnerCountryStock(TypedDict):
    """One country in a ``GET_SERVICES`` response.

    ``operatorMap`` maps an operator name to a service code and a count.
    """

    country: int
    operatorMap: dict[str, dict[str, int]]


class _PartnerServicesStatus(TypedDict):
    status: Literal["SUCCESS", "ERROR"]


class PartnerGetServicesResponse(_PartnerServicesStatus, total=False):
    """Reply to inbound ``GET_SERVICES``.

    Examples:
        reply: PartnerGetServicesResponse = {"status": "SUCCESS", "countryList": []}
    """

    countryList: list[PartnerCountryStock]
    error: str


class _PartnerGetNumberRequired(TypedDict):
    action: Literal["GET_NUMBER"]
    key: str
    country: int
    operator: str
    service: str
    sum: int


class PartnerGetNumberRequest(_PartnerGetNumberRequired, total=False):
    """Inbound ``GET_NUMBER`` body sent by Grizzly to the partner server.

    ``exceptionPhoneSet`` and ``canGetAnotherSms`` may be omitted.

    Examples:
        body: PartnerGetNumberRequest = {
            "action": "GET_NUMBER",
            "key": partner_key,
            "country": 0,
            "operator": "any",
            "service": "tg",
            "sum": 1,
        }
    """

    exceptionPhoneSet: list[str]
    canGetAnotherSms: bool | int | str


class _PartnerNumberStatus(TypedDict):
    status: Literal["SUCCESS", "NO_NUMBERS", "ERROR"]


class PartnerGetNumberResponse(_PartnerNumberStatus, total=False):
    """Reply to inbound ``GET_NUMBER``.

    Examples:
        reply: PartnerGetNumberResponse = {
            "status": "SUCCESS",
            "number": 447472190082,
            "activationId": 1,
        }
    """

    number: int
    activationId: int
    flashcall: bool
    voice: bool
    canGetAnotherSms: bool | int | str
    error: str


class PartnerFinishActivationRequest(TypedDict):
    """Inbound ``FINISH_ACTIVATION`` body.

    Status ``1`` is forbidden, ``3`` sold, ``4`` cancelled, and ``5`` returned.

    Examples:
        body: PartnerFinishActivationRequest = {
            "action": "FINISH_ACTIVATION",
            "key": partner_key,
            "activationId": 1,
            "status": 3,
        }
    """

    action: Literal["FINISH_ACTIVATION"]
    key: str
    activationId: int
    status: Literal[1, 3, 4, 5]


class _PartnerFinishStatus(TypedDict):
    status: Literal["SUCCESS", "ERROR"]


@dataclass(frozen=True)
class NumberStock:
    """One ``getNumbersStatus`` key, for example ``tg_0``."""

    key: str
    service: str
    suffix: str
    count: float


class RentAction:
    """Status values for ``set_rent_status``.

    ``FINISH`` is ``1``. ``CANCEL`` is ``2``.

    Examples:
        RentAction.FINISH
    """

    FINISH = 1
    CANCEL = 2


@dataclass(frozen=True)
class RentPhone:
    """Number returned by ``get_rent_number`` or ``continue_rent``."""

    id: str
    number: str
    end_date: str


@dataclass(frozen=True)
class RentMessage:
    """One SMS from ``get_rent_status``."""

    phone_from: str | None = None
    service: str | None = None
    text: str | None = None
    date: str | None = None


@dataclass(frozen=True)
class RentStatus:
    """Messages collected for a rental."""

    quantity: float
    messages: list[RentMessage]


@dataclass(frozen=True)
class RentHistoryEntry:
    """One extension from ``get_rent_history``."""

    date: str | None = None
    price: float | None = None
    hours: float | None = None


@dataclass(frozen=True)
class RentHistory:
    """History of a rental."""

    quantity: float
    entries: list[RentHistoryEntry]


@dataclass(frozen=True)
class RentPrice:
    """One row from ``get_rent_prices``."""

    country: str
    service: str
    cost: float
    count: float
    max_hours: float | None = None


@dataclass(frozen=True)
class ActivationWebhook:
    """Profile webhook body in the sms-activate-compatible shape."""

    activation_id: str
    service: str | None = None
    text: str | None = None
    code: str | None = None
    country: str | None = None
    received_at: str | None = None


@dataclass(frozen=True)
class ReceivedMessage:
    """Code delivered by ``wait_for_message``."""

    code: str
    source: str
    text: str | None = None
    verification_type: int | None = None


class PartnerFinishActivationResponse(_PartnerFinishStatus, total=False):
    """Reply to inbound ``FINISH_ACTIVATION``.

    Examples:
        reply: PartnerFinishActivationResponse = {"status": "SUCCESS"}
    """

    error: str
