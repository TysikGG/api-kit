"""Unit tests for the Greedy SMS Python client."""

import pytest
from pytest_httpx import HTTPXMock

from greedy_sms import (
    AuthenticationError,
    ConflictError,
    ForbiddenError,
    GreedySMS,
    NotFoundError,
    RateLimitError,
    ServerError,
    ValidationError,
)

BASE_URL = "https://api.greedy-sms.com"


def test_init_validation() -> None:
    """Test API key validation and context manager."""
    with pytest.raises(AuthenticationError):
        GreedySMS(api_key="")

    with pytest.raises(AuthenticationError):
        GreedySMS(api_key="   ")

    with GreedySMS(api_key="secret") as client:
        assert client.api_key == "secret"


def test_system_and_user(httpx_mock: HTTPXMock) -> None:
    """Test check_health, get_me, and get_balance."""
    client = GreedySMS(api_key="secret")

    httpx_mock.add_response(
        url=f"{BASE_URL}/health/live",
        json={"status": "ok"},
    )
    health = client.check_health()
    assert health["status"] == "ok"

    user_data = {
        "id": "usr_99",
        "purchases": {"activations": 10, "rents": 1},
        "discount": {"level": "Gold", "percent": 10},
        "balance": 250.0,
        "referralBalance": 15.0,
    }
    httpx_mock.add_response(
        url=f"{BASE_URL}/users/getMe",
        json=user_data,
        headers={"x-api-key": "secret"},
    )
    me = client.get_me()
    assert me["id"] == "usr_99"
    assert me["balance"] == 250.0

    httpx_mock.add_response(
        url=f"{BASE_URL}/users/getMe",
        json=user_data,
    )
    assert client.get_balance() == 250.0


def test_activations_catalogs(httpx_mock: HTTPXMock) -> None:
    """Test catalog and directory methods."""
    client = GreedySMS(api_key="secret")

    # get_operators
    httpx_mock.add_response(
        url=f"{BASE_URL}/activations/getOperators",
        json=[{"country": "0", "operators": ["mts"]}],
    )
    ops = client.get_operators(country=0)
    assert ops[0]["operators"] == ["mts"]

    # get_countries
    countries_data = {
        "countries": [{"id": 0, "title": {"rus": "Россия", "eng": "Russia"}}],
        "total": 1,
        "totalPages": 1,
        "pageSize": 10,
        "nextPage": 0,
        "prevPage": 0,
    }
    httpx_mock.add_response(
        url=f"{BASE_URL}/activations/getCountries",
        json=countries_data,
    )
    countries = client.get_countries(page=1)
    assert countries["countries"][0]["id"] == 0

    # get_services
    services_data = {
        "services": [{"id": "tg", "name": "Telegram"}],
        "total": 1,
        "totalPages": 1,
        "pageSize": 10,
        "nextPage": 0,
        "prevPage": 0,
    }
    httpx_mock.add_response(
        url=f"{BASE_URL}/activations/getServices",
        json=services_data,
    )
    services = client.get_services(country=0, language="eng")
    assert services["services"][0]["id"] == "tg"

    # get_prices
    prices_data = {
        "countries": [{"country": 0, "services": [{"name": "Telegram", "count": 10, "price": 15}]}],
        "total": 1,
        "totalPages": 1,
        "pageSize": 10,
        "nextPage": 0,
        "prevPage": 0,
    }
    httpx_mock.add_response(
        url=f"{BASE_URL}/activations/getPrices",
        json=prices_data,
    )
    prices = client.get_prices(country=0, service="tg")
    assert prices["countries"][0]["services"][0]["price"] == 15

    # get_numbers_status
    status_data = {
        "numbers": [{"id": "0", "count": 25}],
        "total": 1,
        "totalPages": 1,
        "pageSize": 10,
        "nextPage": 0,
        "prevPage": 0,
    }
    httpx_mock.add_response(
        url=f"{BASE_URL}/activations/getNumbersStatus",
        json=status_data,
    )
    assert client.get_numbers_status(service="tg", page=1)["numbers"][0]["count"] == 25

    # get_list_of_top_countries_by_service
    httpx_mock.add_response(
        url=f"{BASE_URL}/activations/getListOfTopCountriesByService",
        json=[{"country": 0, "price": 14.5}],
    )
    assert client.get_list_of_top_countries_by_service("tg")[0]["price"] == 14.5

    # get_top_countries_by_service
    top_data = {
        "countries": [{"id": 0, "count": 100, "price": 14.5}],
        "total": 1,
        "totalPages": 1,
        "pageSize": 10,
        "nextPage": 0,
        "prevPage": 0,
    }
    httpx_mock.add_response(
        url=f"{BASE_URL}/activations/getTopCountriesByService",
        json=top_data,
    )
    assert client.get_top_countries_by_service(service="tg", page=1)["countries"][0]["id"] == 0


