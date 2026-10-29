import hashlib
import hmac
import json
from typing import Any

import httpx
import pytest

from bitcoinvn import (
    ORDERS_PAGE_SIZE,
    BitcoinVn,
    BitcoinVnBadRequestError,
    BitcoinVnError,
    BitcoinVnMaintenanceError,
    BitcoinVnRateLimitError,
    BitcoinVnTimeoutError,
    BitcoinVnUnauthorizedError,
    read_webhook,
    verify_webhook_signature,
    webhook_signature,
)
from bitcoinvn.client import _Api, _header_int

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


def test_call_is_abstract_and_non_finite_delay(httpx_mock: Any) -> None:
    with pytest.raises(NotImplementedError):
        _Api().get_health()

    calls = {"n": 0}

    def handler(_request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(503, json={"error": {"message": "down", "code": 503}})
        return httpx.Response(200, json={"status": "ok"})

    httpx_mock.add_callback(handler, is_reusable=True)
    with BitcoinVn(
        retries=1,
        retry_delay_ms=float("inf"),
        max_retry_delay_ms=1,
        sleep=lambda _seconds: None,
    ) as client:
        assert client.get_health() == {"status": "ok"}


def test_base_url_proxy_and_headers(httpx_mock: Any) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["x-api-key"] == "secret"
        assert request.headers["user-agent"] == "bitcoinvn/0.1.0"
        assert request.headers["x-trace"] == "abc"
        assert "nope" not in request.headers.get("x-api-key", "")
        return httpx.Response(200, json={"status": "ok"})

    httpx_mock.add_callback(handler)
    with BitcoinVn(
        "  secret  ",
        base_url="https://example.test/",
        timeout_ms=1500,
        headers={"X-Trace": "abc", "X-API-KEY": "nope", "User-Agent": "other"},
        retries=0,
    ) as client:
        assert client.base_url == "https://example.test"
        assert client.get_health() == {"status": "ok"}

    with pytest.raises(BitcoinVnError, match="Proxy must"):
        BitcoinVn(proxy="socks5://127.0.0.1:1080")
    with pytest.raises(BitcoinVnError, match="Proxy must"):
        BitcoinVn(proxy="not a url")
    owned = BitcoinVn(proxy="http://127.0.0.1:9", base_url="   ")
    assert owned.base_url == "https://bitcoinvn.io"
    owned.close()
    assert owned._http.is_closed

    external = httpx.Client(base_url="https://bitcoinvn.io")
    wrapped = BitcoinVn(client=external)
    wrapped.close()
    assert external.is_closed is False
    external.close()


def test_retries_rate_limit_and_plain_errors(httpx_mock: Any) -> None:
    calls = {"n": 0}
    sleeps: list[float] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if request.url.path == "/api/health" and calls["n"] == 1:
            return httpx.Response(
                503,
                json={"error": {"message": "maintenance", "code": 503}},
                headers={
                    "X-RateLimit-Limit": "100",
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Retry-After": "1.9",
                },
            )
        if request.url.path == "/api/health":
            return httpx.Response(
                200,
                json={"status": "ok"},
                headers={"X-RateLimit-Remaining": "99", "X-RateLimit-Limit": "100"},
            )
        if request.url.path == "/api/quotes":
            return httpx.Response(503, json={"error": {"message": "down", "code": 503}})
        if request.url.path == "/api/ticker/NOPE/USDT":
            return httpx.Response(
                400,
                json={"error": {"message": "", "code": "400", "details": {"field": "x"}}},
                headers={"X-RateLimit-Limit": "10"},
            )
        return httpx.Response(500, text="  ")

    httpx_mock.add_callback(handler, is_reusable=True)
    with BitcoinVn(
        retries=2,
        retry_delay_ms=25,
        max_retry_delay_ms=40,
        sleep=sleeps.append,
    ) as client:
        assert client.get_health() == {"status": "ok"}
        assert sleeps == [0.04]
        assert client.last_rate_limit == {"limit": 100, "remaining": 99}
        with pytest.raises(BitcoinVnMaintenanceError):
            client.create_quote("btc", "xmr")
        with pytest.raises(BitcoinVnBadRequestError) as exc:
            client.get_ticker("NOPE", "USDT")
    assert exc.value.message if False else exc.value.args[0] == "HTTP 400"
    assert exc.value.limit == 10
    assert exc.value.details == {"field": "x"}
    assert calls["n"] == 4


def test_mutation_retry_transport_and_non_json(httpx_mock: Any) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if request.url.path == "/api/quotes" and calls["n"] == 1:
            return httpx.Response(500, text="bad gateway")
        if request.url.path == "/api/quotes":
            quote = {"depositMethod": "btc", "settleMethod": "xmr", "id": "q"}
            return httpx.Response(201, json=quote)
        if calls["n"] == 3:
            raise httpx.ConnectError("socket hang up")
        if request.url.path.startswith("/api/ticker"):
            return httpx.Response(200, json={"rate": 1, "volume24h": 2})
        if request.url.path == "/api/info":
            return httpx.Response(200, text="not-json")
        return httpx.Response(200, content=b"")

    httpx_mock.add_callback(handler, is_reusable=True)
    with BitcoinVn(
        retries=2,
        retry_mutations=True,
        retry_delay_ms=0,
        max_retry_delay_ms=0,
        sleep=lambda _seconds: None,
    ) as client:
        assert client.quote("btc", "xmr")["id"] == "q"
        assert client.get_ticker("BTC", "USDT") == {"rate": 1, "volume24h": 2}
        with pytest.raises(BitcoinVnError, match="not JSON"):
            client.get_info()
        with pytest.raises(BitcoinVnError, match="not JSON"):
            client.get_pair("btc", "xmr")


def test_swaps_aliases_and_pagination(httpx_mock: Any) -> None:
    bodies: list[dict[str, Any]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if request.method == "POST" and path == "/api/orders":
            bodies.append(json.loads(request.content))
            return httpx.Response(201, json=ORDER)
        if path == "/api/info":
            return httpx.Response(200, json={"assets": {}, "transferMethods": {}})
        if path.startswith("/api/pairs/"):
            return httpx.Response(200, json={"rate": 1, "min": 2})
        if path == "/api/orders/BV2MTZAF":
            return httpx.Response(200, json=ORDER)
        if path == "/api/balances" and request.method == "GET":
            return httpx.Response(200, json={"BTC": 1})
        if path == "/api/balances/history":
            page = request.url.params.get("page")
            if page == "1":
                rows = [
                    {"id": str(index), "asset": "BTC", "value": 1, "createdAt": "t"}
                    for index in range(25)
                ]
                return httpx.Response(200, json=rows)
            last = {"id": "last", "asset": "BTC", "value": -1, "createdAt": "t"}
            return httpx.Response(200, json=[last])
        if path == "/api/orders":
            page = int(request.url.params.get("page", "1"))
            if page < 2:
                page_rows = [{**ORDER, "shortId": f"BV{index}"} for index in range(10)]
                return httpx.Response(200, json=page_rows)
            return httpx.Response(200, json=[ORDER])
        return httpx.Response(404, json={"error": {"message": path, "code": 404}})

    httpx_mock.add_callback(handler, is_reusable=True)
    with BitcoinVn("secret") as client:
        client.fixed_swap(
            "quote-1",
            "bc1qexample",
            webhook_url="https://merchant.example/hook",
            custom_order_id="rent",
        )
        client.fixed_swap("quote-2", {"invoice": "lnbc1"})
        client.fixed_swap("quote-3", "")
        client.variable_swap(
            "btc",
            "vnd",
            {"accountNumber": "0123456789", "bank": "Vietcombank"},
        )
        client.variable_swap("btc", "xmr", None)
        assert bodies[0]["referrer"] == "35b2eec68a1741ac"
        assert bodies[0]["settleData"] == {"address": "bc1qexample"}
        assert bodies[0]["webhookUrl"] == "https://merchant.example/hook"
        assert bodies[2] == {"quote": "quote-3", "referrer": "35b2eec68a1741ac"}
        assert bodies[4] == {
            "depositMethod": "btc",
            "settleMethod": "xmr",
            "referrer": "35b2eec68a1741ac",
        }
        assert client.info() == {"assets": {}, "transferMethods": {}}
        assert client.pair("btc", "xmr") == {"rate": 1, "min": 2}
        assert client.order("BV2MTZAF")["shortId"] == "BV2MTZAF"
        assert client.balances() == {"BTC": 1}
        orders = client.list_all_orders(custom_order_id="rent")
        assert len(orders) == 11
        assert len(client.list_all_balance_history(asset_id="BTC")) == 26
        assert len(client.list_all_orders(max_pages=1)) == ORDERS_PAGE_SIZE
        assert client.list_all_orders(max_pages=0) == []
        assert list(client.iter_orders(max_pages=0)) == []


def test_wait_for_order_success_and_timeout(httpx_mock: Any) -> None:
    clock = {"now": 0.0}
    seen = {"n": 0}

    def handler(_request: httpx.Request) -> httpx.Response:
        seen["n"] += 1
        payload = dict(ORDER)
        if seen["n"] == 1:
            payload["status"] = "pending"
        elif seen["n"] == 2:
            payload["status"] = "completed"
        else:
            payload["status"] = "processing"
        return httpx.Response(200, json=payload)

    httpx_mock.add_callback(handler, is_reusable=True)

    def monotonic() -> float:
        return clock["now"]

    def sleep(seconds: float) -> None:
        clock["now"] += seconds

    with BitcoinVn(sleep=sleep, monotonic=monotonic) as client:
        order = client.wait_for_order(
            "BV2MTZAF",
            timeout_ms=5_000,
            interval_ms=100,
            statuses=["completed"],
        )
        assert order["status"] == "completed"
        with pytest.raises(BitcoinVnTimeoutError) as exc:
            client.wait_for_order("BV2MTZAF", timeout_ms=1_000, interval_ms=400)
        with pytest.raises(BitcoinVnTimeoutError):
            client.wait_for_order("BV2MTZAF", timeout_ms=0.5, interval_ms=1)
    assert exc.value.order["status"] == "processing"


def test_webhook_and_swap_url() -> None:
    body = json.dumps({**ORDER, "status": "completed"})
    signature = webhook_signature(body, "secret")
    assert signature == hmac.new(b"secret", body.encode(), hashlib.sha256).hexdigest()
    assert verify_webhook_signature(body, signature.upper(), "secret") is True
    assert verify_webhook_signature(body.encode(), f"  {signature}  ", "secret") is True
    assert verify_webhook_signature(body, signature[:10], "secret") is False
    assert verify_webhook_signature(body, "a" * len(signature), "secret") is False
    assert verify_webhook_signature(body, "", "secret") is False
    assert verify_webhook_signature(body, signature, "") is False
    client = BitcoinVn("secret")
    assert client.verify_webhook(body, signature) is True
    assert BitcoinVn().verify_webhook(body, signature) is False
    parsed, verified = client.read_webhook(body, signature)
    assert verified is True
    assert parsed["shortId"] == "BV2MTZAF"
    with pytest.raises(BitcoinVnUnauthorizedError):
        client.read_webhook(body, "00", require_signature=True)
    guest, guest_ok = read_webhook(body)
    assert guest_ok is False
    assert guest["shortId"] == "BV2MTZAF"
    with pytest.raises(BitcoinVnUnauthorizedError):
        read_webhook("[]", None, "secret", require_signature=True)
    with pytest.raises(BitcoinVnError, match="not JSON"):
        read_webhook("not-json")
    with pytest.raises(BitcoinVnError, match="not an order"):
        read_webhook("[]")
    assert client.swap_url("btc", "xmr") == "https://bitcoinvn.io/?deposit=btc&settle=xmr"
    assert client.swap_url() == "https://bitcoinvn.io/"
    staged = BitcoinVn(base_url="https://staging.example/api/")
    assert staged.swap_url("eth") == "https://staging.example/?deposit=eth"
    client.close()
    staged.close()
    response = httpx.Response(200, headers={"x-ratelimit-retry-after": "inf"})
    assert _header_int(response, "x-ratelimit-retry-after") is None
    blank = httpx.Response(200, headers={"x-ratelimit-limit": "  "})
    assert _header_int(blank, "x-ratelimit-limit") is None
    missing = httpx.Response(200)
    assert _header_int(missing, "x-ratelimit-limit") is None


def test_error_envelope_edges(httpx_mock: Any) -> None:
    calls = {"n": 0}

    def handler(_request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(418, json={"error": {"code": 418}})
        if calls["n"] == 2:
            return httpx.Response(409, json=["nope"])
        if calls["n"] == 3:
            return httpx.Response(
                429,
                text="slow down",
                headers={"X-RateLimit-Retry-After": "nope"},
            )
        return httpx.Response(200, json={"error": {"message": "inside", "code": 1}})

    httpx_mock.add_callback(handler, is_reusable=True)
    with BitcoinVn(retries=0) as client:
        with pytest.raises(BitcoinVnError) as teapot:
            client.get_health()
        assert teapot.value.message if False else str(teapot.value) == "HTTP 418"
        assert type(teapot.value) is BitcoinVnError
        with pytest.raises(BitcoinVnError) as conflict:
            client.get_health()
        assert conflict.value.code == 409
        with pytest.raises(BitcoinVnRateLimitError) as limited:
            client.get_health()
        assert limited.value.retry_after is None
        assert str(limited.value) == "slow down"
        assert client.get_health() == {"error": {"message": "inside", "code": 1}}
        assert client.last_rate_limit is None
