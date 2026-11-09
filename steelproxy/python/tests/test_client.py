import pytest
from pytest_httpx import HTTPXMock

from steelproxy import (
    OrderStatus,
    ProxyType,
    RotationMode,
    SteelProxy,
    SteelProxyConflictError,
    SteelProxyError,
    SteelProxyNotFoundError,
    SteelProxyPaymentRequiredError,
    SteelProxyUnauthorizedError,
)


def test_auth_headers_and_defaults(httpx_mock: HTTPXMock):
    client = SteelProxy(api_key="test-key")

    httpx_mock.add_response(
        url="https://api.steelproxy.com/v1/proxy-types",
        json={"status": 200, "message": "", "data": [{"code": "server", "title": "Серверные"}]},
    )

    with client:
        types = client.get_proxy_types()

    requests = httpx_mock.get_requests()
    assert len(requests) == 1
    assert requests[0].headers["x-api-key"] == "test-key"
    assert requests[0].headers["user-agent"] == "steelproxy/0.1.0"
    assert len(types) == 1
    assert types[0]["code"] == "server"


def test_get_proxy_types_success(httpx_mock: HTTPXMock):
    client = SteelProxy(api_key="valid-key")

    httpx_mock.add_response(
        url="https://api.steelproxy.com/v1/proxy-types",
        json={
            "status": 200,
            "message": "",
            "data": [
                {"code": ProxyType.SERVER.value, "title": "Серверные"},
                {"code": ProxyType.RESIDENTIAL.value, "title": "Резидентские"},
                {"code": ProxyType.ROTATION.value, "title": "Ротационные"},
            ],
        },
    )

    with client:
        types = client.get_proxy_types()
        assert len(types) == 3
        assert types[0]["code"] == "server"
        assert types[1]["code"] == "residential"


def test_get_proxy_types_unauthorized(httpx_mock: HTTPXMock):
    client = SteelProxy(api_key="bad-key")

    httpx_mock.add_response(
        url="https://api.steelproxy.com/v1/proxy-types",
        status_code=401,
        json={"status": 401, "message": "Отсутствует или неверен API-ключ", "data": None},
    )

    with client, pytest.raises(SteelProxyUnauthorizedError):
        client.get_proxy_types()


def test_get_locations_success(httpx_mock: HTTPXMock):
    client = SteelProxy(api_key="valid-key")

    httpx_mock.add_response(
        url="https://api.steelproxy.com/v1/locations?proxy_type=residential",
        json={
            "status": 200,
            "message": "",
            "data": [
                {
                    "node_id": 5,
                    "country_code": "US",
                    "title": "США",
                    "proxy_type": "residential",
                    "terms_days": [1, 7, 14, 30],
                }
            ],
        },
    )

    with client:
        locations = client.get_locations(proxy_type="residential")
        assert len(locations) == 1
        assert locations[0]["node_id"] == 5
        assert locations[0]["country_code"] == "US"
        assert locations[0]["terms_days"] == [1, 7, 14, 30]


def test_get_locations_error(httpx_mock: HTTPXMock):
    client = SteelProxy(api_key="valid-key")

    httpx_mock.add_response(
        url="https://api.steelproxy.com/v1/locations",
        status_code=500,
        json={"status": 500, "message": "Server error", "data": None},
    )

    with client, pytest.raises(SteelProxyError):
        client.get_locations()


def test_get_terms_success(httpx_mock: HTTPXMock):
    client = SteelProxy(api_key="valid-key")

    httpx_mock.add_response(
        url="https://api.steelproxy.com/v1/terms",
        json={"status": 200, "message": "", "data": [1, 7, 14, 30]},
    )

    with client:
        terms = client.get_terms()
        assert terms == [1, 7, 14, 30]


def test_get_prices_success(httpx_mock: HTTPXMock):
    client = SteelProxy(api_key="valid-key")

    httpx_mock.add_response(
        url="https://api.steelproxy.com/v1/prices?country_code=US",
        json={
            "status": 200,
            "message": "",
            "data": [
                {
                    "proxy_type": "residential",
                    "country_code": "US",
                    "node_id": 5,
                    "term_days": 7,
                    "price": "47.50",
                    "currency": "RUB",
                }
            ],
        },
    )

    with client:
        prices = client.get_prices(country_code="US")
        assert len(prices) == 1
        assert prices[0]["price"] == "47.50"


