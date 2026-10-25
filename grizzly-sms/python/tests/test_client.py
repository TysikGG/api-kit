from collections.abc import Callable
from typing import Any

import httpx
import pytest

from grizzly_sms import (
    ActivationAction,
    CountryInfo,
    CryptoWallet,
    GrizzlySms,
    GrizzlySmsError,
    OrderedNumber,
    PriceQuote,
    ReceivedCode,
    ServiceInfo,
    flatten_prices,
)

Handler = Callable[[httpx.Request], httpx.Response]


def route(httpx_mock: Any, handler: Handler) -> None:
    httpx_mock.add_callback(handler, is_reusable=True)


def text(body: str, status: int = 200) -> httpx.Response:
    return httpx.Response(status, text=body)


def js(body: object, status: int = 200) -> httpx.Response:
    return httpx.Response(status, json=body)


def test_blank_api_key() -> None:
    with pytest.raises(GrizzlySmsError) as exc:
        GrizzlySms("  ")
    assert exc.value.code == "BAD_KEY"


def test_call_success_and_api_error(httpx_mock: object) -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        if request.url.params["action"] == "customAction":
            return text("OK")
        return text("BAD_ACTION")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        assert sms.call("customAction", {"note": "1"}) == "OK"
        assert seen[0].url.params["api_key"] == "secret"
        assert seen[0].url.params["ref_id"] == "tysik"
        assert seen[0].url.path == "/stubs/handler_api.php"
        assert seen[0].headers["user-agent"] == "grizzly-sms/2.0.0"
        with pytest.raises(GrizzlySmsError) as exc:
            sms.call("other")
    assert exc.value.code == "BAD_ACTION"


def test_get_balance_success_and_api_error(httpx_mock: object) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.url.params["action"] == "getBalance"
        assert request.url.params["ref_id"] == "tysik"
        if calls["n"] == 1:
            return text("ACCESS_BALANCE:210.05")
        return text("BAD_KEY")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        assert sms.get_balance() == 210.05
        with pytest.raises(GrizzlySmsError) as exc:
            sms.get_balance()
    assert exc.value.code == "BAD_KEY"


def test_get_number_success_and_api_error(httpx_mock: object) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        params = request.url.params
        if "phoneException" not in params:
            return text("NO_NUMBERS")
        assert params["action"] == "getNumber"
        assert params["service"] == "tg"
        assert params["country"] == "any"
        assert params["maxPrice"] == "1.5"
        assert params["minPrice"] == "0.2"
        assert params["providerIds"] == "1,2"
        assert params["exceptProviderIds"] == "9"
        assert params["phoneException"] == "1628,147220"
        return text("ACCESS_NUMBER:38496653:66846426435")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        assert sms.get_number(
            "tg",
            country="any",
            max_price=1.5,
            min_price=0.2,
            provider_ids=[1, 2],
            except_provider_ids="9",
            phone_exception=["1628", "147220"],
        ) == OrderedNumber(activation_id="38496653", phone_number="66846426435")
        with pytest.raises(GrizzlySmsError) as exc:
            sms.get_number("tg")
    assert exc.value.code == "NO_NUMBERS"


def test_get_number_v2_success_and_api_error(httpx_mock: object) -> None:
    payload = {
        "activationCancel": "2026-05-07 14:03:16",
        "activationCost": 0.35,
        "activationEnd": "2026-05-07 14:18:16",
        "activationId": 495357953,
        "activationTime": "2026-05-07 13:58:16",
        "canGetAnotherSms": "0",
        "countryCode": "12",
        "currency": 643,
        "phoneNumber": "18036181752",
    }

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.params["action"] == "getNumberV2" and "country" in request.url.params:
            return js(payload)
        return text("NO_NUMBERS")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        ordered = sms.get_number_v2("tg", country=12)
        assert ordered.activation_id == "495357953"
        assert ordered.can_get_another_sms is False
        assert ordered.activation_cost == 0.35
        assert ordered.activation_cancel == "2026-05-07 14:03:16"
        with pytest.raises(GrizzlySmsError) as exc:
            sms.get_number_v2("tg")
    assert exc.value.code == "NO_NUMBERS"


