import json
import os

import httpx
import pytest
from pytest_httpx import HTTPXMock

from exolix import EXOLIX_API_KEY_HEADER, Exolix, ExolixError

BASE = "https://exolix.com/api/v2"

TRANSACTION = {
    "id": "dsd8f65609bb20",
    "amount": 0.5,
    "amountTo": 505.631486,
    "coinFrom": {
        "coinCode": "ETH",
        "coinName": "Ethereum",
        "network": "ETH",
        "networkName": "Ethereum (ERC20)",
    },
    "coinTo": {
        "coinCode": "USDT",
        "coinName": "TetherUS",
        "network": "ETH",
        "networkName": "Ethereum (ERC20)",
    },
    "depositAddress": "0xDb3B8a6dd4ddfDCA3330eaebc1a20aF26fDbbCfa",
    "withdrawalAddress": "0x0E29D1E501f90649Ad5982E900c455006e4522FC",
    "rate": 1011.262972,
    "rateType": "float",
    "status": "wait",
}


def test_authorization_header(httpx_mock: HTTPXMock) -> None:
    assert EXOLIX_API_KEY_HEADER == "Authorization"
    httpx_mock.add_response(url=f"{BASE}/currencies", json={"data": [], "count": 0})

    client = Exolix(api_key="test-exolix-key")
    client.get_currencies()

    request = httpx_mock.get_requests()[0]
    assert request.headers["Authorization"] == "test-exolix-key"


