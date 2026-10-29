"""Unit tests for parsers, errors, rates, retries and the remaining API methods."""

import json
from typing import Any

import httpx
import pytest
from pytest_httpx import HTTPXMock

from fixedfloat import (
    DEFAULT_REFCODE,
    PRICE_ERROR_TEXT,
    AsyncFixedFloat,
    FixedFloat,
    FixedFloatApiError,
    FixedFloatAuthError,
    FixedFloatError,
    FixedFloatHttpError,
    FixedFloatNetworkError,
    FixedFloatRateLimitError,
    FixedFloatTimeoutError,
    assert_quote_ok,
    find_currency,
    order_status_text,
    parse_price_shorthand,
    parse_rates_xml,
)
from fixedfloat.client import decode_response
from fixedfloat.parse import filter_rates

XML = """<?xml version="1.0"?>
<rates>
  <item>
    <from>BTC</from>
    <to>ETH</to>
    <in>1</in>
    <out>17.72</out>
    <amount>191.1</amount>
    <tofee>0.0004 ETH</tofee>
    <minamount>0.001 BTC</minamount>
    <maxamount>2 BTC</maxamount>
  </item>
  <item>
    <from>btc</from>
    <to>USDT</to>
    <in>1</in>
    <out>60000</out>
    <amount>10</amount>
    <tofee>1 &amp; 2 USDT</tofee>
    <minamount></minamount>
    <maxamount>3 BTC</maxamount>
  </item>
</rates>
"""

ORDER: dict[str, Any] = {
    "id": "ORD123",
    "type": "float",
    "email": "a@b.c",
    "status": "EMERGENCY",
    "time": {"reg": 10, "start": None, "finish": None, "update": 11, "expiration": 20, "left": 5},
    "from": {
        "code": "BTC",
        "coin": "BTC",
        "network": "BTC",
        "name": "Bitcoin",
        "alias": "btc",
        "amount": "0.1",
        "address": "bc1q",
        "tag": "memo",
        "addressMix": "bc1q:memo",
        "reqConfirmations": 1,
        "maxConfirmations": 2,
        "tx": {
            "id": "abc",
            "amount": "0.1",
            "fee": "0.0001",
            "ccyfee": "BTC",
            "timeReg": 1,
            "timeBlock": 2,
            "confirmations": 1,
        },
    },
    "to": {
        "code": "ETH",
        "coin": "ETH",
        "network": "ETH",
        "amount": "1",
        "address": "0x",
        "extraId": "e",
    },
    "back": {"code": "BTC", "coin": "BTC", "network": "BTC", "amount": "0.09", "address": "refund"},
    "emergency": {"status": ["LESS", "LIMIT"], "choice": "NONE", "repeat": True},
    "token": "TOK",
}

PRICE = {
    "from": {
        "code": "BTC",
        "network": "BTC",
        "coin": "BTC",
        "amount": 0.1,
        "rate": 1,
        "precision": 8,
        "min": 0.001,
        "max": 2,
        "usd": 6000,
        "btc": 0.1,
    },
    "to": {
        "code": "ETH",
        "network": "ETH",
        "coin": "ETH",
        "amount": 1.5,
        "rate": 15,
        "min": 0.02,
        "max": 40,
        "usd": 5900,
    },
    "errors": [],
    "ccies": [{"code": "ADA", "recv": True, "send": False}, "skip-me"],
}


def test_shorthand_status_and_quote_helpers() -> None:
    parsed = parse_price_shorthand("0.1 eth", "btc")
    assert parsed["from_ccy"] == "ETH"
    assert parsed["direction"] == "from"
    reverse = parse_price_shorthand("ETH", "0.2 BTC", "fixed")
    assert reverse["direction"] == "to"
    assert reverse["order_type"] == "fixed"
    with pytest.raises(FixedFloatError, match="shorthand"):
        parse_price_shorthand("ETH", "BTC")
    with pytest.raises(FixedFloatError):
        parse_price_shorthand("0.1 ETH", "0.2 BTC")

    assert order_status_text("DONE").startswith("Order")
    assert order_status_text("CUSTOM") == "CUSTOM"
    assert "LIMIT_MIN" in PRICE_ERROR_TEXT

    class Quote:
        errors: list[str] | None = None

    assert_quote_ok(Quote())
    Quote.errors = []
    assert_quote_ok(Quote())
    Quote.errors = ["LIMIT_MIN", "NOPE"]
    with pytest.raises(FixedFloatError, match="minimum"):
        assert_quote_ok(Quote())


