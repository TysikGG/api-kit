"""Python client for the Grizzly SMS activation and partner push API.

The user key comes from the profile settings on https://grizzlysms.com.
Official documentation: https://grizzlysms.com/docs

Examples:
    from grizzly_sms import GrizzlySms

    sms = GrizzlySms(api_key)
    balance = sms.get_balance()
    countries = sms.get_countries()
"""

from grizzly_sms.client import GrizzlySms
from grizzly_sms.errors import GrizzlySmsError
from grizzly_sms.parse import flatten_prices
from grizzly_sms.partner import GrizzlyPartner
from grizzly_sms.types import (
    ActivationAction,
    ActivationStatus,
    ActiveActivation,
    CountryInfo,
    CryptoWallet,
    OrderedNumber,
    OrderedNumberV2,
    PartnerCountryStock,
    PartnerFinishActivationRequest,
    PartnerFinishActivationResponse,
    PartnerGetNumberRequest,
    PartnerGetNumberResponse,
    PartnerGetServicesRequest,
    PartnerGetServicesResponse,
    PartnerStatus,
    PriceQuote,
    ReceivedCode,
    ServiceInfo,
)

__all__ = [
    "ActivationAction",
    "ActivationStatus",
    "ActiveActivation",
    "CountryInfo",
    "CryptoWallet",
    "GrizzlyPartner",
    "GrizzlySms",
    "GrizzlySmsError",
    "OrderedNumber",
    "OrderedNumberV2",
    "PartnerCountryStock",
    "PartnerFinishActivationRequest",
    "PartnerFinishActivationResponse",
    "PartnerGetNumberRequest",
    "PartnerGetNumberResponse",
    "PartnerGetServicesRequest",
    "PartnerGetServicesResponse",
    "PartnerStatus",
    "PriceQuote",
    "ReceivedCode",
    "ServiceInfo",
    "flatten_prices",
]

__version__ = "0.1.0"
