import pytest
from pytest_httpx import HTTPXMock

from sms_man import DEFAULT_REF, SmsMan, SmsManError


def test_ref_present(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.sms-man.com/control/get-number?token=test_token&country_id=1&application_id=1&ref=s_iNhkmN48Jf",
        json={"request_id": 9988, "number": "+79001112233"},
    )

    with SmsMan(token="test_token") as client:
        assert DEFAULT_REF == "s_iNhkmN48Jf"
        order = client.get_number(country_id=1, application_id=1)
        assert order.request_id == 9988
        assert order.number == "+79001112233"


def test_get_balance(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.sms-man.com/control/get-balance?token=test_token",
        json={"balance": "350.75"},
    )

    with SmsMan(token="test_token") as client:
        bal = client.get_balance()
        assert bal == 350.75


def test_directory_methods(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.sms-man.com/control/limits?token=test_token&country_id=1",
        json={"count": 50},
    )
    httpx_mock.add_response(
        url="https://api.sms-man.com/control/get-prices?token=test_token&country_id=1",
        json={"1": 15},
    )
    httpx_mock.add_response(
        url="https://api.sms-man.com/control/countries?token=test_token",
        json={"1": {"title": "Russia"}},
    )
    httpx_mock.add_response(
        url="https://api.sms-man.com/control/applications?token=test_token",
        json={"1": {"title": "Telegram"}},
    )

    with SmsMan(token="test_token") as client:
        assert client.get_limits(country_id=1) == {"count": 50}
        assert client.get_prices(country_id=1) == {"1": 15}
        assert client.get_countries() == {"1": {"title": "Russia"}}
        assert client.get_applications() == {"1": {"title": "Telegram"}}


def test_order_lifecycle(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.sms-man.com/control/get-sms?token=test_token&request_id=123",
        json={"sms_code": "443322"},
    )
    httpx_mock.add_response(
        url="https://api.sms-man.com/control/set-status?token=test_token&request_id=123&status=reject",
        json={"success": True},
    )

    with SmsMan(token="test_token") as client:
        res = client.get_sms(123)
        assert res.sms_code == "443322"
        assert client.set_status(123, "reject") is True


def test_handler_methods(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.sms-man.com/stubs/handler_api.php?action=getBalance&api_key=test_token",
        text="ACCESS_BALANCE:75.00",
    )
    httpx_mock.add_response(
        url="https://api.sms-man.com/stubs/handler_api.php?action=getNumber&api_key=test_token&country=1&service=tg&ref=s_iNhkmN48Jf",
        text="ACCESS_NUMBER:5544:79008887766",
    )
    httpx_mock.add_response(
        url="https://api.sms-man.com/stubs/handler_api.php?action=getStatus&api_key=test_token&id=5544",
        text="STATUS_OK:1212",
    )
    httpx_mock.add_response(
        url="https://api.sms-man.com/stubs/handler_api.php?action=setStatus&api_key=test_token&id=5544&status=1",
        text="ACCESS_READY",
    )
    httpx_mock.add_response(
        url="https://api.sms-man.com/stubs/handler_api.php?action=getPrices&api_key=test_token&country=1",
        text='{"1": {"tg": 10}}',
    )

    with SmsMan(token="test_token") as client:
        assert client.handler_get_balance() == 75.00
        order = client.handler_get_number(1, "tg")
        assert order.request_id == 5544
        assert order.number == "79008887766"
        st = client.handler_get_status(5544)
        assert st.status == "STATUS_OK"
        assert st.code == "1212"
        assert client.handler_set_status(5544, 1) == "ACCESS_READY"
        assert client.handler_get_prices(1) == {"1": {"tg": 10}}


def test_error_handling(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.sms-man.com/control/get-balance?token=test_token",
        json={"success": False, "error_code": "wrong_token", "error_msg": "Wrong token!"},
    )

    with SmsMan(token="test_token") as client:
        with pytest.raises(SmsManError) as exc_info:
            client.get_balance()
        assert exc_info.value.code == "wrong_token"
