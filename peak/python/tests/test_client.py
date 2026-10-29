"""Unit tests for the synchronous Peak client."""

import json
from typing import Any

import httpx
import pytest
from pytest_httpx import HTTPXMock

from peak import (
    APP_ID,
    AuthenticationError,
    BadRequestError,
    ErrorCode,
    InsufficientBalanceError,
    Peak,
    PeakClient,
    PeakError,
    RetryTimeoutError,
    ServiceUnavailableError,
    SolveError,
    TaskDisabledError,
    UpstreamError,
)


def test_missing_api_key() -> None:
    with pytest.raises(PeakError, match="API key is required"):
        Peak("")
    with pytest.raises(PeakError, match="API key is required"):
        Peak("   ")
    assert isinstance(PeakClient(" pk "), Peak)


def test_http_proxy_and_base_url(httpx_mock: HTTPXMock) -> None:
    with pytest.raises(BadRequestError, match="SOCKS"):
        Peak("pk", http_proxy="socks5://127.0.0.1:1080")

    def _check(request: httpx.Request) -> httpx.Response:
        assert request.headers["x-api-key"] == "pk_test"
        assert request.headers["accept"] == "application/json"
        return httpx.Response(
            200, json={"success": True, "data": {"type": "pay_per_solve", "balance": 3}}
        )

    httpx_mock.add_callback(_check, url="https://example.test/balance", method="GET")
    with Peak(
        " pk_test ",
        base_url="https://example.test/",
        timeout=12.5,
        http_proxy="http://127.0.0.1:8888",
    ) as client:
        assert client.get_balance()["balance"] == 3