def test_set_status_success_and_api_error(httpx_mock: object) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        params = request.url.params
        if params["status"] == str(ActivationAction.COMPLETE):
            assert params["id"] == "7"
            assert params["action"] == "setStatus"
            return text("ACCESS_ACTIVATION")
        return text("BAD_STATUS")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        assert sms.set_status(7, ActivationAction.COMPLETE) == "ACCESS_ACTIVATION"
        with pytest.raises(GrizzlySmsError) as exc:
            sms.set_status(7, 0)
    assert exc.value.code == "BAD_STATUS"


@pytest.mark.parametrize(
    ("method", "status", "body"),
    [
        ("ready", "1", "ACCESS_READY"),
        ("request_another_code", "3", "ACCESS_RETRY_GET"),
        ("complete", "6", "ACCESS_ACTIVATION"),
    ],
)
def test_status_helpers_success_and_api_error(
    httpx_mock: object,
    method: str,
    status: str,
    body: str,
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.params["status"] == status:
            return text(body)
        return text("BAD_STATUS")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        assert getattr(sms, method)(7) == body
        with pytest.raises(GrizzlySmsError) as exc:
            sms.set_status(7, 0)
    assert exc.value.code == "BAD_STATUS"


def test_cancel_success_and_api_error(httpx_mock: object) -> None:
    seen: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request.url.params["status"])
        if request.url.params["status"] in {"8", "-1"}:
            return text("ACCESS_CANCEL")
        return text("BAD_STATUS")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        assert sms.cancel(7) == "ACCESS_CANCEL"
        assert sms.cancel(7, -1) == "ACCESS_CANCEL"
        with pytest.raises(GrizzlySmsError) as exc:
            sms.cancel(7, 0)
    assert seen[:2] == ["8", "-1"]
    assert exc.value.code == "BAD_STATUS"


def test_get_status_success_and_api_error(httpx_mock: object) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.params["id"] == "7":
            return text("STATUS_OK:852508")
        return text("NO_ACTIVATION")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        status = sms.get_status(7)
        assert status.status == "STATUS_OK"
        assert status.code == "852508"
        with pytest.raises(GrizzlySmsError) as exc:
            sms.get_status(1)
    assert exc.value.code == "NO_ACTIVATION"


def test_get_status_v2_success_and_api_error(httpx_mock: object) -> None:
    body = {"verificationType": 0, "sms": {"code": "852508", "text": "code 852508"}, "call": None}

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["action"] == "getStatusV2"
        if request.url.params["id"] == "7":
            return js(body)
        return text("NO_ACTIVATION")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        assert sms.get_status_v2(7) == body
        with pytest.raises(GrizzlySmsError) as exc:
            sms.get_status_v2(1)
    assert exc.value.code == "NO_ACTIVATION"


def test_wait_for_code_success_and_cancel(httpx_mock: object) -> None:
    statuses = iter(["STATUS_WAIT_CODE", "STATUS_OK:852508", "STATUS_CANCEL"])

    def handler(request: httpx.Request) -> httpx.Response:
        return text(next(statuses))

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        assert sms.wait_for_code(7, interval_ms=0, timeout_ms=5_000) == ReceivedCode(
            code="852508",
            status="STATUS_OK",
        )
        with pytest.raises(GrizzlySmsError) as exc:
            sms.wait_for_code(1, interval_ms=0, timeout_ms=10)
    assert exc.value.code == "STATUS_CANCEL"


def test_get_prices_success_and_api_error(httpx_mock: object) -> None:
    table = {"16": {"tg": {"cost": 1.3, "count": 20}}}

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["action"] == "getPrices"
        if "service" in request.url.params:
            assert request.url.params["service"] == "tg"
            return js(table)
        return text("BAD_KEY")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        assert sms.get_prices(service="tg") == table
        with pytest.raises(GrizzlySmsError) as exc:
            sms.get_prices()
    assert exc.value.code == "BAD_KEY"


def test_get_prices_v2_success_and_api_error(httpx_mock: object) -> None:
    table = {"0": {"tg": {"0.2": 5}}}

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["action"] == "getPricesV2"
        if "service" in request.url.params:
            return js(table)
        return text("BAD_KEY")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        assert sms.get_prices_v2(service="tg", country=0) == table
        with pytest.raises(GrizzlySmsError) as exc:
            sms.get_prices_v2()
    assert exc.value.code == "BAD_KEY"


