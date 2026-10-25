import json

import pytest
from pytest_httpx import HTTPXMock

from smsbulk import REF_ID, SMSBulk, SMSBulkError


def test_ref_id_constant():
    assert REF_ID == "3XTTWRX9"


def test_create_activation_sends_ref_id(httpx_mock: HTTPXMock):
    captured_body = {}

    def custom_response(request):
        nonlocal captured_body
        captured_body = json.loads(request.read())
        return httpx_mock.Response(
            status_code=201,
            json={
                "id": "act_123",
                "status": "WAITING",
                "phoneNumber": "+12025550199",
                "purged": False,
                "userCost": "0.50",
                "currency": "USD",
                "service": {"code": "wa", "slug": "whatsapp", "name": "WhatsApp"},
                "country": {"isoCode": "US", "name": "USA"},
                "createdAt": "2026-05-09T13:45:00Z",
                "cancellable": False,
            },
        )

    # Note: custom response with httpx.Response directly
    import httpx

    def handler(request):
        nonlocal captured_body
        captured_body = json.loads(request.read())
        return httpx.Response(
            status_code=201,
            json={
                "id": "act_123",
                "status": "WAITING",
                "phoneNumber": "+12025550199",
                "purged": False,
                "userCost": "0.50",
                "currency": "USD",
                "service": {"code": "wa", "slug": "whatsapp", "name": "WhatsApp"},
                "country": {"isoCode": "US", "name": "USA"},
                "createdAt": "2026-05-09T13:45:00Z",
                "cancellable": False,
            },
        )

    httpx_mock.add_callback(handler)

    client = SMSBulk(api_key="test-api-key")
    res = client.create_activation(
        service_code="wa",
        country_iso="US",
        operator="any",
        max_price="0.50",
    )

    assert captured_body.get("ref_id") == "3XTTWRX9"
    assert captured_body.get("serviceCode") == "wa"
    assert captured_body.get("countryIso") == "US"
    assert captured_body.get("operator") == "any"
    assert captured_body.get("maxPrice") == "0.50"
    assert res["phoneNumber"] == "+12025550199"


def test_get_balance(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://smsbulk.net/api/v1/wallet/balance",
        json={"balance": "50.00", "currency": "USD"},
    )
    client = SMSBulk(api_key="test-api-key")
    bal = client.get_balance()
    assert bal["balance"] == "50.00"
    assert bal["currency"] == "USD"


def test_get_transactions(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://smsbulk.net/api/v1/wallet/transactions?limit=5",
        json={
            "data": [{"id": "tx_1", "amount": "-0.30", "currency": "USD", "type": "activation"}],
            "nextCursor": None,
        },
    )
    client = SMSBulk(api_key="test-api-key")
    txs = client.get_transactions(limit=5)
    assert len(txs["data"]) == 1
    assert txs["data"][0]["id"] == "tx_1"


def test_services_and_countries(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://smsbulk.net/api/v1/services",
        json={
            "data": [
                {
                    "code": "wa",
                    "slug": "whatsapp",
                    "name": "WhatsApp",
                    "countryCount": 50,
                    "totalStock": 100,
                    "minPrice": "0.10",
                }
            ],
            "count": 1,
        },
    )
    httpx_mock.add_response(
        url="https://smsbulk.net/api/v1/services/whatsapp",
        json={
            "code": "wa",
            "slug": "whatsapp",
            "name": "WhatsApp",
            "countryCount": 50,
            "totalStock": 100,
            "minPrice": "0.10",
        },
    )
    httpx_mock.add_response(
        url="https://smsbulk.net/api/v1/countries",
        json={"data": [{"isoCode": "US", "name": "United States"}], "count": 1},
    )
    httpx_mock.add_response(
        url="https://smsbulk.net/api/v1/services/whatsapp/countries",
        json={
            "service": {"code": "wa", "slug": "whatsapp", "name": "WhatsApp"},
            "countries": [{"isoCode": "US", "price": "0.20", "currency": "USD", "stock": 50}],
            "count": 1,
        },
    )

    client = SMSBulk(api_key="test-api-key")
    services = client.get_services()
    assert services["count"] == 1

    svc = client.get_service("whatsapp")
    assert svc["name"] == "WhatsApp"

    countries = client.get_countries()
    assert countries["count"] == 1

    sc = client.get_service_countries("whatsapp")
    assert sc["count"] == 1


def test_email_activations(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://smsbulk.net/api/v1/email-activations/domains?site=telegram.com",
        json=[{
            "name": "gmx.com",
            "price": 0.02,
            "count": 10,
            "currency": "USD",
            "disabled": False,
        }],
    )
    httpx_mock.add_response(
        url="https://smsbulk.net/api/v1/email-activations",
        method="POST",
        json={
            "id": "em_1",
            "site": "telegram.com",
            "domain": "gmx.com",
            "emailAddress": "user@gmx.com",
            "status": "WAITING",
            "userCost": "0.02",
            "currency": "USD",
            "createdAt": "2026-05-09T13:45:00Z",
        },
    )

    client = SMSBulk(api_key="test-api-key")
    domains = client.get_email_domains("telegram.com")
    assert domains[0]["name"] == "gmx.com"

    act = client.create_email_activation(site="telegram.com", domain="gmx.com")
    assert act["emailAddress"] == "user@gmx.com"


def test_errors(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://smsbulk.net/api/v1/wallet/balance",
        status_code=401,
        json={"statusCode": 401, "message": "API key required", "error": "Unauthorized"},
    )

    client = SMSBulk(api_key="test-api-key")
    with pytest.raises(SMSBulkError) as exc_info:
        client.get_balance()

    assert exc_info.value.status_code == 401
    assert exc_info.value.code == "Unauthorized"
