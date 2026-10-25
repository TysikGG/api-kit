import json
from collections.abc import Callable
from typing import Any

import httpx
import pytest

from bitcoinvn import BitcoinVn, BitcoinVnError

Handler = Callable[[httpx.Request], httpx.Response]

ORDER = {
    "id": "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
    "shortId": "BV2MTZAF",
    "status": "new",
    "depositMethod": "btc",
    "depositAsset": "BTC",
    "depositFee": 0.001,
    "depositData": {"address": "bc1qdeposit"},
    "settleMethod": "xmr",
    "settleAsset": "XMR",
    "settleFee": 0.0001,
    "settleData": {"address": "4example"},
    "depositMin": 0.0001,
    "createdAt": "2023-04-10T10:00:00+00:00",
    "expiresAt": "2023-04-17T10:00:00+00:00",
}

QUOTE_ID = "8120a8a8-8dd1-4168-80fc-c4d932ce5b93"
OFFER_ID = "8120a8a8-8dd1-4168-80fc-c4d932ce5b93"


def route(httpx_mock: Any, handler: Handler) -> None:
    httpx_mock.add_callback(handler, is_reusable=True)


def js(body: object, status: int = 200, headers: dict[str, str] | None = None) -> httpx.Response:
    return httpx.Response(status, json=body, headers=headers)


def err(
    status: int,
    message: str,
    details: dict[str, object] | None = None,
    retry_after: str | None = None,
) -> httpx.Response:
    error: dict[str, object] = {"message": message, "code": status}
    if details is not None:
        error["details"] = details
    headers = {"X-RateLimit-Retry-After": retry_after} if retry_after else None
    return js({"error": error}, status, headers)


def body_of(request: httpx.Request) -> dict[str, Any]:
    if not request.content:
        return {}
    parsed = json.loads(request.content)
    assert isinstance(parsed, dict)
    return parsed


def test_blank_api_key_is_anonymous(httpx_mock: Any) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert "x-api-key" not in request.headers
        assert request.headers["user-agent"] == "bitcoinvn/0.1.0"
        return js({"rate": 1, "volume24h": 2})

    route(httpx_mock, handler)
    with BitcoinVn("  ") as client:
        assert client.get_ticker("BTC", "USDT") == {"rate": 1, "volume24h": 2}


def test_get_health_success_and_api_error(httpx_mock: Any) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.method == "GET"
        assert request.url.path == "/api/health"
        if calls["n"] == 1:
            return js({"status": "ok"})
        return err(429, "Too many requests.", retry_after="12")

    route(httpx_mock, handler)
    with BitcoinVn() as client:
        assert client.get_health() == {"status": "ok"}
        with pytest.raises(BitcoinVnError) as exc:
            client.get_health()
    assert exc.value.status == 429
    assert exc.value.code == 429
    assert exc.value.retry_after == 12
    assert str(exc.value) == "Too many requests."


def test_get_info_success_and_api_error(httpx_mock: Any) -> None:
    info = {
        "assets": {
            "BTC": {
                "id": "BTC",
                "name": "Bitcoin",
                "exchangeFee": 0.02,
                "bridgeFee": 0.0015,
                "tags": ["crypto"],
            }
        },
        "transferMethods": {
            "btc": {
                "enabled": True,
                "id": "btc",
                "asset": "BTC",
                "decimals": 8,
                "depositEnabled": True,
                "settleEnabled": True,
                "internalBalance": False,
                "tags": ["crypto"],
            }
        },
    }
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.url.path == "/api/info"
        if calls["n"] == 1:
            return js(info)
        return err(503, "Service temporarily unavailable for maintenance.")

    route(httpx_mock, handler)
    with BitcoinVn() as client:
        assert client.get_info() == info
        with pytest.raises(BitcoinVnError) as exc:
            client.get_info()
    assert exc.value.code == 503


def test_get_pair_success_and_api_error(httpx_mock: Any) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.url.path == "/api/pairs/btc/xmr"
        assert request.headers["x-api-key"] == "secret"
        if calls["n"] == 1:
            return js({"rate": 150, "min": 0.0001, "max": 1})
        return err(404, "Pair does not exist.")

    route(httpx_mock, handler)
    with BitcoinVn("secret") as client:
        assert client.get_pair("btc", "xmr")["rate"] == 150
        with pytest.raises(BitcoinVnError) as exc:
            client.get_pair("btc", "xmr")
    assert exc.value.code == 404


