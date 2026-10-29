import httpx
import pytest
from pytest_httpx import HTTPXMock

from give_sms import (
    PARTNER_KEY,
    Activation,
    ApiStatus401Error,
    GiveSms,
    GiveSmsAbortError,
    GiveSmsError,
    GiveSmsTimeoutError,
    NetworkError,
    NoNumbersError,
    PriceChangedError,
    ResendRequiredError,
    WrongMaxPriceError,
    find_country,
)
from give_sms.catalog import COUNTRIES, SERVICES


def _dispatch(request: httpx.Request) -> httpx.Response:
    assert request.url.params["partner_key"] == PARTNER_KEY
    method = request.url.params.get("method")
    action = request.url.params.get("action")
    path = request.url.path

    if path.endswith("/api/v1/"):
        assert request.url.params["userkey"] == "test_key"
        return _native(method or "", request)
    if path.endswith("/stubs/handler_api.php"):
        assert request.url.params["api_key"] == "test_key"
        return _handler(action or "", request)
    if path.endswith("/rent_number.php"):
        assert request.url.params["userkey"] == "test_key"
        return _rent(method or "", request)
    raise AssertionError(path)


def _native(method: str, request: httpx.Request) -> httpx.Response:
    query = request.url.params
    if method == "getbalance":
        return httpx.Response(200, json={"status": 200, "data": {"balance": 120.0}})
    if method == "getcount":
        assert query["country"] == "kazakhstan"
        return httpx.Response(
            200, json={"status": 200, "data": {"ANY": {"vk": {"count": 1, "price": "5"}}}}
        )
    if method == "getallcount":
        if "service" in query:
            assert query["service"] == "tg"
            return httpx.Response(200, json={"kazakhstan": {"price": "1", "count_all": "2"}})
        return httpx.Response(200, json={"kazakhstan": [{"vk": {"count_all": "3"}}]})
    if method == "getnumber":
        assert query["service"] == "vk"
        assert query["maxPrice"] == "9"
        return httpx.Response(
            200,
            json={"status": 200, "data": {"order_id": "377", "phone": "7996", "start_time": "t"}},
        )
    if method == "getcode":
        assert query["order_id"] == "377"
        return httpx.Response(
            200,
            json={
                "status": 200,
                "data": {
                    "code": "753455",
                    "fullSms": "hi",
                    "phone": "7996",
                    "receivedDate": "d",
                    "sender": "VK",
                    "id": "sms-1",
                    "phonePass": "p",
                },
            },
        )
    if method == "wrongcode":
        assert query["last_id"] == "sms-1"
        return httpx.Response(200, json={"status": 200, "data": {"code": "222", "id": "sms-2"}})
    if method == "refusenumber":
        return httpx.Response(
            200, json={"status": 200, "data": {"msg": "Заказ номера телефона отменен"}}
        )
    if method == "bannumber":
        return httpx.Response(200, json={"status": 200, "data": {"msg": "Номер телефона забанен"}})
    if method == "reactivationoptions":
        return httpx.Response(
            200,
            json={
                "status": 200,
                "data": {"order_id": "377", "options": [{"duration": 20, "price": 12.6}]},
            },
        )
    if method == "reactivation":
        assert query["duration"] == "20"
        assert query["price"] == "12.6"
        return httpx.Response(
            200,
            json={
                "status": 200,
                "data": {"order_id": "900", "phone": "7996", "duration": 20, "price": 12.6},
            },
        )
    raise AssertionError(method)


def _handler(action: str, request: httpx.Request) -> httpx.Response:
    query = request.url.params
    if action == "getBalance":
        return httpx.Response(200, text="ACCESS_BALANCE:55.20")
    if action == "getNumbersStatus":
        assert query["country"] == "2"
        return httpx.Response(200, text='{"vk_0": 10}')
    if action == "getNumber":
        assert query["maxPrice"] == "4"
        return httpx.Response(200, text="ACCESS_NUMBER:987:79001234567")
    if action == "setStatus":
        return httpx.Response(
            200, text="ACCESS_READY" if query["status"] == "1" else f"ACCESS_{query['status']}"
        )
    if action == "getStatus":
        return httpx.Response(200, text="STATUS_OK:9988")
    if action == "getPrices":
        assert query["tiers"] == "1"
        return httpx.Response(200, text='{"2": {"vk": {"10": 5}}}')
    if action == "getReactivationOptions":
        return httpx.Response(200, text='{"20": 12.6}')
    if action == "reactivation":
        assert query["duration"] == "20"
        return httpx.Response(200, text="ACCESS_NUMBER:42:7900:extra")
    raise AssertionError(action)


