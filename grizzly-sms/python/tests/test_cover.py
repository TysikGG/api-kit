"""Branches that the main suites leave unexecuted."""

import asyncio

import httpx
import pytest

from grizzly_sms import GrizzlyPartner, GrizzlySms, GrizzlySmsError
from grizzly_sms.async_client import AsyncGrizzlySms
from grizzly_sms.async_partner import AsyncGrizzlyPartner
from grizzly_sms.errors import assert_not_api_error
from grizzly_sms.parse import (
    flatten_prices,
    js_number,
    parse_countries,
    parse_number_v2,
    parse_rent_phone,
    parse_rent_prices,
)
from grizzly_sms.partner import parse_partner_request

BASE = "https://api.grizzlysms.com"
ORDER = {
    "activationId": 9,
    "phoneNumber": "7900",
    "activationCost": 1,
    "currency": 840,
    "countryCode": "0",
    "canGetAnotherSms": False,
    "activationTime": "t",
}


def _http(handler) -> httpx.Client:
    return httpx.Client(base_url=BASE, transport=httpx.MockTransport(handler))


def _async_http(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=BASE, transport=httpx.MockTransport(handler))


def test_query_coercion_and_decode() -> None:
    seen: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen.update(dict(request.url.params))
        action = request.url.params.get("action")
        if action == "getBalance":
            return httpx.Response(200, text="ACCESS_BALANCE:3")
        if action == "getStatus":
            return httpx.Response(200, json={"not": "text"})
        if action == "getPrices":
            return httpx.Response(
                200,
                content=b"{",
                headers={"content-type": "application/json"},
            )
        if action == "getPricesV3":
            return httpx.Response(200, json=[1])
        return httpx.Response(200, text="   ")

    sms = GrizzlySms("secret", client=_http(handler))
    assert sms.get_balance() == 3
    assert sms.call("getBalance", {"version": "", "flag": False, "n": 2.0}) == "ACCESS_BALANCE:3"
    assert seen["flag"] == "false"
    assert seen["n"] == "2"
    assert "version" not in seen or seen.get("action") == "getBalance"
    with pytest.raises(GrizzlySmsError) as status:
        sms.get_status(1)
    assert status.value.code == "UNEXPECTED_RESPONSE"
    with pytest.raises(GrizzlySmsError):
        sms.get_prices()
    with pytest.raises(GrizzlySmsError):
        sms.get_prices_v3()
    with pytest.raises(GrizzlySmsError) as empty:
        sms.call("custom")
    assert empty.value.code == "EMPTY_RESPONSE"
    sms.close()
    assert js_number(None) == 0
    with pytest.raises(GrizzlySmsError):
        assert_not_api_error("   ")


