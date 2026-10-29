import json

import httpx
import pytest
from pytest_httpx import HTTPXMock

from simpleswap import (
    DEFAULT_USER_AGENT,
    SIMPLESWAP_API_KEY_HEADER,
    ExchangeStatus,
    SimpleSwap,
    SimpleSwapAuthError,
    SimpleSwapBadRequestError,
    SimpleSwapError,
    SimpleSwapForbiddenError,
    SimpleSwapNetworkError,
    SimpleSwapNotFoundError,
    SimpleSwapServerError,
    SimpleSwapTimeoutError,
    SimpleSwapValidationError,
    exchange_public_id,
)
from simpleswap.errors import error_from_response, parse_retry_after


def test_currencies_list(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/currencies",
        json={
            "traceId": "trace_1",
            "result": [{"ticker": "btc", "network": "btc", "name": "Bitcoin"}],
        },
    )

    with SimpleSwap(api_key="test-api-key", max_retries=0) as client:
        currencies = client.get_currencies()

    assert len(currencies) == 1
    assert currencies[0]["ticker"] == "btc"
    assert httpx_mock.get_request().headers[SIMPLESWAP_API_KEY_HEADER] == "test-api-key"
    assert httpx_mock.get_request().headers["user-agent"] == DEFAULT_USER_AGENT
    assert httpx_mock.get_request().headers["x-user-agent"] == DEFAULT_USER_AGENT


def test_get_currency(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/currencies/btc/btc",
        json={
            "traceId": "trace_2",
            "result": {"ticker": "btc", "network": "btc", "name": "Bitcoin"},
        },
    )

    with SimpleSwap(api_key="test-api-key", max_retries=0) as client:
        btc = client.get_currency("btc", "btc")
    assert btc["name"] == "Bitcoin"


def test_get_estimate(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/estimates?tickerFrom=btc&tickerTo=eth&amount=0.1&customFee=0.5",
        json={
            "traceId": "trace_3",
            "result": {"estimatedAmount": "3.45", "rateId": None, "validUntil": None},
        },
    )

    with SimpleSwap(api_key="test-api-key", max_retries=0) as client:
        est = client.get_estimate("btc", "eth", 0.1, custom_fee=0.5)

    assert est["estimatedAmount"] == "3.45"


def test_get_ranges(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/ranges?tickerFrom=btc&tickerTo=eth",
        json={"traceId": "trace_4", "result": {"min": "0.001", "max": "10.0"}},
    )

    with SimpleSwap(api_key="test-api-key", max_retries=0) as client:
        ranges = client.get_ranges("btc", "eth")

    assert ranges["min"] == "0.001"
    assert ranges["max"] == "10.0"


def test_check_exchange(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/exchanges/check?tickerFrom=btc&tickerTo=eth&amount=0.1",
        json={"traceId": "trace_5", "result": {"canCreate": True}},
    )

    with SimpleSwap(api_key="test-api-key", max_retries=0) as client:
        check = client.check_exchange("btc", "eth", 0.1)

    assert check["canCreate"] is True


def test_create_exchange(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/exchanges",
        method="POST",
        json={
            "traceId": "trace_6",
            "result": {
                "id": "ex_100",
                "status": "waiting",
                "tickerFrom": "btc",
                "tickerTo": "eth",
                "amountFrom": "0.1",
                "amountTo": "3.45",
                "addressFrom": "1BtcDepositAddress",
                "addressTo": "0xEthReceiveAddress",
            },
        },
    )

    with SimpleSwap(api_key="test-api-key", max_retries=0) as client:
        order = client.create_exchange(
            ticker_from="btc",
            ticker_to="eth",
            amount=0.1,
            address_to="0xEthReceiveAddress",
            custom_fee=0.8,
        )

    assert order["id"] == "ex_100"
    assert order["addressFrom"] == "1BtcDepositAddress"
    sent = json.loads(httpx_mock.get_request().content)
    assert sent["customFee"] == 0.8
    assert sent["amount"] == "0.1"


def test_get_exchange(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/exchanges/ex_100",
        json={"traceId": "trace_7", "result": {"id": "ex_100", "status": "finished"}},
    )

    with SimpleSwap(api_key="test-api-key", max_retries=0) as client:
        order = client.get_exchange("ex_100")
    assert order["status"] == "finished"


