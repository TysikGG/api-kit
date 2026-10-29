import asyncio

import httpx
import pytest

from grizzly_sms import GrizzlySms, GrizzlySmsError, flatten_prices
from grizzly_sms.async_client import AsyncGrizzlySms
from grizzly_sms.async_partner import AsyncGrizzlyPartner
from grizzly_sms.errors import error_from, is_retryable_api_body
from grizzly_sms.parse import (
    as_bool_flag,
    expect_rent_success,
    js_number,
    js_string,
    list_param,
    parse_access_number,
    parse_activation_webhook,
    parse_activations,
    parse_balance,
    parse_countries,
    parse_number_v2,
    parse_numbers_status,
    parse_rent_history,
    parse_rent_phone,
    parse_rent_prices,
    parse_rent_status,
    parse_services,
    parse_set_status,
    parse_status,
)
from grizzly_sms.partner import (
    parse_partner_request,
    partner_finish_response,
    partner_number_response,
)


def test_parser_edges() -> None:
    assert js_number(True) == 1
    assert js_number(False) == 0
    assert js_number("") == 0
    assert js_number("nope") != js_number("nope")
    assert js_number(object()) != 0
    assert js_string(None) == "null"
    assert js_string(True) == "true"
    assert js_string(1.0) == "1"
    assert as_bool_flag("true") is True
    assert list_param("  ") is None
    assert list_param(["1", " "]) == "1"
    with pytest.raises(GrizzlySmsError):
        parse_access_number("NOPE")
    with pytest.raises(GrizzlySmsError):
        parse_balance("ACCESS_BALANCE:nope")
    with pytest.raises(GrizzlySmsError):
        parse_status("WAIT")
    assert parse_status("STATUS_WAIT_CODE").code is None
    with pytest.raises(GrizzlySmsError):
        parse_set_status("NOPE")
    with pytest.raises(GrizzlySmsError):
        parse_number_v2([])
    with pytest.raises(GrizzlySmsError):
        parse_number_v2({"activationId": True, "phoneNumber": "1"})
    parsed = parse_number_v2({"activationId": 1, "phoneNumber": 2})
    assert parsed.activation_cancel is None
    assert flatten_prices(None) == []
    assert flatten_prices({"1": "x", "2": {"tg": "no"}}) == []
    with pytest.raises(GrizzlySmsError):
        parse_services({"nope": 1})
    assert parse_services([{"code": "tg"}])[0].name == ""
    with pytest.raises(GrizzlySmsError):
        parse_countries("nope")
    assert (
        parse_countries([{"id": "x"}, {"id": 2, "eng": "E", "visible": "", "retry": "1"}])[0].retry
        == 1
    )
    with pytest.raises(GrizzlySmsError):
        parse_activations({"a": 1})
    row = parse_activations(
        [{"activationId": 1, "canGetAnotherSms": "1", "currency": 840, "smsCode": "9"}]
    )[0]
    assert row.can_get_another_sms is True
    assert parse_activations(None) == []
    with pytest.raises(GrizzlySmsError):
        parse_numbers_status([])
    assert parse_numbers_status({"tg": 1, "bad": "x"})[0].suffix == ""
    with pytest.raises(GrizzlySmsError):
        parse_rent_phone({"phone": []})
    with pytest.raises(GrizzlySmsError):
        parse_rent_phone({"phone": {"id": True, "number": "1"}})
    assert parse_rent_status({"values": "x"}).messages == []
    assert parse_rent_status({"values": {"0": "skip", "1": {"text": "1"}}}).messages[0].text == "1"
    history = parse_rent_history({"values": {"0": {"price": "x"}, "1": "no"}})
    assert history.entries[0].price is None
    assert parse_rent_prices({"values": "x"}) == []
    assert parse_rent_prices({"values": {"0": "x", "1": {"tg": {"cost": 1}}}}) == []
    quote = parse_rent_prices(
        {"values": {"0": {"tg": {"cost": 1, "count": 2, "max_hours": "no"}}}}
    )[0]
    assert quote.max_hours is None
    with pytest.raises(GrizzlySmsError):
        parse_activation_webhook({"activationId": True})
    assert parse_activation_webhook({"activation_id": 4, "service": "tg"}).service == "tg"
    with pytest.raises(GrizzlySmsError):
        expect_rent_success({"status": "nope"})
    assert is_retryable_api_body({"error": "SERVER_ERROR"}) is True
    assert is_retryable_api_body(1) is False
    assert error_from("WHATEVER").code == "WHATEVER"


