import pytest
from pytest_httpx import HTTPXMock

from swapzone import Swapzone, SwapzoneError


def test_client_headers(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.swapzone.io/v1/exchange/currencies",
        json=[{"name": "Bitcoin", "ticker": "btc", "network": "BTC"}],
    )

    client = Swapzone(api_key="test-api-key")
    currencies = client.get_currencies()

    assert len(currencies) == 1
    assert currencies[0]["ticker"] == "btc"


def test_get_rate(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.swapzone.io/v1/exchange/get-rate?from=btc&to=eth&amount=0.1&rateType=all&chooseRate=best",
        json={
            "adapter": "changenow",
            "from": "btc",
            "to": "eth",
            "amountFrom": 0.1,
            "amountTo": 1.5,
            "quotaId": "q_123",
        },
    )

    client = Swapzone(api_key="test-api-key")
    rate = client.get_rate("btc", "eth", 0.1)

    assert rate["adapter"] == "changenow"
    assert rate["amountTo"] == 1.5


def test_create_transaction(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.swapzone.io/v1/exchange/create",
        method="POST",
        json={
            "id": "tx_123",
            "status": "waiting",
            "addressDeposit": "1DepositAddress...",
            "addressReceive": "0xReceiveAddress...",
            "amountDeposit": 0.1,
            "amountEstimated": 1.5,
        },
    )

    client = Swapzone(api_key="test-api-key")
    order = client.create_transaction(
        from_currency="btc",
        to_currency="eth",
        amount_deposit="0.1",
        address_receive="0xReceiveAddress...",
        quota_id="q_123",
    )

    assert order["id"] == "tx_123"
    assert order["addressDeposit"] == "1DepositAddress..."


def test_get_transaction(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.swapzone.io/v1/exchange/tx?id=tx_123",
        json={"id": "tx_123", "status": "finished", "amountEstimated": 1.5},
    )

    client = Swapzone(api_key="test-api-key")
    tx = client.get_transaction("tx_123")
    assert tx["status"] == "finished"


def test_validate_address(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.swapzone.io/v1/exchange/validate/address?currency=eth&address=0x123&network=ETH",
        json={"result": True, "message": None},
    )

    client = Swapzone(api_key="test-api-key")
    res = client.validate_address("eth", "0x123", network="ETH")
    assert res["result"] is True


def test_get_dex_blockchains(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.swapzone.io/v1/dex/blockchains",
        json={"error": False, "result": [{"chainId": 1, "name": "Ethereum"}]},
    )

    client = Swapzone(api_key="test-api-key")
    chains = client.get_dex_blockchains()
    assert len(chains) == 1
    assert chains[0]["name"] == "Ethereum"


def test_error_response_raises(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.swapzone.io/v1/exchange/currencies",
        status_code=200,
        json={"error": True, "message": "Invalid API Key"},
    )

    client = Swapzone(api_key="test-api-key")
    with pytest.raises(SwapzoneError) as exc_info:
        client.get_currencies()

    assert "Invalid API Key" in str(exc_info.value)