def _rent(method: str, request: httpx.Request) -> httpx.Response:
    query = request.url.params
    if method == "countries":
        return httpx.Response(
            200, json={"status": 200, "data": {"countries": [{"code": "KZ"}], "count": 1}}
        )
    if method == "getdatacountry":
        assert query["country"] == "KZ"
        return httpx.Response(200, json={"status": 200, "data": {"services": []}})
    if method == "allorders":
        return httpx.Response(200, json={"status": 200, "data": {"orders": [], "count": 0}})
    if method == "createorder":
        assert query["services"] == "82,1"
        assert query["type"] == "week"
        return httpx.Response(
            200,
            json={
                "status": 200,
                "data": {
                    "order_id": 123,
                    "phone": "7999",
                    "country_code": "+7",
                    "end_time": "later",
                    "end_time_timestamp": 10,
                    "start_timestamp": 1,
                    "orders_count": 1,
                    "order_ids": [123],
                },
            },
        )
    if method == "getsms":
        return httpx.Response(
            200,
            json={
                "status": 200,
                "data": {
                    "msg": "Список всех СМС",
                    "sms_list": [{"date": "d", "text": "123", "timestamp": 50}],
                },
            },
        )
    if method == "prolong":
        return httpx.Response(
            200,
            json={
                "status": 200,
                "data": {
                    "msg": "ok",
                    "order_id": 123,
                    "days": 7,
                    "price": 350,
                    "rent_at": 99,
                    "rent_at_formatted": "later",
                },
            },
        )
    raise AssertionError(method)