def test_error_handling(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/currencies",
        status_code=401,
        json={"traceId": "trace_err", "message": "API key is invalid"},
    )

    with SimpleSwap(api_key="test-api-key", max_retries=0) as client:
        with pytest.raises(SimpleSwapAuthError) as exc_info:
            client.get_currencies()

    assert "API key is invalid" in str(exc_info.value)
    assert exc_info.value.trace_id == "trace_err"
    assert isinstance(exc_info.value, SimpleSwapError)


def test_status_error_classes(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/ranges?tickerFrom=btc&tickerTo=eth",
        status_code=400,
        json={"message": "Amount is below the minimum"},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/currencies/no/no",
        status_code=403,
        json={"message": "Forbidden"},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/exchanges/missing",
        status_code=404,
        json={"error": "Not Found"},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/exchanges",
        method="POST",
        status_code=422,
        json={"message": "Address is invalid", "code": "invalid_address"},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/market",
        status_code=500,
        text="down",
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/pairs",
        status_code=200,
        json={"error": "Not Found", "traceId": "nf"},
    )

    with SimpleSwap(api_key="k", max_retries=0) as client:
        with pytest.raises(SimpleSwapBadRequestError):
            client.get_ranges("btc", "eth")
        with pytest.raises(SimpleSwapForbiddenError):
            client.get_currency("no", "no")
        with pytest.raises(SimpleSwapNotFoundError) as not_found:
            client.get_exchange("missing")
        with pytest.raises(SimpleSwapValidationError) as invalid:
            client.create_exchange("btc", "eth", "1", "bad")
        with pytest.raises(SimpleSwapServerError):
            client.get_market()
        with pytest.raises(SimpleSwapError, match="Not Found"):
            client.get_pairs()

    assert not_found.value.message == "Not Found"
    assert invalid.value.code == "invalid_address"


def test_payload_shapes_aliases_and_flags(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/currencies/b%2Ftc/e%20th",
        json={"result": {"name": "Slash"}},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/pairs?fixed=true",
        json={"result": {"btc:btc": ["eth:eth"]}},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/pairs/btc/btc?fixed=false",
        json={"result": {"btc:btc": ["usdt:trx"]}},
    )
    httpx_mock.add_response(
        url=(
            "https://api.simpleswap.io/v3/estimates?tickerFrom=btc&tickerTo=eth"
            "&amount=0&networkFrom=btc&fixed=false&reverse=true&customFee=0"
        ),
        json={"result": {"estimatedAmount": "1"}},
    )
    httpx_mock.add_response(
        url=(
            "https://api.simpleswap.io/v3/ranges?tickerFrom=btc&tickerTo=eth"
            "&networkFrom=btc&fixed=true&reverse=false"
        ),
        json={"result": {"min": "0.01", "max": None}},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/exchanges/check?tickerFrom=btc&tickerTo=eth&amount=1&fixed=true",
        json={"result": False},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/exchanges?limit=10&offset=2&startDate=2024-01-01&finishDate=2024-02-01",
        json={"result": [{"id": "ex", "status": "finished"}]},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/market",
        json={"result": [{"rate": "1"}]},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/currencies",
        json=[{"ticker": "eth"}],
    )
    httpx_mock.add_response(
        method="POST",
        url="https://api.simpleswap.io/v3/exchanges",
        json={"result": {"publicId": "pub", "status": "waiting"}},
    )
    httpx_mock.add_response(
        method="PUT",
        url="https://api.simpleswap.io/v3/exchanges",
        json={"result": {"publicId": "pub", "status": "confirming"}},
    )

    with SimpleSwap(api_key="k", max_retries=0) as client:
        assert client.get_currency("b/tc", "e th")["name"] == "Slash"
        assert client.get_all_pairs(fixed=True)["btc:btc"] == ["eth:eth"]
        assert "usdt:trx" in client.get_pairs("btc", "btc", fixed=False)["btc:btc"]
        estimated = client.get_estimated(
            "btc",
            "eth",
            0,
            network_from="btc",
            fixed=False,
            reverse=True,
            custom_fee=0,
        )
        assert estimated["estimatedAmount"] == "1"
        assert client.get_min("btc", "eth", network_from="btc", fixed=True, reverse=False) == "0.01"
        with pytest.raises(SimpleSwapError, match="both ticker and network"):
            client.get_pairs("btc")
        assert client.check_exchange("btc", "eth", 1, fixed=True) == {"canCreate": False}
        assert client.get_exchanges(10, 2, "2024-01-01", "2024-02-01")[0]["status"] == "finished"
        assert client.get_market_info()[0]["rate"] == "1"
        assert client.get_all_currencies()[0]["ticker"] == "eth"
        created = client.create_exchange(
            "btc",
            "xrp",
            "0.2",
            "rDest",
            network_from="btc",
            network_to="xrp",
            fixed=True,
            extra_id_to="",
            user_refund_address="refund",
            user_refund_extra_id="memo",
            rate_id="rate-1",
            reverse=False,
        )
        confirmed = client.confirm_exchange(
            "pub",
            tx_from="tx",
            provider_user_deposit_address="dep",
            target_address="out",
        )
        assert exchange_public_id(created) == "pub"
        assert confirmed["status"] == "confirming"
        assert client.is_valid_address("anywhere") is True
        assert client.is_valid_address("  ", ".*") is False
        pattern = "^0x[0-9a-f]+$"
        assert client.is_valid_address("0xabc", currency={"validationAddress": pattern}) is True
        with pytest.raises(SimpleSwapError, match="validation pattern"):
            client.is_valid_address("abc", "(")

    post = [request for request in httpx_mock.get_requests() if request.method == "POST"][-1]
    body = json.loads(post.content)
    assert body["fixed"] is True
    assert body["reverse"] is False
    assert body["extraIdTo"] == ""
    assert "customFee" not in body
    put = [request for request in httpx_mock.get_requests() if request.method == "PUT"][-1]
    assert json.loads(put.content)["providerUserDepositAddress"] == "dep"