def test_get_ticker_success_and_api_error(httpx_mock: Any) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.method == "GET"
        assert request.url.path == "/api/ticker/BTC/USDT"
        assert "x-api-key" not in request.headers
        assert "referrer" not in request.url.params
        if calls["n"] == 1:
            return js({"rate": 100, "volume24h": 5})
        return err(404, "One or both asset IDs are invalid or private")

    route(httpx_mock, handler)
    with BitcoinVn() as client:
        assert client.get_ticker("BTC", "USDT") == {"rate": 100, "volume24h": 5}
        with pytest.raises(BitcoinVnError) as exc:
            client.get_ticker("BTC", "USDT")
    assert exc.value.code == 404


def test_validate_address_success_and_api_error(httpx_mock: Any) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.url.path == "/api/addresses/validate"
        if calls["n"] == 1:
            assert request.url.params["transferMethod"] == "btcln"
            assert request.url.params["address"] == "lnbc1example"
            assert request.url.params["invoiceAmount"] == "0.01"
            return js({"valid": True})
        return err(400, "Unknown transfer method.")

    route(httpx_mock, handler)
    with BitcoinVn() as client:
        assert client.validate_address("btcln", "lnbc1example", invoice_amount=0.01) == {
            "valid": True
        }
        with pytest.raises(BitcoinVnError) as exc:
            client.validate_address("nope", "x")
    assert exc.value.code == 400


def test_create_quote_success_and_api_error(httpx_mock: Any) -> None:
    calls = {"n": 0}
    quote = {
        "id": QUOTE_ID,
        "depositMethod": "btc",
        "settleMethod": "xmr",
        "depositAmount": 0.01,
        "settleAmount": 1.5,
        "rate": 150,
    }

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.method == "POST"
        assert request.url.path == "/api/quotes"
        if calls["n"] == 1:
            body = body_of(request)
            assert body == {
                "depositMethod": "btc",
                "settleMethod": "xmr",
                "depositAmount": 0.01,
                "markupRate": 0.01,
            }
            assert "referrer" not in body
            return js(quote, 201)
        return err(400, "Amount is below the minimum.", {"depositAmount": "too small"})

    route(httpx_mock, handler)
    with BitcoinVn() as client:
        assert client.create_quote("btc", "xmr", deposit_amount=0.01, markup_rate=0.01) == quote
        with pytest.raises(BitcoinVnError) as exc:
            client.create_quote("btc", "xmr", deposit_amount=0)
    assert exc.value.code == 400
    assert exc.value.details == {"depositAmount": "too small"}


def test_list_orders_success_and_api_error(httpx_mock: Any) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.method == "GET"
        assert request.url.path == "/api/orders"
        if calls["n"] == 1:
            assert request.headers["x-api-key"] == "secret"
            assert request.url.params["page"] == "2"
            assert request.url.params["customOrderId"] == "rent-october"
            assert body_of(request) == {}
            return js([ORDER])
        return err(401, "API key is required.")

    route(httpx_mock, handler)
    with BitcoinVn("secret") as client:
        assert client.list_orders(page=2, custom_order_id="rent-october") == [ORDER]
        with pytest.raises(BitcoinVnError) as exc:
            client.list_orders()
    assert exc.value.code == 401
    assert exc.value.status == 401


def test_create_order_sends_referrer_and_api_error(httpx_mock: Any) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.method == "POST"
        assert request.url.path == "/api/orders"
        assert "referrer" not in request.url.params
        assert "referrer" not in request.headers
        body = body_of(request)
        assert body["referrer"] == "35b2eec68a1741ac"
        if calls["n"] == 1:
            assert request.headers["x-api-key"] == "secret"
            assert body["quote"] == QUOTE_ID
            assert body["settleData"] == {"address": "4example"}
            return js(ORDER, 201)
        return err(403, "Read-only API key used.")

    route(httpx_mock, handler)
    with BitcoinVn("secret") as client:
        order = client.create_order(quote=QUOTE_ID, settle_data={"address": "4example"})
        assert order["shortId"] == "BV2MTZAF"
        with pytest.raises(TypeError):
            client.create_order(  # type: ignore[call-arg]
                quote=QUOTE_ID,
                referrer="someone-else",
            )
        with pytest.raises(BitcoinVnError) as exc:
            client.create_order(deposit_method="btc", settle_method="xmr")
    assert exc.value.code == 403


