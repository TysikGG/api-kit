import pytest
from pytest_httpx import HTTPXMock

from onlinesim import DEFAULT_DEV_ID, OnlineSim, OnlineSimError


def test_dev_id_present(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://onlinesim.io/api/getNum.php?apikey=test_key&service=telegram&dev_id=9656076&country=7",
        json={"response": "1", "tzid": 998877},
    )

    with OnlineSim(api_key="test_key") as client:
        assert DEFAULT_DEV_ID == 9656076
        order = client.get_num("telegram", country=7)
        assert order.tzid == 998877


def test_get_balance(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://onlinesim.io/api/getBalance.php?apikey=test_key",
        json={"response": "1", "balance": "220.50"},
    )

    with OnlineSim(api_key="test_key") as client:
        bal = client.get_balance()
        assert bal == 220.50


def test_get_tariffs_and_countries(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://onlinesim.io/api/getTariffs.php?apikey=test_key&country=7",
        json={"response": "1", "countries": {}},
    )
    httpx_mock.add_response(
        url="https://onlinesim.io/api/getCountries.php?apikey=test_key",
        json={"response": "1", "countries": []},
    )

    with OnlineSim(api_key="test_key") as client:
        t = client.get_tariffs(7)
        assert t["response"] == "1"
        c = client.get_countries()
        assert c["response"] == "1"


def test_activation_lifecycle(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://onlinesim.io/api/getState.php?apikey=test_key&tzid=123",
        json=[{"tzid": 123, "response": "TZ_NUM_ANSWER", "number": "+79001234567", "msg": "5544"}],
    )
    httpx_mock.add_response(
        url="https://onlinesim.io/api/setOperationOk.php?apikey=test_key&tzid=123",
        json={"response": "1"},
    )
    httpx_mock.add_response(
        url="https://onlinesim.io/api/setOperationRevise.php?apikey=test_key&tzid=123",
        json={"response": "1"},
    )

    with OnlineSim(api_key="test_key") as client:
        states = client.get_state(123)
        assert len(states) == 1
        assert states[0].number == "+79001234567"
        assert states[0].msg == "5544"

        assert client.set_operation_ok(123) is True
        assert client.set_operation_revise(123) is True


def test_error_handling(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://onlinesim.io/api/getBalance.php?apikey=test_key",
        json={"response": "ERROR_WRONG_KEY"},
    )

    with OnlineSim(api_key="test_key") as client:
        with pytest.raises(OnlineSimError) as exc_info:
            client.get_balance()
        assert exc_info.value.code == "ERROR_WRONG_KEY"


def test_rent_methods(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://onlinesim.io/api/getRentNum.php?apikey=test_key&country=7&days=1&dev_id=9656076",
        json={"response": "1", "tzid": 4455},
    )
    httpx_mock.add_response(
        url="https://onlinesim.io/api/getRentTariffs.php?apikey=test_key",
        json={"response": "1"},
    )
    httpx_mock.add_response(
        url="https://onlinesim.io/api/getRentState.php?apikey=test_key&tzid=4455",
        json={"response": "1"},
    )
    httpx_mock.add_response(
        url="https://onlinesim.io/api/closeRentNum.php?apikey=test_key&tzid=4455",
        json={"response": "1"},
    )

    with OnlineSim(api_key="test_key") as client:
        rent = client.get_rent_num(7, days=1)
        assert rent["tzid"] == 4455
        assert client.get_rent_tariffs() == {"response": "1"}
        assert client.get_rent_state(4455) == {"response": "1"}
        assert client.close_rent_num(4455) is True
