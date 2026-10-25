"""Parsers for the text and JSON bodies used by the Grizzly SMS API."""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from typing import Any

from grizzly_sms.errors import GrizzlySmsError
from grizzly_sms.types import (
    ActivationStatus,
    ActiveActivation,
    CountryInfo,
    OrderedNumber,
    OrderedNumberV2,
    PriceQuote,
    ServiceInfo,
)

_SET_STATUS = frozenset(
    {
        "ACCESS_READY",
        "ACCESS_RETRY_GET",
        "ACCESS_ACTIVATION",
        "ACCESS_CANCEL",
    }
)

_COUNTRY_LANGS = ("rus", "eng", "chn", "tur", "spa", "hin", "ara", "fra")


def js_number(value: Any) -> float:
    # Number(null) is 0. A missing key is not None; callers pass NaN themselves.
    if value is None:
        return 0.0
    if isinstance(value, bool):
        return 1.0 if value else 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        text = value.strip()
        if text == "":
            return 0.0
        try:
            return float(text)
        except ValueError:
            return float("nan")
    return float("nan")


def js_string(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, float) and math.isfinite(value) and value.is_integer():
        return str(int(value))
    return str(value)


def _missing_number(row: Mapping[str, Any], key: str) -> float:
    if key not in row:
        return float("nan")
    return js_number(row[key])


def _optional_string(row: Mapping[str, Any], key: str) -> str | None:
    if key not in row:
        return None
    return js_string(row[key])


def _coalesced_string(row: Mapping[str, Any], key: str) -> str:
    if key not in row or row[key] is None:
        return ""
    return js_string(row[key])


def as_bool_flag(value: Any) -> bool:
    return value is True or value == 1 or value == "1" or value == "true"


def list_param(value: Sequence[str | int] | str | None) -> str | None:
    if value is None:
        return None
    items: Sequence[str | int] = [value] if isinstance(value, str) else value
    parts = [str(item).strip() for item in items]
    parts = [part for part in parts if part]
    if not parts:
        return None
    return ",".join(parts)


def parse_access_number(raw: str) -> OrderedNumber:
    parts = raw.strip().split(":")
    prefix = parts[0] if parts else ""
    activation_id = parts[1] if len(parts) > 1 else ""
    phone_number = ":".join(parts[2:])
    if prefix != "ACCESS_NUMBER" or not activation_id or not phone_number:
        raise GrizzlySmsError("UNEXPECTED_RESPONSE", raw)
    return OrderedNumber(activation_id=activation_id, phone_number=phone_number)


def parse_balance(raw: str) -> float:
    parts = raw.strip().split(":")
    prefix = parts[0] if parts else ""
    amount = parts[1] if len(parts) > 1 else None
    balance = float("nan") if amount is None else js_number(amount)
    if prefix != "ACCESS_BALANCE" or not math.isfinite(balance):
        raise GrizzlySmsError("UNEXPECTED_RESPONSE", raw)
    return balance


def parse_status(raw: str) -> ActivationStatus:
    parts = raw.strip().split(":")
    status = parts[0] if parts else ""
    if not status.startswith("STATUS_"):
        raise GrizzlySmsError("UNEXPECTED_RESPONSE", raw)
    code = ":".join(parts[1:])
    if code:
        return ActivationStatus(status=status, code=code)
    return ActivationStatus(status=status)


def parse_set_status(raw: str) -> str:
    value = raw.strip()
    if value not in _SET_STATUS:
        raise GrizzlySmsError("UNEXPECTED_RESPONSE", raw)
    return value


