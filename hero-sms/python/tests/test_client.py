"""Unit tests for the HeroSMS client."""

import pytest
from pytest_httpx import HTTPXMock

from hero_sms import (
    DEFAULT_REF,
    AccountInactiveError,
    ActivationNotFoundError,
    ActivationStatusCode,
    ApiJsonError,
    AuthenticationError,
    BannedError,
    ChannelsLimitError,
    EarlyCancelError,
    HeroSMS,
    HeroSMSError,
    NoBalanceError,
    NoNumbersError,
    WrongMaxPriceError,
)

BASE_URL = "https://hero-sms.com/stubs/handler_api.php"


def test_init_validation() -> None:
    """Test constructor validates key and options."""
    with pytest.raises(HeroSMSError):
        HeroSMS(api_key="")

    with pytest.raises(HeroSMSError):
        HeroSMS(api_key="   ")

    with HeroSMS(api_key="secret") as client:
        assert client.api_key == "secret"


def test_referrer_parameter(httpx_mock: HTTPXMock) -> None:
    """Outgoing requests must include the partner ref in number requests."""
    client = HeroSMS(api_key="secret")

    # get_number
    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getNumber&service=tg&country=2&ref={DEFAULT_REF}",
        text="ACCESS_NUMBER:1001:79998887766",
    )
    res = client.get_number(service="tg", country=2)
    assert res["activation_id"] == 1001
    assert res["phone_number"] == "79998887766"

    # get_number_v2
    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getNumberV2&service=tg&country=2&ref={DEFAULT_REF}",
        json={"activationId": "1001", "phoneNumber": "79998887766"},
    )
    v2 = client.get_number_v2(service="tg", country=2)
    assert v2["activationId"] == "1001"

    # get_rent_number
    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getRentNumber&service=tg&country=0&duration=4&ref={DEFAULT_REF}",
        json={"activationId": "2002", "phoneNumber": "79995554433"},
    )
    rent = client.get_rent_number(service="tg", country=0, duration=4)
    assert rent["activationId"] == "2002"


def test_get_balance(httpx_mock: HTTPXMock) -> None:
    """Test get_balance success and malformed response."""
    client = HeroSMS(api_key="secret")

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getBalance",
        text="ACCESS_BALANCE:250.75",
    )
    assert client.get_balance() == 250.75

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getBalance",
        text="MALFORMED_OUTPUT",
    )
    with pytest.raises(HeroSMSError) as exc_info:
        client.get_balance()
    assert "Unexpected balance response" in str(exc_info.value)


def test_get_number_options(httpx_mock: HTTPXMock) -> None:
    """Test passing all options to get_number."""
    client = HeroSMS(api_key="secret")

    httpx_mock.add_response(
        url=(
            f"{BASE_URL}?api_key=secret&action=getNumber&service=wa&country=1"
            f"&ref={DEFAULT_REF}&maxPrice=15.0&fixedPrice=1&phoneException=7900&operator=tele2"
        ),
        text="ACCESS_NUMBER:5544:79001112233",
    )

    result = client.get_number(
        service="wa",
        country=1,
        max_price=15.0,
        fixed_price="1",
        phone_exception="7900",
        operator="tele2",
    )
    assert result["activation_id"] == 5544
    assert result["phone_number"] == "79001112233"


def test_status_methods(httpx_mock: HTTPXMock) -> None:
    """Test set_status, convenience methods, and get_status."""
    client = HeroSMS(api_key="secret")

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=setStatus&id=123&status=1",
        text="ACCESS_READY",
    )
    assert client.set_status(123, ActivationStatusCode.SMS_SENT) == "ACCESS_READY"

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=setStatus&id=123&status=1",
        text="ACCESS_READY",
    )
    assert client.mark_ready(123) == "ACCESS_READY"

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=setStatus&id=123&status=3",
        text="ACCESS_RETRY_GET",
    )
    assert client.request_resend(123) == "ACCESS_RETRY_GET"

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=setStatus&id=123&status=6",
        text="ACCESS_ACTIVATION",
    )
    assert client.complete(123) == "ACCESS_ACTIVATION"

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=setStatus&id=123&status=8",
        text="ACCESS_CANCEL",
    )
    assert client.cancel(123) == "ACCESS_CANCEL"

    # get_status codes
    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getStatus&id=123",
        text="STATUS_OK:445566",
    )
    assert client.get_status(123) == {"status": "STATUS_OK", "code": "445566"}

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getStatus&id=123",
        text="STATUS_WAIT_RETRY:112233",
    )
    assert client.get_status(123) == {"status": "STATUS_WAIT_RETRY", "code": "112233"}

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getStatus&id=123",
        text="STATUS_WAIT_CODE",
    )
    assert client.get_status(123) == {"status": "STATUS_WAIT_CODE"}


