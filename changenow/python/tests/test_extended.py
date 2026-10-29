import asyncio

import httpx
import pytest
from pytest_httpx import HTTPXMock

from changenow import (
    AsyncChangeNow,
    ChangeNow,
    ChangeNowAddressError,
    ChangeNowAmountError,
    ChangeNowAssetError,
    ChangeNowAuthError,
    ChangeNowError,
    ChangeNowNetworkError,
    ChangeNowNotFoundError,
    ChangeNowPairError,
    ChangeNowRateError,
    ChangeNowRateLimitError,
    ChangeNowServerError,
    ChangeNowTimeoutError,
    ChangeNowValidationError,
    build_exchange_link,
    is_terminal_exchange_status,
    parse_exchange_webhook,
    split_asset_id,
)


def test_link_and_webhook_helpers() -> None:
    assert split_asset_id("usdt.trx") == {"currency": "usdt", "network": "trx"}
    assert split_asset_id("btc") == {"currency": "btc", "network": "btc"}
    assert split_asset_id(".eth") == {"currency": ".eth", "network": ".eth"}
    assert is_terminal_exchange_status("finished") is True
    assert is_terminal_exchange_status("waiting") is False
    assert is_terminal_exchange_status(None) is False

    link = build_exchange_link(
        "btc",
        "eth",
        amount="0.1",
        fixed_rate=True,
        lang="en",
        recipient_address="0xabc",
        utm_source="wallet",
    )
    assert link.startswith("https://changenow.io/exchange?")
    assert "fixedRate=true" in link
    assert "utm_source=wallet" in link
    fiat = build_exchange_link(
        "usd",
        "btc",
        amount=10,
        fiat_mode=True,
        lang="de",
        amount_to="0.01",
        recipient_extra_id="9",
        backup_address="bc1q",
        utm_medium="app",
        utm_campaign="spring",
        utm_content="banner",
        utm_term="btc",
    )
    assert fiat.startswith("https://changenow.io/de/exchange?")
    with pytest.raises(ChangeNowValidationError):
        build_exchange_link("", "eth")

    assert parse_exchange_webhook({"id": "ex-1", "status": "waiting"})["id"] == "ex-1"
    assert parse_exchange_webhook({"requestId": "req-1"})["id"] == "req-1"
    with pytest.raises(ChangeNowValidationError):
        parse_exchange_webhook(["nope"])
    with pytest.raises(ChangeNowValidationError):
        parse_exchange_webhook({"status": "waiting"})
    with pytest.raises(ChangeNowValidationError):
        parse_exchange_webhook({"id": "ex-1", "status": 1})


def test_invalid_proxy() -> None:
    with pytest.raises(ChangeNowError):
        ChangeNow(proxy="not a url")
    client = ChangeNow(proxy="https://127.0.0.1")
    client.close()


