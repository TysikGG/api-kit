"""Pure helpers: payload builders, response parsers, and the XML rates reader."""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from typing import Any

from .errors import FixedFloatError

# Imported lazily inside functions that build models to keep import cycles out.
# types.py imports order_status_text from this module, so model imports stay local.

DEFAULT_REFCODE = "gfc1h2fb"

ORDER_STATUS_TEXT: dict[str, str] = {
    "NEW": "New order",
    "PENDING": "Transaction received, pending confirmation",
    "EXCHANGE": "Transaction confirmed, exchange in progress",
    "WITHDRAW": "Sending funds",
    "DONE": "Order completed",
    "EXPIRED": "Order expired",
    "EMERGENCY": "Emergency, customer choice required",
}

TERMINAL_ORDER_STATUSES: tuple[str, ...] = ("DONE", "EXPIRED", "EMERGENCY")

PRICE_ERROR_TEXT: dict[str, str] = {
    "MAINTENANCE_FROM": "Currency being sent is under maintenance",
    "MAINTENANCE_TO": "Currency being received is under maintenance",
    "OFFLINE_FROM": "Currency being sent is offline",
    "OFFLINE_TO": "Currency being received is offline",
    "RESERVE_FROM": "Not enough reserves of the currency being sent",
    "RESERVE_TO": "Not enough reserves of the currency being received",
    "LIMIT_MIN": "Amount is below the minimum",
    "LIMIT_MAX": "Amount is above the maximum",
}

_AMOUNT_CODE = re.compile(r"^\s*([0-9]*\.?[0-9]+)\s+([A-Za-z0-9]+)\s*$")
_CODE_ONLY = re.compile(r"^\s*([A-Za-z0-9]+)\s*$")


def order_status_text(status: str) -> str:
    """Label for an order status. Unknown statuses are returned unchanged."""
    return ORDER_STATUS_TEXT.get(status, status)


def assert_quote_ok(price: Any) -> None:
    """Raise when a quote lists problems that would block order creation."""
    errors = list(getattr(price, "errors", None) or [])
    if not errors:
        return
    details = "; ".join(PRICE_ERROR_TEXT.get(code, code) for code in errors)
    raise FixedFloatError(f"Quote is not exchangeable: {details}", code=0, data=errors)


def parse_price_shorthand(
    from_expr: str,
    to_expr: str,
    order_type: str = "float",
) -> dict[str, Any]:
    """Parse ``'0.1 ETH', 'BTC'`` or ``'ETH', '0.1 BTC'`` into price fields."""
    from_amount = _AMOUNT_CODE.match(from_expr)
    to_amount = _AMOUNT_CODE.match(to_expr)
    from_code = _CODE_ONLY.match(from_expr)
    to_code = _CODE_ONLY.match(to_expr)

    if from_amount and to_code and not to_amount:
        return {
            "from_ccy": from_amount.group(2).upper(),
            "to_ccy": to_code.group(1).upper(),
            "amount": float(from_amount.group(1)),
            "direction": "from",
            "order_type": order_type,
        }
    if from_code and to_amount and not from_amount:
        return {
            "from_ccy": from_code.group(1).upper(),
            "to_ccy": to_amount.group(2).upper(),
            "amount": float(to_amount.group(1)),
            "direction": "to",
            "order_type": order_type,
        }
    raise FixedFloatError("Price shorthand must look like '0.1 ETH', 'BTC' or 'ETH', '0.1 BTC'")


def price_payload(
    from_ccy: str,
    to_ccy: str,
    amount: float,
    direction: str,
    order_type: str,
    afftax: float | None,
    ccies: bool | None,
    usd: bool | None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "fromCcy": from_ccy,
        "toCcy": to_ccy,
        "amount": amount,
        "direction": direction,
        "type": order_type,
        "refcode": DEFAULT_REFCODE,
    }
    if afftax is not None:
        payload["afftax"] = afftax
    if ccies is not None:
        payload["ccies"] = ccies
    if usd is not None:
        payload["usd"] = usd
    return payload