def test_ignores_environment_key(httpx_mock: HTTPXMock, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EXOLIX_API_KEY", "env-key-must-not-be-used")
    httpx_mock.add_response(url=f"{BASE}/currencies", json={"data": [], "count": 0})

    client = Exolix()
    assert client.api_key is None
    client.get_currencies()

    request = httpx_mock.get_requests()[0]
    assert "Authorization" not in request.headers
    assert os.environ["EXOLIX_API_KEY"] not in request.headers.values()


def test_get_currencies(httpx_mock: HTTPXMock) -> None:
    def respond(request: httpx.Request) -> httpx.Response:
        assert request.url.params["page"] == "1"
        assert request.url.params["size"] == "1"
        assert request.url.params["search"] == "bit"
        assert request.url.params["withNetworks"] == "true"
        assert "apiKey" not in request.url.params
        return httpx.Response(
            200,
            json={
                "data": [{"code": "BTC", "name": "Bitcoin"}],
                "count": 547,
            },
        )

    httpx_mock.add_callback(respond)

    client = Exolix(api_key="test-exolix-key")
    page = client.get_currencies(page=1, size=1, search="bit", with_networks=True)

    assert page["count"] == 547
    assert page["data"][0]["code"] == "BTC"


def test_get_currency_networks(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url=f"{BASE}/currencies/ETH/networks",
        json=[
            {
                "network": "ETH",
                "name": "Ethereum (ERC20)",
                "shortName": "ERC20",
                "isDefault": True,
            }
        ],
    )

    client = Exolix(api_key="test-exolix-key")
    networks = client.get_currency_networks("ETH")

    assert networks[0]["network"] == "ETH"
    assert networks[0]["isDefault"] is True


def test_get_networks(httpx_mock: HTTPXMock) -> None:
    def respond(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/v2/currencies/networks"
        assert request.url.params["page"] == "1"
        assert request.url.params["search"] == "eth"
        body = {
            "data": [{"network": "ETH", "name": "Ethereum", "shortName": "ERC20"}],
            "count": 142,
        }
        return httpx.Response(200, json=body)

    httpx_mock.add_callback(respond)

    client = Exolix(api_key="test-exolix-key")
    page = client.get_networks(page=1, size=10, search="eth")

    assert page["count"] == 142
    assert page["data"][0]["shortName"] == "ERC20"


def test_get_rate_float_amount(httpx_mock: HTTPXMock) -> None:
    def respond(request: httpx.Request) -> httpx.Response:
        assert request.url.params["coinFrom"] == "BTC"
        assert request.url.params["coinTo"] == "ETH"
        assert request.url.params["networkFrom"] == "BTC"
        assert request.url.params["networkTo"] == "ETH"
        assert request.url.params["amount"] == "0.1"
        assert request.url.params["rateType"] == "float"
        assert "withdrawalAmount" not in request.url.params
        assert "apiKey" not in request.url.params
        assert "referral" not in request.url.params
        return httpx.Response(
            200,
            json={
                "fromAmount": 0.1,
                "toAmount": 1.5,
                "rate": 15,
                "message": None,
                "minAmount": 0.001,
                "withdrawMin": 0.01,
                "maxAmount": 10,
            },
        )

    httpx_mock.add_callback(respond)

    client = Exolix(api_key="test-exolix-key")
    quote = client.get_rate(
        "BTC",
        "ETH",
        "float",
        network_from="BTC",
        network_to="ETH",
        amount=0.1,
    )

    assert quote["toAmount"] == 1.5
    assert quote["rate"] == 15


def test_get_rate_fixed_withdrawal_amount(httpx_mock: HTTPXMock) -> None:
    def respond(request: httpx.Request) -> httpx.Response:
        assert request.url.params["withdrawalAmount"] == "50"
        assert request.url.params["rateType"] == "fixed"
        assert "amount" not in request.url.params
        return httpx.Response(
            200,
            json={
                "fromAmount": 0.05,
                "toAmount": 50,
                "rate": 1000,
                "message": None,
                "minAmount": 0.01,
                "withdrawMin": 10,
                "maxAmount": 20,
            },
        )

    httpx_mock.add_callback(respond)

    client = Exolix(api_key="test-exolix-key")
    quote = client.get_rate(
        "ETH",
        "USDT",
        "fixed",
        network_to="ETH",
        withdrawal_amount="50",
    )

    assert quote["fromAmount"] == 0.05
    assert quote["toAmount"] == 50


def test_create_transaction(httpx_mock: HTTPXMock) -> None:
    def respond(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert body == {
            "coinFrom": "ETH",
            "networkFrom": "ETH",
            "coinTo": "USDT",
            "networkTo": "ETH",
            "amount": 0.5,
            "withdrawalAddress": "0x0E29D1E501f90649Ad5982E900c455006e4522FC",
            "withdrawalExtraId": "memo",
            "rateType": "float",
            "refundAddress": "0x0070BeBe9E30429437bD9c84C731031c27Fc7955",
            "slippage": 1,
        }
        assert "apiKey" not in body
        assert "referral" not in body
        return httpx.Response(200, json=TRANSACTION)

    httpx_mock.add_callback(respond, method="POST")

    client = Exolix(api_key="test-exolix-key")
    tx = client.create_transaction(
        "ETH",
        "USDT",
        "ETH",
        "ETH",
        "0x0E29D1E501f90649Ad5982E900c455006e4522FC",
        amount=0.5,
        withdrawal_extra_id="memo",
        refund_address="0x0070BeBe9E30429437bD9c84C731031c27Fc7955",
        rate_type="float",
        slippage=1,
    )

    assert tx["id"] == "dsd8f65609bb20"
    assert tx["depositAddress"] == TRANSACTION["depositAddress"]


def test_create_transaction_withdrawal_amount(httpx_mock: HTTPXMock) -> None:
    def respond(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert "amount" not in body
        assert body["withdrawalAmount"] == 1
        assert body["rateType"] == "fixed"
        return httpx.Response(200, json={**TRANSACTION, "rateType": "fixed"})

    httpx_mock.add_callback(respond, method="POST")

    client = Exolix(api_key="test-exolix-key")
    tx = client.create_transaction(
        "BTC",
        "ETH",
        "BTC",
        "ETH",
        "0xReceiver",
        withdrawal_amount=1,
        rate_type="fixed",
    )

    assert tx["rateType"] == "fixed"


def test_get_transaction(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url=f"{BASE}/transactions/ab93061434dd0s",
        json={**TRANSACTION, "id": "ab93061434dd0s", "status": "exchanging"},
    )

    client = Exolix(api_key="test-exolix-key")
    tx = client.get_transaction("ab93061434dd0s")

    assert tx["id"] == "ab93061434dd0s"
    assert tx["status"] == "exchanging"


def test_get_transactions(httpx_mock: HTTPXMock) -> None:
    def respond(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/v2/transactions"
        assert request.url.params["page"] == "1"
        assert request.url.params["size"] == "25"
        assert request.url.params["search"] == "dsd8"
        assert request.url.params["sort"] == "createdAt"
        assert request.url.params["order"] == "desc"
        assert request.url.params["dateFrom"] == "2024-01-01"
        assert request.url.params["dateTo"] == "2024-02-01"
        assert request.url.params["statuses"] == "success,wait"
        return httpx.Response(200, json={"data": [TRANSACTION], "count": 1})

    httpx_mock.add_callback(respond)

    client = Exolix(api_key="test-exolix-key")
    history = client.get_transactions(
        page=1,
        size=25,
        search="dsd8",
        sort="createdAt",
        order="desc",
        date_from="2024-01-01",
        date_to="2024-02-01",
        statuses=["success", "wait"],
    )

    assert history["count"] == 1
    assert history["data"][0]["id"] == TRANSACTION["id"]


def test_http_401(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url=f"{BASE}/transactions",
        status_code=401,
        json={"statusCode": 401, "message": "Unauthorized", "error": "Unauthorized"},
    )

    client = Exolix(api_key="test-exolix-key")
    with pytest.raises(ExolixError) as exc_info:
        client.get_transactions()

    assert exc_info.value.status_code == 401
    assert exc_info.value.code == "Unauthorized"
    assert "Unauthorized" in str(exc_info.value)


def test_array_validation_message(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url=f"{BASE}/rate?coinFrom=BTC&coinTo=ETH&rateType=float",
        status_code=400,
        json={
            "statusCode": 400,
            "message": ["amount must be a number", "rateType is required"],
            "error": "Bad Request",
        },
    )

    client = Exolix(api_key="test-exolix-key")
    with pytest.raises(ExolixError) as exc_info:
        client.get_rate("BTC", "ETH", "float")

    assert exc_info.value.status_code == 400
    assert exc_info.value.code == "Bad Request"
    assert exc_info.value.message == "amount must be a number, rateType is required"


def test_request_error(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_exception(httpx.ConnectError("connection refused"))

    client = Exolix(api_key="test-exolix-key")
    with pytest.raises(ExolixError, match="HTTP request failed"):
        client.get_currencies()