def test_rates_xml_parser() -> None:
    rows = parse_rates_xml(XML)
    assert rows[0].from_ccy == "BTC"
    assert filter_rates(rows, "DOGE", None) == []
    assert filter_rates(rows, "BTC", "DOGE") == []
    assert rows[1].to_fee == "1 & 2 USDT"
    assert rows[1].min_amount == ""
    assert parse_rates_xml("<rates></rates>") == []
    assert parse_rates_xml("<item><from>BTC</from><to>ETH</to></item>")[0].from_ccy == "BTC"
    with pytest.raises(FixedFloatError, match="parse"):
        parse_rates_xml("<nope></nope>")
    with pytest.raises(FixedFloatError, match="parse"):
        parse_rates_xml("this is not xml")


def test_decode_response_branches() -> None:
    assert decode_response(200, "") is None
    assert decode_response(200, '{"plain": 1}') == {"plain": 1}
    assert decode_response(200, '{"code": 0, "msg": "", "data": false}') is False
    with pytest.raises(FixedFloatHttpError):
        decode_response(400, "")
    with pytest.raises(FixedFloatApiError) as api_error:
        decode_response(200, '{"code": 3, "msg": "bad", "data": {"a": 1}}')
    assert api_error.value.code == 3
    assert api_error.value.data == {"a": 1}
    assert str(api_error.value).startswith("[3]")
    with pytest.raises(FixedFloatRateLimitError):
        decode_response(429, '{"code": "slow", "msg": "weight"}')
    with pytest.raises(FixedFloatAuthError):
        decode_response(401, '{"code": 401, "msg": "nope"}')
    with pytest.raises(FixedFloatApiError) as server:
        decode_response(500, '{"code": 500, "msg": "down"}')
    assert server.value.retryable is True
    with pytest.raises(FixedFloatHttpError) as broken:
        decode_response(502, "not-json")
    assert broken.value.retryable is True
    with pytest.raises(FixedFloatError, match="parse"):
        decode_response(200, "not-json")
    with pytest.raises(FixedFloatRateLimitError):
        decode_response(429, "slow down")
    with pytest.raises(FixedFloatAuthError):
        decode_response(403, "no")
    with pytest.raises(FixedFloatHttpError):
        decode_response(418, '{"why": "teapot"}')
    with pytest.raises(FixedFloatRateLimitError):
        decode_response(429, '{"why": 1}')
    with pytest.raises(FixedFloatAuthError):
        decode_response(401, '{"why": 1}')
    assert str(FixedFloatError("plain")) == "plain"