def test_string_bodies_and_cancel(httpx_mock: object) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        action = request.url.params.get("action")
        if action == "getStatus":
            return httpx.Response(200, text="STATUS_CANCEL")
        if action == "getStatusV2":
            return httpx.Response(200, json={"call": {"code": "100", "text": "100"}})
        if action == "setStatus":
            return httpx.Response(500, text="down")
        if action == "getNumberV2":
            return httpx.Response(
                200,
                json={
                    "activationId": 1,
                    "phoneNumber": "2",
                    "activationCost": 1,
                    "currency": 1,
                    "countryCode": "0",
                    "canGetAnotherSms": 0,
                    "activationTime": "t",
                },
            )
        return httpx.Response(200, text="NOT_JSON")

    httpx_mock.add_callback(handler, is_reusable=True)  # type: ignore[attr-defined]
    with GrizzlySms("secret") as sms:
        with pytest.raises(GrizzlySmsError) as exc:
            sms.wait_for_code(1, interval_ms=0, timeout_ms=1000)
        assert exc.value.code == "STATUS_CANCEL"
        message = sms.wait_for_message(1, interval_ms=0, timeout_ms=1000)
        assert message.source == "call"
        with pytest.raises(GrizzlySmsError) as cancelled:
            sms.activate("tg", ready=False, cancel_on_error=True, interval_ms=0, timeout_ms=1000)
        assert cancelled.value.code == "STATUS_CANCEL"
        for method in (
            lambda: sms.get_services(),
            lambda: sms.get_countries(),
            lambda: sms.get_active_activations(),
            lambda: sms.get_prices(),
            lambda: sms.get_numbers_status(),
            lambda: sms.get_rent_number("tg", 0, 4),
            lambda: sms.continue_rent(1, 4),
            lambda: sms.get_rent_status(1),
            lambda: sms.get_rent_history(1),
            lambda: sms.get_rent_prices(),
            lambda: sms.set_rent_status(1, 1),
            lambda: sms.get_wallet(),
        ):
            with pytest.raises(GrizzlySmsError):
                method()


def test_partner_edges() -> None:
    with pytest.raises(GrizzlySmsError):
        parse_partner_request([])
    with pytest.raises(GrizzlySmsError):
        parse_partner_request({"action": "GET_SERVICES", "key": " "})
    with pytest.raises(GrizzlySmsError):
        parse_partner_request({"action": "FINISH_ACTIVATION", "key": "k", "status": 9})
    parsed = parse_partner_request(
        {"action": "GET_NUMBER", "key": "k", "exceptionPhoneSet": ["1"], "country": 0}
    )
    assert parsed["exceptionPhoneSet"] == ["1"]
    assert partner_number_response(status="NO_NUMBERS")["status"] == "NO_NUMBERS"
    assert partner_finish_response()["status"] == "SUCCESS"


