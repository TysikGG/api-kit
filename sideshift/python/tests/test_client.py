import pytest
from pytest_httpx import HTTPXMock

from sideshift import AFFILIATE_ID, SideShift, SideShiftError


def test_affiliate_id_present(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://sideshift.ai/api/v2/quotes",
        method="POST",
        json={
            "id": "q1",
            "createdAt": "2026-10-26T00:00:00Z",
            "expiresAt": "2026-10-26T00:15:00Z",
            "depositCoin": "eth",
            "depositNetwork": "ethereum",
            "settleCoin": "btc",
            "settleNetwork": "bitcoin",
            "depositAmount": "1.0",
            "settleAmount": "0.05",
            "rate": "0.05",
        },
    )

    with SideShift() as client:
        assert AFFILIATE_ID == "TEfvFYrJO"
        quote = client.request_quote("eth", "ethereum", "btc", "bitcoin", deposit_amount="1.0")
        assert quote.id == "q1"

    req = httpx_mock.get_request()
    import json

    body = json.loads(req.content)
    assert body["affiliateId"] == "TEfvFYrJO"


def test_get_coins(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://sideshift.ai/api/v2/coins",
        json=[{"coin": "ETH", "name": "Ethereum", "networks": ["ethereum"]}],
    )

    with SideShift() as client:
        coins = client.get_coins()
        assert len(coins) == 1
        assert coins[0].coin == "ETH"


def test_get_pair(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://sideshift.ai/api/v2/pair/eth-ethereum/btc-bitcoin?affiliateId=TEfvFYrJO",
        json={
            "depositCoin": "ETH",
            "depositNetwork": "ethereum",
            "settleCoin": "BTC",
            "settleNetwork": "bitcoin",
            "rate": "0.03",
            "min": "0.01",
            "max": "100",
        },
    )

    with SideShift() as client:
        pair = client.get_pair("eth", "ethereum", "btc", "bitcoin")
        assert pair.rate == "0.03"


def test_get_pairs(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://sideshift.ai/api/v2/pairs?pairs=eth-ethereum%2Fbtc-bitcoin&affiliateId=TEfvFYrJO",
        json=[
            {
                "depositCoin": "ETH",
                "depositNetwork": "ethereum",
                "settleCoin": "BTC",
                "settleNetwork": "bitcoin",
                "rate": "0.03",
                "min": "0.01",
                "max": "100",
            }
        ],
    )

    with SideShift() as client:
        pairs = client.get_pairs(["eth-ethereum/btc-bitcoin"])
        assert len(pairs) == 1


def test_shifts_lifecycle(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://sideshift.ai/api/v2/shifts/fixed",
        method="POST",
        json={
            "id": "s1",
            "createdAt": "2026-10-26T00:00:00Z",
            "type": "fixed",
            "status": "waiting",
            "depositAddress": "0xabc",
            "settleAddress": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            "depositCoin": "ETH",
            "depositNetwork": "ethereum",
            "settleCoin": "BTC",
            "settleNetwork": "bitcoin",
        },
    )
    httpx_mock.add_response(
        url="https://sideshift.ai/api/v2/shifts/variable",
        method="POST",
        json={
            "id": "s2",
            "createdAt": "2026-10-26T00:00:00Z",
            "type": "variable",
            "status": "waiting",
            "depositAddress": "0xdef",
            "settleAddress": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            "depositCoin": "ETH",
            "depositNetwork": "ethereum",
            "settleCoin": "BTC",
            "settleNetwork": "bitcoin",
        },
    )
    httpx_mock.add_response(
        url="https://sideshift.ai/api/v2/shifts/s1",
        json={
            "id": "s1",
            "createdAt": "2026-10-26T00:00:00Z",
            "type": "fixed",
            "status": "completed",
            "depositAddress": "0xabc",
            "settleAddress": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            "depositCoin": "ETH",
            "depositNetwork": "ethereum",
            "settleCoin": "BTC",
            "settleNetwork": "bitcoin",
        },
    )
    httpx_mock.add_response(
        url="https://sideshift.ai/api/v2/recent-shifts?limit=5",
        json=[],
    )

    with SideShift() as client:
        fixed = client.create_fixed_shift("q1", "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")
        assert fixed.id == "s1"
        assert fixed.deposit_address == "0xabc"

        var = client.create_variable_shift(
            "eth", "ethereum", "btc", "bitcoin", "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        )
        assert var.id == "s2"

        retrieved = client.get_shift("s1")
        assert retrieved.status == "completed"

        recent = client.get_recent_shifts(5)
        assert recent == []


def test_permissions_and_metadata(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://sideshift.ai/api/v2/permissions",
        json={"createShift": True},
    )
    httpx_mock.add_response(
        url="https://sideshift.ai/api/v2/xai/stats",
        json={
            "totalSupply": 210000000,
            "circulatingSupply": 140000000,
            "numberOfStakers": 50,
            "totalStaked": "1000000",
        },
    )
    httpx_mock.add_response(
        url="https://sideshift.ai/api/v2/account",
        json={"id": "acc_123"},
    )

    with SideShift(secret="my_secret") as client:
        perms = client.get_permissions()
        assert perms.create_shift is True

        xai = client.get_xai_stats()
        assert xai.total_supply == 210000000

        acc = client.get_account()
        assert acc == {"id": "acc_123"}


def test_error_handling(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://sideshift.ai/api/v2/coins",
        status_code=400,
        json={"error": {"message": "Invalid input", "code": "BAD_USER_INPUT"}},
    )

    with SideShift() as client:
        with pytest.raises(SideShiftError) as exc_info:
            client.get_coins()
        assert exc_info.value.code == "BAD_USER_INPUT"
        assert exc_info.value.status_code == 400
