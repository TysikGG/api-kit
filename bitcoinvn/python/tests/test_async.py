import asyncio
import json

import httpx
import pytest

from bitcoinvn import (
    AsyncBitcoinVn,
    BitcoinVnError,
    BitcoinVnServerError,
    BitcoinVnTimeoutError,
)

ORDER = {
    "id": "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
    "shortId": "BV2MTZAF",
    "status": "new",
    "depositMethod": "btc",
    "depositAsset": "BTC",
    "depositFee": 0,
    "depositData": {"address": "bc1q"},
    "settleMethod": "xmr",
    "settleAsset": "XMR",
    "settleFee": 0,
    "settleData": {"address": "4"},
    "depositMin": 0,
    "createdAt": "2023-04-10T10:00:00+00:00",
    "expiresAt": "2023-04-17T10:00:00+00:00",
}
QUOTE = {"id": "q", "depositMethod": "btc", "settleMethod": "xmr"}


def transport(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        transport=httpx.MockTransport(handler),
        base_url="https://bitcoinvn.io",
    )


def test_async_methods_cover_the_public_surface() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        method = request.method
        if path == "/api/health":
            return httpx.Response(200, json={"status": "ok"})
        if path == "/api/info":
            return httpx.Response(200, json={"assets": {}, "transferMethods": {}})
        if path.startswith("/api/pairs/"):
            return httpx.Response(200, json={"rate": 1, "min": 1})
        if path.startswith("/api/ticker/"):
            return httpx.Response(200, json={"rate": 2, "volume24h": 3})
        if path == "/api/addresses/validate":
            return httpx.Response(200, json={"valid": True})
        if path == "/api/quotes" and method == "POST":
            return httpx.Response(201, json=QUOTE)
        if path == "/api/orders" and method == "GET":
            page = request.url.params.get("page")
            if page in (None, "1"):
                return httpx.Response(200, json=[dict(ORDER) for _ in range(10)])
            return httpx.Response(200, json=[ORDER])
        if path == "/api/orders" and method == "POST":
            body = json.loads(request.content)
            assert body["referrer"] == "35b2eec68a1741ac"
            return httpx.Response(201, json=ORDER)
        if path == "/api/orders/BV2MTZAF" and method == "GET":
            payload = dict(ORDER)
            payload["status"] = "completed"
            return httpx.Response(200, json=payload)
        if path.endswith("/deposit"):
            return httpx.Response(200, json=ORDER)
        if path.endswith("/settle-data"):
            return httpx.Response(200, json=ORDER)
        if path == "/api/balances":
            return httpx.Response(200, json={"BTC": 1})
        if path == "/api/balances/history":
            page = request.url.params.get("page")
            if page == "1":
                rows = [
                    {"id": str(i), "asset": "BTC", "value": 1, "createdAt": "t"} for i in range(25)
                ]
                return httpx.Response(200, json=rows)
            last = {"id": "last", "asset": "BTC", "value": 1, "createdAt": "t"}
            return httpx.Response(200, json=[last])
        if path == "/api/staking" and method == "GET":
            return httpx.Response(
                200,
                json=[
                    {
                        "id": "offer",
                        "asset": "sBCH",
                        "distribution": 0.1,
                        "supplyTarget": 1,
                        "staked": 1,
                        "latestApr": 0.1,
                        "latestFullyDilutedApr": 0.1,
                    }
                ],
            )
        if path.endswith("/auto-stake"):
            return httpx.Response(200, json={"value": True})
        if path.endswith("/notifications"):
            return httpx.Response(200, json={"value": False})
        if path == "/api/addresses/resolve":
            return httpx.Response(
                200,
                json={
                    "name": "alice.eth",
                    "address": "0x",
                    "transferMethod": "eth",
                    "networkId": "eth",
                    "networkName": "Ethereum",
                    "chainId": 1,
                    "resolvedAt": 1,
                    "expiresAt": 2,
                    "ensResolutionToken": "tok",
                },
            )
        if path == "/api/guarantee/public-key":
            return httpx.Response(200, text="PGP")
        if path.endswith("/guarantee"):
            return httpx.Response(200, text="LETTER")
        return httpx.Response(404, json={"error": {"message": path, "code": 404}})

    async def run() -> None:
        http = transport(handler)
        async with AsyncBitcoinVn("secret", client=http) as client:
            assert await client.get_health() == {"status": "ok"}
            assert await client.get_info() == {"assets": {}, "transferMethods": {}}
            assert (await client.info())["assets"] == {}
            assert (await client.get_pair("btc", "xmr"))["rate"] == 1
            assert (await client.pair("btc", "xmr"))["min"] == 1
            assert (await client.get_ticker("BTC", "USDT"))["volume24h"] == 3
            assert (await client.validate_address("btc", "bc1q"))["valid"] is True
            assert (await client.create_quote("btc", "xmr", deposit_amount=0.01))["id"] == "q"
            assert (await client.quote("btc", "xmr", None, 1))["id"] == "q"
            assert len(await client.list_orders(page=2)) == 1
            assert len(await client.orders()) == 10
            created = await client.create_order(quote="q", settle_data={"address": "4"})
            assert created["shortId"] == "BV2MTZAF"
            assert (await client.fixed_swap("q", "addr"))["shortId"] == "BV2MTZAF"
            assert (await client.variable_swap("btc", "xmr", None))["depositMethod"] == "btc"
            assert (await client.get_order("BV2MTZAF"))["status"] == "completed"
            assert (await client.order("BV2MTZAF"))["status"] == "completed"
            assert (await client.submit_deposit("BV2MTZAF", "abc"))["shortId"] == "BV2MTZAF"
            settled = await client.update_settle_data("BV2MTZAF", {"address": "z"})
            assert settled["shortId"] == "BV2MTZAF"
            assert await client.get_balances() == {"BTC": 1}
            assert await client.balances() == {"BTC": 1}
            assert len(await client.list_balance_history(asset_id="BTC", page=1)) == 25
            offers = await client.list_staking_offers()
            assert offers[0]["asset"] == "sBCH"
            assert (await client.set_auto_stake("offer", True))["value"] is True
            assert (await client.set_staking_notifications("offer", False))["value"] is False
            assert (await client.resolve_address("eth", "alice.eth"))["ensResolutionToken"] == "tok"
            assert await client.get_guarantee_public_key() == "PGP"
            assert await client.get_order_guarantee("BV2MTZAF") == "LETTER"
            waited = await client.wait_for_order("BV2MTZAF", timeout_ms=1000, interval_ms=10)
            assert waited["status"] == "completed"
            assert len(await client.list_all_orders(max_pages=2)) == 11
            assert len(await client.list_all_balance_history()) == 26
            assert client.swap_url("btc", "xmr").endswith("deposit=btc&settle=xmr")
            assert client.verify_webhook("{}", "00") is False
        await http.aclose()

    asyncio.run(run())


