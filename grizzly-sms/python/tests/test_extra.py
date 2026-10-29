import httpx
import pytest

from grizzly_sms import (
    GrizzlySms,
    GrizzlySmsError,
    RentAction,
    parse_activation_webhook,
    parse_partner_request,
    partner_finish_response,
    partner_number_response,
    partner_services_response,
)
from grizzly_sms.errors import HttpStatusError, NetworkError, NoNumbersError


def route(httpx_mock: object, handler) -> None:
    httpx_mock.add_callback(handler, is_reusable=True)  # type: ignore[attr-defined]


def text(body: str, status: int = 200) -> httpx.Response:
    return httpx.Response(status, text=body)


def js(body: object, status: int = 200) -> httpx.Response:
    return httpx.Response(status, json=body)


def test_subclass_and_json_error(httpx_mock: object) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.params["action"] == "getNumber":
            return text("WRONG_MAX_PRICE:0.5")
        return js({"status": "error", "error": "NO_NUMBERS"})

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        with pytest.raises(GrizzlySmsError) as exc:
            sms.get_number("tg")
        assert exc.value.code == "WRONG_MAX_PRICE"
        with pytest.raises(NoNumbersError):
            sms.get_rent_status(1)


def test_retries_reads_not_purchases(httpx_mock: object) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if request.url.params["action"] == "getBalance":
            if calls["n"] == 1:
                return text("ERROR_SQL")
            assert request.url.params["version"] == "2"
            return text("ACCESS_BALANCE:3")
        return text("SERVER_ERROR")

    route(httpx_mock, handler)
    with GrizzlySms("secret", retries=1, retry_delay_ms=0) as sms:
        assert sms.get_balance(version=2) == 3
    with GrizzlySms("other", retries=3, retry_delay_ms=0) as sms:
        with pytest.raises(GrizzlySmsError) as exc:
            sms.get_number("tg")
        assert exc.value.code == "SERVER_ERROR"