def test_async_edges() -> None:
    class Signal:
        aborted = False

    def handler(request: httpx.Request) -> httpx.Response:
        action = request.url.params.get("action")
        if action == "getBalance":
            return httpx.Response(200, text="ERROR_SQL")
        if action == "getStatus":
            Signal.aborted = True
            return httpx.Response(200, text="STATUS_WAIT_CODE")
        if action == "getStatusV2":
            return httpx.Response(200, text="NOPE")
        if action == "getNumberV2":
            return httpx.Response(200, text="NOPE")
        if action == "getPrices":
            return httpx.Response(200, text="NOPE")
        return httpx.Response(200, text="ACCESS_BALANCE:1")

    async def main() -> None:
        transport = httpx.MockTransport(handler)
        http = httpx.AsyncClient(base_url="https://api.grizzlysms.com", transport=transport)
        sms = AsyncGrizzlySms(
            "secret", client=http, retries=1, retry_delay_ms=0, retry_mutations=True
        )
        with pytest.raises(GrizzlySmsError):
            await sms.get_balance()
        signal = Signal()
        with pytest.raises(GrizzlySmsError) as aborted:
            await sms.wait_for_code(1, interval_ms=0, timeout_ms=1000, signal=signal)
        assert aborted.value.code == "ABORTED"
        with pytest.raises(GrizzlySmsError):
            await sms.get_status_v2(1)
        with pytest.raises(GrizzlySmsError):
            await sms.get_number_v2("tg")
        with pytest.raises(GrizzlySmsError):
            await sms.get_prices()
        with pytest.raises(GrizzlySmsError):
            await sms.wait_for_message(
                1, interval_ms=0, timeout_ms=0, signal=type("S", (), {"aborted": True})()
            )
        await sms.aclose()
        with pytest.raises(GrizzlySmsError):
            AsyncGrizzlySms("k", proxy="not a url")

        calls = {"n": 0}

        def partner_handler(request: httpx.Request) -> httpx.Response:
            calls["n"] += 1
            if calls["n"] == 1:
                return httpx.Response(200, json={"status": "ERROR", "error": "busy"})
            return httpx.Response(200, json={"status": "SUCCESS"})

        partner = AsyncGrizzlyPartner(
            "k",
            client=httpx.AsyncClient(
                base_url="https://api.grizzlysms.com",
                transport=httpx.MockTransport(partner_handler),
            ),
        )
        assert (
            await partner.push_sms(
                sms_id=1, phone=1, phone_from="a", text="t", retries=1, retry_delay_ms=0
            )
        ).status == "SUCCESS"

        def boom(request: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError("boom")

        broken = AsyncGrizzlyPartner(
            "k",
            client=httpx.AsyncClient(
                base_url="https://api.grizzlysms.com",
                transport=httpx.MockTransport(boom),
            ),
        )
        with pytest.raises(GrizzlySmsError):
            await broken.push_call(call_id=1, phone=1, phone_from="a")
        http500 = AsyncGrizzlyPartner(
            "k",
            client=httpx.AsyncClient(
                base_url="https://api.grizzlysms.com",
                transport=httpx.MockTransport(lambda request: httpx.Response(500, text="x")),
            ),
        )
        with pytest.raises(GrizzlySmsError) as http_error:
            await http500.push_call(call_id=1, phone=1, phone_from="a")
        assert http_error.value.code == "HTTP_500"
        odd = AsyncGrizzlyPartner(
            "k",
            client=httpx.AsyncClient(
                base_url="https://api.grizzlysms.com",
                transport=httpx.MockTransport(lambda request: httpx.Response(200, text="nope")),
            ),
        )
        with pytest.raises(GrizzlySmsError):
            await odd.push_call(call_id=1, phone=1, phone_from="a")
        async with AsyncGrizzlyPartner(
            "k",
            client=httpx.AsyncClient(
                base_url="https://api.grizzlysms.com",
                transport=httpx.MockTransport(
                    lambda request: httpx.Response(200, json={"status": "SUCCESS"})
                ),
            ),
        ) as owned:
            assert (
                await owned.push_call_record(call_id=1, phone=1, phone_from="a", text="t")
            ).status == "SUCCESS"
        await partner.aclose()
        await broken.aclose()
        await http500.aclose()
        await odd.aclose()

    asyncio.run(main())