def test_get_min_non_object_and_application_errors(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/ranges?tickerFrom=a&tickerTo=b",
        json={"result": "0.01"},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/estimates?tickerFrom=a&tickerTo=b&amount=1",
        json={"error": True, "traceId": "e1"},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/estimates?tickerFrom=a&tickerTo=b&amount=2",
        json={"error": "kept", "result": {"estimatedAmount": "9"}},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/market",
        status_code=200,
        content=b"",
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/pairs",
        status_code=200,
        content=b"not-json",
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/currencies",
        json={"ticker": "raw"},
    )

    with SimpleSwap(api_key="k", max_retries=0) as client:
        assert client.get_min("a", "b") is None
        with pytest.raises(SimpleSwapError, match="SimpleSwap error") as blank:
            client.get_estimate("a", "b", 1)
        assert blank.value.trace_id == "e1"
        assert str(blank.value) == "[200] SimpleSwap error"
        assert client.get_estimate("a", "b", 2)["estimatedAmount"] == "9"
        assert client.get_market() is None
        with pytest.raises(SimpleSwapError, match="Invalid JSON"):
            client.get_pairs()
        assert client.get_currencies()["ticker"] == "raw"


def test_retries_and_polling(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/currencies",
        status_code=503,
        json={"message": "down"},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/currencies",
        json={"result": [{"ticker": "btc"}]},
    )
    with SimpleSwap(api_key="k", max_retries=1, retry_delay=0) as client:
        assert client.get_currencies()[0]["ticker"] == "btc"

    httpx_mock.add_response(
        method="POST",
        url="https://api.simpleswap.io/v3/exchanges",
        status_code=503,
        json={"message": "down"},
    )
    with SimpleSwap(api_key="k", max_retries=2, retry_delay=0) as client:
        with pytest.raises(SimpleSwapServerError):
            client.create_exchange("btc", "eth", "1", "dest")

    httpx_mock.add_response(
        method="POST",
        url="https://api.simpleswap.io/v3/exchanges",
        status_code=429,
        headers={"Retry-After": "0"},
        json={"message": "slow"},
    )
    httpx_mock.add_response(
        method="POST",
        url="https://api.simpleswap.io/v3/exchanges",
        json={"result": {"id": "ok", "status": "waiting"}},
    )
    with SimpleSwap(api_key="k", max_retries=1, retry_delay=30) as client:
        assert client.create_exchange("btc", "eth", "1", "dest")["id"] == "ok"

    httpx_mock.add_exception(httpx.ConnectError("boom"), url="https://api.simpleswap.io/v3/market")
    httpx_mock.add_response(url="https://api.simpleswap.io/v3/market", json={"result": []})
    with SimpleSwap(api_key="k", max_retries=1, retry_delay=0) as client:
        assert client.get_market() == []

    httpx_mock.add_exception(
        httpx.ConnectError("boom"),
        url="https://api.simpleswap.io/v3/exchanges",
        method="POST",
    )
    with SimpleSwap(api_key="k", max_retries=2, retry_delay=0) as client:
        with pytest.raises(SimpleSwapNetworkError, match="HTTP request failed"):
            client.create_exchange("btc", "eth", "1", "dest")

    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/exchanges/ex_1",
        json={"result": {"id": "ex_1", "status": ExchangeStatus.WAITING}},
    )
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/exchanges/ex_1",
        json={"result": {"id": "ex_1", "status": ExchangeStatus.FINISHED}},
    )
    seen: list[str] = []
    with SimpleSwap(api_key="k", max_retries=0) as client:
        order = client.wait_for_exchange(
            "ex_1",
            timeout=5,
            interval=0,
            on_update=lambda item: seen.append(item["status"]),
        )
        assert order["status"] == "finished"
        httpx_mock.add_response(
            url="https://api.simpleswap.io/v3/exchanges/ex_2",
            json={"result": {"id": "ex_2", "status": "confirming"}},
        )
        with pytest.raises(SimpleSwapTimeoutError, match="ex_2"):
            client.wait_for_exchange("ex_2", timeout=0, interval=0)
        httpx_mock.add_response(
            url="https://api.simpleswap.io/v3/exchanges/ex_2",
            json={"result": {"status": "confirming"}},
        )
        stopped = client.wait_for_exchange("ex_2", timeout=5, interval=0, statuses={"confirming"})
        assert stopped["status"] == "confirming"
    assert seen == ["waiting", "finished"]


