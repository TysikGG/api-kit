import pytest
from pytest_httpx import HTTPXMock

from changenow import CHANGENOW_API_KEY_HEADER, ChangeNow, ChangeNowError


def test_api_key_header_constant_and_user_ip(httpx_mock: HTTPXMock) -> None:
    assert CHANGENOW_API_KEY_HEADER == "x-changenow-api-key"
    httpx_mock.add_response(json=[])

    client = ChangeNow(api_key="test-changenow-key", user_ip="203.0.113.10")
    client.get_currencies()
    request = httpx_mock.get_requests()[0]

    assert request.headers[CHANGENOW_API_KEY_HEADER] == "test-changenow-key"
    assert request.headers["x-forwarded-for"] == "203.0.113.10"


def test_omits_api_key_header_when_unset(
    httpx_mock: HTTPXMock, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("CHANGENOW_API_KEY", raising=False)
    httpx_mock.add_response(json={"result": True, "message": None})

    client = ChangeNow()
    client.validate_address("eth", "0x57f31ad4b64095347F87eDB1675566DAfF5EC886")
    request = httpx_mock.get_requests()[0]
    assert CHANGENOW_API_KEY_HEADER not in request.headers


def test_get_currencies_filters(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json=[{"ticker": "btc", "name": "Bitcoin", "network": "btc"}])

    client = ChangeNow(api_key="test-changenow-key")
    currencies = client.get_currencies(active=True, flow="fixed-rate", buy=True)

    assert currencies[0]["ticker"] == "btc"
    request = httpx_mock.get_requests()[0]
    assert request.url.params["active"] == "true"
    assert request.url.params["flow"] == "fixed-rate"
    assert request.url.params["buy"] == "true"


def test_pairs_min_and_range(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        json=[
            {
                "fromCurrency": "btc",
                "fromNetwork": "btc",
                "toCurrency": "eth",
                "toNetwork": "eth",
                "flow": {"standard": True, "fixed-rate": True},
            }
        ]
    )
    httpx_mock.add_response(json={"minAmount": 0.001, "flow": "standard"})
    httpx_mock.add_response(json={"minAmount": 0.001, "maxAmount": None})

    client = ChangeNow(api_key="test-changenow-key")
    pairs = client.get_available_pairs(from_currency="btc", flow="standard")
    minimum = client.get_min_amount("btc", "eth", "btc", "eth", flow="standard")
    bounds = client.get_range("btc", "eth", flow="standard")

    assert pairs[0]["toCurrency"] == "eth"
    assert minimum["minAmount"] == 0.001
    assert bounds["maxAmount"] is None


def test_estimated_amount_standard_and_fixed_rate(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        json={"fromAmount": 0.1, "toAmount": 1.4, "flow": "standard", "rateId": None}
    )
    httpx_mock.add_response(
        json={
            "fromAmount": 0.1,
            "toAmount": 1.5,
            "flow": "fixed-rate",
            "rateId": "rate-1",
            "validUntil": "2026-01-01T00:00:00.000Z",
        }
    )

    client = ChangeNow(api_key="test-changenow-key")
    floating = client.get_estimated_amount(
        "btc",
        "eth",
        from_amount=0.1,
        from_network="btc",
        to_network="eth",
        flow="standard",
        type="direct",
    )
    fixed = client.get_estimated_amount(
        "btc",
        "eth",
        from_amount="0.1",
        flow="fixed-rate",
        use_rate_id=True,
    )

    assert floating["toAmount"] == 1.4
    assert fixed["rateId"] == "rate-1"
    requests = httpx_mock.get_requests()
    assert requests[0].url.params["flow"] == "standard"
    assert "useRateId" not in requests[0].url.params
    assert requests[1].url.params["flow"] == "fixed-rate"
    assert requests[1].url.params["useRateId"] == "true"


def test_create_exchange_partner_fields(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        json={
            "id": "ex-1",
            "payinAddress": "bc1qdeposit",
            "payoutAddress": "0xreceive",
            "flow": "standard",
            "type": "direct",
        }
    )

    client = ChangeNow(api_key="test-changenow-key")
    order = client.create_exchange(
        "btc",
        "eth",
        "0xreceive",
        from_network="btc",
        to_network="eth",
        from_amount=0.1,
        extra_id="",
        refund_address="bc1qrefund",
        user_id="user-42",
        payload={"campaign": "spring"},
        contact_email="trader@example.com",
        source="wallet",
        flow="standard",
        type="direct",
    )

    assert order["id"] == "ex-1"
    body = httpx_mock.get_requests()[0].read().decode()
    assert '"userId":"user-42"' in body or '"userId": "user-42"' in body
    assert "campaign" in body
    assert "trader@example.com" in body
    assert '"source":"wallet"' in body or '"source": "wallet"' in body
    assert "extraId" not in body


def test_create_exchange_fixed_rate_id(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"id": "ex-fixed", "flow": "fixed-rate"})

    client = ChangeNow(api_key="test-changenow-key")
    client.create_exchange(
        "btc",
        "eth",
        "0xreceive",
        from_amount="0.2",
        flow="fixed-rate",
        rate_id="rate-1",
    )
    body = httpx_mock.get_requests()[0].read().decode()
    assert "rate-1" in body
    assert "fixed-rate" in body