def create_payload(
    from_ccy: str,
    to_ccy: str,
    amount: float,
    to_address: str,
    direction: str,
    order_type: str,
    extra_id: str | None,
    refund_address: str | None,
    refund_extra_id: str | None,
    afftax: float | None,
    tag: str | None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "fromCcy": from_ccy,
        "toCcy": to_ccy,
        "amount": amount,
        "direction": direction,
        "type": order_type,
        "toAddress": to_address,
        "refcode": DEFAULT_REFCODE,
    }
    if tag is not None:
        payload["tag"] = tag
    elif extra_id is not None:
        payload["tag"] = extra_id
    if extra_id is not None:
        payload["extraId"] = extra_id
    if refund_address is not None:
        payload["refundAddress"] = refund_address
    if refund_extra_id is not None:
        payload["refundExtraId"] = refund_extra_id
    if afftax is not None:
        payload["afftax"] = afftax
    return payload


def emergency_payload(
    order_id: str,
    token: str,
    choice: str,
    address: str | None,
    extra_id: str | None,
    tag: str | None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"id": order_id, "token": token, "choice": choice}
    if address is not None:
        payload["address"] = address
    if tag is not None:
        payload["tag"] = tag
    elif extra_id is not None:
        payload["tag"] = extra_id
    if extra_id is not None:
        payload["extraId"] = extra_id
    return payload


def _as_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    return str(value)


