"""Unit tests for the VakSmsClient."""

import httpx
import pytest
from pytest_httpx import HTTPXMock

from vak_sms import VakSmsClient, VakSmsError


def test_init_validation() -> None:
    with pytest.raises(VakSmsError):
        VakSmsClient(api_key="")


def test_get_balance(httpx_mock: HTTPXMock) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert "/api/getBalance/" in str(request.url)
        assert "apiKey=test_key" in str(request.url)
        return httpx.Response(status_code=200, json={"balance": 350.25})

    httpx_mock.add_callback(handler)

    client = VakSmsClient(api_key="test_key")
    balance = client.get_balance()
    assert balance == 350.25


def test_get_balance_api_key_not_found(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"error": "apiKeyNotFound"})

    client = VakSmsClient(api_key="wrong_key")
    with pytest.raises(VakSmsError) as exc_info:
        client.get_balance()
    assert exc_info.value.code == "apiKeyNotFound"


def test_get_number(httpx_mock: HTTPXMock) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        url_str = str(request.url)
        assert "/api/getNumber/" in url_str
        assert "service=tg" in url_str
        assert "country=ru" in url_str
        return httpx.Response(status_code=200, json={"tel": "79998887766", "idNum": "act_1020"})

    httpx_mock.add_callback(handler)

    client = VakSmsClient(api_key="test_key")
    num = client.get_number(service="tg", country="ru")
    assert num.tel == "79998887766"
    assert num.id_num == "act_1020"


def test_get_number_passes_soft_id(httpx_mock: HTTPXMock) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        url_str = str(request.url)
        assert "softId=custom_soft" in url_str
        return httpx.Response(status_code=200, json={"tel": "79998887766", "idNum": "act_1020"})

    httpx_mock.add_callback(handler)

    client = VakSmsClient(api_key="test_key", soft_id="custom_soft")
    num = client.get_number(service="tg")
    assert num.id_num == "act_1020"


def test_prolong_number(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"tel": "79998887766", "idNum": "act_prolonged"})

    client = VakSmsClient(api_key="test_key")
    num = client.prolong_number("tg", "79998887766")
    assert num.id_num == "act_prolonged"


def test_get_sms_code(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"smsCode": "443322"})

    client = VakSmsClient(api_key="test_key")
    code = client.get_sms_code("act_1020")
    assert code == "443322"


def test_set_status(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"status": "update"})

    client = VakSmsClient(api_key="test_key")
    res = client.set_status("act_1020", "end")
    assert res == "update"


def test_get_count_number(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"tg": 150, "price": 12.5})

    client = VakSmsClient(api_key="test_key")
    count = client.get_count_number("tg", country="ru")
    assert count.service == "tg"
    assert count.count == 150
    assert count.price == 12.5


def test_get_country_list(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        json=[{"countryName": "Russia", "countryCode": "ru", "operatorList": ["megafon"]}]
    )

    client = VakSmsClient(api_key="test_key")
    countries = client.get_country_list()
    assert len(countries) == 1
    assert countries[0].country_code == "ru"


def test_get_count_numbers_list(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"tg": [{"count": 50, "price": 10}]})

    client = VakSmsClient(api_key="test_key")
    catalog = client.get_count_numbers_list("ru")
    assert "tg" in catalog
