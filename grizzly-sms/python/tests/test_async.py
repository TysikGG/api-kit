import asyncio

import httpx
import pytest

from grizzly_sms import AsyncGrizzlyPartner, AsyncGrizzlySms, GrizzlySmsError, ReceivedCode


def _client(handler, **kwargs: object) -> AsyncGrizzlySms:
    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(base_url="https://api.grizzlysms.com", transport=transport)
    return AsyncGrizzlySms("secret", client=http, retry_delay_ms=0, **kwargs)  # type: ignore[arg-type]


def _partner(handler) -> AsyncGrizzlyPartner:
    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(base_url="https://api.grizzlysms.com", transport=transport)
    return AsyncGrizzlyPartner("k", client=http)


def test_async_surface() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/wallet"):
            assert "ref_id" not in request.url.params
            return httpx.Response(200, json={"wallet_address": "T"})
        action = request.url.params["action"]
        bodies = {
            "getBalance": "ACCESS_BALANCE:2.5",
            "getNumber": "ACCESS_NUMBER:1:7900",
            "setStatus": "ACCESS_READY",
            "getStatus": "STATUS_OK:42",
            "getRentStatus": None,
        }
        if action == "getNumberV2":
            return httpx.Response(
                200,
                json={
                    "activationId": 8,
                    "phoneNumber": "7900",
                    "activationCost": 1,
                    "currency": 840,
                    "countryCode": "0",
                    "canGetAnotherSms": True,
                    "activationTime": "t",
                },
            )
        if action == "getStatusV2":
            return httpx.Response(200, json={"sms": {"code": "42", "text": "42"}})
        if action == "getPrices":
            return httpx.Response(200, json={"0": {"tg": {"cost": 1, "count": 2}}})
        if action in {"getPricesV2", "getPricesV3"}:
            return httpx.Response(200, json={"0": {}})
        if action == "getServicesList":
            return httpx.Response(200, json={"services": [{"code": "tg", "name": "Telegram"}]})
        if action == "getCountries":
            return httpx.Response(200, json={"1": {"id": 1, "eng": "Ukraine"}})
        if action == "getActiveActivations":
            return httpx.Response(
                200,
                content=b"null",
                headers={"content-type": "application/json"},
            )
        if action == "getNumbersStatus":
            return httpx.Response(200, json={"tg_0": 4})
        if action in {"getRentNumber", "continueRentNumber"}:
            return httpx.Response(
                200, json={"status": "success", "phone": {"id": 3, "number": "1", "endDate": "e"}}
            )
        if action == "getRentStatus":
            return httpx.Response(200, json={"status": "success", "values": {}})
        if action == "setRentStatus":
            return httpx.Response(200, json={"status": "success"})
        if action == "getRentHistory":
            return httpx.Response(200, json={"status": "success", "values": {}})
        if action == "getRentPrices":
            return httpx.Response(200, json={"status": "success", "values": {}})
        if action in bodies and isinstance(bodies[action], str):
            return httpx.Response(200, text=str(bodies[action]))
        return httpx.Response(200, text="OK")

    async def main() -> None:
        sms = _client(handler)
        try:
            assert await sms.get_balance() == 2.5
            assert (await sms.get_number("tg", country="any")).phone_number == "7900"
            ordered = await sms.get_number_v2("tg", country=12, max_price=1)
            assert ordered.activation_id == "8"
            assert await sms.ready(1) == "ACCESS_READY"
            assert await sms.request_another_code(1) == "ACCESS_READY"
            assert await sms.complete(1) == "ACCESS_READY"
            assert await sms.cancel(1) == "ACCESS_READY"
            assert (await sms.get_status(1)).code == "42"
            assert (await sms.get_status_v2(1))["sms"]["code"] == "42"
            assert await sms.wait_for_code(1, interval_ms=0, timeout_ms=1000) == ReceivedCode(
                code="42", status="STATUS_OK"
            )
            message = await sms.wait_for_message(1, interval_ms=0, timeout_ms=1000)
            assert message.source == "sms"
            order, received = await sms.activate("tg", ready=False, interval_ms=0, timeout_ms=1000)
            assert received.code == "42" and order.activation_id == "8"
            assert (await sms.find_prices(service="tg", min_count=1, max_price=2))[0].cost == 1
            assert await sms.get_prices_v2(service="tg") == {"0": {}}
            assert await sms.get_prices_v3(country=0) == {"0": {}}
            assert (await sms.get_services())[0].code == "tg"
            assert (await sms.get_countries())[0].eng == "Ukraine"
            assert await sms.get_active_activations() == []
            assert (await sms.get_numbers_status(country=0))[0].count == 4
            assert (await sms.get_rent_number("tg", 0, 4)).id == "3"
            assert (await sms.continue_rent(3, 4)).number == "1"
            assert (await sms.get_rent_status(3)).quantity == 0
            assert await sms.finish_rent(3) == "success"
            assert await sms.cancel_rent(3) == "success"
            assert (await sms.get_rent_history(3)).entries == []
            assert await sms.get_rent_prices() == []
            assert (await sms.get_wallet()).wallet_address == "T"
            assert await sms.call("custom") == "OK"
        finally:
            await sms.aclose()

        async with _client(handler) as entered:
            assert await entered.get_balance() == 2.5

        partner = _partner(lambda request: httpx.Response(200, json={"status": "SUCCESS"}))
        try:
            assert (
                await partner.push_sms(sms_id=1, phone=1, phone_from="a", text="t")
            ).status == "SUCCESS"
            assert (await partner.push_call(call_id=1, phone=1, phone_from="a")).status == "SUCCESS"
            recorded = await partner.push_call_record(
                call_id=1, phone=1, phone_from="a", file=b"wav"
            )
            assert recorded.status == "SUCCESS"
        finally:
            await partner.aclose()

    asyncio.run(main())


def test_async_errors() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.params.get("action") == "getBalance":
            return httpx.Response(500, text="nope")
        return httpx.Response(200, text="STATUS_WAIT_CODE")

    async def main() -> None:
        sms = _client(handler)
        with pytest.raises(GrizzlySmsError) as exc:
            await sms.get_balance()
        assert exc.value.code == "HTTP_500"
        with pytest.raises(GrizzlySmsError) as timeout:
            await sms.wait_for_code(1, interval_ms=0, timeout_ms=0)
        assert timeout.value.code == "TIMEOUT"
        with pytest.raises(GrizzlySmsError):
            await sms.get_number(" ")
        await sms.aclose()
        with pytest.raises(GrizzlySmsError):
            AsyncGrizzlySms(" ")
        with pytest.raises(GrizzlySmsError):
            AsyncGrizzlyPartner(" ")
        bare = _partner(
            lambda request: httpx.Response(200, json={"status": "ERROR", "error": "busy"})
        )
        with pytest.raises(GrizzlySmsError):
            await bare.push_sms(
                sms_id=1, phone=1, phone_from="a", text="t", retries=1, retry_delay_ms=0
            )
        await bare.aclose()
        missing = _partner(lambda request: httpx.Response(200, json={"status": "SUCCESS"}))
        with pytest.raises(GrizzlySmsError):
            await missing.push_call_record(call_id=1, phone=1, phone_from="a")
        await missing.aclose()

    asyncio.run(main())