def test_get_order_success_and_api_error(httpx_mock: Any) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.url.path == "/api/orders/BV2MTZAF"
        if calls["n"] == 1:
            return js(ORDER)
        return err(404, "Order not found")

    route(httpx_mock, handler)
    with BitcoinVn() as client:
        assert client.get_order("BV2MTZAF")["shortId"] == "BV2MTZAF"
        with pytest.raises(BitcoinVnError) as exc:
            client.get_order("BV2MTZAF")
    assert exc.value.code == 404


def test_submit_deposit_success_and_api_error(httpx_mock: Any) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.method == "POST"
        assert request.url.path == "/api/orders/BV2MTZAF/deposit"
        if calls["n"] == 1:
            body = body_of(request)
            assert body == {"txid": "abc123"}
            assert "referrer" not in body
            pending = dict(ORDER)
            pending["status"] = "pending"
            return js(pending)
        return err(409, "Order is not new.")

    route(httpx_mock, handler)
    with BitcoinVn() as client:
        assert client.submit_deposit("BV2MTZAF", "abc123")["status"] == "pending"
        with pytest.raises(BitcoinVnError) as exc:
            client.submit_deposit("BV2MTZAF", "abc123")
    assert exc.value.code == 409


def test_update_settle_data_success_and_api_error(httpx_mock: Any) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.method == "PUT"
        assert request.url.path == "/api/orders/BV2MTZAF/settle-data"
        if calls["n"] == 1:
            assert request.headers["x-api-key"] == "secret"
            assert body_of(request) == {"address": "bc1qnew"}
            return js(ORDER)
        return err(404, "Order was not found.")

    route(httpx_mock, handler)
    with BitcoinVn("secret") as client:
        assert client.update_settle_data("BV2MTZAF", {"address": "bc1qnew"}) == ORDER
        with pytest.raises(BitcoinVnError) as exc:
            client.update_settle_data("BV2MTZAF", {"invoice": "lnbc1"})
    assert exc.value.code == 404


def test_get_balances_success_and_api_error(httpx_mock: Any) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.url.path == "/api/balances"
        if calls["n"] == 1:
            assert request.headers["x-api-key"] == "secret"
            return js({"BTC": 0.01, "VND": 20000000})
        return err(401, "Invalid API key.")

    route(httpx_mock, handler)
    with BitcoinVn("secret") as client:
        assert client.get_balances() == {"BTC": 0.01, "VND": 20000000}
        with pytest.raises(BitcoinVnError) as exc:
            client.get_balances()
    assert exc.value.code == 401


def test_list_balance_history_success_and_api_error(httpx_mock: Any) -> None:
    row = {
        "id": QUOTE_ID,
        "asset": "BTC",
        "value": 0.05,
        "createdAt": "2023-04-10T10:00:00+00:00",
        "note": "Order settle BV2MTZAF",
    }
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.url.path == "/api/balances/history"
        if calls["n"] == 1:
            assert request.url.params["assetId"] == "BTC"
            assert request.url.params["page"] == "1"
            return js([row])
        return err(404, "Unknown asset.")

    route(httpx_mock, handler)
    with BitcoinVn("secret") as client:
        assert client.list_balance_history(asset_id="BTC", page=1) == [row]
        with pytest.raises(BitcoinVnError) as exc:
            client.list_balance_history(asset_id="NOPE")
    assert exc.value.code == 404


