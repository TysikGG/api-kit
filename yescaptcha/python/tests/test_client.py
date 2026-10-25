"""Unit tests for the YesCaptcha Python client."""

import json
from typing import Any

import httpx
import pytest
from pytest_httpx import HTTPXMock

from yescaptcha import SOFT_ID, YesCaptcha, YesCaptchaError


def test_missing_client_key() -> None:
    with pytest.raises(YesCaptchaError, match="Client key is required"):
        YesCaptcha("")


def test_get_balance(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.yescaptcha.com/getBalance",
        method="POST",
        json={
            "errorId": 0,
            "balance": 1500.0,
            "softBalance": 30.0,
            "inviteBalance": 15.0,
            "inviteBy": 999,
        },
    )

    with YesCaptcha("test_key") as client:
        balance = client.get_balance()
        assert balance["balance"] == 1500.0
        assert balance["softBalance"] == 30.0
        assert balance["inviteBalance"] == 15.0
        assert balance["inviteBy"] == 999


def test_create_task_embeds_soft_id(httpx_mock: HTTPXMock) -> None:
    def custom_response(request: Any) -> Any:
        body = json.loads(request.content)
        assert body["clientKey"] == "test_key"
        assert body["softID"] == SOFT_ID
        assert body["task"]["type"] == "TurnstileTaskProxyless"
        assert body["task"]["websiteURL"] == "https://example.com"

        return httpx.Response(
            status_code=200,
            json={
                "errorId": 0,
                "taskId": "task_xyz_456",
            },
        )

    httpx_mock.add_callback(
        custom_response,
        url="https://api.yescaptcha.com/createTask",
        method="POST",
    )

    with YesCaptcha("test_key") as client:
        task_id = client.create_task({
            "type": "TurnstileTaskProxyless",
            "websiteURL": "https://example.com",
        })
        assert task_id == "task_xyz_456"


def test_get_task_result(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.yescaptcha.com/getTaskResult",
        method="POST",
        json={
            "errorId": 0,
            "status": "ready",
            "solution": {"token": "0.solution_token"},
        },
    )

    with YesCaptcha("test_key") as client:
        res = client.get_task_result("task_xyz_456")
        assert res["status"] == "ready"
        assert res["solution"]["token"] == "0.solution_token"


def test_wait_for_result_polling(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.yescaptcha.com/getTaskResult",
        method="POST",
        json={"errorId": 0, "status": "processing"},
    )
    httpx_mock.add_response(
        url="https://api.yescaptcha.com/getTaskResult",
        method="POST",
        json={
            "errorId": 0,
            "status": "ready",
            "solution": {"token": "poll_done_token"},
        },
    )

    with YesCaptcha("test_key") as client:
        solution = client.wait_for_result("task_xyz_456", timeout=5.0, interval=0.01)
        assert solution["token"] == "poll_done_token"


def test_api_error_response(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.yescaptcha.com/getBalance",
        method="POST",
        json={
            "errorId": 1,
            "errorCode": "ERROR_KEY_DOES_NOT_EXIST",
            "errorDescription": "Client key does not exist",
        },
    )

    with YesCaptcha("invalid_key") as client:
        with pytest.raises(YesCaptchaError) as exc_info:
            client.get_balance()
        assert exc_info.value.error_id == 1
        assert exc_info.value.error_code == "ERROR_KEY_DOES_NOT_EXIST"
        assert "Client key does not exist" in exc_info.value.message


def test_http_500_error(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.yescaptcha.com/getBalance",
        method="POST",
        status_code=500,
        text="Internal Server Error",
    )

    with YesCaptcha("test_key") as client:
        with pytest.raises(YesCaptchaError) as exc_info:
            client.get_balance()
        assert exc_info.value.status_code == 500
