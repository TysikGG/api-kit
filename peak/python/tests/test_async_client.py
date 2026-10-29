"""Unit tests for the async Peak client."""

import json

import httpx
import pytest
from pytest_httpx import HTTPXMock

from peak import APP_ID, AsyncPeak, AuthenticationError, PeakError, RetryTimeoutError


async def test_async_balance_and_turnstile(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.peak.fo/balance",
        json={"success": True, "data": {"type": "pay_per_solve", "balance": 4}},
    )

    def _solve(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert body["appId"] == APP_ID
        assert body["task_type"] == "turnstiletask"
        assert body["proxy"] == "http://user:pass@1.2.3.4:8080"
        return httpx.Response(200, json={"success": True, "data": {"token": "async-token"}})

    httpx_mock.add_callback(_solve, url="https://api.peak.fo/solve")
    events: list[str] = []
    async with AsyncPeak(
        " pk ",
        on_result=lambda event: events.append(event["task_type"]),
    ) as client:
        balance = await client.get_balance()
        assert balance["balance"] == 4
        token = await client.solve_turnstile(
            "https://example.com/login",
            "0x4",
            proxy="http://user:pass@1.2.3.4:8080",
            action="login",
            on_result=lambda event: events.append("call:" + event["task_type"]),
        )
        assert token["token"] == "async-token"
    assert events == ["call:turnstiletask", "turnstiletask"]


async def test_async_tasks_and_errors(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.peak.fo/solve",
        json={
            "success": True,
            "data": {
                "cookies": {"cf_clearance": "c"},
                "headers": {"user-agent": "ua"},
                "attributes": {"md": "m", "r": "r"},
                "cf_rt": "rt",
            },
        },
    )
    httpx_mock.add_response(
        url="https://api.peak.fo/solve",
        json={"success": True, "data": {"token": "aws"}},
    )
    httpx_mock.add_response(
        url="https://api.peak.fo/balance",
        status_code=401,
        json={"success": False, "error": "unauthorized"},
    )
    httpx_mock.add_response(url="https://api.peak.fo/balance", text="nope")
    httpx_mock.add_exception(httpx.ReadTimeout("slow"))
    httpx_mock.add_exception(httpx.ConnectError("down"))

    async with AsyncPeak("pk") as client:
        waf = await client.solve_cloudflare_waf(
            "https://example.com",
            "http://user:pass@1.2.3.4:8080",
            user_agent="Mozilla/5.0",
            html="<html>",
        )
        assert waf["cf_rt"] == "rt"
        aws = await client.solve_aws_waf(
            "https://app.example.com/",
            "https://sdk.example/a/b",
            {"protocol": "https", "host": "10.0.0.8", "port": 443},
            "App/1.0",
            os="android",
        )
        assert aws["token"] == "aws"
        with pytest.raises(AuthenticationError):
            await client.get_balance()
        with pytest.raises(PeakError, match="non-JSON"):
            await client.get_balance()
        with pytest.raises(PeakError, match="slow"):
            await client.get_balance()
        with pytest.raises(PeakError, match="down"):
            await client.get_balance()


async def test_async_retry_sleeps_between_attempts(httpx_mock: HTTPXMock) -> None:
    calls = {"n": 0}

    def _flaky(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(503, json={"success": False, "error": "no solver"})
        return httpx.Response(
            200, json={"success": True, "data": {"type": "pay_per_solve", "balance": 1}}
        )

    httpx_mock.add_callback(_flaky, url="https://api.peak.fo/balance", is_reusable=True)
    async with AsyncPeak("pk", retries=1, retry_delay=0.01) as client:
        balance = await client.get_balance()
    assert balance["balance"] == 1
    assert calls["n"] == 2


async def test_async_retry_and_closed(httpx_mock: HTTPXMock) -> None:
    calls = {"n": 0}

    def _flaky(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(503, json={"success": False, "error": "no solver capacity"})
        return httpx.Response(200, json={"success": True, "data": {"token": "ok"}})

    httpx_mock.add_callback(_flaky, url="https://api.peak.fo/solve", is_reusable=True)
    async with AsyncPeak("pk", retries=1, retry_delay=0) as client:
        solved = await client.solve({"task_type": "turnstiletask", "appId": "nope"})
        assert solved["token"] == "ok"
    assert calls["n"] == 2

    httpx_mock.add_response(
        url="https://api.peak.fo/balance",
        status_code=503,
        json={"success": False, "error": "down"},
        is_reusable=True,
    )
    async with AsyncPeak("pk", retries=3, retry_delay=0, retry_timeout=0) as client:
        with pytest.raises(RetryTimeoutError):
            await client.get_balance()

    client = AsyncPeak("pk", http_proxy="http://127.0.0.1:8888", base_url="https://example.test/")
    await client.aclose()
    await client.close()
    with pytest.raises(PeakError):
        await client.get_balance()

    with pytest.raises(PeakError, match="API key is required"):
        AsyncPeak(" ")