def test_network_retry_and_http(httpx_mock: object) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            raise httpx.ConnectError("boom")
        return text("ACCESS_BALANCE:1")

    route(httpx_mock, handler)
    with GrizzlySms("secret", retries=1, retry_delay_ms=0) as sms:
        assert sms.get_balance() == 1

    def down(request: httpx.Request) -> httpx.Response:
        return text("down", status=503)

    route(httpx_mock, down)
    with GrizzlySms("secret", retries=0) as sms:
        with pytest.raises(HttpStatusError) as exc:
            sms.get_balance()
        assert exc.value.status == 503

    def boom(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("boom")

    route(httpx_mock, boom)
    with GrizzlySms("secret") as sms:
        with pytest.raises(NetworkError):
            sms.get_balance()


def test_number_filters_and_rent(httpx_mock: object) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        action = request.url.params["action"]
        if action == "getNumber":
            assert request.url.params["operator"] == "mts"
            assert request.url.params["forward"] == "1"
            assert request.url.params["activationType"] == "2"
            assert request.url.params["ref_id"] == "tysik"
            return text("ACCESS_NUMBER:9:100")
        if action == "setStatus":
            assert request.url.params["forward"] == "0"
            return text("ACCESS_ACTIVATION")
        if action == "getNumbersStatus":
            return js({"tg_0": 20, "note": "x"})
        if action == "getRentNumber":
            return js({"status": "success", "phone": {"id": 7, "endDate": "d", "number": "7900"}})
        if action == "continueRentNumber":
            return js({"status": "success", "phone": {"id": "7", "number": "7900"}})
        if action == "getRentStatus":
            return js(
                {
                    "status": "success",
                    "quantity": "1",
                    "values": {"0": {"test": "4321", "service": "tg"}},
                }
            )
        if action == "setRentStatus":
            return js({"status": "success"})
        if action == "getRentHistory":
            return js(
                {"status": "success", "values": {"1": {"date": "d", "price": 3.6, "hours": 4}}}
            )
        if action == "getRentPrices":
            return js(
                {
                    "status": "success",
                    "values": {"0": {"tg": {"cost": 12, "count": 15, "max_hours": 10}}},
                }
            )
        return text("BAD_ACTION")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        assert (
            sms.get_number("tg", operator="mts", forward=True, activation_type=2).activation_id
            == "9"
        )
        assert sms.set_status(5, 6, False) == "ACCESS_ACTIVATION"
        stock = sms.get_numbers_status(country=0, operator="any")
        assert stock[0].service == "tg"
        rented = sms.get_rent_number("tg", 0, 4)
        assert rented.id == "7"
        assert sms.continue_rent(7, 4).end_date == ""
        assert sms.get_rent_status(7).messages[0].text == "4321"
        assert sms.finish_rent(7) == "success"
        assert sms.cancel_rent(7) == "success"
        assert sms.get_rent_history(7).entries[0].price == 3.6
        assert sms.get_rent_prices(service="tg", country=0, rent_time=4)[0].max_hours == 10
        assert RentAction.CANCEL == 2
        with pytest.raises(GrizzlySmsError):
            sms.get_rent_number(" ", 0, 4)


def test_wait_message_activate_and_webhook(httpx_mock: object) -> None:
    phase = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        action = request.url.params["action"]
        phase["n"] += 1
        if action == "getStatusV2":
            return js(
                {"verificationType": 2, "sms": {"code": "852508", "text": "hi"}, "call": None}
            )
        if action == "getNumberV2":
            return js(
                {
                    "activationId": 3,
                    "phoneNumber": "7900",
                    "activationCost": 1,
                    "currency": 840,
                    "countryCode": "0",
                    "canGetAnotherSms": "1",
                    "activationTime": "t",
                }
            )
        if action == "setStatus":
            return text("ACCESS_READY" if request.url.params["status"] == "1" else "ACCESS_CANCEL")
        if action == "getStatus":
            return text("STATUS_OK:5555")
        return text("BAD_ACTION")

    route(httpx_mock, handler)
    seen: list[str] = []
    with GrizzlySms("secret") as sms:
        message = sms.wait_for_message(1, interval_ms=0, timeout_ms=1000, on_status=seen.append)
        assert message.code == "852508" and message.source == "sms"
        order, received = sms.activate(
            "tg", country=0, interval_ms=0, timeout_ms=1000, on_status=lambda status: None
        )
        assert order.activation_id == "3"
        assert received.code == "5555"

    event = parse_activation_webhook({"activationId": 9, "code": "1", "received_at": "now"})
    assert event.activation_id == "9"
    assert event.received_at == "now"
    with pytest.raises(GrizzlySmsError):
        parse_activation_webhook({})
    assert parse_partner_request({"action": "GET_SERVICES", "key": "k"})["action"] == "GET_SERVICES"
    assert partner_services_response([])["status"] == "SUCCESS"
    assert partner_number_response(number=1)["status"] == "SUCCESS"
    assert partner_finish_response("busy")["error"] == "busy"
    with pytest.raises(GrizzlySmsError):
        parse_partner_request({"action": "NOPE", "key": "k"})


def test_timeout_cancels(httpx_mock: object) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        action = request.url.params["action"]
        if action == "getNumberV2":
            return js(
                {
                    "activationId": 4,
                    "phoneNumber": "1",
                    "activationCost": 1,
                    "currency": 1,
                    "countryCode": "0",
                    "canGetAnotherSms": 0,
                    "activationTime": "t",
                }
            )
        if action == "getStatus":
            return text("STATUS_WAIT_CODE")
        if action == "setStatus":
            return text("ACCESS_CANCEL")
        return text("BAD_ACTION")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        with pytest.raises(GrizzlySmsError) as exc:
            sms.activate("tg", ready=False, interval_ms=0, timeout_ms=0, cancel_on_timeout=True)
        assert exc.value.code == "TIMEOUT"


def test_empty_and_proxy_constructor() -> None:
    with pytest.raises(GrizzlySmsError):
        GrizzlySms("secret", proxy="not a url")
    with GrizzlySms("secret", proxy="http://127.0.0.1:9", retries=0) as sms:
        assert sms._http is not None
        sms.close()