def test_get_status_v2(httpx_mock: HTTPXMock) -> None:
    """Test get_status_v2 returning full dict."""
    client = HeroSMS(api_key="secret")
    v2_data = {
        "verificationType": 1,
        "sms": {"dateTime": "now", "code": "1234", "text": "Code: 1234"},
        "call": {"from_": "", "text": "", "code": "", "dateTime": "", "url": "", "parsingCount": 0},
    }
    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getStatusV2&id=123",
        json=v2_data,
    )
    assert client.get_status_v2(123) == v2_data


def test_directory_and_catalogs(httpx_mock: HTTPXMock) -> None:
    """Test get_countries, get_services_list, get_operators, get_prices."""
    client = HeroSMS(api_key="secret")

    # get_countries
    countries_data = {
        "0": {"id": 0, "rus": "Россия", "eng": "Russia", "chn": "俄罗斯", "visible": 1, "retry": 1}
    }
    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getCountries",
        json=countries_data,
    )
    assert client.get_countries()["0"]["eng"] == "Russia"

    # get_services_list
    services_data = {"status": "success", "services": [{"code": "tg", "name": "Telegram"}]}
    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getServicesList&country=0&lang=en",
        json=services_data,
    )
    assert client.get_services_list(country=0, lang="en")["services"][0]["code"] == "tg"

    # get_operators
    operators_data = {"status": "success", "countryOperators": {"0": ["mts", "beeline"]}}
    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getOperators&country=0",
        json=operators_data,
    )
    assert "mts" in client.get_operators(country=0)["countryOperators"]["0"]

    # get_prices
    prices_data = {"0": {"tg": {"cost": 15.0, "count": 200, "physicalCount": 100}}}
    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getPrices&country=0&service=tg",
        json=prices_data,
    )
    assert client.get_prices(country=0, service="tg")["0"]["tg"]["cost"] == 15.0


def test_active_activations_and_history(httpx_mock: HTTPXMock) -> None:
    """Test get_active_activations and get_history."""
    client = HeroSMS(api_key="secret")

    activations_data = {
        "status": "success",
        "data": [{"activationId": "500", "serviceCode": "tg", "phoneNumber": "79001112233"}],
    }
    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getActiveActivations&start=0&limit=5",
        json=activations_data,
    )
    res = client.get_active_activations(start=0, limit=5)
    assert res["data"][0]["activationId"] == "500"

    history_data = [{"id": "1", "phone": "79001112233", "cost": 10.0}]
    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getHistory&size=10",
        json=history_data,
    )
    assert client.get_history(size=10)[0]["id"] == "1"


def test_top_countries(httpx_mock: HTTPXMock) -> None:
    """Test get_top_countries_by_service and get_top_countries_by_service_rank."""
    client = HeroSMS(api_key="secret")
    top_data = [{"country": 0, "price": 10.0, "count": 100}]

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getTopCountriesByService&service=tg&freePrice=true",
        json=top_data,
    )
    assert client.get_top_countries_by_service(service="tg", free_price=True)[0]["country"] == 0

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getTopCountriesByServiceRank&service=tg",
        json=top_data,
    )
    assert client.get_top_countries_by_service_rank(service="tg")[0]["country"] == 0


def test_reactivation_and_sms(httpx_mock: HTTPXMock) -> None:
    """Test reactivate, reactivation_price, and get_all_sms."""
    client = HeroSMS(api_key="secret")

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=reactivate&id=123",
        json={"activationId": "123", "phoneNumber": "79001112233"},
    )
    assert client.reactivate(123)["activationId"] == "123"

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=reactivationPrice&id=123",
        json={"data": {"price": 6.0}},
    )
    assert client.get_reactivation_price(123)["data"]["price"] == 6.0

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getAllSms&id=123&size=10&page=1",
        json={"data": [{"code": "7788"}], "meta": {"total": 1}},
    )
    assert client.get_all_sms(123, size=10, page=1)["data"][0]["code"] == "7788"

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=finishActivation&id=123",
        text="ACCESS_ACTIVATION",
    )
    client.finish_activation(123)

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=cancelActivation&id=123",
        text="ACCESS_CANCEL",
    )
    client.cancel_activation(123)