def test_get_prices_v3_success_and_api_error(httpx_mock: object) -> None:
    table = {
        "0": {
            "tg": {
                "price": 0.2,
                "count": 5,
                "providers": {"a": {"count": 5, "price": [0.2], "provider_id": 1}},
            }
        }
    }

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["action"] == "getPricesV3"
        if "service" in request.url.params:
            return js(table)
        return text("BAD_KEY")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        assert sms.get_prices_v3(service="tg", country=0) == table
        with pytest.raises(GrizzlySmsError) as exc:
            sms.get_prices_v3()
    assert exc.value.code == "BAD_KEY"


def test_find_prices_success_and_api_error(httpx_mock: object) -> None:
    table = {
        "16": {"tg": {"cost": 1.3, "count": 20}},
        "6": {"tg": {"cost": 0.4, "count": 2}, "wa": {"cost": 0.1, "count": 100}},
    }
    assert len(flatten_prices(table)) == 3

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["action"] == "getPrices"
        if request.url.params.get("service") == "tg":
            return js(table)
        return text("NO_BALANCE")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        assert sms.find_prices(service="tg", min_count=10, max_price=2) == [
            PriceQuote(country="16", service="tg", cost=1.3, count=20),
        ]
        with pytest.raises(GrizzlySmsError) as exc:
            sms.find_prices()
    assert exc.value.code == "NO_BALANCE"


def test_get_services_success_and_api_error(httpx_mock: object) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["action"] == "getServicesList"
        if request.url.params["api_key"] == "secret":
            return js({"status": "success", "services": [{"code": "kt", "name": "KakaoTalk"}]})
        return text("BAD_KEY")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        assert sms.get_services() == [ServiceInfo(code="kt", name="KakaoTalk")]
    with GrizzlySms("other") as sms:
        with pytest.raises(GrizzlySmsError) as exc:
            sms.get_services()
    assert exc.value.code == "BAD_KEY"


def test_get_countries_success_and_api_error(httpx_mock: object) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["action"] == "getCountries"
        if request.url.params["api_key"] == "secret":
            return js({"22": {"id": 22, "eng": "India", "rus": "Индия"}})
        return text("BAD_KEY")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        assert sms.get_countries() == [
            CountryInfo(id=22, rus="Индия", eng="India"),
        ]
    with GrizzlySms("other") as sms:
        with pytest.raises(GrizzlySmsError) as exc:
            sms.get_countries()
    assert exc.value.code == "BAD_KEY"


def test_get_active_activations_success_and_api_error(httpx_mock: object) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["action"] == "getActiveActivations"
        if request.url.params["api_key"] == "secret":
            return httpx.Response(
                200,
                content=b"null",
                headers={"content-type": "application/json"},
            )
        return text("BAD_KEY")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        assert sms.get_active_activations() == []
    with GrizzlySms("other") as sms:
        with pytest.raises(GrizzlySmsError) as exc:
            sms.get_active_activations()
    assert exc.value.code == "BAD_KEY"


def test_get_wallet_success_and_api_error(httpx_mock: object) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/public/crypto/wallet"
        assert "ref_id" not in request.url.params
        assert request.url.params["coin"] == "usdt"
        assert request.url.params["network"] == "tron"
        if request.url.params["api_key"] == "secret":
            return js({"wallet_address": "TAddr"})
        return text("BAD_KEY")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        assert sms.get_wallet() == CryptoWallet(wallet_address="TAddr")
    with GrizzlySms("other") as sms:
        with pytest.raises(GrizzlySmsError) as exc:
            sms.get_wallet()
    assert exc.value.code == "BAD_KEY"


def test_prohibited_service(httpx_mock: object) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return text("The service is prohibited for sale by administration")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        with pytest.raises(GrizzlySmsError) as exc:
            sms.get_number("xx")
    assert exc.value.code == "SERVICE_PROHIBITED"


def test_http_status_is_reported(httpx_mock: object) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return text("nope", status=500)

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        with pytest.raises(GrizzlySmsError) as exc:
            sms.get_balance()
    assert exc.value.code == "HTTP_500"


def test_network_error(httpx_mock: object) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("boom")

    route(httpx_mock, handler)
    with GrizzlySms("secret") as sms:
        with pytest.raises(GrizzlySmsError) as exc:
            sms.get_balance()
    assert exc.value.code == "NETWORK"

