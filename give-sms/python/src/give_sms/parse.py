"""Pure response parsers shared by the sync and async clients."""

from __future__ import annotations

import json
from typing import Any

from give_sms.errors import GiveSmsError, api_status_error, handler_error
from give_sms.types import (
    ActivationNumber,
    ApiEnvelope,
    CodeResult,
    HandlerStatusResult,
    RentOrder,
    RentProlongResult,
    RentSmsList,
    RentSmsMessage,
)


def as_record(value: Any) -> dict[str, Any] | None:
    if isinstance(value, dict):
        return value
    return None


def envelope_message(body: Any) -> tuple[str, str | None]:
    record = as_record(body) or {}
    data = as_record(record.get("data")) or {}
    reason = data.get("reason")
    reason_text = reason if isinstance(reason, str) else None
    for key in ("msg", "error", "advice"):
        candidate = data.get(key)
        if isinstance(candidate, str) and candidate:
            return candidate, reason_text
    top = record.get("msg")
    if isinstance(top, str) and top:
        return top, reason_text
    return "", reason_text


def read_envelope(body: Any, allow_statuses: tuple[int, ...] = ()) -> ApiEnvelope:
    record = as_record(body)
    if record is None:
        raise GiveSmsError("Invalid JSON response", response_data=body)
    if "status" not in record:
        return ApiEnvelope(status=200, data=body, raw=body)
    status = int(record["status"])
    if status not in (200, 1) and status not in allow_statuses:
        message, reason = envelope_message(body)
        raise api_status_error(status, message or f"API returned status {status}", body, reason)
    data = record.get("data", body)
    return ApiEnvelope(status=status, data=data, raw=body)


def parse_balance(data: Any) -> float:
    value: Any = data
    record = as_record(data)
    if record is not None:
        if record.get("balance") is not None:
            value = record["balance"]
        elif record.get("user_balance") is not None:
            value = record["user_balance"]
        else:
            raise GiveSmsError("Missing balance in API response", response_data=data)
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise GiveSmsError(f"Invalid balance format: {value}", response_data=data) from exc


def parse_activation(data: Any) -> ActivationNumber:
    record = as_record(data)
    if record is None:
        raise GiveSmsError("Incomplete order data returned by API", response_data=data)
    order_id = record.get("order_id", record.get("id"))
    number = record.get("phone", record.get("number"))
    if order_id in (None, "") or number in (None, ""):
        raise GiveSmsError("Incomplete order data returned by API", response_data=data)
    start = record.get("start_time")
    return ActivationNumber(
        id=order_id,
        number=str(number),
        phone=str(number),
        order_id=record.get("order_id", order_id),
        start_time=start if isinstance(start, str) else None,
    )


def parse_code(envelope: ApiEnvelope) -> CodeResult:
    data = as_record(envelope.data) or {}
    if envelope.status == 400:
        message = data.get("msg")
        advice = data.get("advice")
        return CodeResult(
            status="WAIT",
            extra=envelope.data,
            message=message if isinstance(message, str) else None,
            advice=advice if isinstance(advice, str) else None,
        )
    raw_code = data.get("code")
    raw_status = data.get("status")
    return CodeResult(
        status="OK" if raw_status is None else str(raw_status),
        code=None if raw_code is None else str(raw_code),
        full_sms=data.get("fullSms") if isinstance(data.get("fullSms"), str) else None,
        phone=data.get("phone") if isinstance(data.get("phone"), str) else None,
        received_date=data.get("receivedDate")
        if isinstance(data.get("receivedDate"), str)
        else None,
        sender=data.get("sender") if isinstance(data.get("sender"), str) else None,
        sms_id=data.get("id"),
        phone_pass=data.get("phonePass") if isinstance(data.get("phonePass"), str) else None,
        extra=envelope.data,
    )


def parse_access_number(text: str) -> ActivationNumber:
    prefix = "ACCESS_NUMBER:"
    if not text.startswith(prefix):
        raise GiveSmsError(f"Failed to order number: {text}", code=text, response_data=text)
    rest = text[len(prefix) :]
    split_at = rest.find(":")
    if split_at <= 0 or split_at == len(rest) - 1:
        raise GiveSmsError(
            f"Malformed ACCESS_NUMBER response: {text}", code=text, response_data=text
        )
    order_id = rest[:split_at]
    number = rest[split_at + 1 :]
    return ActivationNumber(id=order_id, number=number, phone=number, order_id=order_id)


