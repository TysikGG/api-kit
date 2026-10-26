"""Tests for FixedFloat API client."""

import hashlib
import hmac
import json

import pytest
from pytest_httpx import HTTPXMock

from fixedfloat import DEFAULT_REFCODE, FixedFloat, FixedFloatError


def test_default_constant():
    assert DEFAULT_REFCODE == "gfc1h2fb"


def test_signature_and_headers(httpx_mock: HTTPXMock):
    api_key = "test-key"
    api_secret = "test-secret"
    client = FixedFloat(api_key=api_key, api_secret=api_secret)

    httpx_mock.add_response(
        url="https://ff.io/api/v2/ccies",
        json={"code": 0, "msg": "OK", "data": []},
    )

    client.get_currencies()
    request = httpx_mock.get_request()
    assert request is not None
    assert request.headers["X-API-KEY"] == api_key

    content = request.read().decode("utf-8")
    expected_sign = hmac.new(
        api_secret.encode("utf-8"),
        content.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    assert request.headers["X-API-SIGN"] == expected_sign


def test_get_currencies(httpx_mock: HTTPXMock):
    client = FixedFloat()
    mock_data = [
        {
            "code": "BTC",
            "coin": "BTC",
            "network": "BTC",
            "name": "Bitcoin",
            "recv": 1,
            "send": 1,
            "tag": None,
            "logo": "https://ff.io/btc.svg",
            "color": "#f7931a",
            "priority": 1,
        }
    ]
    httpx_mock.add_response(
        url="https://ff.io/api/v2/ccies",
        json={"code": 0, "msg": "OK", "data": mock_data},
    )

    currencies = client.get_currencies()
    assert len(currencies) == 1
    assert currencies[0].code == "BTC"
    assert currencies[0].name == "Bitcoin"


def test_get_price_includes_refcode_and_afftax(httpx_mock: HTTPXMock):
    client = FixedFloat()
    mock_data = {
        "from": {
            "code": "BTC",
            "network": "BTC",
            "coin": "BTC",
            "amount": "0.1",
            "rate": "1",
            "min": "0.001",
            "max": "2",
        },
        "to": {
            "code": "ETH",
            "network": "ETH",
            "coin": "ETH",
            "amount": "3.25",
            "rate": "32.5",
            "min": "0.02",
            "max": "40",
        },
    }
    httpx_mock.add_response(
        url="https://ff.io/api/v2/price",
        json={"code": 0, "msg": "OK", "data": mock_data},
    )

    price = client.get_price("BTC", "ETH", 0.1, afftax=0.5)
    request = httpx_mock.get_request()
    assert request is not None
    body = json.loads(request.read())
    assert body["refcode"] == "gfc1h2fb"
    assert body["afftax"] == 0.5
    assert body["fromCcy"] == "BTC"
    assert body["toCcy"] == "ETH"
    assert price.to_side.amount == "3.25"


def test_create_order_includes_refcode(httpx_mock: HTTPXMock):
    client = FixedFloat()
    mock_data = {
        "id": "ORD12345",
        "type": "float",
        "status": "NEW",
        "time": {"reg": 1700000000},
        "from": {"code": "BTC", "network": "BTC", "coin": "BTC", "amount": "0.1"},
        "to": {
            "code": "ETH",
            "network": "ETH",
            "coin": "ETH",
            "amount": "3.25",
            "address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        },
        "token": "SEC_TOKEN_XYZ",
    }
    httpx_mock.add_response(
        url="https://ff.io/api/v2/create",
        json={"code": 0, "msg": "OK", "data": mock_data},
    )

    order = client.create_order(
        from_ccy="BTC",
        to_ccy="ETH",
        amount=0.1,
        to_address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    )
    request = httpx_mock.get_request()
    assert request is not None
    body = json.loads(request.read())
    assert body["refcode"] == "gfc1h2fb"
    assert body["toAddress"] == "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
    assert order.id == "ORD12345"
    assert order.token == "SEC_TOKEN_XYZ"


def test_get_order(httpx_mock: HTTPXMock):
    client = FixedFloat()
    mock_data = {
        "id": "ORD12345",
        "type": "float",
        "status": "DONE",
        "time": {"reg": 1700000000, "finish": 1700001000},
        "from": {"code": "BTC", "network": "BTC", "coin": "BTC", "amount": "0.1"},
        "to": {
            "code": "ETH",
            "network": "ETH",
            "coin": "ETH",
            "amount": "3.25",
            "address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        },
        "token": "SEC_TOKEN_XYZ",
    }
    httpx_mock.add_response(
        url="https://ff.io/api/v2/order",
        json={"code": 0, "msg": "OK", "data": mock_data},
    )

    order = client.get_order("ORD12345", "SEC_TOKEN_XYZ")
    assert order.status == "DONE"
    assert order.id == "ORD12345"


def test_emergency_email_and_qr(httpx_mock: HTTPXMock):
    client = FixedFloat()
    httpx_mock.add_response(
        url="https://ff.io/api/v2/emergency",
        json={"code": 0, "msg": "OK", "data": True},
    )
    httpx_mock.add_response(
        url="https://ff.io/api/v2/setEmail",
        json={"code": 0, "msg": "OK", "data": True},
    )
    httpx_mock.add_response(
        url="https://ff.io/api/v2/qr",
        json={"code": 0, "msg": "OK", "data": {"src": "data:image/png;base64,..."}},
    )

    assert client.set_emergency("ORD123", "TOK", choice="REFUND") is True
    assert client.set_email("ORD123", "TOK", "test@example.com") is True
    qr = client.get_qr("ORD123", "TOK")
    assert qr.src.startswith("data:image/png")


def test_api_error_raised(httpx_mock: HTTPXMock):
    client = FixedFloat()
    httpx_mock.add_response(
        url="https://ff.io/api/v2/price",
        json={"code": 101, "msg": "Invalid pair", "data": None},
    )

    with pytest.raises(FixedFloatError) as exc_info:
        client.get_price("BTC", "INVALID", 1.0)
    assert exc_info.value.code == 101
    assert "Invalid pair" in str(exc_info.value)