def test_price_create_emergency_and_qr(httpx_mock: HTTPXMock) -> None:
    client = FixedFloat(api_key="k", api_secret="s", retries=0, headers={"X-Debug": "1"})
    httpx_mock.add_response(
        url="https://ff.io/api/v2/price", json={"code": 0, "msg": "", "data": PRICE}
    )
    quote = client.get_price("BTC", "ETH", 0.1, ccies=True, usd=True, afftax=0.2)
    sent = json.loads(httpx_mock.get_requests()[-1].read())
    assert sent["refcode"] == DEFAULT_REFCODE
    assert sent["ccies"] is True
    assert sent["usd"] is True
    assert quote.from_side.precision == 8
    assert quote.from_side.usd == "6000"
    assert quote.ccies is not None
    assert quote.ccies[0].code == "ADA"
    assert quote.exchangeable is True
    assert httpx_mock.get_requests()[-1].headers["X-Debug"] == "1"

    httpx_mock.add_response(
        url="https://ff.io/api/v2/price",
        json={"code": 0, "msg": "", "data": {**PRICE, "errors": ["OFFLINE_FROM"]}},
    )
    with pytest.raises(FixedFloatError, match="offline"):
        client.get_price_or_raise("BTC", "ETH", 1)
    httpx_mock.add_response(
        url="https://ff.io/api/v2/price", json={"code": 0, "msg": "", "data": PRICE}
    )
    assert client.get_price_or_raise("BTC", "ETH", 0.1).exchangeable is True

    httpx_mock.add_response(
        url="https://ff.io/api/v2/price", json={"code": 0, "msg": "", "data": PRICE}
    )
    short = client.get_price_shorthand("0.4 ETH", "BTC", "fixed")
    body = json.loads(httpx_mock.get_requests()[-1].read())
    assert body["direction"] == "from"
    assert body["type"] == "fixed"
    assert short.to_side.code == "ETH"

    httpx_mock.add_response(
        url="https://ff.io/api/v2/price", json={"code": 0, "msg": "", "data": PRICE}
    )
    client.price("ETH", "BTC", 1, direction="to")

    httpx_mock.add_response(
        url="https://ff.io/api/v2/create", json={"code": 0, "msg": "", "data": ORDER}
    )
    order = client.create_order(
        "BTC",
        "ETH",
        0.1,
        "0xabc",
        extra_id="legacy",
        tag="official",
        refund_address="bc1q",
        refund_extra_id="rtag",
        afftax=0.1,
    )
    created = json.loads(httpx_mock.get_requests()[-1].read())
    assert created["tag"] == "official"
    assert created["extraId"] == "legacy"
    assert created["refundAddress"] == "bc1q"
    assert order.emergency is not None
    assert order.emergency.choice == "NONE"
    assert order.back is not None
    assert order.from_side.tx is not None
    assert order.from_side.tx.time_block == 2
    assert order.from_side.tag == "memo"
    assert order.to_side.extra_id == "e"
    assert order.status_text.startswith("Emergency")
    assert client.status_text("NEW") == "New order"

    httpx_mock.add_response(
        url="https://ff.io/api/v2/create", json={"code": 0, "msg": "", "data": ORDER}
    )
    client.create("BTC", "XRP", 1, "rAddr", extra_id="only")
    created = json.loads(httpx_mock.get_requests()[-1].read())
    assert created["tag"] == "only"

    httpx_mock.add_response(
        url="https://ff.io/api/v2/emergency", json={"code": 0, "msg": "", "data": True}
    )
    assert client.set_emergency("ORD123", "TOK", "REFUND", address="bc1q", extra_id="m") is True
    emergency = json.loads(httpx_mock.get_requests()[-1].read())
    assert emergency["tag"] == "m"
    assert emergency["extraId"] == "m"
    httpx_mock.add_response(
        url="https://ff.io/api/v2/emergency", json={"code": 0, "msg": "", "data": True}
    )
    client.emergency("ORD123", "TOK", "EXCHANGE", tag="official")
    assert json.loads(httpx_mock.get_requests()[-1].read())["tag"] == "official"

    httpx_mock.add_response(
        url="https://ff.io/api/v2/setEmail", json={"code": 0, "msg": "", "data": True}
    )
    assert client.set_email_notification("ORD123", "TOK", "a@b.c") is True
    httpx_mock.add_response(
        url="https://ff.io/api/v2/setEmail", json={"code": 0, "msg": "", "data": True}
    )
    assert client.subscribe("ORD123", "TOK", "c@d.e") is True

    httpx_mock.add_response(
        url="https://ff.io/api/v2/qr",
        json={
            "code": 0,
            "msg": "",
            "data": [
                {"title": "Address", "src": "data:image/png;base64,AAA", "checked": False},
                {"title": "With amount", "src": "data:image/png;base64,BBB", "checked": True},
            ],
        },
    )
    qr = client.qr("ORD123", "TOK")
    assert qr.src.endswith("BBB")
    assert len(qr.codes) == 2
    httpx_mock.add_response(
        url="https://ff.io/api/v2/qr",
        json={
            "code": 0,
            "msg": "",
            "data": [
                {"title": "Address", "src": "data:image/png;base64,AAA", "checked": False},
                {"title": "With amount", "src": "data:image/png;base64,BBB", "checked": True},
            ],
        },
    )
    assert len(client.get_qr_codes("ORD123", "TOK")) == 2

    httpx_mock.add_response(
        url="https://ff.io/api/v2/future", json={"code": 0, "msg": "", "data": {"ok": 1}}
    )
    assert client.raw_request("future", {"a": 1}) == {"ok": 1}