def test_get_balance_shapes(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.peak.fo/balance",
        json={"success": True, "data": {"type": "pay_per_solve", "balance": 24.50}},
    )
    httpx_mock.add_response(
        url="https://api.peak.fo/balance",
        json={
            "success": True,
            "data": {
                "type": "package",
                "package_name": "Turnstile 500K",
                "remaining_solves": 10,
                "total_solves": 500000,
                "allowed_tasks": ["turnstiletask"],
                "expires_at": "2026-06-25T00:00:00Z",
                "days_remaining": 30,
            },
        },
    )
    httpx_mock.add_response(
        url="https://api.peak.fo/balance",
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
        pay = client.get_balance()
        assert pay["type"] == "pay_per_solve"
        assert pay["balance"] == 24.50
        package = client.get_balance()
        assert package["package_name"] == "Turnstile 500K"
        legacy = client.get_balance()
        assert legacy["package"] == "Enterprise 50k"
        assert legacy["days_remaining"] == 60


def test_balance_failures(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.peak.fo/balance",
        json={"success": False, "error": "Account suspended"},
    )
    httpx_mock.add_response(url="https://api.peak.fo/balance", json={"success": False})
    httpx_mock.add_response(url="https://api.peak.fo/balance", json={"success": True})
    httpx_mock.add_response(url="https://api.peak.fo/balance", json=[1, 2])
    httpx_mock.add_response(url="https://api.peak.fo/balance", text="nope")
    with Peak("pk_test_123") as client:
        with pytest.raises(SolveError, match="Account suspended"):
            client.get_balance()
        with pytest.raises(PeakError, match="Failed to retrieve balance"):
            client.get_balance()
        with pytest.raises(PeakError, match="Failed to retrieve balance"):
            client.get_balance()
        with pytest.raises(PeakError, match="non-JSON"):
            client.get_balance()
        with pytest.raises(PeakError, match="non-JSON"):
            client.get_balance()


def test_solve_turnstile_and_aliases(httpx_mock: HTTPXMock) -> None:
    bodies: list[dict[str, Any]] = []

    def _capture(request: httpx.Request) -> httpx.Response:
        bodies.append(json.loads(request.content))
        return httpx.Response(
            200, json={"success": True, "data": {"token": f"tok-{len(bodies)}"}}
        )

    httpx_mock.add_callback(_capture, url="https://api.peak.fo/solve", is_reusable=True)
    events: list[str] = []
    with Peak("pk_test_123", on_result=lambda event: events.append(event["task_type"])) as client:
        res = client.solve_turnstile("https://example.com/login", " 0x4AAAAAAA ")
        assert res["token"] == "tok-1"
        assert bodies[0]["appId"] == APP_ID
        assert bodies[0]["task_type"] == "TurnstileTaskProxyLess"
        assert bodies[0]["url"] == "https://example.com/login/"
        assert bodies[0]["sitekey"] == "0x4AAAAAAA"
        assert "proxy" not in bodies[0]

        proxied = client.solve_turnstile(
            "https://example.com/a?x=1",
            "0x4AAAAAAA",
            proxy={"host": "1.2.3.4", "port": 8080, "username": "user", "password": "pass"},
            action="submit",
            cdata="cdata_token",
            task_type="turnstiletask",
        )
        assert proxied["token"] == "tok-2"
        assert bodies[1]["proxy"] == "http://user:pass@1.2.3.4:8080"
        assert bodies[1]["action"] == "submit"
        assert bodies[1]["cdata"] == "cdata_token"
        assert bodies[1]["url"] == "https://example.com/a/?x=1"

        client.solve_turnstile("https://example.com/", "0x4", proxy="")
        assert bodies[2]["task_type"] == "TurnstileTaskProxyLess"

        waf = client.solve_cloudflare_5s(
            "https://example.com",
            "http://user:pass@1.2.3.4:8080",
            user_agent="Mozilla/5.0 Windows",
            html="<html></html>",
        )
        assert waf["token"] == "tok-4"
        assert bodies[3]["task_type"] == "cloudflare5stask"
        assert bodies[3]["url"] == "https://example.com/"
        assert bodies[3]["user_agent"] == "Mozilla/5.0 Windows"
        assert bodies[3]["html"] == "<html></html>"
        assert bodies[3]["appId"] == APP_ID

    # The callback above received turnstile task types. WAF is included too.
    assert "TurnstileTaskProxyLess" in events
    assert "cloudflare5stask" in events


def test_cloudflare_result_and_aws(httpx_mock: HTTPXMock) -> None:
    bodies: list[dict[str, Any]] = []

    def _capture(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        bodies.append(body)
        if body["task_type"] == "awswaftask":
            return httpx.Response(200, json={"success": True, "data": {"token": "aws-token"}})
        return httpx.Response(
            200,
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

    httpx_mock.add_callback(_capture, url="https://api.peak.fo/solve", is_reusable=True)
    hooks: list[str] = []
    with Peak("pk_test_123") as client:
        res = client.solve_cloudflare_waf(
            "https://example.com/",
            "http://user:pass@1.2.3.4:8080",
            user_agent="Mozilla/5.0 Windows",
        )
        assert res["cookies"]["cf_clearance"] == "clearance_val"
        assert res["cf_rt"] == "challenge_token"
        client.solve_cloudflare_5s(
            "https://example.com/",
            "http://user:pass@1.2.3.4:8080",
            task_type=" cloudflare5stask ",
        )
        assert "user_agent" not in bodies[1]
        ios = client.solve_aws_waf(
            "https://app.example.com",
            "https://xxx.edge.sdk.awswaf.com/xxx/xxx",
            "http://user:pass@1.2.3.4:8080",
            "ExampleApp/1.0 (iOS 17.0)",
        )
        assert ios["token"] == "aws-token"
        assert bodies[2]["os"] == "ios"
        assert bodies[2]["sdk_url"] == "https://xxx.edge.sdk.awswaf.com/xxx/xxx"
        assert bodies[2]["url"] == "https://app.example.com/"
        assert bodies[2]["appId"] == APP_ID
        client.solve_aws_waf(
            "https://app.example.com/",
            "https://xxx.edge.sdk.awswaf.com/xxx/xxx",
            {"protocol": "socks5", "host": "10.0.0.1", "port": 1080},
            "ExampleApp/1.0 (Android 14)",
            os="android",
            on_result=lambda event: hooks.append(event["task_type"]),
        )
        assert bodies[3]["os"] == "android"
        assert bodies[3]["proxy"] == "socks5://10.0.0.1:1080"
        raw = client.solve(
            {"task_type": "turnstiletask", "url": "https://example.com/", "appId": "app_other"},
            on_result=lambda _event: hooks.append("call"),
        )
        assert raw["cf_rt"] == "challenge_token"
        assert bodies[4]["appId"] == APP_ID
    assert hooks[0] == "awswaftask"
    assert "call" in hooks

    with Peak("pk") as client:
        with pytest.raises(BadRequestError, match="ios"):
            client.solve_aws_waf(
                "https://app.example.com/",
                "https://sdk.example/a",
                "http://1.2.3.4:8080",
                "App",
                os="windows",
            )
        with pytest.raises(BadRequestError, match="sitekey"):
            client.solve_turnstile("https://example.com/", "  ")
        with pytest.raises(BadRequestError):
            client.solve_cloudflare_5s("notaurl", "http://1.2.3.4:1")


def test_http_errors(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.peak.fo/balance",
        status_code=401,
        json={"success": False, "error": "API key invalid"},
    )
    httpx_mock.add_response(
        url="https://api.peak.fo/solve",
        status_code=402,
        json={"success": False, "error": "insufficient balance"},
    )
    httpx_mock.add_response(
        url="https://api.peak.fo/solve",
        status_code=400,
        json={"success": False, "error": "missing field"},
    )
    httpx_mock.add_response(
        url="https://api.peak.fo/solve",
        status_code=429,
        json={"error": "rate limit"},
    )
    httpx_mock.add_response(url="https://api.peak.fo/solve", status_code=502, text="upstream down")
    httpx_mock.add_response(
        url="https://api.peak.fo/solve",
        status_code=503,
        json={"success": False, "error": "temporarily unavailable"},
    )
    httpx_mock.add_response(
        url="https://api.peak.fo/solve",
        json={"success": False, "error": "Sitekey invalid or domain mismatch"},
    )
    httpx_mock.add_response(
        url="https://api.peak.fo/solve",
        json={"success": True, "error": "Turnstile challenge was flagged"},
    )
    httpx_mock.add_response(url="https://api.peak.fo/solve", json={"success": True})
    httpx_mock.add_response(
        url="https://api.peak.fo/solve",
        json={"success": False, "error": "task type is disabled"},
    )
    httpx_mock.add_response(url="https://api.peak.fo/balance", status_code=500, json={"error": ""})
    httpx_mock.add_exception(httpx.ConnectError("boom"))
    httpx_mock.add_exception(httpx.ReadTimeout("timed out"))

    with Peak("pk_invalid") as client:
        with pytest.raises(AuthenticationError) as auth:
            client.get_balance()
        assert auth.value.status_code == 401
        assert "API key invalid" in auth.value.message

        with pytest.raises(InsufficientBalanceError):
            client.solve_turnstile("https://example.com/", "0x4")
        with pytest.raises(BadRequestError):
            client.solve_turnstile("https://example.com/", "0x4")
        with pytest.raises(PeakError) as limited:
            client.solve_turnstile("https://example.com/", "0x4")
        assert limited.value.status_code == 429
        with pytest.raises(UpstreamError, match="upstream down"):
            client.solve_turnstile("https://example.com/", "0x4")
        with pytest.raises(ServiceUnavailableError):
            client.solve_aws_waf(
                "https://app.example.com/",
                "https://sdk.example/a",
                "http://1.2.3.4:8080",
                "App/1",
            )
        with pytest.raises(SolveError, match="Sitekey invalid or domain mismatch") as solve_err:
            client.solve_turnstile("https://example.com/", "bad")
        assert solve_err.value.status_code == 200
        with pytest.raises(SolveError):
            client.solve_turnstile("https://example.com/", "0x4")
        with pytest.raises(PeakError, match="Missing response data"):
            client.solve_turnstile("https://example.com/", "0x4")
        with pytest.raises(TaskDisabledError):
            client.solve_turnstile("https://example.com/", "0x4")
        with pytest.raises(PeakError) as server:
            client.get_balance()
        assert server.value.status_code == 500
        assert server.value.response == {"error": ""}
        with pytest.raises(PeakError, match="boom") as network:
            client.get_balance()
        assert network.value.code == ErrorCode.NETWORK
        with pytest.raises(PeakError) as timed:
            client.get_balance()
        assert timed.value.code == ErrorCode.REQUEST_TIMED_OUT


def test_retries(httpx_mock: HTTPXMock) -> None:
    calls = {"n": 0}

    def _flaky(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(503, json={"success": False, "error": "no solver capacity"})
        return httpx.Response(200, json={"success": True, "data": {"token": "later"}})

    httpx_mock.add_callback(_flaky, url="https://api.peak.fo/solve", is_reusable=True)
    with Peak("pk", retries=1, retry_delay=0) as client:
        assert client.solve_turnstile("https://example.com/", "0x4")["token"] == "later"
    assert calls["n"] == 2

    auth_calls = {"n": 0}

    def _auth(request: httpx.Request) -> httpx.Response:
        auth_calls["n"] += 1
        return httpx.Response(401, json={"success": False, "error": "unauthorized"})

    httpx_mock.add_callback(_auth, url="https://api.peak.fo/balance")
    with Peak("pk", retries=4, retry_delay=0) as client:
        with pytest.raises(AuthenticationError):
            client.get_balance()
    assert auth_calls["n"] == 1

    budget_calls = {"n": 0}

    def _down(request: httpx.Request) -> httpx.Response:
        budget_calls["n"] += 1
        return httpx.Response(503, json={"success": False, "error": "down"})

    httpx_mock.add_callback(_down, url="https://api.peak.fo/balance", is_reusable=True)
    with Peak("pk", retries=5, retry_delay=0, retry_timeout=0) as client:
        with pytest.raises(RetryTimeoutError):
            client.get_balance()
    assert budget_calls["n"] == 1

    with Peak("pk", retry_delay=0.05, retry_timeout=0.01) as client:
        with pytest.raises(RetryTimeoutError):
            client.get_balance(retries=2, retry_delay=0.05, retry_timeout=0.01)


def test_hooks_and_closed_client(httpx_mock: HTTPXMock) -> None:
    events: list[str] = []
    httpx_mock.add_response(
        url="https://api.peak.fo/solve",
        json={"success": False, "error": "Proxy connection failed"},
    )
    httpx_mock.add_response(
        url="https://api.peak.fo/solve",
        json={"success": True, "data": {"token": "ok"}},
    )
    with Peak("pk", on_result=lambda _event: events.append("client")) as client:
        with pytest.raises(SolveError):
            client.solve_turnstile(
                "https://example.com/",
                "0x4",
                on_result=lambda _event: events.append("call"),
            )
        assert events == []
        client.solve_turnstile(
            "https://example.com/",
            "0x4",
            on_result=lambda event: events.append(event["task_type"]),
        )
    assert events == ["TurnstileTaskProxyLess", "client"]

    client = Peak("pk")
    client.close()
    client.close()
    with pytest.raises(PeakError):
        client.get_balance()
