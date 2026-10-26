import pytest
from pytest_httpx import HTTPXMock

from give_sms import PARTNER_KEY, GiveSms, GiveSmsError


def test_partner_key_present(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://give-sms.com/api/v1/?method=getbalance&userkey=test_key&partner_key=pk_39579ba6dfd61e59",
        json={"status": 200, "data": {"balance": 120.0}},
    )

    with GiveSms(api_key="test_key") as client:
        assert PARTNER_KEY == "pk_39579ba6dfd61e59"
        bal = client.get_balance()
        assert bal == 120.0


def test_handler_partner_key_present(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://give-sms.com/stubs/handler_api.php?action=getBalance&api_key=test_key&partner_key=pk_39579ba6dfd61e59",
        text="ACCESS_BALANCE:55.20",
    )

    with GiveSms(api_key="test_key") as client:
        bal = client.handler_get_balance()
        assert bal == 55.2


def test_get_balance_error(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://give-sms.com/api/v1/?method=getbalance&userkey=test_key&partner_key=pk_39579ba6dfd61e59",
        json={"status": 401, "data": {"msg": "Bad API key"}},
    )

    with GiveSms(api_key="test_key") as client:
        with pytest.raises(GiveSmsError):
            client.get_balance()


def test_get_count(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://give-sms.com/api/v1/?method=getcount&userkey=test_key&partner_key=pk_39579ba6dfd61e59&country=kazakhstan",
        json={"status": 200, "data": {"vk": 10, "tg": 20}},
    )

    with GiveSms(api_key="test_key") as client:
        res = client.get_count(country="kazakhstan")
        assert res == {"vk": 10, "tg": 20}


def test_get_number(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://give-sms.com/api/v1/?method=getnumber&userkey=test_key&partner_key=pk_39579ba6dfd61e59&service=vk&country=kazakhstan",
        json={"status": 200, "data": {"id": 12345, "number": "+77001112233"}},
    )

    with GiveSms(api_key="test_key") as client:
        res = client.get_number(service="vk", country="kazakhstan")
        assert res.id == 12345
        assert res.number == "+77001112233"


def test_get_code(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://give-sms.com/api/v1/?method=getcode&userkey=test_key&partner_key=pk_39579ba6dfd61e59&id=12345",
        json={"status": 200, "data": {"code": "654321", "status": "OK"}},
    )

    with GiveSms(api_key="test_key") as client:
        res = client.get_code(12345)
        assert res.code == "654321"
        assert res.status == "OK"


def test_lifecycle_methods(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://give-sms.com/api/v1/?method=repeatcode&userkey=test_key&partner_key=pk_39579ba6dfd61e59&id=12345",
        json={"status": 200, "data": "OK"},
    )
    httpx_mock.add_response(
        url="https://give-sms.com/api/v1/?method=cancelnumber&userkey=test_key&partner_key=pk_39579ba6dfd61e59&id=12345",
        json={"status": 200, "data": "OK"},
    )
    httpx_mock.add_response(
        url="https://give-sms.com/api/v1/?method=bannumber&userkey=test_key&partner_key=pk_39579ba6dfd61e59&id=12345",
        json={"status": 200, "data": "OK"},
    )
    httpx_mock.add_response(
        url="https://give-sms.com/api/v1/?method=getreactivationoptions&userkey=test_key&partner_key=pk_39579ba6dfd61e59&id=12345",
        json={"status": 200, "data": {"active": True}},
    )
    httpx_mock.add_response(
        url="https://give-sms.com/api/v1/?method=reactivation&userkey=test_key&partner_key=pk_39579ba6dfd61e59&id=12345",
        json={"status": 200, "data": {"id": 12346}},
    )
    httpx_mock.add_response(
        url="https://give-sms.com/api/v1/?method=getall&userkey=test_key&partner_key=pk_39579ba6dfd61e59",
        json={"status": 200, "data": []},
    )

    with GiveSms(api_key="test_key") as client:
        assert client.repeat_code(12345) is True
        assert client.cancel_number(12345) is True
        assert client.ban_number(12345) is True
        assert client.get_reactivation_options(12345) == {"active": True}
        assert client.reactivate(12345) == {"id": 12346}
        assert client.get_all() == []


def test_handler_methods(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://give-sms.com/stubs/handler_api.php?action=getNumbersStatus&api_key=test_key&partner_key=pk_39579ba6dfd61e59",
        text='{"vk_0": 10}',
    )
    httpx_mock.add_response(
        url="https://give-sms.com/stubs/handler_api.php?action=getNumber&api_key=test_key&partner_key=pk_39579ba6dfd61e59&service=vk",
        text="ACCESS_NUMBER:987:79001234567",
    )
    httpx_mock.add_response(
        url="https://give-sms.com/stubs/handler_api.php?action=setStatus&api_key=test_key&partner_key=pk_39579ba6dfd61e59&id=987&status=1",
        text="ACCESS_READY",
    )
    httpx_mock.add_response(
        url="https://give-sms.com/stubs/handler_api.php?action=getStatus&api_key=test_key&partner_key=pk_39579ba6dfd61e59&id=987",
        text="STATUS_OK:9988",
    )
    httpx_mock.add_response(
        url="https://give-sms.com/stubs/handler_api.php?action=getPrices&api_key=test_key&partner_key=pk_39579ba6dfd61e59",
        text='{"2": {"vk": 15}}',
    )

    with GiveSms(api_key="test_key") as client:
        status_data = client.handler_get_numbers_status()
        assert status_data == {"vk_0": 10}

        num = client.handler_get_number(service="vk")
        assert num.id == "987"
        assert num.number == "79001234567"

        set_st = client.handler_set_status(987, 1)
        assert set_st == "ACCESS_READY"

        st = client.handler_get_status(987)
        assert st.status == "STATUS_OK"
        assert st.code == "9988"

        prices = client.handler_get_prices()
        assert prices == {"2": {"vk": 15}}
