from dataclasses import dataclass
from typing import Any


@dataclass
class OrderResult:
    """Result of ordering a phone number.

    Attributes:
        tzid: Order ID assigned by OnlineSIM.
        response: Response status string or number.
    """

    tzid: int
    response: str | int


@dataclass
class ActivationState:
    """State of an ordered number activation.

    Attributes:
        tzid: Order ID.
        response: Status code (e.g. TZ_NUM_WAIT, TZ_NUM_ANSWER, TZ_OVER_EMPTY).
        number: Assigned phone number.
        msg: Received SMS message code or text.
        service: Service name.
        time: Remaining time in seconds.
        raw_data: Complete dictionary returned by API.
    """

    tzid: int
    response: str
    number: str | None = None
    msg: str | None = None
    service: str | None = None
    time: int | None = None
    raw_data: Any = None
