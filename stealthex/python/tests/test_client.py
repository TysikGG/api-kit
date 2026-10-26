import pytest
from pytest_httpx import HTTPXMock

from stealthex import StealthEX, StealthEXError


def test_currencies(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.stealthex.io/api/v2/currency?api_key=test-api-key",
        json=[{"symbol": "btc", "name": "Bitcoin"}],
    )

    client = StealthEX(api_key="test-api-key")
    currencies = client.get_currencies()

    assert len(currencies) == 1
    assert currencies[0]["symbol"] == "btc"


def test_currency(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.stealthex.io/api/v2/currency/btc?api_key=test-api-key",
        json={"symbol": "btc", "name": "Bitcoin"},
    )

    client = StealthEX(api_key="test-api-key")
    btc = client.get_currency("btc")
    assert btc["name"] == "Bitcoin"


def test_pairs(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.stealthex.io/api/v2/pairs/btc?api_key=test-api-key",
        json=["eth", "usdt", "sol"],
    )

    client = StealthEX(api_key="test-api-key")
    pairs = client.get_pairs("btc")
    assert pairs == ["eth", "usdt", "sol"]


def test_range_and_min(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.stealthex.io/api/v2/range/btc/eth?api_key=test-api-key",
        json={"min_amount": "0.001", "max_amount": "10.0"},
    )
    httpx_mock.add_response(
        url="https://api.stealthex.io/api/v2/min/btc/eth?api_key=test-api-key",
        json={"min_amount": "0.001"},
    )

    client = StealthEX(api_key="test-api-key")
    range_res = client.get_range("btc", "eth")
    min_res = client.get_min_amount("btc", "eth")

    assert range_res["min_amount"] == "0.001"
    assert min_res["min_amount"] == "0.001"


def test_estimate(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.stealthex.io/api/v2/estimate/btc/eth?amount=0.1&api_key=test-api-key",
        json={"estimated_amount": "3.45"},
    )

    client = StealthEX(api_key="test-api-key")
    est = client.get_estimate("btc", "eth", "0.1")
    assert est["estimated_amount"] == "3.45"


def test_create_exchange(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.stealthex.io/api/v2/exchange?api_key=test-api-key",
        method="POST",
        json={
            "id": "stealth_100",
            "status": "waiting",
            "currency_from": "btc",
            "currency_to": "eth",
            "amount_from": "0.1",
            "amount_to": "3.45",
            "address_from": "1BtcDepositAddress",
            "address_to": "0xEthReceiveAddress",
        },
    )

    client = StealthEX(api_key="test-api-key")
    order = client.create_exchange(
        currency_from="btc",
        currency_to="eth",
        amount_from=0.1,
        address_to="0xEthReceiveAddress",
    )

    assert order["id"] == "stealth_100"
    assert order["address_from"] == "1BtcDepositAddress"


def test_get_exchange(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.stealthex.io/api/v2/exchange/stealth_100?api_key=test-api-key",
        json={"id": "stealth_100", "status": "finished"},
    )

    client = StealthEX(api_key="test-api-key")
    order = client.get_exchange("stealth_100")
    assert order["status"] == "finished"


def test_error_handling(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.stealthex.io/api/v2/currency?api_key=test-api-key",
        status_code=401,
        json={"message": "Invalid API key"},
    )

    client = StealthEX(api_key="test-api-key")
    with pytest.raises(StealthEXError) as exc_info:
        client.get_currencies()

    assert "Invalid API key" in str(exc_info.value)