def test_list_staking_offers_success_and_api_error(httpx_mock: Any) -> None:
    vault = {
        "id": OFFER_ID,
        "asset": "sBCH",
        "distribution": 0.005,
        "supplyTarget": 200,
        "staked": 99,
        "latestApr": 0.31,
        "latestFullyDilutedApr": 0.06,
    }
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.url.path == "/api/staking"
        if calls["n"] == 1:
            return js([vault])
        return err(503, "Service temporarily unavailable.")

    route(httpx_mock, handler)
    with BitcoinVn() as client:
        assert client.list_staking_offers() == [vault]
        with pytest.raises(BitcoinVnError) as exc:
            client.list_staking_offers()
    assert exc.value.code == 503


def test_set_auto_stake_success_and_api_error(httpx_mock: Any) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.method == "PUT"
        assert request.url.path == f"/api/staking/{OFFER_ID}/auto-stake"
        if calls["n"] == 1:
            assert body_of(request) == {"value": True}
            return js({"value": True})
        return err(403, "Read-only API key used.")

    route(httpx_mock, handler)
    with BitcoinVn("secret") as client:
        assert client.set_auto_stake(OFFER_ID, True) == {"value": True}
        with pytest.raises(BitcoinVnError) as exc:
            client.set_auto_stake(OFFER_ID, False)
    assert exc.value.code == 403


def test_set_staking_notifications_success_and_api_error(httpx_mock: Any) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.url.path == f"/api/staking/{OFFER_ID}/notifications"
        if calls["n"] == 1:
            assert body_of(request) == {"value": False}
            return js({"value": False})
        return err(400, "value must be a boolean.")

    route(httpx_mock, handler)
    with BitcoinVn("secret") as client:
        assert client.set_staking_notifications(OFFER_ID, False) == {"value": False}
        with pytest.raises(BitcoinVnError) as exc:
            client.set_staking_notifications(OFFER_ID, True)
    assert exc.value.code == 400


def test_resolve_address_success_and_api_error(httpx_mock: Any) -> None:
    resolved = {
        "name": "alice.eth",
        "address": "0xabc",
        "transferMethod": "eth",
        "networkId": "eth",
        "networkName": "Ethereum",
        "chainId": 1,
        "resolvedAt": 1700000000,
        "expiresAt": 1700000900,
        "ensResolutionToken": "token",
    }
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.url.path == "/api/addresses/resolve"
        if calls["n"] == 1:
            assert request.url.params["transferMethod"] == "eth"
            assert request.url.params["name"] == "alice.eth"
            return js(resolved)
        return err(422, "No address returned.")

    route(httpx_mock, handler)
    with BitcoinVn() as client:
        assert client.resolve_address("eth", "alice.eth") == resolved
        with pytest.raises(BitcoinVnError) as exc:
            client.resolve_address("btc", "alice.eth")
    assert exc.value.code == 422


def test_get_guarantee_public_key_success_and_api_error(httpx_mock: Any) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.url.path == "/api/guarantee/public-key"
        if calls["n"] == 1:
            return httpx.Response(200, text="-----BEGIN PGP PUBLIC KEY BLOCK-----")
        return err(404, "Verification certificates are not provisioned")

    route(httpx_mock, handler)
    with BitcoinVn() as client:
        assert client.get_guarantee_public_key() == "-----BEGIN PGP PUBLIC KEY BLOCK-----"
        with pytest.raises(BitcoinVnError) as exc:
            client.get_guarantee_public_key()
    assert exc.value.code == 404


def test_get_order_guarantee_success_and_api_error(httpx_mock: Any) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.url.path == "/api/orders/BV2MTZAF/guarantee"
        if calls["n"] == 1:
            return httpx.Response(200, text="-----BEGIN PGP SIGNED MESSAGE-----")
        return err(403, "Caller does not own the order")

    route(httpx_mock, handler)
    with BitcoinVn() as client:
        assert client.get_order_guarantee("BV2MTZAF") == "-----BEGIN PGP SIGNED MESSAGE-----"
        with pytest.raises(BitcoinVnError) as exc:
            client.get_order_guarantee("BV2MTZAF")
    assert exc.value.code == 403


def test_transport_error(httpx_mock: Any) -> None:
    httpx_mock.add_exception(httpx.ConnectError("boom"))
    with BitcoinVn() as client, pytest.raises(BitcoinVnError) as exc:
        client.get_health()
    assert exc.value.status == 0
    assert exc.value.code == 0
