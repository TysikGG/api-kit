import pytest
from pytest_httpx import HTTPXMock

from xmlstock import DEFAULT_SOFT_ID, XmlStockClient, XmlStockError


def test_default_soft_id() -> None:
    assert DEFAULT_SOFT_ID == "7ee4fabf80ee75b2c5bfa100f8fe169f"


def test_init_validation() -> None:
    with pytest.raises(XmlStockError):
        XmlStockClient(user="", api_key="test_key")

    with pytest.raises(XmlStockError):
        XmlStockClient(user="12345", api_key="")


def test_context_manager() -> None:
    with XmlStockClient(user="12345", api_key="test_key") as client:
        assert client.user == "12345"


def test_get_balance_success(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://xmlstock.com/api/?do=balance&user=12345&key=test_key&soft_id=7ee4fabf80ee75b2c5bfa100f8fe169f",
        json={"balance": 350.5, "currency": "RUB"},
    )

    with XmlStockClient(user="12345", api_key="test_key") as client:
        res = client.get_balance()
        assert res["balance"] == 350.5
        assert res["currency"] == "RUB"


def test_get_balance_error_code(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://xmlstock.com/api/?do=balance&user=12345&key=test_key&soft_id=7ee4fabf80ee75b2c5bfa100f8fe169f",
        text="ERROR_VERIFICATION_KEY",
    )

    with XmlStockClient(user="12345", api_key="test_key") as client:
        with pytest.raises(XmlStockError) as exc_info:
            client.get_balance()
        assert "ERROR_VERIFICATION_KEY" in str(exc_info.value)


def test_get_balance_json_error(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://xmlstock.com/api/?do=balance&user=12345&key=test_key&soft_id=7ee4fabf80ee75b2c5bfa100f8fe169f",
        json={"error": "Access denied"},
    )

    with XmlStockClient(user="12345", api_key="test_key") as client:
        with pytest.raises(XmlStockError) as exc_info:
            client.get_balance()
        assert "Access denied" in str(exc_info.value)


def test_search_yandex_success(httpx_mock: HTTPXMock) -> None:
    mock_xml = "<yandexsearch><response><results/></response></yandexsearch>"
    httpx_mock.add_response(
        url="https://xmlstock.com/yandex/xml/?user=12345&key=test_key&query=buy+coffee&soft_id=7ee4fabf80ee75b2c5bfa100f8fe169f&lr=213",
        text=mock_xml,
    )

    with XmlStockClient(user="12345", api_key="test_key") as client:
        xml = client.search_yandex("buy coffee", lr=213)
        assert xml == mock_xml


def test_search_yandex_empty_query() -> None:
    with XmlStockClient(user="12345", api_key="test_key") as client:
        with pytest.raises(XmlStockError):
            client.search_yandex("")


def test_search_yandex_error_xml(httpx_mock: HTTPXMock) -> None:
    error_xml = (
        '<yandexsearch><response>'
        '<error code="15">No results found</error>'
        '</response></yandexsearch>'
    )
    httpx_mock.add_response(
        url="https://xmlstock.com/yandex/xml/?user=12345&key=test_key&query=unknown&soft_id=7ee4fabf80ee75b2c5bfa100f8fe169f",
        text=error_xml,
    )

    with XmlStockClient(user="12345", api_key="test_key") as client:
        with pytest.raises(XmlStockError) as exc_info:
            client.search_yandex("unknown")
        assert exc_info.value.code == "15"


def test_search_yandex_live_success(httpx_mock: HTTPXMock) -> None:
    mock_xml = "<yandexsearch><response><results/></response></yandexsearch>"
    httpx_mock.add_response(
        url="https://xmlstock.com/yandexlive/xml/?user=12345&key=test_key&query=live+query&soft_id=7ee4fabf80ee75b2c5bfa100f8fe169f",
        text=mock_xml,
    )

    with XmlStockClient(user="12345", api_key="test_key") as client:
        xml = client.search_yandex_live("live query")
        assert xml == mock_xml


def test_search_google_success(httpx_mock: HTTPXMock) -> None:
    mock_xml = "<googlesearch><response><results/></response></googlesearch>"
    httpx_mock.add_response(
        url="https://xmlstock.com/google/xml/?user=12345&key=test_key&query=python+testing&soft_id=7ee4fabf80ee75b2c5bfa100f8fe169f&domain=com",
        text=mock_xml,
    )

    with XmlStockClient(user="12345", api_key="test_key") as client:
        xml = client.search_google("python testing", domain="com")
        assert xml == mock_xml


def test_search_google_error_xml(httpx_mock: HTTPXMock) -> None:
    error_xml = (
        '<googlesearch><response>'
        '<error code="32">Limit exceeded</error>'
        '</response></googlesearch>'
    )
    httpx_mock.add_response(
        url="https://xmlstock.com/google/xml/?user=12345&key=test_key&query=rate+limit&soft_id=7ee4fabf80ee75b2c5bfa100f8fe169f",
        text=error_xml,
    )

    with XmlStockClient(user="12345", api_key="test_key") as client:
        with pytest.raises(XmlStockError) as exc_info:
            client.search_google("rate limit")
        assert exc_info.value.code == "32"


def test_get_wordstat_success(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://xmlstock.com/wordstat/json/?user=12345&key=test_key&words=kw1%2Ckw2&pagetype=words&soft_id=7ee4fabf80ee75b2c5bfa100f8fe169f",
        json={"success": True, "data": []},
    )

    with XmlStockClient(user="12345", api_key="test_key") as client:
        res = client.get_wordstat(["kw1", "kw2"])
        assert res["success"] is True


def test_get_wordstat_error(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://xmlstock.com/wordstat/json/?user=12345&key=test_key&words=kw1&pagetype=words&soft_id=7ee4fabf80ee75b2c5bfa100f8fe169f",
        json={"error": {"code": 100, "message": "Invalid credentials"}},
    )

    with XmlStockClient(user="12345", api_key="test_key") as client:
        with pytest.raises(XmlStockError) as exc_info:
            client.get_wordstat("kw1")
        assert exc_info.value.code == "100"
