"""Unit tests for the SolveCaptchaClient."""

import httpx
import pytest
from pytest_httpx import HTTPXMock

from solvecaptcha import SolveCaptchaClient, SolveCaptchaError


def test_init_validation() -> None:
    with pytest.raises(SolveCaptchaError):
        SolveCaptchaClient(api_key="")


def test_get_balance(httpx_mock: HTTPXMock) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        url_str = str(request.url)
        assert "action=getbalance" in url_str
        assert "key=test_key" in url_str
        return httpx.Response(status_code=200, json={"status": 1, "request": "25.50"})

    httpx_mock.add_callback(handler)

    client = SolveCaptchaClient(api_key="test_key")
    balance = client.get_balance()
    assert balance == 25.50


def test_get_balance_error(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"status": 0, "request": "ERROR_WRONG_USER_KEY"})

    client = SolveCaptchaClient(api_key="bad_key")
    with pytest.raises(SolveCaptchaError) as exc_info:
        client.get_balance()
    assert exc_info.value.code == "ERROR_WRONG_USER_KEY"


def test_create_task_with_soft_id(httpx_mock: HTTPXMock) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        url_str = str(request.url)
        assert "soft_id=7788" in url_str
        assert "method=base64" in url_str
        return httpx.Response(status_code=200, json={"status": 1, "request": "task_112233"})

    httpx_mock.add_callback(handler)

    client = SolveCaptchaClient(api_key="test_key", soft_id="7788")
    task_id = client.create_task({"method": "base64", "body": "data"})
    assert task_id == "task_112233"


def test_get_task_result_not_ready(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"status": 0, "request": "CAPCHA_NOT_READY"})

    client = SolveCaptchaClient(api_key="test_key")
    res = client.get_task_result("task_112233")
    assert res is None


def test_get_task_result_ready(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"status": 1, "request": "solved_text_value"})

    client = SolveCaptchaClient(api_key="test_key")
    res = client.get_task_result("task_112233")
    assert res == "solved_text_value"


def test_solve_image(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"status": 1, "request": "task_img"})
    httpx_mock.add_response(json={"status": 1, "request": "image_result"})

    client = SolveCaptchaClient(
        api_key="test_key", default_polling_interval=0.01, default_polling_timeout=0.1
    )
    ans = client.solve_image(body="base64data")
    assert ans == "image_result"


def test_solve_text(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"status": 1, "request": "task_txt"})
    httpx_mock.add_response(json={"status": 1, "request": "friday"})

    client = SolveCaptchaClient(
        api_key="test_key", default_polling_interval=0.01, default_polling_timeout=0.1
    )
    ans = client.solve_text("What day is it?")
    assert ans == "friday"


def test_solve_recaptcha_v2(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"status": 1, "request": "task_recaptcha"})
    httpx_mock.add_response(json={"status": 1, "request": "recaptcha_token"})

    client = SolveCaptchaClient(
        api_key="test_key", default_polling_interval=0.01, default_polling_timeout=0.1
    )
    token = client.solve_recaptcha_v2(googlekey="key123", pageurl="https://site.com")
    assert token == "recaptcha_token"


def test_solve_turnstile(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"status": 1, "request": "task_turnstile"})
    httpx_mock.add_response(json={"status": 1, "request": "turnstile_token"})

    client = SolveCaptchaClient(
        api_key="test_key", default_polling_interval=0.01, default_polling_timeout=0.1
    )
    token = client.solve_turnstile(sitekey="key123", pageurl="https://site.com")
    assert token == "turnstile_token"


def test_reports(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"status": 1, "request": "OK_REPORT_RECORDED"})
    httpx_mock.add_response(json={"status": 1, "request": "OK_REPORT_RECORDED"})

    client = SolveCaptchaClient(api_key="test_key")
    assert client.report_good("task_123") is True
    assert client.report_bad("task_123") is True