def test_partner_key_and_balance(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_callback(_dispatch, is_reusable=True)
    with GiveSms("test_key") as client:
        assert PARTNER_KEY == "pk_39579ba6dfd61e59"
        assert client.get_balance() == 120.0
        assert client.handler_get_balance() == 55.2


def test_catalog_and_counts(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_callback(_dispatch, is_reusable=True)
    assert find_country("Kazakhstan")[1]["handler_id"] == 2  # type: ignore[index]
    assert find_country(16)[0] == "england"  # type: ignore[index]
    assert find_country("nope") is None
    assert find_country("") is None
    assert COUNTRIES["kazakhstan"]["name"] == "Казахстан"
    assert SERVICES["tg"] == "Telegram"
    with GiveSms("test_key") as client:
        assert client.get_count(country="kazakhstan", operator="ANY")["ANY"]["vk"]["count"] == 1
        assert client.get_all(service="tg")["kazakhstan"]["price"] == "1"
        assert "kazakhstan" in client.get_all_count()


def test_number_lifecycle(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_callback(_dispatch, is_reusable=True)
    with GiveSms("test_key") as client:
        ordered = client.get_number("vk", country="kazakhstan", operator="ANY", max_price=9)
        assert ordered.id == "377"
        assert ordered.number == "7996"
        assert ordered.start_time == "t"
        activation = client.purchase("vk", max_price=9)
        assert isinstance(activation, Activation)
        assert activation.get_code().code == "753455"
        assert activation.wait_for_code(timeout=1, interval=0).full_sms == "hi"
        assert activation.repeat_code("sms-1") is True
        assert activation.wrong_code("sms-1").sms_id == "sms-2"
        assert activation.cancel() is True
        assert client.refuse_number(377) is True
        assert activation.ban() is True
        options = client.reactivation_options(377)
        assert options["options"][0]["duration"] == 20
        renewed = client.reactivate(377, duration=20, price=12.6)
        assert renewed["order_id"] == "900"
        assert client.get_reactivation_options(377)["order_id"] == "377"


def test_handler_and_rent(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_callback(_dispatch, is_reusable=True)
    with GiveSms("test_key") as client:
        assert client.handler_get_numbers_status(country=2, operator="any") == {"vk_0": 10}
        number = client.handler_get_number("vk", country=2, operator="mts", max_price=4)
        assert number.id == "987"
        assert number.number == "79001234567"
        assert client.handler_ready(987) == "ACCESS_READY"
        assert client.handler_request_another_sms(987) == "ACCESS_3"
        assert client.handler_complete(987) == "ACCESS_6"
        assert client.handler_cancel(987) == "ACCESS_8"
        assert client.handler_set_status(987, 1) == "ACCESS_READY"
        status = client.handler_get_status(987)
        assert status.status == "STATUS_OK"
        assert status.code == "9988"
        assert client.handler_wait_for_code(987, timeout=1, interval=0).code == "9988"
        assert client.handler_get_prices(country=2, service="vk", tiers=1)["2"]["vk"]["10"] == 5
        assert client.handler_get_reactivation_options(987) == {"20": 12.6}
        renewed = client.handler_reactivate(987, 20, price=12.6)
        assert renewed.id == "42"
        assert renewed.number == "7900:extra"
        assert client.rent_countries()["count"] == 1
        assert client.rent_get_data_country("KZ") == {"services": []}
        assert client.rent_all_orders()["count"] == 0
        order = client.rent_create_order(
            type="week", period=1, services=[82, 1], country="KZ", operator="ANY"
        )
        assert order.order_id == 123
        assert order.order_ids == [123]
        inbox = client.rent_get_sms(123)
        assert inbox.messages[0].text == "123"
        assert client.rent_prolong(123, type="week", period=1).days == 7
        waited = client.rent_wait_for_sms(123, timeout=1, interval=0, since=10)
        assert waited.messages[0].timestamp == 50


def test_wait_status_and_errors(httpx_mock: HTTPXMock) -> None:
    calls = {"n": 0}

    def callback(request: httpx.Request) -> httpx.Response:
        assert request.url.params["partner_key"] == PARTNER_KEY
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(
                200, json={"status": 400, "data": {"msg": "wait", "advice": "later"}}
            )
        return httpx.Response(
            200, json={"status": 200, "data": {"code": "999", "status": "SUCCESS"}}
        )

    httpx_mock.add_callback(callback, is_reusable=True)
    with GiveSms("test_key") as client:
        waiting = client.get_code(1)
        assert waiting.status == "WAIT"
        assert waiting.advice == "later"
        assert client.wait_for_code(1, timeout=2, interval=0).code == "999"
        assert client.wait_for_next_code(1, timeout=1, interval=0).status == "SUCCESS"


def test_timeouts_abort_and_handler_terminal_states(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"status": 400, "data": {"msg": "wait"}}, is_reusable=True)
    with GiveSms("test_key") as client:
        with pytest.raises(GiveSmsTimeoutError):
            client.wait_for_code(1, timeout=0, interval=0)
        with pytest.raises(GiveSmsAbortError):
            client.wait_for_code(1, timeout=5, interval=0, cancel=lambda: True)

    httpx_mock.reset()
    httpx_mock.add_response(text="STATUS_CANCEL")
    httpx_mock.add_response(text="STATUS_WAIT_RESEND")
    httpx_mock.add_response(text="STATUS_WAIT_RETRY:111")
    httpx_mock.add_response(text="STATUS_WAIT_CODE")
    with GiveSms("test_key") as client:
        with pytest.raises(GiveSmsError) as cancelled:
            client.handler_wait_for_code(1, timeout=1, interval=0)
        assert cancelled.value.code == "STATUS_CANCEL"
        with pytest.raises(ResendRequiredError):
            client.handler_wait_for_code(1, timeout=1, interval=0)
        parsed = client.handler_get_status(1)
        assert parsed.status == "STATUS_WAIT_RETRY"
        assert parsed.code == "111"
        with pytest.raises(GiveSmsTimeoutError):
            client.handler_wait_for_code(1, timeout=0, interval=0)


def test_error_classes_and_retries(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"status": 401, "data": {"msg": "bad key"}})
    with GiveSms("test_key") as client:
        with pytest.raises(ApiStatus401Error) as exc:
            client.get_balance()
        assert exc.value.code == 401

    httpx_mock.add_response(text="NO_NUMBERS")
    httpx_mock.add_response(text="WRONG_MAX_PRICE:1.5")
    httpx_mock.add_response(text="PRICE_CHANGED")
    httpx_mock.add_response(text="ACCESS_NUMBER:only")
    httpx_mock.add_response(text="ACCESS_NUMBER::7900")
    httpx_mock.add_response(text="NOPE")
    httpx_mock.add_response(text="ACCESS_BALANCE:nope")
    httpx_mock.add_response(text="not-json")
    httpx_mock.add_response(text="[]")
    httpx_mock.add_response(text="[]")
    httpx_mock.add_response(status_code=500, text="")
    with GiveSms("test_key") as client:
        with pytest.raises(NoNumbersError):
            client.handler_get_number("vk")
        with pytest.raises(WrongMaxPriceError) as price_error:
            client.handler_get_number("vk")
        assert price_error.value.response_data == "1.5"
        with pytest.raises(PriceChangedError):
            client.handler_reactivate(1, 20)
        with pytest.raises(GiveSmsError, match="Malformed"):
            client.handler_get_number("vk")
        with pytest.raises(GiveSmsError, match="Malformed"):
            client.handler_get_number("vk")
        with pytest.raises(GiveSmsError, match="Unexpected balance"):
            client.handler_get_balance()
        with pytest.raises(GiveSmsError, match="Invalid balance format"):
            client.handler_get_balance()
        with pytest.raises(GiveSmsError, match="Invalid JSON"):
            client.handler_get_prices()
        with pytest.raises(GiveSmsError, match="Unexpected getNumbersStatus"):
            client.handler_get_numbers_status()
        with pytest.raises(GiveSmsError, match="Unexpected reactivation"):
            client.handler_get_reactivation_options(1)
        with pytest.raises(GiveSmsError, match="HTTP 500"):
            client.handler_get_balance()

    httpx_mock.add_response(json={"status": 502, "data": {"msg": "again"}})
    httpx_mock.add_response(json={"status": 200, "data": {"balance": 3}})
    with GiveSms("test_key", retries=1, retry_delay=0) as client:
        assert client.get_balance() == 3

    httpx_mock.add_response(json={"status": 401, "data": {"msg": "no"}})
    with GiveSms("test_key", retries=2, retry_delay=0) as client:
        with pytest.raises(ApiStatus401Error):
            client.get_balance()

    httpx_mock.add_exception(httpx.ConnectError("down"))
    with GiveSms("test_key") as client:
        with pytest.raises(NetworkError):
            client.get_balance()

    httpx_mock.add_exception(httpx.ReadTimeout("slow"))
    httpx_mock.add_response(json={"status": 200, "data": {"user_balance": 0}})
    with GiveSms("test_key", retries=1, retry_delay=0) as client:
        assert client.get_balance() == 0.0


def test_payload_edges(httpx_mock: HTTPXMock) -> None:
    with pytest.raises(GiveSmsError, match="API key"):
        GiveSms("")
    proxied = GiveSms(
        "test_key",
        base_url="https://give-sms.com/",
        proxy="http://127.0.0.1:8080",
        headers={"X-Test": "1"},
    )
    assert proxied.proxy == "http://127.0.0.1:8080"
    assert proxied.base_url == "https://give-sms.com"
    proxied.close()

    httpx_mock.add_response(json={"status": 1, "data": {"balance": "2.5"}})
    httpx_mock.add_response(json={"status": 200, "data": {"extra": True}})
    httpx_mock.add_response(json={"status": 200, "data": {"balance": "nope"}})
    httpx_mock.add_response(json={"status": 200, "data": []})
    httpx_mock.add_response(json={"status": 200, "data": {}})
    httpx_mock.add_response(text="<html>")
    httpx_mock.add_response(status_code=500, text="down")
    httpx_mock.add_response(json={"status": 507, "data": {"msg": "no", "reason": "sim_offline"}})
    httpx_mock.add_response(json={"status": 200, "data": []})
    httpx_mock.add_response(json={"status": 200, "data": {}})
    httpx_mock.add_response(json={"status": 200, "data": {"msg": "empty", "sms_list": []}})
    with GiveSms("test_key") as client:
        assert client.get_balance() == 2.5
        with pytest.raises(GiveSmsError, match="Missing balance"):
            client.get_balance()
        with pytest.raises(GiveSmsError, match="Invalid balance"):
            client.get_balance()
        with pytest.raises(GiveSmsError, match="Unexpected getcount"):
            client.get_count()
        with pytest.raises(GiveSmsError, match="Incomplete"):
            client.get_number("vk")
        with pytest.raises(GiveSmsError, match="service is required"):
            client.get_number("")
        with pytest.raises(GiveSmsError, match="Invalid JSON"):
            client.get_balance()
        with pytest.raises(GiveSmsError, match="HTTP 500"):
            client.get_balance()
        with pytest.raises(GiveSmsError) as offline:
            client.reactivate(1, duration=20)
        assert offline.value.reason == "sim_offline"
        with pytest.raises(GiveSmsError, match="Unexpected countries"):
            client.rent_countries()
        with pytest.raises(GiveSmsError, match="Incomplete rent"):
            client.rent_create_order(type="month", period=1, services="1", country="KZ")
        with pytest.raises(GiveSmsTimeoutError):
            client.rent_wait_for_sms(1, timeout=0, interval=0, since=5)
        with pytest.raises(GiveSmsError, match="service is required"):
            client.handler_get_number("")


def test_string_constructor_balance_number(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"status": 200, "data": 8})
    # GiveSms only accepts api_key positionally; numeric data still parses.
    with GiveSms(api_key="test_key") as client:
        assert client.get_balance() == 8.0
