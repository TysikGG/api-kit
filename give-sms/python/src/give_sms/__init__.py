"""Python client for the Give-SMS virtual-number, handler, and rent APIs."""

from give_sms.async_client import AsyncActivation, AsyncGiveSms
from give_sms.catalog import COUNTRIES, SERVICES, find_country
from give_sms.client import (
    PARTNER_KEY,
    Activation,
    GiveSms,
)
from give_sms.errors import (
    API_STATUS_ERRORS,
    HANDLER_ERROR_CLASSES,
    AlreadyActiveError,
    ApiStatus401Error,
    ApiStatus504Error,
    BadKeyError,
    GiveSmsAbortError,
    GiveSmsError,
    GiveSmsTimeoutError,
    NetworkError,
    NoBalanceError,
    NoNumbersError,
    PriceChangedError,
    ResendRequiredError,
    WrongMaxPriceError,
)
from give_sms.types import (
    ActivationNumber,
    CodeResult,
    HandlerStatusResult,
    RentOrder,
    RentProlongResult,
    RentSmsList,
    RentSmsMessage,
)

__all__ = [
    "API_STATUS_ERRORS",
    "Activation",
    "ActivationNumber",
    "AlreadyActiveError",
    "ApiStatus401Error",
    "ApiStatus504Error",
    "AsyncActivation",
    "AsyncGiveSms",
    "BadKeyError",
    "COUNTRIES",
    "CodeResult",
    "GiveSms",
    "GiveSmsAbortError",
    "GiveSmsError",
    "GiveSmsTimeoutError",
    "HANDLER_ERROR_CLASSES",
    "HandlerStatusResult",
    "NetworkError",
    "NoBalanceError",
    "NoNumbersError",
    "PARTNER_KEY",
    "PriceChangedError",
    "RentOrder",
    "RentProlongResult",
    "RentSmsList",
    "RentSmsMessage",
    "ResendRequiredError",
    "SERVICES",
    "WrongMaxPriceError",
    "find_country",
]