def test_create_order_success(httpx_mock: HTTPXMock):
    client = SteelProxy(api_key="valid-key")

    httpx_mock.add_response(
        url="https://api.steelproxy.com/v1/orders",
        method="POST",
        json={
            "status": 200,
            "message": "",
            "data": {
                "order_id": 118432,
                "created_at": "2026-08-20T10:00:00Z",
                "expires_at": "2026-08-27T10:00:00Z",
                "proxy_type": "residential",
                "location": "US",
                "term_days": 7,
                "quantity": 1,
                "price": "47.50",
                "currency": "RUB",
                "balance_after": "4952.50",
                "proxies": [
                    {
                        "username": "user1",
                        "password": "pass1",
                        "host": "dc01.steelproxy.com",
                        "http_port": "3071",
                        "socks5_port": "3072",
                        "connection_string_http": "user1:pass1@dc01.steelproxy.com:3071",
                        "connection_string_socks5": "user1:pass1@dc01.steelproxy.com:3072",
                        "rotate_link": None,
                    }
                ],
            },
        },
    )

    with client:
        order = client.create_order(
            proxy_type="residential",
            node_id=5,
            term_days=7,
            quantity=1,
            buyer_reference="order-8841",
        )
        assert order["order_id"] == 118432
        assert len(order["proxies"]) == 1
        expected_conn = "user1:pass1@dc01.steelproxy.com:3071"
        assert order["proxies"][0]["connection_string_http"] == expected_conn


def test_create_order_validation():
    client = SteelProxy(api_key="valid-key")

    with client:
        with pytest.raises(SteelProxyError, match="proxy_type is required"):
            client.create_order(proxy_type="", node_id=1, term_days=7, quantity=1)

        with pytest.raises(SteelProxyError, match="node_id must be an integer"):
            client.create_order(proxy_type="server", node_id="not-an-int", term_days=7, quantity=1)  # type: ignore

        with pytest.raises(SteelProxyError, match="term_days must be a positive integer"):
            client.create_order(proxy_type="server", node_id=1, term_days=0, quantity=1)

        with pytest.raises(SteelProxyError, match="quantity must be a positive integer"):
            client.create_order(proxy_type="server", node_id=1, term_days=7, quantity=-1)


def test_create_order_payment_required_error(httpx_mock: HTTPXMock):
    client = SteelProxy(api_key="valid-key")

    httpx_mock.add_response(
        url="https://api.steelproxy.com/v1/orders",
        method="POST",
        status_code=402,
        json={"status": 402, "message": "Недостаточно средств", "data": None},
    )

    with client, pytest.raises(SteelProxyPaymentRequiredError):
        client.create_order(proxy_type="server", node_id=1, term_days=30, quantity=1)


def test_create_order_conflict_out_of_stock(httpx_mock: HTTPXMock):
    client = SteelProxy(api_key="valid-key")

    httpx_mock.add_response(
        url="https://api.steelproxy.com/v1/orders",
        method="POST",
        status_code=409,
        json={"status": 409, "message": "На выбранной локации нет свободных прокси", "data": None},
    )

    with client, pytest.raises(SteelProxyConflictError):
        client.create_order(proxy_type="server", node_id=1, term_days=30, quantity=1)


def test_get_order_success(httpx_mock: HTTPXMock):
    client = SteelProxy(api_key="valid-key")

    httpx_mock.add_response(
        url="https://api.steelproxy.com/v1/orders/118432",
        json={
            "status": 200,
            "message": "",
            "data": {
                "order_id": 118432,
                "status": OrderStatus.ACTIVE.value,
                "proxy_type": "residential",
                "location": "US",
                "term_days": 7,
                "quantity": 1,
                "price": "47.50",
                "currency": "RUB",
                "created_at": "2026-08-20T10:00:00Z",
                "expires_at": "2026-08-27T10:00:00Z",
                "buyer_reference": "order-8841",
                "proxies": [],
            },
        },
    )

    with client:
        order = client.get_order(118432)
        assert order["order_id"] == 118432
        assert order["status"] == "active"