def test_activations_lifecycle(httpx_mock: HTTPXMock) -> None:
    """Test get_number, get_status, set_status, helpers, and get_history."""
    client = GreedySMS(api_key="secret")

    # get_number
    httpx_mock.add_response(
        url=f"{BASE_URL}/activations/getNumber",
        json={"activationId": 1234, "phone": "79001112233", "price": 15.0},
    )
    order = client.get_number(service="tg", country=0, verification_type=1, max_price=20.0)
    assert order["activationId"] == 1234
    assert order["phone"] == "79001112233"

    # get_status and get_status_alternative
    httpx_mock.add_response(
        url=f"{BASE_URL}/activations/getStatus",
        json={"status": "STATUS_OK:9876"},
    )
    assert client.get_status(1234)["status"] == "STATUS_OK:9876"

    httpx_mock.add_response(
        url=f"{BASE_URL}/activations/getStatusAlternative",
        json={"status": "STATUS_WAIT_CODE"},
    )
    assert client.get_status_alternative(1234)["status"] == "STATUS_WAIT_CODE"

    # set_status and helpers
    httpx_mock.add_response(
        url=f"{BASE_URL}/activations/setStatus",
        json={"status": "Cancel"},
    )
    assert client.cancel_activation(1234)["status"] == "Cancel"

    httpx_mock.add_response(
        url=f"{BASE_URL}/activations/setStatus",
        json={"status": "Finish"},
    )
    assert client.finish_activation(1234)["status"] == "Finish"

    httpx_mock.add_response(
        url=f"{BASE_URL}/activations/setStatus",
        json={"status": "NewCode"},
    )
    assert client.request_new_code(1234)["status"] == "NewCode"

    # get_history
    history_data = {
        "activations": [{"id": 1234, "phone": "79001112233", "service": "tg"}],
        "total": 1,
        "totalPages": 1,
        "pageSize": 10,
        "nextPage": 0,
        "prevPage": 0,
    }
    httpx_mock.add_response(
        url=f"{BASE_URL}/activations/getHistory",
        json=history_data,
    )
    assert client.get_history(active=True)["activations"][0]["id"] == 1234


def test_rental_methods(httpx_mock: HTTPXMock) -> None:
    """Test rent endpoints."""
    client = GreedySMS(api_key="secret")

    # get_rent_prices
    httpx_mock.add_response(
        url=f"{BASE_URL}/rent/getRentPrices",
        json={"4": 50},
    )
    assert client.get_rent_prices(service="tg", country=0)["4"] == 50

    # get_rent_list
    rent_list = {
        "rents": [{"id": 88, "phone": "79998887766", "price": 50, "endDate": "tomorrow"}],
        "total": 1,
        "totalPages": 1,
        "pageSize": 10,
        "nextPage": 0,
        "prevPage": 0,
    }
    httpx_mock.add_response(
        url=f"{BASE_URL}/rent/getRentList",
        json=rent_list,
    )
    assert client.get_rent_list()["rents"][0]["id"] == 88

    # get_rent_status
    rent_status = {
        "sms": [{"phone": "Service", "text": "SMS code 1122", "date": "today"}],
        "total": 1,
        "totalPages": 1,
        "pageSize": 10,
        "nextPage": 0,
        "prevPage": 0,
    }
    httpx_mock.add_response(
        url=f"{BASE_URL}/rent/getRentStatus",
        json=rent_status,
    )
    assert client.get_rent_status(88)["sms"][0]["text"] == "SMS code 1122"

    # get_continue_rent_price_number
    httpx_mock.add_response(
        url=f"{BASE_URL}/rent/getContinueRentPriceNumber",
        json={"price": 30.0},
    )
    assert client.get_continue_rent_price_number(88, time=4)["price"] == 30.0

    # get_rent_number
    rent_num = {"rentId": 88, "phone": "79998887766", "price": 50.0, "endDate": "tomorrow"}
    httpx_mock.add_response(
        url=f"{BASE_URL}/rent/getRentNumber",
        json=rent_num,
    )
    assert client.get_rent_number(service="tg", country=0, time=4)["rentId"] == 88

    # set_rent_status
    httpx_mock.add_response(
        url=f"{BASE_URL}/rent/setRentStatus",
        json={"status": "finish"},
    )
    assert client.set_rent_status(88, status=2)["status"] == "finish"

    # continue_rent_number and continue_rent_number_v2
    httpx_mock.add_response(
        url=f"{BASE_URL}/rent/continueRentNumber",
        json=rent_num,
    )
    assert client.continue_rent_number(88, time=4)["rentId"] == 88

    httpx_mock.add_response(
        url=f"{BASE_URL}/v2/rent/continueRentNumber",
        json=rent_num,
    )
    assert client.continue_rent_number_v2(88, time=4)["rentId"] == 88


