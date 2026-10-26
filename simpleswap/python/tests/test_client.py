import pytest
from pytest_httpx import HTTPXMock

from simpleswap import SimpleSwap, SimpleSwapError


def test_currencies_list(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/currencies",
        json={
            "traceId": "trace_1",
            "result": [{"ticker": "btc", "network": "btc", "name": "Bitcoin"}],
        },
    )

    client = SimpleSwap(api_key="test-api-key")
    currencies = client.get_currencies()

    assert len(currencies) == 1
    assert currencies[0]["ticker"] == "btc"


def test_get_currency(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/currencies/btc/btc",
        json={
            "traceId": "trace_2",
            "result": {"ticker": "btc", "network": "btc", "name": "Bitcoin"},
        },
    )

    client = SimpleSwap(api_key="test-api-key")
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

    client = SimpleSwap(api_key="test-api-key")
    est = client.get_estimate("btc", "eth", 0.1, custom_fee=0.5)

    assert est["estimatedAmount"] == "3.45"


def test_get_ranges(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/ranges?tickerFrom=btc&tickerTo=eth",
        json={"traceId": "trace_4", "result": {"min": "0.001", "max": "10.0"}},
    )

    client = SimpleSwap(api_key="test-api-key")
    ranges = client.get_ranges("btc", "eth")

    assert ranges["min"] == "0.001"
    assert ranges["max"] == "10.0"


def test_check_exchange(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/exchanges/check?tickerFrom=btc&tickerTo=eth&amount=0.1",
        json={"traceId": "trace_5", "result": {"canCreate": True}},
    )

    client = SimpleSwap(api_key="test-api-key")
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

    client = SimpleSwap(api_key="test-api-key")
    order = client.create_exchange(
        ticker_from="btc",
        ticker_to="eth",
        amount=0.1,
        address_to="0xEthReceiveAddress",
        custom_fee=0.8,
    )

    assert order["id"] == "ex_100"
    assert order["addressFrom"] == "1BtcDepositAddress"


def test_get_exchange(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/exchanges/ex_100",
        json={"traceId": "trace_7", "result": {"id": "ex_100", "status": "finished"}},
    )

    client = SimpleSwap(api_key="test-api-key")
    order = client.get_exchange("ex_100")
    assert order["status"] == "finished"


def test_error_handling(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.simpleswap.io/v3/currencies",
        status_code=401,
        json={"traceId": "trace_err", "message": "API key is invalid"},
    )

    client = SimpleSwap(api_key="test-api-key")
    with pytest.raises(SimpleSwapError) as exc_info:
        client.get_currencies()

    assert "API key is invalid" in str(exc_info.value)
    assert exc_info.value.trace_id == "trace_err"
