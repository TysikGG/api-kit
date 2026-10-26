from dataclasses import dataclass


@dataclass
class PhoneNumberOrder:
    """Ordered virtual phone number details.

    Attributes:
        request_id: Order request ID.
        number: Assigned phone number string.
    """

    request_id: int
    number: str


@dataclass
class SmsCodeResult:
    """SMS verification code result.

    Attributes:
        sms_code: Verification code if received.
        error: Error message string if code not yet arrived.
    """

    sms_code: str | None = None
    error: str | None = None


@dataclass
class HandlerStatusResult:
    """Compatible handler status response.

    Attributes:
        status: Status code string (e.g. STATUS_OK, STATUS_WAIT_CODE).
        code: Verification code if status is STATUS_OK.
    """

    status: str
    code: str | None = None
