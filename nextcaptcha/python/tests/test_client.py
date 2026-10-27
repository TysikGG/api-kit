"""Unit tests for the NextCaptcha Python client."""

import json

import httpx
import pytest
from pytest_httpx import HTTPXMock

from nextcaptcha import (
    DEFAULT_SOFT_ID,
    NextCaptcha,
    NextCaptchaError,
    funcaptcha,
    hcaptcha,
    recaptcha_v2,
    recaptcha_v2_enterprise,
    recaptcha_v2_hs_enterprise,
    recaptcha_v3_proxyless,
    turnstile_proxyless,
)


def test_missing_client_key() -> None:
    with pytest.raises(NextCaptchaError, match="Client key is required"):
        NextCaptcha("")


def test_default_soft_id() -> None:
    assert DEFAULT_SOFT_ID == "next_softId_b3bdc0a2f7035cc72e1d62d575469f449d"


def test_get_balance(httpx_mock: HTTPXMock) -> None:
    def custom_response(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert body["clientKey"] == "test_key"
        assert "softId" not in body
        return httpx.Response(status_code=200, json={"errorId": 0, "balance": "12.34"})

    httpx_mock.add_callback(
        custom_response,
        url="https://api.nextcaptcha.com/getBalance",
        method="POST",
    )

    with NextCaptcha("test_key") as client:
        balance = client.get_balance()
        assert balance["balance"] == 12.34


def test_create_task_sends_soft_id(httpx_mock: HTTPXMock) -> None:
    def custom_response(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert body["clientKey"] == "test_key"
        assert body["softId"] == DEFAULT_SOFT_ID
        assert "softId" not in body["task"]
        assert body["task"]["type"] == "RecaptchaV2TaskProxyless"
        assert body["task"]["websiteURL"] == "https://example.com"
        assert body["task"]["websiteKey"] == "site-key"
        return httpx.Response(status_code=200, json={"errorId": 0, "taskId": 1781234567890})

    httpx_mock.add_callback(
        custom_response,
        url="https://api.nextcaptcha.com/createTask",
        method="POST",
    )

    with NextCaptcha("test_key") as client:
        task_id = client.create_task(recaptcha_v2("https://example.com", "site-key"))
        assert task_id == 1781234567890


def test_create_task_soft_id_override(httpx_mock: HTTPXMock) -> None:
    def custom_response(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert body["softId"] == "override-soft"
        assert body["callbackUrl"] == "https://example.com/callback"
        assert body["task"]["type"] == "RecaptchaV2EnterpriseTask"
        return httpx.Response(status_code=200, json={"errorId": 0, "taskId": 42})

    httpx_mock.add_callback(
        custom_response,
        url="https://api.nextcaptcha.com/createTask",
        method="POST",
    )

    with NextCaptcha("test_key", soft_id="custom-soft") as client:
        task_id = client.create_task(
            recaptcha_v2_enterprise(
                "https://example.com",
                "site-key",
                proxyType="http",
                proxyAddress="1.2.3.4",
                proxyPort=8080,
            ),
            soft_id="override-soft",
            callback_url="https://example.com/callback",
        )
        assert task_id == 42


def test_empty_soft_id_is_omitted(httpx_mock: HTTPXMock) -> None:
    def custom_response(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert "softId" not in body
        return httpx.Response(status_code=200, json={"errorId": 0, "taskId": 7})

    httpx_mock.add_callback(
        custom_response,
        url="https://api.nextcaptcha.com/createTask",
        method="POST",
    )

    with NextCaptcha("test_key") as client:
        task_id = client.create_task(
            recaptcha_v2("https://example.com", "site-key"),
            soft_id="",
        )
        assert task_id == 7


def test_task_builders() -> None:
    v3 = recaptcha_v3_proxyless("https://example.com", "site-key", pageAction="login")
    assert v3["type"] == "RecaptchaV3TaskProxyless"
    assert v3["pageAction"] == "login"

    hs = recaptcha_v2_hs_enterprise("https://example.com", "site-key")
    assert hs["type"] == "ReCaptchaV2HSEnterpriseTaskProxyLess"

    turnstile = turnstile_proxyless("https://example.com", "0x4AAAAAAA", pagedata="challenge")
    assert turnstile["type"] == "TurnstileTaskProxyless"
    assert turnstile["pagedata"] == "challenge"

    captcha = hcaptcha(
        "https://example.com",
        "site-key",
        proxyType="http",
        proxyAddress="1.2.3.4",
        proxyPort=8080,
    )
    assert captcha["type"] == "HCaptchaTask"

    fun = funcaptcha("public-key", websiteURL="https://example.com")
    assert fun["type"] == "FunCaptchaTaskProxyless"


def test_get_task_result(httpx_mock: HTTPXMock) -> None:
    def custom_response(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert body["taskId"] == 1781234567890
        assert "softId" not in body
        return httpx.Response(
            status_code=200,
            json={
                "errorId": 0,
                "status": "ready",
                "solution": {"gRecaptchaResponse": "token_value"},
            },
        )

    httpx_mock.add_callback(
        custom_response,
        url="https://api.nextcaptcha.com/getTaskResult",
        method="POST",
    )

    with NextCaptcha("test_key") as client:
        res = client.get_task_result(1781234567890)
        assert res["status"] == "ready"
        assert res["solution"]["gRecaptchaResponse"] == "token_value"


def test_processing_status(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.nextcaptcha.com/getTaskResult",
        method="POST",
        json={"errorId": 0, "status": "processing"},
    )

    with NextCaptcha("test_key") as client:
        res = client.get_task_result(1781234567890)
        assert res["status"] == "processing"


def test_wait_for_result_polling(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.nextcaptcha.com/getTaskResult",
        method="POST",
        json={"errorId": 0, "status": "processing"},
    )
    httpx_mock.add_response(
        url="https://api.nextcaptcha.com/getTaskResult",
        method="POST",
        json={
            "errorId": 0,
            "status": "ready",
            "solution": {"token": "poll_done_token"},
        },
    )

    with NextCaptcha("test_key") as client:
        solution = client.wait_for_result(1781234567890, timeout=5.0, interval=0.01)
        assert solution["token"] == "poll_done_token"


def test_solve(httpx_mock: HTTPXMock) -> None:
    def create(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert body["softId"] == DEFAULT_SOFT_ID
        assert body["task"]["type"] == "TurnstileTaskProxyless"
        return httpx.Response(status_code=200, json={"errorId": 0, "taskId": 99})

    httpx_mock.add_callback(create, url="https://api.nextcaptcha.com/createTask", method="POST")
    httpx_mock.add_response(
        url="https://api.nextcaptcha.com/getTaskResult",
        method="POST",
        json={"errorId": 0, "status": "ready", "solution": {"token": "turnstile-token"}},
    )

    with NextCaptcha("test_key") as client:
        solution = client.solve(
            turnstile_proxyless("https://example.com", "0x4AAAAAAA"),
            timeout=5.0,
            interval=0.01,
        )
        assert solution["token"] == "turnstile-token"


def test_get_token(httpx_mock: HTTPXMock) -> None:
    def custom_response(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert body["softId"] == DEFAULT_SOFT_ID
        assert body["task"]["type"] == "RecaptchaV2TaskProxyless"
        return httpx.Response(status_code=200, text="0|03AFcWeA7CFb")

    httpx_mock.add_callback(
        custom_response,
        url="https://api-v2.nextcaptcha.com/getToken",
        method="POST",
    )

    with NextCaptcha("test_key") as client:
        token = client.get_token(recaptcha_v2("https://example.com", "site-key"))
        assert token == "03AFcWeA7CFb"


def test_get_token_failure(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api-v2.nextcaptcha.com/getToken",
        method="POST",
        text="1|The CAPTCHA challenge failed to be resolved.",
    )

    with NextCaptcha("test_key") as client:
        with pytest.raises(NextCaptchaError, match="failed to be resolved"):
            client.get_token(recaptcha_v2("https://example.com", "site-key"))


def test_invalid_key(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.nextcaptcha.com/getBalance",
        method="POST",
        json={
            "errorId": 1,
            "errorCode": "ERROR_KEY_DOES_NOT_EXIST",
            "errorDescription": "Your API key is incorrect",
        },
    )

    with NextCaptcha("invalid_key") as client:
        with pytest.raises(NextCaptchaError) as exc_info:
            client.get_balance()
        assert exc_info.value.error_id == 1
        assert exc_info.value.error_code == "ERROR_KEY_DOES_NOT_EXIST"
        assert "API key" in exc_info.value.message


def test_zero_balance_on_create_task(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.nextcaptcha.com/createTask",
        method="POST",
        json={
            "errorId": 10,
            "errorCode": "ERROR_ZERO_BALANCE",
        },
    )

    with NextCaptcha("test_key") as client:
        with pytest.raises(NextCaptchaError) as exc_info:
            client.create_task(recaptcha_v2("https://example.com", "site-key"))
        assert exc_info.value.error_code == "ERROR_ZERO_BALANCE"
        assert "balance is zero" in exc_info.value.message


def test_http_500_error(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.nextcaptcha.com/getBalance",
        method="POST",
        status_code=500,
        text="Internal Server Error",
    )

    with NextCaptcha("test_key") as client:
        with pytest.raises(NextCaptchaError) as exc_info:
            client.get_balance()
        assert exc_info.value.status_code == 500