def test_retries_and_error_mapping(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(status_code=503, json={"message": "down"}, headers={"retry-after": "0"})
    httpx_mock.add_response(status_code=408, json={"message": "timeout"})
    httpx_mock.add_response(json={"id": "ex-1", "status": "waiting"})

    client = ChangeNow(api_key="test-changenow-key", retries=2, retry_delay=0)
    assert client.get_exchange("ex-1")["status"] == "waiting"

    httpx_mock.add_response(status_code=500, json={"message": "down"})
    with pytest.raises(ChangeNowServerError):
        client.create_exchange("btc", "eth", "0xabc", from_amount="1")
    posts = [request for request in httpx_mock.get_requests() if request.method == "POST"]
    assert len(posts) == 1

    httpx_mock.add_response(
        status_code=400,
        json={
            "status": 400,
            "errors": {
                "fromAmount": {
                    "code": "AMOUNT_OUT_OF_RANGE",
                    "message": "too small",
                }
            },
            "help": "GET /v3/exchange/estimate?help",
        },
    )
    with pytest.raises(ChangeNowAmountError) as amount_error:
        client.get_min_amount("btc", "eth")
    assert amount_error.value.field == "fromAmount"
    assert amount_error.value.help == "GET /v3/exchange/estimate?help"

    once = ChangeNow(api_key="test-changenow-key", retries=0)
    httpx_mock.add_response(status_code=400, json="plain failure")
    with pytest.raises(ChangeNowValidationError, match="plain failure"):
        once.get_min_amount("btc", "eth")

    httpx_mock.add_response(status_code=429, json={"message": ["slow", "down"]})
    with pytest.raises(ChangeNowRateLimitError):
        once.get_min_amount("btc", "eth")

    httpx_mock.add_exception(httpx.ConnectError("offline"))
    with pytest.raises(ChangeNowNetworkError):
        once.get_range("btc", "eth")

    httpx_mock.add_response(status_code=401, json={"error": "unauthorized", "message": "bad key"})
    with pytest.raises(ChangeNowAuthError):
        once.get_exchange("missing")

    httpx_mock.add_response(status_code=404, json={"code": "NOT_FOUND", "message": "missing"})
    with pytest.raises(ChangeNowNotFoundError):
        once.get_market_estimate("usd", "btc", from_amount=1)

    httpx_mock.add_response(status_code=400, json=["bad", "pair"])
    with pytest.raises(ChangeNowValidationError, match="bad; pair"):
        once.get_range("a", "b")

    httpx_mock.add_response(
        status_code=404,
        json={"status": 404, "errors": {"asset": "No such asset"}, "help": "GET /v1/assets?help"},
    )
    with pytest.raises(ChangeNowNotFoundError, match="No such asset") as missing:
        once.get_asset("nope")
    assert missing.value.field == "asset"

    for status, code, exc in (
        (400, "INVALID_ADDRESS", ChangeNowAddressError),
        (400, "UNKNOWN_ASSET", ChangeNowAssetError),
        (400, "PAIR_NOT_AVAILABLE", ChangeNowPairError),
        (400, "RATE_UNAVAILABLE", ChangeNowRateError),
        (418, "TEAPOT", ChangeNowError),
    ):
        httpx_mock.add_response(
            status_code=status,
            json={"errors": {"request": {"code": code, "message": code}}},
        )
        with pytest.raises(exc):
            once.get_market_estimate("usd", "btc", from_amount=1)


def test_wait_and_public_and_v1(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"id": "ex-1", "status": "waiting"})
    httpx_mock.add_response(json={"id": "ex-1", "status": "finished"})
    seen: list[str] = []
    client = ChangeNow(api_key="test-changenow-key", retries=0, retry_delay=0)
    done = client.wait_for_exchange(
        "ex-1",
        timeout=5,
        interval=0,
        on_status=lambda status, _row: seen.append(status),
    )
    assert done["status"] == "finished"
    assert seen == ["waiting", "finished"]

    httpx_mock.add_response(json={"id": "ex-2", "status": "confirming"})
    with pytest.raises(ChangeNowTimeoutError):
        client.wait_for_exchange("ex-2", timeout=0, interval=0)

    httpx_mock.add_response(json="not-an-object")
    with pytest.raises(ChangeNowError, match="received text"):
        client.wait_for_exchange("ex-3", timeout=0, interval=0)

    httpx_mock.add_response(
        json={
            "returned": 1,
            "total": 2,
            "has_more": True,
            "next_cursor": "next",
            "summary": "more",
            "assets": [{"asset": "btc.btc", "ticker": "btc"}],
        }
    )
    httpx_mock.add_response(
        json={
            "returned": 1,
            "total": 2,
            "has_more": False,
            "next_cursor": None,
            "summary": "done",
            "assets": [{"asset": "eth.eth", "ticker": "eth"}],
        }
    )
    assert [row["ticker"] for row in client.list_all_assets(q="btc", limit=1)] == ["btc", "eth"]

    httpx_mock.add_response(
        json={
            "returned": 1,
            "total": 9,
            "has_more": True,
            "next_cursor": "again",
            "summary": "more",
            "assets": [{"ticker": "btc"}],
        }
    )
    assert len(client.list_all_assets(limit=1, max_pages=1)) == 1

    httpx_mock.add_response(text="asset,ticker\nbtc.btc,btc\n", headers={"content-type": "text/csv"})
    assert "btc.btc" in client.list_assets(format="csv")
    httpx_mock.add_response(text="catalogue manual", headers={"content-type": "text/plain"})
    assert client.get_asset_manual() == "catalogue manual"
    httpx_mock.add_response(json={"asset": "btc.btc", "network": "btc"})
    assert client.get_asset("btc.btc")["network"] == "btc"

    httpx_mock.add_response(json={"quote": {"toAmount": "1.2", "provider": "changenow"}})
    quote = client.get_public_estimate("btc", "btc", "eth", "eth", from_amount="0.1", use_rate_id=False)
    assert quote["quote"]["toAmount"] == "1.2"
    httpx_mock.add_response(text="estimate manual", headers={"content-type": "text/plain"})
    assert client.get_public_manual() == "estimate manual"

    httpx_mock.add_response(
        status_code=201,
        json={"id": "041c0026e6e482", "payinAddress": "bc1q", "addressFormatChecked": True},
    )
    created = client.create_public_transaction(
        "btc",
        "btc",
        "eth",
        "eth",
        "0xabc",
        from_amount="0.1",
        source="wallet",
        promo_code="PROMO",
    )
    assert created["id"] == "041c0026e6e482"
    httpx_mock.add_response(text="create manual", headers={"content-type": "text/plain"})
    assert (
        client.create_public_transaction("btc", "btc", "eth", "eth", "0xabc", help=True) == "create manual"
    )

    httpx_mock.add_response(json={"id": "041c0026e6e482", "status": "waiting"})
    httpx_mock.add_response(json={"id": "041c0026e6e482", "status": "finished", "payoutHash": "0xhash"})
    finished = client.wait_for_public_transaction("041c0026e6e482", timeout=5, interval=0, sub_id="leg-1")
    assert finished["payoutHash"] == "0xhash"

    with pytest.raises(ChangeNowAuthError):
        ChangeNow(retries=0).create_transaction_v1("btc", "eth", "0xabc", 0.1)

    httpx_mock.add_response(json=[{"ticker": "btc"}])
    httpx_mock.add_response(json=[{"ticker": "eth"}])
    httpx_mock.add_response(json={"ticker": "btc", "name": "Bitcoin"})
    httpx_mock.add_response(json={"minAmount": 0.001})
    httpx_mock.add_response(json={"estimatedAmount": 1.5})
    httpx_mock.add_response(json={"minAmount": 0.001, "maxAmount": None})
    httpx_mock.add_response(json={"estimatedAmount": 1.4, "rateId": "rate-v1"})
    httpx_mock.add_response(json=["btc_eth"])
    httpx_mock.add_response(json={"result": True, "message": None})
    httpx_mock.add_response(json={"id": "v1-1"})
    httpx_mock.add_response(json={"id": "v1-fixed"})
    httpx_mock.add_response(json={"status": "waiting"})
    httpx_mock.add_response(json=[{"status": "finished"}])

    assert client.get_currencies_v1(active=True, fixed_rate=True)[0]["ticker"] == "btc"
    assert client.get_currencies_to_v1("btc", fixed_rate=True)[0]["ticker"] == "eth"
    assert client.get_currency_info_v1("btc")["name"] == "Bitcoin"
    assert client.get_min_amount_v1("btc", "eth")["minAmount"] == 0.001
    assert client.get_exchange_amount_v1(0.1, "btc", "eth")["estimatedAmount"] == 1.5
    assert client.get_exchange_range_v1("btc", "eth")["maxAmount"] is None
    assert client.get_fixed_rate_amount_v1("0.1", "btc", "eth", use_rate_id=True)["rateId"] == "rate-v1"
    assert client.get_market_pairs_v1() == ["btc_eth"]
    assert client.validate_address_v1("eth", "0xabc")["result"] is True
    assert client.create_transaction_v1(
        "btc", "eth", "0xabc", "0.1", user_id="user-42", payload={"campaign": "spring"}, flow="standard"
    )["id"] == "v1-1"
    assert client.create_fixed_rate_transaction_v1(
        "btc", "eth", "0xabc", 0.2, rate_id="rate-v1"
    )["id"] == "v1-fixed"
    assert client.get_transaction_v1("v1-1")["status"] == "waiting"
    assert client.list_transactions_v1(from_ticker="btc", status="finished", limit=5)[0]["status"] == "finished"
    assert client.is_terminal_exchange_status("refunded") is True
    assert client.split_asset_id("usdt.trx")["network"] == "trx"
    assert client.parse_exchange_webhook({"exchangeId": "ex-9"})["id"] == "ex-9"

    v1_requests = [request for request in httpx_mock.get_requests() if "/v1/currencies" in str(request.url)]
    assert any(request.url.params.get("api_key") == "test-changenow-key" for request in v1_requests)