def parse_number_v2(data: Any) -> OrderedNumberV2:
    if not isinstance(data, dict):
        raise GrizzlySmsError("UNEXPECTED_RESPONSE", data)
    activation_id = data.get("activationId", None)
    phone_number = data.get("phoneNumber", None)
    if not isinstance(activation_id, (int, str)) or isinstance(activation_id, bool):
        raise GrizzlySmsError("UNEXPECTED_RESPONSE", data)
    if not isinstance(phone_number, (int, str)) or isinstance(phone_number, bool):
        raise GrizzlySmsError("UNEXPECTED_RESPONSE", data)
    return OrderedNumberV2(
        activation_id=js_string(activation_id),
        phone_number=js_string(phone_number),
        activation_cost=_missing_number(data, "activationCost"),
        currency=_missing_number(data, "currency"),
        country_code=_coalesced_string(data, "countryCode"),
        can_get_another_sms=as_bool_flag(data.get("canGetAnotherSms")),
        activation_time=_coalesced_string(data, "activationTime"),
        activation_cancel=_optional_string(data, "activationCancel"),
        activation_end=_optional_string(data, "activationEnd"),
    )


def flatten_prices(data: Mapping[str, Any] | None) -> list[PriceQuote]:
    """Flatten a ``getPrices`` table into rows.

    Rows whose cost or count is not a finite number are skipped.

    Examples:
        quotes = flatten_prices({"16": {"tg": {"cost": 0.4, "count": 20}}})
    """
    quotes: list[PriceQuote] = []
    if not data:
        return quotes
    for country, services in data.items():
        if not isinstance(services, dict):
            continue
        for service, quote in services.items():
            if not isinstance(quote, dict):
                continue
            cost = _missing_number(quote, "cost")
            count = _missing_number(quote, "count")
            if not math.isfinite(cost) or not math.isfinite(count):
                continue
            quotes.append(
                PriceQuote(
                    country=str(country),
                    service=str(service),
                    cost=cost,
                    count=count,
                )
            )
    return quotes


def parse_services(data: Any) -> list[ServiceInfo]:
    if isinstance(data, list):
        source = data
    elif isinstance(data, dict) and isinstance(data.get("services"), list):
        source = data["services"]
    else:
        raise GrizzlySmsError("UNEXPECTED_RESPONSE", data)
    services: list[ServiceInfo] = []
    for item in source:
        row = item if isinstance(item, dict) else {}
        services.append(
            ServiceInfo(
                code=_coalesced_string(row, "code"),
                name=_coalesced_string(row, "name"),
            )
        )
    return services


def parse_countries(data: Any) -> list[CountryInfo]:
    if isinstance(data, list):
        rows = data
    elif isinstance(data, dict):
        rows = list(data.values())
    else:
        raise GrizzlySmsError("UNEXPECTED_RESPONSE", data)
    countries: list[CountryInfo] = []
    for item in rows:
        if not isinstance(item, dict):
            continue
        country_id = _missing_number(item, "id")
        if not math.isfinite(country_id):
            continue
        names = {lang: _optional_string(item, lang) for lang in _COUNTRY_LANGS}
        countries.append(CountryInfo(id=int(country_id), **names))
    return countries


def parse_activations(data: Any) -> list[ActiveActivation]:
    if data is None:
        return []
    if not isinstance(data, list):
        raise GrizzlySmsError("UNEXPECTED_RESPONSE", data)
    activations: list[ActiveActivation] = []
    for item in data:
        row = item if isinstance(item, dict) else {}
        currency = None if "currency" not in row else js_number(row["currency"])
        status = row["activationStatus"] if "activationStatus" in row else None
        flag = None
        if "canGetAnotherSms" in row:
            flag = as_bool_flag(row["canGetAnotherSms"])
        activations.append(
            ActiveActivation(
                activation_id=_coalesced_string(row, "activationId"),
                phone_number=_coalesced_string(row, "phoneNumber"),
                service_code=_coalesced_string(row, "serviceCode"),
                country_code=_coalesced_string(row, "countryCode"),
                country_name=_optional_string(row, "countryName"),
                activation_cost=_missing_number(row, "activationCost"),
                currency=currency,
                activation_status=status,
                activation_time=_optional_string(row, "activationTime"),
                can_get_another_sms=flag,
                discount=_optional_string(row, "discount"),
                repeated=_optional_string(row, "repeated"),
                sms_code=_optional_string(row, "smsCode"),
                sms_text=_optional_string(row, "smsText"),
            )
        )
    return activations
