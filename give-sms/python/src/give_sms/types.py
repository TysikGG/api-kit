from dataclasses import dataclass
from typing import Any


@dataclass
class ActivationNumber:
    """Ordered phone number result.

    Attributes:
        id: Activation order ID.
        number: Allocated phone number string.
    """

    id: str | int
    number: str


@dataclass
class CodeResult:
    """Result of querying SMS code.

    Attributes:
        status: Current activation status.
        code: Verification code if received.
        extra: Additional payload details.
    """

    status: str
    code: str | None = None
    extra: Any = None


@dataclass
class HandlerStatusResult:
    """Handler status response.

    Attributes:
        status: Status code string (e.g. STATUS_OK, STATUS_WAIT_CODE).
        code: Verification code if status is STATUS_OK or STATUS_WAIT_RETRY.
    """

    status: str
    code: str | None = None