def test_context_manager_aliases_and_odd_bodies(httpx_mock: HTTPXMock) -> None:
    from changenow.client import _retry_after

    assert _retry_after("   ") is None
    assert _retry_after("Wed, 21 Oct 2015 07:28:00") is None

    httpx_mock.add_response(status_code=200, content=b"")
    httpx_mock.add_response(status_code=400, text="not-json", headers={"content-type": "text/plain"})
    httpx_mock.add_response(status_code=400, json={"message": None, "error": None})
    httpx_mock.add_response(status_code=400, content=b"1", headers={"content-type": "application/json"})
    httpx_mock.add_response(status_code=403, json={"message": "disabled"})
    httpx_mock.add_response(json={"id": "ex-1", "status": "finished"})
    httpx_mock.add_response(json={"id": "ex-1", "status": "finished"})

    with ChangeNow(api_key="k", retries=0) as client:
        assert client.get_currencies() is None
        with pytest.raises(ChangeNowValidationError, match="not-json"):
            client.get_min_amount("btc", "eth")
        with pytest.raises(ChangeNowValidationError):
            client.get_min_amount("btc", "eth")
        with pytest.raises(ChangeNowValidationError):
            client.get_min_amount("btc", "eth")
        with pytest.raises(ChangeNowError, match="disabled"):
            client.get_exchange("ex-1")
        assert client.get_transaction("ex-1")["status"] == "finished"
        assert client.get_transaction_status("ex-1")["status"] == "finished"