def _optional_str(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def parse_currencies(raw: Any) -> list[Any]:
    from .types import Currency

    result: list[Currency] = []
    if not isinstance(raw, list):
        return result
    for item in raw:
        if not isinstance(item, dict):
            continue
        result.append(
            Currency(
                code=_as_str(item.get("code")),
                coin=_as_str(item.get("coin")),
                network=_as_str(item.get("network")),
                name=_as_str(item.get("name")),
                recv=int(item.get("recv") or 0),
                send=int(item.get("send") or 0),
                tag=item.get("tag"),
                logo=_as_str(item.get("logo")),
                color=_as_str(item.get("color")),
                priority=int(item.get("priority") or 0),
                contract=item.get("contract"),
            )
        )
    return result


def find_currency(currencies: list[Any], code: str) -> Any | None:
    """Return the first currency whose code matches, ignoring case."""
    target = code.lower()
    for currency in currencies:
        if str(getattr(currency, "code", "")).lower() == target:
            return currency
    return None


def _parse_price_side(data: dict[str, Any]) -> Any:
    from .types import PriceSide

    precision = data.get("precision")
    return PriceSide(
        code=_as_str(data.get("code")),
        network=_as_str(data.get("network")),
        coin=_as_str(data.get("coin")),
        amount=_as_str(data.get("amount")),
        rate=_as_str(data.get("rate")),
        min=_as_str(data.get("min")),
        max=_as_str(data.get("max")),
        precision=int(precision) if precision is not None else None,
        usd=_optional_str(data.get("usd")),
        btc=_optional_str(data.get("btc")),
    )


def parse_price(data: Any) -> Any:
    from .types import PriceCurrency, PriceResult

    if not isinstance(data, dict):
        raise FixedFloatError("Price response was not an object", data=data)
    ccies_raw = data.get("ccies")
    ccies = None
    if isinstance(ccies_raw, list):
        ccies = [
            PriceCurrency(
                code=_as_str(item.get("code")),
                recv=bool(item.get("recv")),
                send=bool(item.get("send")),
            )
            for item in ccies_raw
            if isinstance(item, dict)
        ]
    errors = data.get("errors")
    return PriceResult(
        from_side=_parse_price_side(data.get("from") or {}),
        to_side=_parse_price_side(data.get("to") or {}),
        errors=list(errors) if isinstance(errors, list) else None,
        ccies=ccies,
    )


def _parse_tx(raw: Any) -> Any | None:
    from .types import OrderTx

    if not isinstance(raw, dict):
        return None
    return OrderTx(
        id=raw.get("id"),
        amount=_optional_str(raw.get("amount")) if "amount" in raw else None,
        fee=_optional_str(raw.get("fee")) if "fee" in raw else None,
        ccyfee=_optional_str(raw.get("ccyfee")) if "ccyfee" in raw else None,
        time_reg=raw.get("timeReg"),
        time_block=raw.get("timeBlock"),
        confirmations=raw.get("confirmations"),
    )


def _parse_side(data: dict[str, Any]) -> Any:
    from .types import OrderSide

    tag = data.get("tag")
    extra = data.get("extraId")
    return OrderSide(
        code=_as_str(data.get("code")),
        network=_as_str(data.get("network")),
        coin=_as_str(data.get("coin")),
        amount=_as_str(data.get("amount")),
        address=data.get("address"),
        extra_id=extra if extra is not None else tag,
        tx=_parse_tx(data.get("tx")),
        name=data.get("name"),
        alias=data.get("alias"),
        tag=tag if tag is not None else extra,
        address_mix=data.get("addressMix"),
        req_confirmations=data.get("reqConfirmations"),
        max_confirmations=data.get("maxConfirmations"),
    )


def parse_order(data: Any) -> Any:
    from .types import Order, OrderEmergency, OrderTime

    if not isinstance(data, dict):
        raise FixedFloatError("Order response was not an object", data=data)
    time_data = data.get("time") or {}
    if not isinstance(time_data, dict):
        time_data = {}
    emergency_raw = data.get("emergency")
    emergency = None
    if isinstance(emergency_raw, dict):
        status = emergency_raw.get("status") or []
        emergency = OrderEmergency(
            status=list(status) if isinstance(status, list) else [str(status)],
            choice=emergency_raw.get("choice"),
            repeat=emergency_raw.get("repeat"),
        )
    back_raw = data.get("back")
    return Order(
        id=_as_str(data.get("id")),
        type=_as_str(data.get("type"), "float"),
        status=_as_str(data.get("status")),
        time=OrderTime(
            reg=int(time_data.get("reg") or 0),
            start=time_data.get("start"),
            finish=time_data.get("finish"),
            update=time_data.get("update"),
            expiration=time_data.get("expiration"),
            left=time_data.get("left"),
        ),
        from_side=_parse_side(data.get("from") or {}),
        to_side=_parse_side(data.get("to") or {}),
        token=_as_str(data.get("token")),
        email=data.get("email"),
        back=_parse_side(back_raw) if isinstance(back_raw, dict) else None,
        emergency=emergency,
    )


def _qr_code(item: dict[str, Any]) -> Any:
    from .types import QrCode

    return QrCode(
        title=_as_str(item.get("title")),
        src=_as_str(item.get("src")),
        checked=bool(item.get("checked")),
    )


def parse_qr(data: Any) -> Any:
    from .types import QrResult

    if isinstance(data, list):
        codes = [_qr_code(item) for item in data if isinstance(item, dict)]
        selected = next((code for code in codes if code.checked), codes[0] if codes else None)
        return QrResult(
            src=selected.src if selected else "",
            raw=data,
            title=selected.title if selected else None,
            checked=selected.checked if selected else None,
            codes=codes,
        )
    if isinstance(data, dict):
        src = _as_str(data.get("src"))
        codes_raw = data.get("codes")
        if isinstance(codes_raw, list):
            codes = [_qr_code(item) for item in codes_raw if isinstance(item, dict)]
        elif src:
            codes = [_qr_code({"title": data.get("title") or "", "src": src, "checked": True})]
        else:
            codes = []
        return QrResult(
            src=src,
            raw=data,
            title=data.get("title"),
            checked=data.get("checked"),
            codes=codes,
        )
    return QrResult(src=_as_str(data) if data is not None else "", raw=data, codes=[])


def parse_rates_xml(xml: str) -> list[Any]:
    from .types import RateItem

    try:
        root = ET.fromstring(xml)
    except ET.ParseError as exc:
        raise FixedFloatError(f"Failed to parse rates XML: {exc}") from exc

    def text(parent: ET.Element, tag: str) -> str:
        element = parent.find(tag)
        if element is None or element.text is None:
            return ""
        return element.text.strip()

    items: list[RateItem] = []
    nodes = root.findall("item")
    if root.tag == "item":
        nodes = [root]
    for node in nodes:
        items.append(
            RateItem(
                from_ccy=text(node, "from"),
                to_ccy=text(node, "to"),
                in_amount=text(node, "in"),
                out_amount=text(node, "out"),
                amount=text(node, "amount"),
                to_fee=text(node, "tofee"),
                min_amount=text(node, "minamount"),
                max_amount=text(node, "maxamount"),
            )
        )
    if not items and root.tag != "rates":
        raise FixedFloatError("Failed to parse rates XML")
    return items


def filter_rates(items: list[Any], from_ccy: str | None, to_ccy: str | None) -> list[Any]:
    source = from_ccy.upper() if from_ccy else None
    target = to_ccy.upper() if to_ccy else None
    selected = []
    for item in items:
        if source and str(item.from_ccy).upper() != source:
            continue
        if target and str(item.to_ccy).upper() != target:
            continue
        selected.append(item)
    return selected