def test_configuration_and_header_parsers(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SIMPLESWAP_API_KEY", "from-env")
    with SimpleSwap(base_url="https://example.test/api/", user_agent="", timeout=12) as client:
        assert client.api_key == "from-env"
        assert client.base_url == "https://example.test/api"
        assert client._client.headers["user-agent"] == DEFAULT_USER_AGENT

    with SimpleSwap(
        api_key="explicit",
        client_ip="203.0.113.8",
        proxy="http://127.0.0.1:9",
        trust_env=False,
        max_retries=-4,
        retry_delay=-1,
    ) as client:
        assert client._cfg.max_retries == 0
        assert client._cfg.retry_delay == 0
        assert client._client.headers["x-client-ip"] == "203.0.113.8"

    monkeypatch.delenv("SIMPLESWAP_API_KEY", raising=False)
    with SimpleSwap(api_key="") as client:
        assert client.api_key is None

    assert exchange_public_id({"id": "only"}) == "only"
    with pytest.raises(SimpleSwapError):
        exchange_public_id(None)
    with pytest.raises(SimpleSwapError):
        exchange_public_id({"status": "waiting"})

    assert parse_retry_after(None) is None
    assert parse_retry_after("  ") is None
    assert parse_retry_after("nope") is None
    assert parse_retry_after("1.5") == 1.5
    assert parse_retry_after("Tue, 15 Nov 1994 08:12:31 GMT", now=10**12) == 0
    assert parse_retry_after("Tue, 15 Nov 2099 08:12:31 GMT", now=0) > 0
    built = error_from_response(408, {"message": "slow"}, headers=object())
    assert built.retryable is True
    assert str(SimpleSwapError("plain")) == "plain"


def test_non_dict_wait_status(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/exchanges/ex",
        json={"result": "nope"},
    )
    with SimpleSwap(api_key="k", max_retries=0) as client:
        with pytest.raises(SimpleSwapTimeoutError, match="unknown"):
            client.wait_for_exchange("ex", timeout=0, interval=0)