def test_rental_methods(httpx_mock: HTTPXMock) -> None:
    """Test get_rent_prices and get_rent_services_and_countries."""
    client = HeroSMS(api_key="secret")

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=serviceCountRent&service=tg&country=0",
        json={"0": {"4": {"price": 10.0, "count": 5}}},
    )
    assert client.get_rent_prices(service="tg", country=0)["0"]["4"]["price"] == 10.0

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getRentServicesAndCountries&country=0&duration=4",
        json={"operators": {"mts": "MTS"}, "services": {}},
    )
    assert "mts" in client.get_rent_services_and_countries(country=0, duration=4)["operators"]


def test_text_error_handling(httpx_mock: HTTPXMock) -> None:
    """Test raising specific exceptions on error strings."""
    client = HeroSMS(api_key="secret")

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getBalance",
        text="NO_NUMBERS",
    )
    with pytest.raises(NoNumbersError):
        client.get_balance()

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getBalance",
        text="BAD_KEY",
    )
    with pytest.raises(AuthenticationError):
        client.get_balance()

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getStatus&id=123",
        text="NO_ACTIVATION",
    )
    with pytest.raises(ActivationNotFoundError):
        client.get_status(123)

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=setStatus&id=123&status=8",
        text="EARLY_CANCEL_DENIED",
    )
    with pytest.raises(EarlyCancelError):
        client.cancel(123)

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getNumber&service=tg&country=0&ref={DEFAULT_REF}",
        text="WRONG_MAX_PRICE:16.5",
    )
    with pytest.raises(WrongMaxPriceError) as exc_info:
        client.get_number(service="tg", country=0)
    assert exc_info.value.minimum_price == 16.5

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getBalance",
        text="BANNED:2026-12-31",
    )
    with pytest.raises(BannedError) as exc_info:
        client.get_balance()
    assert exc_info.value.banned_until == "2026-12-31"

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getBalance",
        text="ACCOUNT_INACTIVE",
    )
    with pytest.raises(AccountInactiveError):
        client.get_balance()

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getBalance",
        text="CHANNELS_LIMIT",
    )
    with pytest.raises(ChannelsLimitError):
        client.get_balance()

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getBalance",
        text="NO_BALANCE",
    )
    with pytest.raises(NoBalanceError):
        client.get_balance()

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getBalance",
        text="BAD_SERVICE",
    )
    with pytest.raises(HeroSMSError) as exc_info:
        client.get_balance()
    assert exc_info.value.code == "BAD_SERVICE"


def test_json_error_handling(httpx_mock: HTTPXMock) -> None:
    """Test structured JSON error handling."""
    client = HeroSMS(api_key="secret")

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getBalance",
        json={"title": "WRONG_MAX_PRICE", "details": "Too low", "info": {"min": 19.5}},
    )
    with pytest.raises(WrongMaxPriceError) as exc_info:
        client.get_balance()
    assert exc_info.value.minimum_price == 19.5

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getBalance",
        json={"title": "BANNED", "details": "Banned", "info": {"readable_date": "2027-01-01"}},
    )
    with pytest.raises(BannedError) as exc_info:
        client.get_balance()
    assert exc_info.value.banned_until == "2027-01-01"

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getBalance",
        json={
            "title": "CHANNELS_LIMIT",
            "details": "Limit reached",
            "info": {"current_threads": 5, "max_allowed": 5},
        },
    )
    with pytest.raises(ChannelsLimitError) as exc_info:
        client.get_balance()
    assert exc_info.value.current_threads == 5

    httpx_mock.add_response(
        url=f"{BASE_URL}?api_key=secret&action=getBalance",
        json={"title": "CUSTOM_ERROR", "details": "Custom failure description"},
    )
    with pytest.raises(ApiJsonError) as exc_info:
        client.get_balance()
    assert exc_info.value.title == "CUSTOM_ERROR"
    assert exc_info.value.details == "Custom failure description"