def test_order_polling_rates_and_errors(
    httpx_mock: HTTPXMock, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("fixedfloat.client.time.sleep", lambda _delay: None)
    client = FixedFloat(retries=0, retry_delay=0)
    pending = {**ORDER, "status": "PENDING"}
    done = {**ORDER, "status": "DONE"}
    httpx_mock.add_response(
        url="https://ff.io/api/v2/order", json={"code": 0, "msg": "", "data": pending}
    )
    httpx_mock.add_response(
        url="https://ff.io/api/v2/order", json={"code": 0, "msg": "", "data": done}
    )
    assert client.wait_for_order("ORD123", "TOK", timeout=2, interval=0).status == "DONE"
    httpx_mock.add_response(
        url="https://ff.io/api/v2/order", json={"code": 0, "msg": "", "data": done}
    )
    assert client.order("ORD123", "TOK").id == "ORD123"

    httpx_mock.add_response(
        url="https://ff.io/api/v2/order", json={"code": 0, "msg": "", "data": pending}
    )
    with pytest.raises(FixedFloatTimeoutError):
        client.wait_for_order("ORD123", "TOK", timeout=0, interval=0)

    httpx_mock.add_response(
        url="https://ff.io/api/v2/order", json={"code": 0, "msg": "", "data": pending}
    )
    calls = {"n": 0}

    def stop_after_first() -> bool:
        calls["n"] += 1
        return calls["n"] > 1

    with pytest.raises(FixedFloatError, match="aborted"):
        client.wait_for_order("ORD123", "TOK", timeout=5, interval=0, should_stop=stop_after_first)

    httpx_mock.add_response(url="https://rates.example/rates/float.xml", text=XML)
    httpx_mock.add_response(url="https://rates.example/rates/fixed.xml", text="<rates></rates>")
    rates_client = FixedFloat(rates_base_url="https://rates.example/", retries=0)
    rows = rates_client.get_rates(from_ccy="btc", to_ccy="ETH")
    assert len(rows) == 1
    assert rates_client.get_rates_xml("fixed") == "<rates></rates>"
    with pytest.raises(FixedFloatError, match="Unknown rates"):
        rates_client.get_rates_xml("nope")  # type: ignore[arg-type]

    httpx_mock.add_response(
        url="https://ff.io/api/v2/ccies",
        json={
            "code": 0,
            "msg": "",
            "data": [
                {
                    "code": "BTC",
                    "coin": "BTC",
                    "network": "BTC",
                    "name": "Bitcoin",
                    "recv": True,
                    "send": 0,
                    "tag": None,
                    "logo": "",
                    "color": "",
                    "priority": "5",
                    "contract": "native",
                },
                "skip",
            ],
        },
    )
    currencies = client.ccies()
    assert currencies[0].recv == 1
    assert currencies[0].priority == 5
    assert currencies[0].contract == "native"
    assert find_currency(currencies, "btc").code == "BTC"
    assert find_currency(currencies, "nope") is None
    assert find_currency([], "btc") is None

    httpx_mock.add_response(
        url="https://ff.io/api/v2/price", json={"code": 0, "msg": "", "data": None}
    )
    with pytest.raises(FixedFloatError, match="not an object"):
        client.get_price("A", "B", 1)
    httpx_mock.add_response(
        url="https://ff.io/api/v2/order", json={"code": 0, "msg": "", "data": []}
    )
    with pytest.raises(FixedFloatError, match="not an object"):
        client.get_order("A", "B")
    httpx_mock.add_response(
        url="https://ff.io/api/v2/ccies", json={"code": 0, "msg": "", "data": None}
    )
    assert client.get_currencies() == []

    httpx_mock.add_response(
        url="https://ff.io/api/v2/qr", json={"code": 0, "msg": "", "data": "nope"}
    )
    assert client.get_qr("A", "B").src == "nope"
    httpx_mock.add_response(url="https://ff.io/api/v2/qr", json={"code": 0, "msg": "", "data": []})
    assert client.get_qr("A", "B").src == ""

    httpx_mock.add_exception(httpx.ConnectError("down"), url="https://ff.io/api/v2/ccies")
    with pytest.raises(FixedFloatNetworkError, match="HTTP request failed"):
        client.get_currencies()

    httpx_mock.add_exception(httpx.ReadTimeout("timed out"), url="https://ff.io/api/v2/ccies")
    with pytest.raises(FixedFloatTimeoutError):
        client.get_currencies()

    httpx_mock.add_response(
        url="https://ff.io/api/v2/ccies", status_code=401, json={"code": 401, "msg": "bad"}
    )
    with pytest.raises(FixedFloatAuthError):
        client.get_currencies()

    retrying = FixedFloat(retries=1, retry_delay=0.2)
    httpx_mock.add_response(
        url="https://ff.io/api/v2/ccies", status_code=503, json={"code": 503, "msg": "down"}
    )
    httpx_mock.add_response(
        url="https://ff.io/api/v2/ccies", json={"code": 0, "msg": "", "data": []}
    )
    assert retrying.get_currencies() == []

    httpx_mock.add_exception(httpx.ConnectError("down"), url="https://ff.io/api/v2/create")
    with pytest.raises(FixedFloatNetworkError):
        retrying.create_order("BTC", "ETH", 0.1, "0x")
    assert httpx_mock.get_requests()[-1].url.path == "/api/v2/create"

    httpx_mock.add_response(url="https://ff.io/rates/float.xml", status_code=502, text="bad")
    httpx_mock.add_response(url="https://ff.io/rates/float.xml", text="<rates></rates>")
    assert retrying.get_rates() == []

    httpx_mock.add_exception(httpx.ReadTimeout("slow xml"), url="https://ff.io/rates/float.xml")
    with pytest.raises(FixedFloatTimeoutError):
        client.get_rates_xml()
    httpx_mock.add_exception(httpx.ConnectError("xml down"), url="https://ff.io/rates/float.xml")
    with pytest.raises(FixedFloatNetworkError):
        client.get_rates_xml()

    httpx_mock.add_response(url="https://ff.io/api/v2/create", status_code=500, text="nope")
    with pytest.raises(FixedFloatHttpError):
        client.raw_request("/create", {"a": 1}, idempotent=False)


def test_context_manager_and_unsigned(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://ff.io/api/v2/ccies", json={"code": 0, "msg": "", "data": []}
    )
    with FixedFloat(proxy="http://127.0.0.1:8888", retries=0) as client:
        assert client.proxy == "http://127.0.0.1:8888"
        assert client.get_currencies() == []
    request = httpx_mock.get_request()
    assert request is not None
    assert "X-API-KEY" not in request.headers
    assert "X-API-SIGN" not in request.headers


def test_order_without_tx_dict() -> None:
    from fixedfloat.parse import parse_order, parse_qr

    order = parse_order(
        {
            "id": "A",
            "from": {"tx": "nope"},
            "to": {},
            "time": "bad",
            "emergency": {"status": "LESS"},
        }
    )
    assert order.from_side.tx is None
    assert order.time.reg == 0
    assert order.emergency is not None
    assert order.emergency.status == ["LESS"]
    qr = parse_qr({"src": "img", "codes": [{"title": "A", "src": "img", "checked": True}, "nope"]})
    assert qr.codes[0].title == "A"
    assert parse_qr({"title": "solo"}).src == ""


@pytest.mark.asyncio
async def test_async_client(httpx_mock: HTTPXMock, monkeypatch: pytest.MonkeyPatch) -> None:
    async def _no_sleep(_delay: float) -> None:
        return None

    monkeypatch.setattr("fixedfloat.client.asyncio.sleep", _no_sleep)
    async with AsyncFixedFloat(api_key="k", api_secret="s", retries=1, retry_delay=0.2) as client:
        httpx_mock.add_response(
            url="https://ff.io/api/v2/ccies",
            json={
                "code": 0,
                "msg": "",
                "data": [
                    {
                        "code": "ETH",
                        "coin": "ETH",
                        "network": "ETH",
                        "name": "Ether",
                        "recv": 1,
                        "send": 1,
                    }
                ],
            },
        )
        currencies = await client.ccies()
        assert currencies[0].code == "ETH"
        assert find_currency(currencies, "eth") is currencies[0]

        httpx_mock.add_response(
            url="https://ff.io/api/v2/price", json={"code": 0, "msg": "", "data": PRICE}
        )
        quote = await client.get_price("BTC", "ETH", 0.1, ccies=True, usd=False, afftax=0.1)
        assert quote.to_side.amount == "1.5"
        httpx_mock.add_response(
            url="https://ff.io/api/v2/price", json={"code": 0, "msg": "", "data": PRICE}
        )
        await client.price("BTC", "ETH", 1)
        httpx_mock.add_response(
            url="https://ff.io/api/v2/price", json={"code": 0, "msg": "", "data": PRICE}
        )
        await client.get_price_shorthand("ETH", "0.01 BTC")
        httpx_mock.add_response(
            url="https://ff.io/api/v2/price", json={"code": 0, "msg": "", "data": PRICE}
        )
        assert (await client.get_price_or_raise("BTC", "ETH", 0.1)).exchangeable is True
        httpx_mock.add_response(
            url="https://ff.io/api/v2/price",
            json={"code": 0, "msg": "", "data": {**PRICE, "errors": ["LIMIT_MAX"]}},
        )
        with pytest.raises(FixedFloatError, match="maximum"):
            await client.get_price_or_raise("BTC", "ETH", 9)

        httpx_mock.add_response(
            url="https://ff.io/api/v2/create", json={"code": 0, "msg": "", "data": ORDER}
        )
        created = await client.create("BTC", "ETH", 0.1, "0x", extra_id="m", tag="t")
        assert created.token == "TOK"
        body = json.loads(httpx_mock.get_requests()[-1].read())
        assert body["tag"] == "t"
        assert body["refcode"] == DEFAULT_REFCODE

        httpx_mock.add_response(
            url="https://ff.io/api/v2/order",
            json={"code": 0, "msg": "", "data": {**ORDER, "status": "NEW"}},
        )
        httpx_mock.add_response(
            url="https://ff.io/api/v2/order",
            json={"code": 0, "msg": "", "data": {**ORDER, "status": "DONE"}},
        )
        assert (
            await client.wait_for_order("ORD123", "TOK", timeout=2, interval=0)
        ).status == "DONE"
        httpx_mock.add_response(
            url="https://ff.io/api/v2/order",
            json={"code": 0, "msg": "", "data": {**ORDER, "status": "NEW"}},
        )
        with pytest.raises(FixedFloatTimeoutError):
            await client.wait_for_order("ORD123", "TOK", timeout=0, interval=0)
        httpx_mock.add_response(
            url="https://ff.io/api/v2/order",
            json={"code": 0, "msg": "", "data": {**ORDER, "status": "NEW"}},
        )
        seen = {"n": 0}

        def stop_later() -> bool:
            seen["n"] += 1
            return seen["n"] > 1

        with pytest.raises(FixedFloatError, match="aborted"):
            await client.wait_for_order(
                "ORD123", "TOK", timeout=1, interval=0, should_stop=stop_later
            )
        httpx_mock.add_response(
            url="https://ff.io/api/v2/order", json={"code": 0, "msg": "", "data": ORDER}
        )
        assert (await client.order("ORD123", "TOK")).id == "ORD123"
        assert client.status_text("EXPIRED") == "Order expired"

        httpx_mock.add_response(
            url="https://ff.io/api/v2/emergency", json={"code": 0, "msg": "", "data": True}
        )
        assert await client.emergency("ORD123", "TOK", "REFUND", address="bc1q", tag="x") is True
        httpx_mock.add_response(
            url="https://ff.io/api/v2/setEmail", json={"code": 0, "msg": "", "data": True}
        )
        assert await client.set_email("ORD123", "TOK", "a@b.c") is True
        httpx_mock.add_response(
            url="https://ff.io/api/v2/setEmail", json={"code": 0, "msg": "", "data": True}
        )
        assert await client.set_email_notification("ORD123", "TOK", "a@b.c") is True
        httpx_mock.add_response(
            url="https://ff.io/api/v2/setEmail", json={"code": 0, "msg": "", "data": True}
        )
        assert await client.subscribe("ORD123", "TOK", "a@b.c") is True

        httpx_mock.add_response(
            url="https://ff.io/api/v2/qr",
            json={
                "code": 0,
                "msg": "",
                "data": [{"title": "Address", "src": "data:image/png;base64,Z", "checked": True}],
            },
        )
        qr = await client.qr("ORD123", "TOK")
        assert qr.checked is True
        httpx_mock.add_response(
            url="https://ff.io/api/v2/qr",
            json={
                "code": 0,
                "msg": "",
                "data": [{"title": "Address", "src": "data:image/png;base64,Z", "checked": True}],
            },
        )
        codes = await client.get_qr_codes("ORD123", "TOK")
        assert codes[0].src.startswith("data:image")

        httpx_mock.add_response(url="https://ff.io/rates/float.xml", text=XML)
        rows = await client.get_rates(from_ccy="BTC", to_ccy="USDT")
        assert rows[0].to_ccy == "USDT"
        with pytest.raises(FixedFloatError, match="Unknown rates"):
            await client.get_rates_xml("nope")  # type: ignore[arg-type]

        httpx_mock.add_response(
            url="https://ff.io/api/v2/future", json={"code": 0, "msg": "", "data": 5}
        )
        assert await client.raw_request("/future") == 5

        httpx_mock.add_response(url="https://ff.io/api/v2/ccies", status_code=503, text="down")
        httpx_mock.add_response(
            url="https://ff.io/api/v2/ccies", json={"code": 0, "msg": "", "data": []}
        )
        assert await client.get_currencies() == []

        httpx_mock.add_exception(httpx.ConnectError("down"), url="https://ff.io/api/v2/create")
        with pytest.raises(FixedFloatNetworkError):
            await client.create_order("BTC", "ETH", 1, "0x")

        httpx_mock.add_exception(httpx.ReadTimeout("slow"), url="https://ff.io/api/v2/ccies")
        httpx_mock.add_exception(httpx.ReadTimeout("slow"), url="https://ff.io/api/v2/ccies")
        with pytest.raises(FixedFloatTimeoutError):
            await client.get_currencies()

        httpx_mock.add_response(url="https://ff.io/rates/fixed.xml", status_code=500, text="bad")
        httpx_mock.add_response(url="https://ff.io/rates/fixed.xml", status_code=500, text="bad")
        with pytest.raises(FixedFloatHttpError):
            await client.get_rates_xml("fixed")
        httpx_mock.add_exception(httpx.ReadTimeout("slow xml"), url="https://ff.io/rates/float.xml")
        httpx_mock.add_exception(httpx.ReadTimeout("slow xml"), url="https://ff.io/rates/float.xml")
        with pytest.raises(FixedFloatTimeoutError):
            await client.get_rates_xml()
        httpx_mock.add_exception(
            httpx.ConnectError("xml down"), url="https://ff.io/rates/float.xml"
        )
        httpx_mock.add_exception(
            httpx.ConnectError("xml down"), url="https://ff.io/rates/float.xml"
        )
        with pytest.raises(FixedFloatNetworkError):
            await client.get_rates()