def test_forward_status_and_filters() -> None:
    state = {"v2": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        action = request.url.params.get("action")
        if action == "getNumber":
            assert request.url.params["forward"] == "0"
            return httpx.Response(200, text="ACCESS_NUMBER:1:7900")
        if action == "getNumberV2":
            return httpx.Response(200, text="NOPE")
        if action == "setStatus":
            assert request.url.params["forward"] == "1"
            return httpx.Response(200, text="ACCESS_READY")
        if action == "getStatusV2":
            state["v2"] += 1
            if state["v2"] == 1:
                return httpx.Response(200, text="NOPE")
            return httpx.Response(200, json=[])
        if action == "getPrices":
            return httpx.Response(
                200,
                json={
                    "16": {"tg": {"cost": 1, "count": 4}, "wa": {"cost": "x", "count": 1}},
                    "0": {"tg": {"cost": 9, "count": 1}},
                },
            )
        return httpx.Response(200, text="ACCESS_BALANCE:1")

    sms = GrizzlySms("secret", client=_http(handler))
    assert sms.get_number("tg", forward=False).activation_id == "1"
    with pytest.raises(GrizzlySmsError):
        sms.get_number_v2("tg")
    assert sms.set_status(1, 1, True) == "ACCESS_READY"
    with pytest.raises(GrizzlySmsError):
        sms.get_status_v2(1)
    with pytest.raises(GrizzlySmsError):
        sms.get_status_v2(1)
    quotes = sms.find_prices(country=16, min_count=1)
    assert [quote.service for quote in quotes] == ["tg"]
    sms.close()
    with pytest.raises(GrizzlySmsError):
        parse_number_v2({"activationId": 1, "phoneNumber": True})
    assert flatten_prices({"1": {"tg": {"cost": "x", "count": 1}}}) == []
    assert parse_countries([1, {"id": 2, "visible": "nope"}])[0].visible is None
    with pytest.raises(GrizzlySmsError):
        parse_rent_phone({"phone": {"id": 1, "number": True}})
    prices = parse_rent_prices(
        {"values": {"0": "skip", "1": {"tg": "skip", "wa": {"cost": "no", "count": 1}}}}
    )
    assert prices == []
    finished = parse_partner_request(
        {"action": "FINISH_ACTIVATION", "key": "k", "status": 3, "activationId": 9}
    )
    assert finished["status"] == 3


def test_waits_activate_and_retries() -> None:
    class Flip:
        def __init__(self) -> None:
            self.n = 0

        @property
        def aborted(self) -> bool:
            self.n += 1
            return self.n >= 3

    state = {"status": 0, "v2": 0, "net": 0, "http": 0, "sql": 0, "set": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        action = request.url.params.get("action")
        if action == "getStatus":
            state["status"] += 1
            if state["status"] < 3:
                return httpx.Response(200, text="STATUS_WAIT_CODE")
            if state["status"] == 3:
                return httpx.Response(200, text="STATUS_OK:55")
            return httpx.Response(200, text="BAD_KEY")
        if action == "getStatusV2":
            state["v2"] += 1
            if state["v2"] < 3:
                return httpx.Response(200, json={"sms": {"code": "  "}, "verificationType": 1})
            return httpx.Response(200, json={"sms": {"code": "55", "text": "55"}})
        if action == "getNumberV2":
            return httpx.Response(200, json=ORDER)
        if action == "setStatus":
            state["set"] += 1
            if state["set"] == 1:
                return httpx.Response(200, text="ACCESS_READY")
            return httpx.Response(200, text="BAD_KEY")
        if action == "getBalance":
            return httpx.Response(200, text="ACCESS_BALANCE:1")
        return httpx.Response(200, text="OK")

    sms = GrizzlySms("secret", client=_http(handler))
    with pytest.raises(GrizzlySmsError) as aborted:
        sms.wait_for_code(1, signal=type("S", (), {"aborted": True})())
    assert aborted.value.code == "ABORTED"
    seen: list[str] = []

    def on_status(status: object) -> None:
        seen.append(getattr(status, "status", ""))
        signal.aborted = True

    signal = type("S", (), {"aborted": False})()
    with pytest.raises(GrizzlySmsError):
        sms.wait_for_code(
            1, interval_ms=1_000, timeout_ms=5_000, signal=signal, on_status=on_status
        )
    assert seen == ["STATUS_WAIT_CODE"]
    received = sms.wait_for_code(1, interval_ms=30, timeout_ms=5_000)
    assert received.code == "55"
    with pytest.raises(GrizzlySmsError) as message_abort:
        sms.wait_for_message(1, signal=type("S", (), {"aborted": True})())
    assert message_abort.value.code == "ABORTED"
    with pytest.raises(GrizzlySmsError) as timed:
        sms.wait_for_message(1, interval_ms=0, timeout_ms=0, on_status=lambda _status: None)
    assert timed.value.code == "TIMEOUT"
    with pytest.raises(GrizzlySmsError) as mid:
        sms.wait_for_message(1, interval_ms=1_000, timeout_ms=5_000, signal=Flip())
    assert mid.value.code == "ABORTED"
    with pytest.raises(GrizzlySmsError) as cancelled:
        sms.activate("tg", cancel_on_error=True, interval_ms=0, timeout_ms=1_000)
    assert cancelled.value.code == "BAD_KEY"
    sms.close()

    def retry_http(request: httpx.Request) -> httpx.Response:
        state["http"] += 1
        if state["http"] == 1:
            return httpx.Response(503, text="busy")
        return httpx.Response(200, text="ACCESS_BALANCE:4")

    retrying = GrizzlySms("secret", client=_http(retry_http), retries=1, retry_delay_ms=0)
    assert retrying.get_balance() == 4
    retrying.close()

    def retry_net(request: httpx.Request) -> httpx.Response:
        state["net"] += 1
        if state["net"] == 1:
            raise httpx.ConnectError("down")
        return httpx.Response(200, text="ACCESS_BALANCE:5")

    networked = GrizzlySms("secret", client=_http(retry_net), retries=1, retry_delay_ms=0)
    assert networked.get_balance() == 5
    networked.close()

    def retry_sql(request: httpx.Request) -> httpx.Response:
        state["sql"] += 1
        if state["sql"] == 1:
            return httpx.Response(200, text="ERROR_SQL")
        return httpx.Response(200, text="ACCESS_BALANCE:6")

    sql = GrizzlySms("secret", client=_http(retry_sql), retries=1, retry_delay_ms=0)
    assert sql.get_balance() == 6
    sql.close()


def test_partner_injected_edges() -> None:
    def bad_json(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, content=b"{", headers={"content-type": "application/json"})

    partner = GrizzlyPartner("k", client=_http(bad_json))
    with pytest.raises(GrizzlySmsError) as http_error:
        partner.push_sms(sms_id=1, phone=1, phone_from="a", text="t")
    assert http_error.value.code == "HTTP_400"
    partner.close()

    def boom(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("down")

    broken = GrizzlyPartner("k", client=_http(boom))
    with pytest.raises(GrizzlySmsError) as network:
        broken.push_call(call_id=1, phone=1, phone_from="a")
    assert network.value.code == "NETWORK"
    broken.close()

    def no_error(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"status": "FAIL"})

    quiet = GrizzlyPartner("k", client=_http(no_error))
    with pytest.raises(GrizzlySmsError) as failed:
        quiet.push_call(call_id=1, phone=1, phone_from="a")
    assert failed.value.code == "FAIL"
    quiet.close()

    def record(request: httpx.Request) -> httpx.Response:
        assert b'filename="record"' in request.content
        return httpx.Response(200, json={"status": "SUCCESS"})

    saved = GrizzlyPartner("k", client=_http(record))
    recorded = saved.push_call_record(call_id=1, phone=1, phone_from="a", file=b"wav")
    assert recorded.status == "SUCCESS"
    saved.close()


def test_async_owned_and_remaining() -> None:
    async def main() -> None:
        owned = AsyncGrizzlySms("secret")
        await owned.aclose()
        async with AsyncGrizzlySms("secret"):
            pass
        async with AsyncGrizzlyPartner("partner-key"):
            pass

        state = {"n": 0, "status": 0, "v2": 0}

        def handler(request: httpx.Request) -> httpx.Response:
            action = request.url.params.get("action")
            if action == "getBalance":
                state["n"] += 1
                if state["n"] == 1:
                    return httpx.Response(503, text="busy")
                if state["n"] == 2:
                    raise httpx.ConnectError("down")
                if state["n"] == 3:
                    return httpx.Response(200, text="ERROR_SQL")
                return httpx.Response(200, text="ACCESS_BALANCE:7")
            if action == "getNumber":
                assert request.url.params["forward"] == "0"
                assert request.url.params.get("skip", "") == ""
                return httpx.Response(200, text="ACCESS_NUMBER:1:7900")
            if action == "getNumberV2":
                return httpx.Response(200, json=ORDER)
            if action == "setStatus":
                state["set"] = state.get("set", 0) + 1
                if state["set"] == 1:
                    return httpx.Response(200, text="ACCESS_READY")
                if state["set"] == 2:
                    return httpx.Response(200, text="NO_BALANCE")
                return httpx.Response(200, text="ACCESS_CANCEL")
            if action == "getStatus":
                state["status"] += 1
                if state["status"] == 1:
                    return httpx.Response(200, text="STATUS_CANCEL")
                return httpx.Response(200, text="STATUS_WAIT_CODE")
            if action == "getStatusV2":
                state["v2"] += 1
                if state["v2"] == 1:
                    return httpx.Response(200, text="NOPE")
                if state["v2"] < 5:
                    return httpx.Response(200, json={"sms": {}})
                return httpx.Response(200, json={"sms": {"code": "77", "text": "77"}})
            if action == "getPrices":
                return httpx.Response(200, json={"4": {"tg": {"cost": 1, "count": 3}}})
            if request.url.path.endswith("/wallet"):
                return httpx.Response(200, json={})
            return httpx.Response(200, text="NOPE")

        sms = AsyncGrizzlySms("secret", client=_async_http(handler), retries=3, retry_delay_ms=0)
        assert await sms.call("getBalance", {"skip": "", "flag": False}) == "ACCESS_BALANCE:7"
        assert (await sms.get_number("tg", forward=False)).phone_number == "7900"
        called: list[str] = []
        with pytest.raises(GrizzlySmsError) as cancelled:
            await sms.wait_for_code(1, on_status=lambda status: called.append(status.status))
        assert cancelled.value.code == "STATUS_CANCEL"
        assert called == ["STATUS_CANCEL"]
        with pytest.raises(GrizzlySmsError) as aborted:
            await sms.wait_for_code(1, signal=type("S", (), {"aborted": True})())
        assert aborted.value.code == "ABORTED"
        with pytest.raises(GrizzlySmsError):
            await sms.get_status_v2(1)
        with pytest.raises(GrizzlySmsError) as timed:
            await sms.wait_for_message(1, interval_ms=0, timeout_ms=0, on_status=lambda _row: None)
        assert timed.value.code == "TIMEOUT"

        class Flip:
            def __init__(self) -> None:
                self.n = 0

            @property
            def aborted(self) -> bool:
                self.n += 1
                return self.n >= 3

        with pytest.raises(GrizzlySmsError):
            await sms.wait_for_message(1, interval_ms=1_000, timeout_ms=5_000, signal=Flip())
        message = await sms.wait_for_message(1, interval_ms=40, timeout_ms=5_000)
        assert message.code == "77"
        with pytest.raises(GrizzlySmsError) as activation:
            await sms.activate(
                "tg",
                cancel_on_timeout=True,
                interval_ms=0,
                timeout_ms=0,
            )
        assert activation.value.code == "TIMEOUT"
        assert (await sms.find_prices(country=4))[0].country == "4"
        for method in (
            sms.get_services,
            sms.get_countries,
            sms.get_active_activations,
            sms.get_numbers_status,
            lambda: sms.get_rent_number(" ", 0, 4),
            lambda: sms.get_rent_number("tg", 0, 4),
            lambda: sms.continue_rent(1, 4),
            lambda: sms.get_rent_status(1),
            lambda: sms.get_rent_history(1),
            sms.get_rent_prices,
        ):
            with pytest.raises(GrizzlySmsError):
                await method()
        with pytest.raises(GrizzlySmsError):
            await sms.get_wallet()
        assert await sms.set_status(1, 6, True) == "ACCESS_CANCEL"
        assert await sms.set_status(1, 6, False) == "ACCESS_CANCEL"
        assert await sms.set_status(1, 6, 2) == "ACCESS_CANCEL"
        await sms.aclose()

        def disconnect(request: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError("down")

        offline = AsyncGrizzlySms("secret", client=_async_http(disconnect), retries=0)
        with pytest.raises(GrizzlySmsError) as network:
            await offline.get_balance()
        assert network.value.code == "NETWORK"
        await offline.aclose()

    asyncio.run(main())
