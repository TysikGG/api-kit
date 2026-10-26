"""Unit tests for the SmsBowerClient."""

import httpx
import pytest
from pytest_httpx import HTTPXMock

from smsbower import DEFAULT_REF_ID, SmsBowerClient, SmsBowerError


def test_init_validation() -> None:
    with pytest.raises(SmsBowerError):
        SmsBowerClient(api_key="")


def test_get_balance(httpx_mock: HTTPXMock) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert "action=getBalance" in str(request.url)
        assert "api_key=test_key" in str(request.url)
        return httpx.Response(status_code=200, text="ACCESS_BALANCE:19.45")

    httpx_mock.add_callback(handler)

    client = SmsBowerClient(api_key="test_key")
    balance = client.get_balance()
    assert balance == 19.45


def test_get_balance_bad_key(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(text="BAD_KEY")

    client = SmsBowerClient(api_key="wrong_key")
    with pytest.raises(SmsBowerError) as exc_info:
        client.get_balance()
    assert exc_info.value.code == "BAD_KEY"


def test_get_number(httpx_mock: HTTPXMock) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        url_str = str(request.url)
        assert "action=getNumber" in url_str
        assert "service=tg" in url_str
        assert f"ref={DEFAULT_REF_ID}" in url_str
        assert "ref=572438" in url_str
        return httpx.Response(status_code=200, text="ACCESS_NUMBER:102030:19998887766")

    httpx_mock.add_callback(handler)

    client = SmsBowerClient(api_key="test_key")
    number = client.get_number(service="tg")
    assert number.id == "102030"
    assert number.number == "19998887766"


def test_get_number_v2(httpx_mock: HTTPXMock) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        url_str = str(request.url)
        assert "action=getNumberV2" in url_str
        assert f"ref={DEFAULT_REF_ID}" in url_str
        return httpx.Response(
            status_code=200,
            json={
                "activationId": 102030,
                "phoneNumber": "19998887766",
                "activationCost": 0.5,
            },
        )

    httpx_mock.add_callback(handler)

    client = SmsBowerClient(api_key="test_key")
    order = client.get_number_v2(service="tg")
    assert order["activationId"] == 102030
    assert order["activationCost"] == 0.5


def test_get_status(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(text="STATUS_OK:554433")

    client = SmsBowerClient(api_key="test_key")
    status = client.get_status("102030")
    assert status.status == "STATUS_OK"
    assert status.code == "554433"


def test_set_status(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(text="ACCESS_ACTIVATION")

    client = SmsBowerClient(api_key="test_key")
    resp = client.set_status("102030", 6)
    assert resp == "ACCESS_ACTIVATION"


def test_get_prices(httpx_mock: HTTPXMock) -> None:
    sample = {"22": {"tg": {"cost": 1.2, "count": 100}}}
    httpx_mock.add_response(json=sample)

    client = SmsBowerClient(api_key="test_key")
    prices = client.get_prices(service="tg", country="22")
    assert prices["22"]["tg"]["cost"] == 1.2


def test_get_services_list(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"services": [{"code": "tg", "name": "Telegram"}]})

    client = SmsBowerClient(api_key="test_key")
    services = client.get_services_list()
    assert len(services) == 1
    assert services[0].code == "tg"


def test_get_countries(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"22": {"id": "22", "eng": "India"}})

    client = SmsBowerClient(api_key="test_key")
    countries = client.get_countries()
    assert "22" in countries
    assert countries["22"].eng == "India"


def test_get_actual_wallet_address(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"wallet_address": "TXYZ12345"})

    client = SmsBowerClient(api_key="test_key")
    addr = client.get_actual_wallet_address("usdt", "tron")
    assert addr == "TXYZ12345"
