"""Unit tests for the CapMonster Cloud Python client."""

import json

import httpx
import pytest
from pytest_httpx import HTTPXMock

from capmonster import (
    DEFAULT_SOFT_ID,
    CapMonster,
    CapMonsterError,
    datadome,
    image_to_text,
    recaptcha_v2,
    tendi,
    turnstile,
)


def test_missing_client_key() -> None:
    with pytest.raises(CapMonsterError, match="Client key is required"):
        CapMonster("")


def test_default_soft_id_is_empty() -> None:
    assert DEFAULT_SOFT_ID == ""


def test_get_balance(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getBalance",
        method="POST",
        json={"errorId": 0, "balance": 345.678},
    )

    with CapMonster("test_key") as client:
        balance = client.get_balance()
        assert balance["balance"] == 345.678


def test_create_task_omits_soft_id(httpx_mock: HTTPXMock) -> None:
    def custom_response(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert body["clientKey"] == "test_key"
        assert "softId" not in body
        assert body["task"]["type"] == "TurnstileTask"
        assert body["task"]["websiteURL"] == "https://example.com"
        assert body["task"]["websiteKey"] == "0x4AAAAAAA"
        return httpx.Response(status_code=200, json={"errorId": 0, "taskId": 7654321})

    httpx_mock.add_callback(
        custom_response,
        url="https://api.capmonster.cloud/createTask",
        method="POST",
    )

    with CapMonster("test_key") as client:
        task_id = client.create_task(
            turnstile("https://example.com", "0x4AAAAAAA"),
        )
        assert task_id == 7654321


def test_create_task_sends_soft_id_when_set(httpx_mock: HTTPXMock) -> None:
    def custom_response(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert body["softId"] == 9988
        assert body["callbackUrl"] == "https://example.com/callback"
        assert body["task"]["type"] == "RecaptchaV2Task"
        return httpx.Response(status_code=200, json={"errorId": 0, "taskId": 42})

    httpx_mock.add_callback(
        custom_response,
        url="https://api.capmonster.cloud/createTask",
        method="POST",
    )

    with CapMonster("test_key", soft_id="9988") as client:
        task_id = client.create_task(
            recaptcha_v2("https://example.com", "site-key"),
            callback_url="https://example.com/callback",
        )
        assert task_id == 42


def test_task_builders() -> None:
    image = image_to_text("aGVsbG8=", capMonsterModule="yandex", case=True)
    assert image["type"] == "ImageToTextTask"
    assert image["case"] is True

    dome = datadome(
        "https://example.com",
        {"captchaUrl": "https://geo.captcha-delivery.com/captcha/", "datadomeCookie": "datadome=1"},
        proxyType="http",
        proxyAddress="1.2.3.4",
        proxyPort=8080,
    )
    assert dome["type"] == "CustomTask"
    assert dome["class"] == "DataDome"

    tencent = tendi("https://example.com", "189123456")
    assert tencent["class"] == "TenDI"


def test_get_task_result(httpx_mock: HTTPXMock) -> None:
    def custom_response(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert body["taskId"] == 7654321
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
        url="https://api.capmonster.cloud/getTaskResult",
        method="POST",
    )

    with CapMonster("test_key") as client:
        res = client.get_task_result(7654321)
        assert res["status"] == "ready"
        assert res["solution"]["gRecaptchaResponse"] == "token_value"


def test_captcha_not_ready(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getTaskResult",
        method="POST",
        json={
            "errorId": 1,
            "errorCode": "CAPTCHA_NOT_READY",
            "errorDescription": "The captcha is not ready yet",
        },
    )

    with CapMonster("test_key") as client:
        res = client.get_task_result(7654321)
        assert res["status"] == "processing"


def test_wait_for_result_polling(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getTaskResult",
        method="POST",
        json={"errorId": 0, "status": "processing"},
    )
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getTaskResult",
        method="POST",
        json={
            "errorId": 0,
            "status": "ready",
            "solution": {"token": "poll_done_token"},
        },
    )

    with CapMonster("test_key") as client:
        solution = client.wait_for_result(7654321, timeout=5.0, interval=0.01)
        assert solution["token"] == "poll_done_token"


def test_invalid_key(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getBalance",
        method="POST",
        json={
            "errorId": 1,
            "errorCode": "ERROR_KEY_DOES_NOT_EXIST",
            "errorDescription": "Account authorization key not found in the system",
        },
    )

    with CapMonster("invalid_key") as client:
        with pytest.raises(CapMonsterError) as exc_info:
            client.get_balance()
        assert exc_info.value.error_id == 1
        assert exc_info.value.error_code == "ERROR_KEY_DOES_NOT_EXIST"
        assert "authorization key" in exc_info.value.message


def test_zero_balance_on_create_task(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/createTask",
        method="POST",
        json={
            "errorId": 1,
            "errorCode": "ERROR_ZERO_BALANCE",
        },
    )

    with CapMonster("test_key") as client:
        with pytest.raises(CapMonsterError) as exc_info:
            client.create_task(recaptcha_v2("https://example.com", "site-key"))
        assert exc_info.value.error_code == "ERROR_ZERO_BALANCE"
        assert "Insufficient funds" in exc_info.value.message


def test_http_500_error(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getBalance",
        method="POST",
        status_code=500,
        text="Internal Server Error",
    )

    with CapMonster("test_key") as client:
        with pytest.raises(CapMonsterError) as exc_info:
            client.get_balance()
        assert exc_info.value.status_code == 500