def test_get_order_not_found(httpx_mock: HTTPXMock):
    client = SteelProxy(api_key="valid-key")

    httpx_mock.add_response(
        url="https://api.steelproxy.com/v1/orders/999999",
        status_code=404,
        json={"status": 404, "message": "Заказ не найден", "data": None},
    )

    with client, pytest.raises(SteelProxyNotFoundError):
        client.get_order(999999)


def test_get_orders_success(httpx_mock: HTTPXMock):
    client = SteelProxy(api_key="valid-key")

    httpx_mock.add_response(
        url="https://api.steelproxy.com/v1/orders?page=2&page_size=10",
        json={
            "status": 200,
            "message": "",
            "data": {
                "total": 30,
                "page": 2,
                "page_size": 10,
                "items": [
                    {
                        "order_id": 118430,
                        "status": "active",
                        "proxy_type": "server",
                        "location": "RU",
                        "term_days": 30,
                        "quantity": 1,
                        "price": "100.00",
                        "currency": "RUB",
                        "created_at": "2026-08-20T10:00:00Z",
                        "buyer_reference": None,
                    }
                ],
            },
        },
    )

    with client:
        orders = client.get_orders(page=2, page_size=10)
        assert orders["total"] == 30
        assert len(orders["items"]) == 1
        assert orders["items"][0]["order_id"] == 118430


def test_extend_order_success(httpx_mock: HTTPXMock):
    client = SteelProxy(api_key="valid-key")

    httpx_mock.add_response(
        url="https://api.steelproxy.com/v1/orders/118432/extend",
        method="POST",
        json={
            "status": 200,
            "message": "",
            "data": {
                "order_id": 118432,
                "months": 1,
                "price": "100.00",
                "currency": "RUB",
                "previous_expires_at": "2026-08-27T10:00:00Z",
                "expires_at": "2026-09-26T10:00:00Z",
                "balance_after": "4805.00",
            },
        },
    )

    with client:
        ext = client.extend_order(118432, months=1)
        assert ext["order_id"] == 118432
        assert ext["months"] == 1
        assert ext["expires_at"] == "2026-09-26T10:00:00Z"


def test_extend_order_validation():
    client = SteelProxy(api_key="valid-key")

    with client:
        with pytest.raises(SteelProxyError, match="order_id must be an integer"):
            client.extend_order("invalid", months=1)  # type: ignore

        with pytest.raises(SteelProxyError, match="months must be an integer"):
            client.extend_order(123, months="bad")  # type: ignore


def test_create_order_webhook_success(httpx_mock: HTTPXMock):
    client = SteelProxy(api_key="webhook-key")

    httpx_mock.add_response(
        url="https://api.steelproxy.com/v1/orders/webhook?api_key=webhook-key&proxy_type=residential&country_code=US&term_days=7",
        method="POST",
        json={
            "status": 200,
            "message": "",
            "data": {
                "order_id": 118433,
                "created_at": "2026-08-20T10:00:00Z",
                "expires_at": "2026-08-27T10:00:00Z",
                "proxy_type": "residential",
                "location": "US",
                "term_days": 7,
                "quantity": 2,
                "price": "95.00",
                "currency": "RUB",
                "balance_after": "4810.00",
                "proxies": [],
            },
        },
    )

    with client:
        order = client.create_order_webhook(
            proxy_type="residential",
            country_code="US",
            term_days=7,
            count=2,
            buyer="order-8841",
        )
        assert order["order_id"] == 118433
        assert order["quantity"] == 2


def test_build_webhook_url():
    client = SteelProxy(api_key="sp_live_key")
    url = client.build_webhook_url(
        proxy_type="rotation",
        country_code="DE",
        term_days=14,
        rotation_mode=RotationMode.TIMER,
        timer_interval=10,
    )

    assert "https://api.steelproxy.com/v1/orders/webhook" in url
    assert "api_key=sp_live_key" in url
    assert "proxy_type=rotation" in url
    assert "country_code=DE" in url
    assert "term_days=14" in url
    assert "rotation_mode=timer" in url
    assert "timer_interval=10" in url


def test_health_success(httpx_mock: HTTPXMock):
    client = SteelProxy()

    httpx_mock.add_response(
        url="https://api.steelproxy.com/health",
        json={"status": "ok"},
    )

    res = client.health()
    assert res["status"] == "ok"
