import asyncio

import httpx
import pytest
from pytest_httpx import HTTPXMock

from give_sms import (
    PARTNER_KEY,
    AsyncGiveSms,
    GiveSmsAbortError,
    GiveSmsError,
    GiveSmsTimeoutError,
    NetworkError,
    ResendRequiredError,
)
from tests.test_client import _dispatch


def _run(coro):
    return asyncio.run(coro)


def test_async_surface(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_callback(_dispatch, is_reusable=True)

    async def scenario() -> None:
        async with AsyncGiveSms("test_key", headers={"X-Test": "1"}) as client:
            assert await client.get_balance() == 120.0
            assert (await client.get_count("kazakhstan"))["ANY"]["vk"]["count"] == 1
            assert await client.get_all(service="tg")
            assert await client.get_all_count()
            ordered = await client.get_number("vk", country="kazakhstan", max_price=9)
            assert ordered.phone == "7996"
            activation = await client.purchase("vk", max_price=9)
            assert (await activation.get_code()).code == "753455"
            assert (await activation.wait_for_code(timeout=1, interval=0)).full_sms == "hi"
            assert await activation.repeat_code("sms-1") is True
            assert (await activation.wrong_code("sms-1")).code == "222"
            assert await activation.cancel() is True
            assert await client.refuse_number(ordered.id) is True
            assert await activation.ban() is True
            assert (await client.reactivation_options(ordered.id))["options"][0]["price"] == 12.6
            assert (await client.reactivate(ordered.id, 20, 12.6))["order_id"] == "900"
            assert await client.get_reactivation_options(ordered.id)
            assert await client.handler_get_balance() == 55.2
            assert await client.handler_get_numbers_status(2) == {"vk_0": 10}
            handler_number = await client.handler_get_number("vk", max_price=4)
            assert handler_number.number == "79001234567"
            assert await client.handler_ready(1) == "ACCESS_READY"
            assert await client.handler_request_another_sms(1) == "ACCESS_3"
            assert await client.handler_complete(1) == "ACCESS_6"
            assert await client.handler_cancel(1) == "ACCESS_8"
            assert (await client.handler_get_status(1)).code == "9988"
            assert (
                await client.handler_wait_for_code(1, timeout=1, interval=0)
            ).status == "STATUS_OK"
            assert await client.handler_get_prices(tiers=1)
            assert await client.handler_get_reactivation_options(1) == {"20": 12.6}
            renewed = await client.handler_reactivate(1, 20, 12.6)
            assert renewed.number == "7900:extra"
            assert (await client.rent_countries())["count"] == 1
            assert await client.rent_get_data_country("KZ") == {"services": []}
            assert (await client.rent_all_orders())["count"] == 0
            order = await client.rent_create_order(
                type="week", period=1, services=[82, 1], country="KZ", operator="ANY"
            )
            assert order.phone == "7999"
            assert (await client.rent_get_sms(order.order_id)).messages[0].text == "123"
            assert (await client.rent_prolong(order.order_id, type="week", period=1)).price == 350
            waited = await client.rent_wait_for_sms(order.order_id, timeout=1, interval=0, since=1)
            assert waited.messages
            assert await client.call_api("getbalance")
            assert "ACCESS_BALANCE" in await client.call_handler("getBalance")

    _run(scenario())
    assert PARTNER_KEY == "pk_39579ba6dfd61e59"


def test_async_errors(httpx_mock: HTTPXMock) -> None:
    with pytest.raises(GiveSmsError, match="API key"):
        AsyncGiveSms("")

    proxied = AsyncGiveSms("test_key", proxy="http://127.0.0.1:9", base_url="https://give-sms.com/")
    assert proxied.base_url == "https://give-sms.com"
    _run(proxied.close())

    httpx_mock.add_response(json={"status": 400, "data": {"msg": "wait"}})
    httpx_mock.add_response(text="STATUS_CANCEL")
    httpx_mock.add_response(text="STATUS_WAIT_RESEND")
    httpx_mock.add_response(text="STATUS_WAIT_CODE")
    httpx_mock.add_response(json={"status": 200, "data": []})
    httpx_mock.add_response(json={"status": 200, "data": []})
    httpx_mock.add_response(text="[]")
    httpx_mock.add_response(text="[]")
    httpx_mock.add_response(status_code=502, text="")
    httpx_mock.add_exception(httpx.ConnectError("down"))

    async def scenario() -> None:
        async with AsyncGiveSms("test_key", retry_delay=0) as client:
            with pytest.raises(GiveSmsTimeoutError):
                await client.wait_for_code(1, timeout=0, interval=0)
            with pytest.raises(GiveSmsAbortError):
                await client.wait_for_next_code(1, timeout=5, interval=0, cancel=lambda: True)
            with pytest.raises(GiveSmsError) as cancelled:
                await client.handler_wait_for_code(1, timeout=1, interval=0)
            assert cancelled.value.code == "STATUS_CANCEL"
            with pytest.raises(ResendRequiredError):
                await client.handler_wait_for_code(1, timeout=1, interval=0)
            with pytest.raises(GiveSmsTimeoutError):
                await client.handler_wait_for_code(1, timeout=0, interval=0)
            with pytest.raises(GiveSmsError, match="Unexpected getcount"):
                await client.get_count()
            with pytest.raises(GiveSmsError, match="service is required"):
                await client.get_number("")
            with pytest.raises(GiveSmsError, match="Unexpected countries"):
                await client.rent_countries()
            with pytest.raises(GiveSmsError, match="Unexpected getNumbersStatus"):
                await client.handler_get_numbers_status()
            with pytest.raises(GiveSmsError, match="Unexpected reactivation"):
                await client.handler_get_reactivation_options(1)
            with pytest.raises(GiveSmsError, match="service is required"):
                await client.handler_get_number("")
            with pytest.raises(GiveSmsError, match="HTTP 502"):
                await client.handler_get_balance()
            with pytest.raises(NetworkError):
                await client.get_balance()

    _run(scenario())

    httpx_mock.add_response(json={"status": 502, "data": {"msg": "again"}})
    httpx_mock.add_response(json={"status": 200, "data": {"balance": 6}})

    async def retried() -> None:
        async with AsyncGiveSms("test_key", retries=1, retry_delay=0) as client:
            assert await client.get_balance() == 6

    _run(retried())


def test_async_rent_wait_and_invalid_json(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"status": 200, "data": {"sms_list": []}})
    httpx_mock.add_response(text="<html>")

    async def scenario() -> None:
        async with AsyncGiveSms("test_key") as client:
            with pytest.raises(GiveSmsTimeoutError):
                await client.rent_wait_for_sms(1, timeout=0, interval=0)
            with pytest.raises(GiveSmsError, match="Invalid JSON"):
                await client.get_balance()

    _run(scenario())
