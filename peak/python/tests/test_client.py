"""Unit tests for the Peak Python client."""

import json
from typing import Any

import httpx
import pytest
from pytest_httpx import HTTPXMock

from peak import APP_ID, Peak, PeakError


def test_missing_api_key() -> None:
    with pytest.raises(PeakError, match="API key is required"):
        Peak("")


def test_get_balance_pay_per_solve(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.peak.fo/balance",
        method="GET",
        json={
            "success": True,
            "data": {
                "type": "pay_per_solve",
                "balance": 24.50,
            },
        },
    )

    with Peak("pk_test_123") as client:
        balance = client.get_balance()
        assert balance["type"] == "pay_per_solve"
        assert balance["balance"] == 24.50


def test_get_balance_package(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.peak.fo/balance",
        method="GET",
        json={
            "success": True,
            "data": {
                "type": "package",
                "package": "Enterprise 50k",
                "expires_at": "2026-11-30T00:00:00Z",
                "days_remaining": 60,
            },
        },
    )

    with Peak("pk_test_123") as client:
        balance = client.get_balance()
        assert balance["type"] == "package"
        assert balance["package"] == "Enterprise 50k"
        assert balance["days_remaining"] == 60


def test_get_balance_failure(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.peak.fo/balance",
        method="GET",
        json={
            "success": False,
            "error": "Account suspended",
        },
    )

    with Peak("pk_test_123") as client:
        with pytest.raises(PeakError, match="Failed to retrieve balance"):
            client.get_balance()


def test_solve_turnstile_proxyless_embeds_app_id(httpx_mock: HTTPXMock) -> None:
    def custom_response(request: Any) -> Any:
        body = json.loads(request.content)
        assert body["appId"] == APP_ID
        assert body["task_type"] == "TurnstileTaskProxyLess"
        assert body["url"] == "https://example.com/"
        assert body["sitekey"] == "0x4AAAAAAA"
        assert "proxy" not in body

        return httpx.Response(
            status_code=200,
            json={
                "success": True,
                "data": {"token": "0.AgAAABBqzz..."},
            },
        )

    httpx_mock.add_callback(custom_response, url="https://api.peak.fo/solve", method="POST")

    with Peak("pk_test_123") as client:
        res = client.solve_turnstile("https://example.com/", "0x4AAAAAAA")
        assert res["token"] == "0.AgAAABBqzz..."


def test_solve_turnstile_with_proxy_embeds_app_id(httpx_mock: HTTPXMock) -> None:
    def custom_response(request: Any) -> Any:
        body = json.loads(request.content)
        assert body["appId"] == APP_ID
        assert body["task_type"] == "turnstiletask"
        assert body["proxy"] == "http://user:pass@1.2.3.4:8080"
        assert body["action"] == "submit"
        assert body["cdata"] == "cdata_token"

        return httpx.Response(
            status_code=200,
            json={
                "success": True,
                "data": {"token": "0.AgAAABBqzz_proxied..."},
            },
        )

    httpx_mock.add_callback(custom_response, url="https://api.peak.fo/solve", method="POST")

    with Peak("pk_test_123") as client:
        res = client.solve_turnstile(
            "https://example.com/",
            "0x4AAAAAAA",
            proxy="http://user:pass@1.2.3.4:8080",
            action="submit",
            cdata="cdata_token",
        )
        assert res["token"] == "0.AgAAABBqzz_proxied..."


def test_solve_cloudflare_5s_embeds_app_id(httpx_mock: HTTPXMock) -> None:
    def custom_response(request: Any) -> Any:
        body = json.loads(request.content)
        assert body["appId"] == APP_ID
        assert body["task_type"] == "cloudflare5stask"
        assert body["url"] == "https://example.com/"
        assert body["proxy"] == "http://user:pass@1.2.3.4:8080"
        assert body["user_agent"] == "Mozilla/5.0 Windows"

        return httpx.Response(
            status_code=200,
            json={
                "success": True,
                "data": {
                    "cookies": {"cf_clearance": "clearance_val"},
                    "headers": {"user-agent": "Mozilla/5.0 Windows"},
                    "attributes": {"md": "md_val", "r": "r_val"},
                    "cf_rt": "challenge_token",
                },
            },
        )

    httpx_mock.add_callback(custom_response, url="https://api.peak.fo/solve", method="POST")

    with Peak("pk_test_123") as client:
        res = client.solve_cloudflare_5s(
            "https://example.com/",
            "http://user:pass@1.2.3.4:8080",
            user_agent="Mozilla/5.0 Windows",
        )
        assert res["cookies"]["cf_clearance"] == "clearance_val"
        assert res["cf_rt"] == "challenge_token"


def test_solve_error_response_200(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.peak.fo/solve",
        method="POST",
        json={
            "success": False,
            "error": "Target site unreachable",
        },
    )

    with Peak("pk_test_123") as client:
        with pytest.raises(PeakError, match="Target site unreachable") as exc_info:
            client.solve_turnstile("https://example.com/", "0x4AAAAAAA")
        assert exc_info.value.status_code == 200


def test_http_401_error(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.peak.fo/balance",
        method="GET",
        status_code=401,
        json={
            "success": False,
            "error": "Unauthorized",
        },
    )

    with Peak("pk_invalid") as client:
        with pytest.raises(PeakError) as exc_info:
            client.get_balance()
        assert exc_info.value.status_code == 401
        assert "Unauthorized" in exc_info.value.message