def parse_handler_balance(text: str) -> float:
    prefix = "ACCESS_BALANCE:"
    if not text.startswith(prefix):
        raise GiveSmsError(f"Unexpected balance response: {text}", code=text, response_data=text)
    try:
        return float(text[len(prefix) :])
    except ValueError as exc:
        raise GiveSmsError(
            f"Invalid balance format: {text}", code=text, response_data=text
        ) from exc


def parse_handler_status(text: str) -> HandlerStatusResult:
    if text.startswith("STATUS_OK:"):
        return HandlerStatusResult(status="STATUS_OK", code=text[len("STATUS_OK:") :], raw=text)
    if text.startswith("STATUS_WAIT_RETRY:"):
        return HandlerStatusResult(
            status="STATUS_WAIT_RETRY",
            code=text[len("STATUS_WAIT_RETRY:") :],
            raw=text,
        )
    return HandlerStatusResult(status=text, raw=text)


def parse_json_text(text: str, what: str) -> Any:
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise GiveSmsError(
            f"Invalid JSON from handler {what}: {text}",
            code=text,
            response_data=text,
        ) from exc


def throw_if_handler_error(text: str) -> None:
    error = handler_error(text)
    if error is not None:
        raise error


def parse_rent_order(data: Any) -> RentOrder:
    record = as_record(data)
    if record is None:
        raise GiveSmsError("Incomplete rent order returned by API", response_data=data)
    order_id = record.get("order_id")
    phone = record.get("phone")
    if order_id is None or phone in (None, ""):
        raise GiveSmsError("Incomplete rent order returned by API", response_data=data)
    order_ids = record.get("order_ids")
    return RentOrder(
        order_id=order_id,
        phone=str(phone),
        country_code=record.get("country_code")
        if isinstance(record.get("country_code"), str)
        else None,
        end_time=record.get("end_time") if isinstance(record.get("end_time"), str) else None,
        end_time_timestamp=record.get("end_time_timestamp")
        if isinstance(record.get("end_time_timestamp"), int)
        else None,
        start_timestamp=record.get("start_timestamp")
        if isinstance(record.get("start_timestamp"), int)
        else None,
        orders_count=record.get("orders_count")
        if isinstance(record.get("orders_count"), int)
        else None,
        order_ids=list(order_ids) if isinstance(order_ids, list) else None,
        raw=record,
    )


def parse_rent_sms(data: Any) -> RentSmsList:
    record = as_record(data) or {}
    rows = record.get("sms_list")
    messages: list[RentSmsMessage] = []
    if isinstance(rows, list):
        for item in rows:
            row = as_record(item) or {}
            messages.append(
                RentSmsMessage(
                    date=row.get("date") if isinstance(row.get("date"), str) else None,
                    text=row.get("text") if isinstance(row.get("text"), str) else None,
                    timestamp=row.get("timestamp")
                    if isinstance(row.get("timestamp"), int)
                    else None,
                    raw=row,
                )
            )
    msg = record.get("msg")
    return RentSmsList(
        messages=messages,
        message=msg if isinstance(msg, str) else None,
        raw=record,
    )


def parse_rent_prolong(data: Any) -> RentProlongResult:
    record = as_record(data) or {}
    msg = record.get("msg")
    formatted = record.get("rent_at_formatted")
    return RentProlongResult(
        message=msg if isinstance(msg, str) else None,
        order_id=record.get("order_id"),
        days=record.get("days") if isinstance(record.get("days"), int) else None,
        price=float(record["price"]) if isinstance(record.get("price"), (int, float)) else None,
        rent_at=record.get("rent_at") if isinstance(record.get("rent_at"), int) else None,
        rent_at_formatted=formatted if isinstance(formatted, str) else None,
        raw=record,
    )


def clean_params(params: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in params.items() if value is not None}


def join_services(services: str | list[Any]) -> str:
    if isinstance(services, str):
        return services
    return ",".join(str(item) for item in services)