def test_async_retry_timeout_and_close() -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if request.url.path == "/api/health" and calls["n"] == 1:
            return httpx.Response(502, text="bad gateway")
        if request.url.path == "/api/health":
            return httpx.Response(200, json={"status": "ok"})
        if request.url.path == "/api/quotes":
            return httpx.Response(500, json={"error": {"message": "nope", "code": 500}})
        payload = dict(ORDER)
        payload["status"] = "new"
        return httpx.Response(200, json=payload)

    async def run() -> None:
        sleeps: list[float] = []
        http = transport(handler)
        async with AsyncBitcoinVn(
            client=http,
            retries=1,
            retry_delay_ms=15,
            max_retry_delay_ms=15,
            sleep=sleeps.append,
        ) as client:
            assert await client.get_health() == {"status": "ok"}
            assert sleeps == [0.015]
            with pytest.raises(BitcoinVnServerError):
                await client.quote("btc", "xmr")
            assert calls["n"] == 3

        clock = {"now": 0.0}

        def monotonic() -> float:
            return clock["now"]

        async def asleep(seconds: float) -> None:
            clock["now"] += seconds

        http2 = transport(handler)
        async with AsyncBitcoinVn(client=http2, sleep=asleep, monotonic=monotonic) as client:
            with pytest.raises(BitcoinVnTimeoutError) as exc:
                await client.wait_for_order("BV2MTZAF", timeout_ms=500, interval_ms=200)
            assert exc.value.order["status"] == "new"
            assert await client.list_all_orders(max_pages=0) == []
            history = [row async for row in client.iter_balance_history(max_pages=0)]
            assert history == []
        await http.aclose()
        await http2.aclose()

        async with AsyncBitcoinVn(proxy="http://127.0.0.1:9") as owned:
            assert owned.base_url == "https://bitcoinvn.io"
        with pytest.raises(BitcoinVnError, match="Proxy must"):
            AsyncBitcoinVn(proxy="ftp://example")

    asyncio.run(run())


def test_async_transport_retry_and_owned_client() -> None:
    calls = {"n": 0}

    def handler(_request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            raise httpx.ConnectError("down")
        return httpx.Response(200, json={"status": "ok"})

    async def run() -> None:
        http = transport(handler)
        async with AsyncBitcoinVn(
            client=http,
            retries=1,
            retry_delay_ms=0,
            max_retry_delay_ms=0,
            sleep=lambda _seconds: None,
        ) as client:
            assert await client.get_health() == {"status": "ok"}
        await http.aclose()
        async with AsyncBitcoinVn() as owned:
            assert owned.base_url == "https://bitcoinvn.io"

    asyncio.run(run())


def test_async_transport_error() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("down")

    async def run() -> None:
        http = transport(handler)
        async with AsyncBitcoinVn(client=http, retries=0) as client:
            with pytest.raises(BitcoinVnError) as exc:
                await client.get_info()
            assert exc.value.status == 0
        await http.aclose()

    asyncio.run(run())
