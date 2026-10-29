import asyncio

import httpx
import pytest
from pytest_httpx import HTTPXMock

from simpleswap import (
    AsyncSimpleSwap,
    SimpleSwapNetworkError,
    SimpleSwapServerError,
    SimpleSwapTimeoutError,
)


def _run(coro):
    return asyncio.run(coro)


def test_async_methods(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/currencies",
        json={"result": [{"ticker": "btc"}]},
        is_reusable=True,
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/currencies/btc/btc",
        json={"result": {"name": "Bitcoin"}},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/pairs",
        json={"result": {"btc:btc": ["eth:eth"]}},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/pairs/btc/btc?fixed=true",
        json={"result": {"btc:btc": ["usdt:trx"]}},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/estimates?tickerFrom=btc&tickerTo=eth&amount=0.1&customFee=0.4",
        json={"result": {"estimatedAmount": "2"}},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/ranges?tickerFrom=btc&tickerTo=eth",
        json={"result": {"min": "0.001", "max": "2"}},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/exchanges/check?tickerFrom=btc&tickerTo=eth&amount=0.1",
        json={"result": True},
    )
    httpx_mock.add_response(
        method="POST",
        url="https://api.simpleswap.io/v3/exchanges",
        json={"result": {"id": "ex", "status": "waiting"}},
    )
    httpx_mock.add_response(
        method="PUT",
        url="https://api.simpleswap.io/v3/exchanges",
        json={"result": {"publicId": "ex", "status": "confirming"}},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/exchanges/ex",
        json={"result": {"id": "ex", "status": "finished"}},
        is_reusable=True,
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/exchanges?limit=1",
        json={"result": [{"id": "ex"}]},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/market",
        json={"result": [{"rate": "3"}]},
    )

    async def scenario():
        async with AsyncSimpleSwap(api_key="k", max_retries=0) as client:
            assert (await client.get_currencies())[0]["ticker"] == "btc"
            assert (await client.get_all_currencies())[0]["ticker"] == "btc"
            assert (await client.get_currency("btc", "btc"))["name"] == "Bitcoin"
            assert "eth:eth" in (await client.get_all_pairs())["btc:btc"]
            assert "usdt:trx" in (await client.get_pairs("btc", "btc", fixed=True))["btc:btc"]
            estimated = await client.get_estimated("btc", "eth", "0.1", custom_fee=0.4)
            assert estimated["estimatedAmount"] == "2"
            assert await client.get_min("btc", "eth") == "0.001"
            assert (await client.check_exchange("btc", "eth", "0.1"))["canCreate"] is True
            created = await client.create_exchange("btc", "eth", "0.1", "0xdest")
            assert created["id"] == "ex"
            confirmed = await client.confirm_exchange("ex", "tx")
            assert confirmed["status"] == "confirming"
            assert (await client.get_exchange("ex"))["status"] == "finished"
            assert (await client.get_exchanges(limit=1))[0]["id"] == "ex"
            assert (await client.get_market_info())[0]["rate"] == "3"
            assert client.is_valid_address("abc", currency={"validationAddress": None}) is True
            waited = await client.wait_for_exchange("ex", timeout=1, interval=0)
            assert waited["status"] == "finished"

    _run(scenario())


def test_async_retry_timeout_and_network(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/currencies",
        status_code=503,
        json={"message": "down"},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/currencies",
        json={"result": []},
    )
    httpx_mock.add_response(
        method="POST",
        url="https://api.simpleswap.io/v3/exchanges",
        status_code=500,
        json={"message": "nope"},
    )
    httpx_mock.add_exception(httpx.ConnectError("nope"), url="https://api.simpleswap.io/v3/market")
    httpx_mock.add_exception(httpx.ConnectError("nope"), url="https://api.simpleswap.io/v3/market")
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/exchanges/slow",
        json={"result": "nope"},
    )

    async def scenario():
        async with AsyncSimpleSwap(api_key="k", max_retries=1, retry_delay=0) as client:
            assert await client.get_currencies() == []
            with pytest.raises(SimpleSwapServerError):
                await client.create_exchange("btc", "eth", "1", "dest")
            with pytest.raises(SimpleSwapNetworkError):
                await client.get_market()
            with pytest.raises(SimpleSwapTimeoutError, match="unknown"):
                await client.wait_for_exchange("slow", timeout=0, interval=0)

    _run(scenario())