def test_mail_methods(httpx_mock: HTTPXMock) -> None:
    """Test email verification endpoints."""
    client = GreedySMS(api_key="secret")

    # get_mail_domains
    httpx_mock.add_response(
        url=f"{BASE_URL}/mail/getDomains",
        json=[{"name": "fastmail.com", "cost": 5.0, "count": 10}],
    )
    assert client.get_mail_domains("discord.com")[0]["name"] == "fastmail.com"

    # get_mail_price
    httpx_mock.add_response(
        url=f"{BASE_URL}/mail/getPrice",
        json={"cost": 5.0, "domain": "fastmail.com", "url": "discord.com"},
    )
    assert client.get_mail_price("discord.com", "fastmail.com")["cost"] == 5.0

    # buy_mail_domain
    mail_data = {
        "id": 99,
        "email": "user@fastmail.com",
        "price": 5.0,
        "site": "discord.com",
        "status": "active",
    }
    httpx_mock.add_response(
        url=f"{BASE_URL}/mail/buyDomain",
        json=mail_data,
    )
    assert client.buy_mail_domain("discord.com", "fastmail.com")["id"] == 99

    # reorder_mail_domain
    httpx_mock.add_response(
        url=f"{BASE_URL}/mail/reorderDomain",
        json=mail_data,
    )
    assert client.reorder_mail_domain(99)["id"] == 99

    # get_mail_status
    httpx_mock.add_response(
        url=f"{BASE_URL}/mail/getStatus",
        json={
            "email": "user@fastmail.com",
            "site": "discord.com",
            "status": "received",
            "message": "Code: 5544",
            "value": "5544",
        },
    )
    assert client.get_mail_status(99)["value"] == "5544"

    # cancel_mail_order
    httpx_mock.add_response(
        url=f"{BASE_URL}/mail/cancelOrder",
        json={"balance": 300.0, "status": "canceled"},
    )
    assert client.cancel_mail_order(99)["status"] == "canceled"

    # get_mail_orders
    orders_data = {
        "orders": [{"id": 99, "email": "user@fastmail.com", "site": "discord.com", "price": 5.0}],
        "total": 1,
        "totalPages": 1,
        "pageSize": 10,
        "nextPage": 0,
        "prevPage": 0,
    }
    httpx_mock.add_response(
        url=f"{BASE_URL}/mail/getOrders",
        json=orders_data,
    )
    assert client.get_mail_orders()["orders"][0]["id"] == 99


def test_handler_api(httpx_mock: HTTPXMock) -> None:
    """Test legacy handler_api.php call."""
    client = GreedySMS(api_key="secret")
    httpx_mock.add_response(
        url=f"{BASE_URL}/stubs/handler_api.php?api_key=secret&action=getBalance",
        text="ACCESS_BALANCE:150.00",
    )
    assert client.handler_api("getBalance") == "ACCESS_BALANCE:150.00"


def test_error_handling(httpx_mock: HTTPXMock) -> None:
    """Test error response mapping."""
    client = GreedySMS(api_key="secret")

    # 401
    httpx_mock.add_response(
        url=f"{BASE_URL}/users/getMe",
        status_code=401,
        json={"status": "error", "code": 401, "message": "Unauthorized"},
    )
    with pytest.raises(AuthenticationError):
        client.get_me()

    # 403
    httpx_mock.add_response(
        url=f"{BASE_URL}/users/getMe",
        status_code=403,
        json={"status": "error", "code": 403, "message": "Forbidden"},
    )
    with pytest.raises(ForbiddenError):
        client.get_me()

    # 404
    httpx_mock.add_response(
        url=f"{BASE_URL}/activations/getStatus",
        status_code=404,
        json={"status": "error", "code": 404, "message": "Not found"},
    )
    with pytest.raises(NotFoundError):
        client.get_status(999)

    # 409
    httpx_mock.add_response(
        url=f"{BASE_URL}/activations/setStatus",
        status_code=409,
        json={"status": "error", "code": 409, "message": "Conflict"},
    )
    with pytest.raises(ConflictError):
        client.finish_activation(999)

    # 422
    httpx_mock.add_response(
        url=f"{BASE_URL}/activations/getNumber",
        status_code=422,
        json={
            "status": "error",
            "code": 422,
            "message": "Validation failed",
            "fields": [{"field": "service", "message": "Required"}],
        },
    )
    with pytest.raises(ValidationError) as exc_info:
        client.get_number(service="", country=0)
    assert exc_info.value.fields[0]["field"] == "service"

    # 429
    httpx_mock.add_response(
        url=f"{BASE_URL}/users/getMe",
        status_code=429,
        json={
            "status": "error",
            "code": 429,
            "message": "Too many requests",
            "retryAfterSeconds": 15,
        },
    )
    with pytest.raises(RateLimitError) as exc_info:
        client.get_me()
    assert exc_info.value.retry_after_seconds == 15

    # 500
    httpx_mock.add_response(
        url=f"{BASE_URL}/users/getMe",
        status_code=500,
        json={"status": "error", "code": 500, "message": "Internal error"},
    )
    with pytest.raises(ServerError):
        client.get_me()