def test_status_address_and_names(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"id": "ex-1", "status": "finished"})
    httpx_mock.add_response(json={"result": False, "message": "not valid"})
    httpx_mock.add_response(
        json={
            "success": True,
            "addresses": [
                {"currency": "eth", "chain": "eth", "address": "0xabc", "protocol": "fio"}
            ],
        }
    )

    client = ChangeNow(api_key="test-changenow-key")
    status = client.get_exchange("ex-1")
    check = client.validate_address("eth", "0xbad")
    named = client.get_user_addresses("alice@domain")

    assert status["status"] == "finished"
    assert check["result"] is False
    assert named["addresses"][0]["protocol"] == "fio"


def test_network_fee_and_market_estimate(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        json={"estimatedFee": {"deposit": {"amount": 1}, "withdrawal": {"amount": 2}}}
    )
    httpx_mock.add_response(
        json={
            "fromCurrency": "usd",
            "toCurrency": "btc",
            "type": "direct",
            "fromAmount": 100,
            "toAmount": 0.001,
        }
    )

    client = ChangeNow(api_key="test-changenow-key")
    fee = client.get_network_fee(
        "usdt",
        "btc",
        100,
        from_network="eth",
        to_network="btc",
        converted_currency="usd",
        converted_network="usd",
    )
    market = client.get_market_estimate("usd", "btc", from_amount=100, type="direct")

    assert fee["estimatedFee"]["deposit"]["amount"] == 1  # type: ignore[index]
    assert market["toAmount"] == 0.001


def test_get_exchanges_filters(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"count": 1, "exchanges": [{"requestId": "req-1"}]})

    client = ChangeNow(api_key="test-changenow-key")
    page = client.get_exchanges(
        limit=10,
        offset=0,
        sort_direction="DESC",
        statuses=["finished", "waiting"],
        user_id="user-42",
    )

    assert page["count"] == 1
    params = httpx_mock.get_requests()[0].url.params
    assert params.get_list("statuses") == ["finished", "waiting"]
    assert params["userId"] == "user-42"
    assert params["sortDirection"] == "DESC"


def test_actions_continue_and_refund(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        json={"error": None, "continue": {"available": True}, "refund": {"available": False}}
    )
    httpx_mock.add_response(json={"result": {"result": True}})
    httpx_mock.add_response(json={"result": True})

    client = ChangeNow(api_key="test-changenow-key")
    actions = client.get_exchange_actions("ex-1")
    pushed = client.continue_exchange("ex-1")
    refunded = client.refund_exchange("ex-1", address="bc1qrefund", extra_id="memo")

    assert actions["continue"]["available"] is True  # type: ignore[index]
    assert pushed["result"]["result"] is True  # type: ignore[index]
    assert refunded["result"] is True
    refund_body = httpx_mock.get_requests()[2].read().decode()
    assert "bc1qrefund" in refund_body
    assert "memo" in refund_body


def test_private_transfer(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        json={
            "currency": "eth",
            "network": "eth",
            "fromAmount": "10.1",
            "toAmount": "10",
            "rateId": "rate-pt",
            "validUntil": "2026-01-01T00:00:00.000Z",
            "warningMessage": None,
        }
    )
    httpx_mock.add_response(json={"id": "pt-1", "payinAddress": "0xdeposit"})

    client = ChangeNow(api_key="test-changenow-key")
    quote = client.get_private_transfer_estimate("eth", "eth", 10, user_id="user-42")
    transfer = client.create_private_transfer(
        "eth", "eth", "10", "0xreceive", rate_id=quote["rateId"]
    )

    assert quote["rateId"] == "rate-pt"
    assert transfer["id"] == "pt-1"
    assert "user-42" in str(httpx_mock.get_requests()[0].url)
    assert "rate-pt" in httpx_mock.get_requests()[1].read().decode()


def test_error_handling(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        status_code=400,
        json={"error": "not_valid_params", "message": "Currency btcc is not supported"},
    )

    client = ChangeNow(api_key="test-changenow-key")
    with pytest.raises(ChangeNowError) as exc_info:
        client.get_min_amount("btcc", "eth")

    assert exc_info.value.status_code == 400
    assert exc_info.value.code == "not_valid_params"
    assert "not supported" in str(exc_info.value)