def test_async_client(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json=[{"ticker": "btc", "name": "Bitcoin", "network": "btc"}])
    httpx_mock.add_response(json={"id": "ex-1", "status": "waiting"})
    httpx_mock.add_response(json={"id": "ex-1", "status": "finished"})
    httpx_mock.add_response(
        json={
            "returned": 1,
            "total": 1,
            "has_more": False,
            "next_cursor": None,
            "summary": "done",
            "assets": [{"ticker": "btc"}],
        }
    )
    httpx_mock.add_response(json=[{"ticker": "eth"}])

    async def run() -> None:
        async with AsyncChangeNow(api_key="test-changenow-key", retries=0) as client:
            currencies = await client.get_currencies(active=True)
            assert currencies[0]["ticker"] == "btc"
            link = await client.build_exchange_link("btc", "eth", amount="1")
            assert "from=btc" in link
            done = await client.wait_for_exchange("ex-1", timeout=5, interval=0)
            assert done["status"] == "finished"
            assets = await client.list_all_assets(limit=1)
            assert assets[0]["ticker"] == "btc"
            legacy = await client.get_currencies_v1(active=True)
            assert legacy[0]["ticker"] == "eth"
            await client.close()

    asyncio.run(run())


def test_async_errors_and_polling(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(status_code=503, json={"message": "down"}, headers={"retry-after": "0"})
    httpx_mock.add_response(json={"id": "ex-1", "status": "new"})
    httpx_mock.add_response(status_code=400, text="nope", headers={"content-type": "text/plain"})
    httpx_mock.add_exception(httpx.ConnectError("offline"))
    httpx_mock.add_exception(httpx.ConnectError("offline"))
    httpx_mock.add_response(text="manual", headers={"content-type": "text/plain"})
    httpx_mock.add_response(status_code=200, content=b"")
    httpx_mock.add_response(json={"id": "ex-2", "status": "confirming"})
    httpx_mock.add_response(json="not-an-object")
    httpx_mock.add_response(
        json={
            "has_more": True,
            "next_cursor": "n",
            "assets": [{"ticker": "btc"}],
        }
    )
    httpx_mock.add_response(
        json={"has_more": False, "next_cursor": None, "assets": [{"ticker": "eth"}]}
    )
    httpx_mock.add_response(json={"id": "pub", "status": "finished"})

    async def run() -> None:
        client = AsyncChangeNow(api_key="k", retries=1, retry_delay=0)
        assert (await client.get_exchange("ex-1"))["status"] == "new"
        with pytest.raises(ChangeNowValidationError):
            await client.get_min_amount("btc", "eth")
        with pytest.raises(ChangeNowNetworkError):
            await client.get_range("btc", "eth")
        assert await client.get_asset_manual() == "manual"
        assert await client.get_currencies() is None
        seen: list[str] = []
        with pytest.raises(ChangeNowTimeoutError):
            await client.wait_for_exchange(
                "ex-2",
                timeout=0,
                interval=0,
                on_status=lambda status, _row: seen.append(status),
            )
        assert seen == ["confirming"]
        with pytest.raises(ChangeNowError, match="received text"):
            await client.wait_for_exchange("ex-3", timeout=0, interval=0)
        tickers = [row["ticker"] for row in await client.list_all_assets(limit=1)]
        assert tickers == ["btc", "eth"]
        finished = await client.wait_for_public_transaction("pub", timeout=1, interval=0)
        assert finished["status"] == "finished"
        with pytest.raises(AttributeError):
            await client.not_a_method()
        await client.aclose()

    asyncio.run(run())


def test_retry_unsafe_post(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_exception(httpx.ConnectError("reset"))
    httpx_mock.add_response(json={"result": True})
    client = ChangeNow(api_key="k", retries=1, retry_delay=0, retry_unsafe=True)
    assert client.continue_exchange("ex-1")["result"] is True


def test_date_retry_after(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        status_code=429,
        json={"message": "slow"},
        headers={"retry-after": "Wed, 21 Oct 2015 07:28:00 GMT"},
    )
    httpx_mock.add_response(json={"minAmount": 1, "maxAmount": 2})
    client = ChangeNow(api_key="k", retries=1, retry_delay=0)
    assert client.get_range("btc", "eth")["minAmount"] == 1

    httpx_mock.add_response(status_code=503, json={"message": "later"}, headers={"retry-after": "nope"})
    httpx_mock.add_response(json={"id": "ex-1", "status": "new"})
    assert client.get_exchange("ex-1")["status"] == "new"
