"""Additional unit tests for reports, polling, retries, and errors."""

import httpx
import pytest
from pytest_httpx import HTTPXMock

from capmonster import (
    CAPMONSTER_ERROR_CLASSES,
    CAPMONSTER_ERRORS,
    CapMonster,
    CapMonsterError,
    recaptcha_v2,
)
from capmonster.client import effective_client_key
from capmonster.errors import create_error, describe_error, is_retryable


def test_soft_id_and_task_id_helpers() -> None:
    from capmonster.client import format_soft_id, has_soft_id, normalize_task_id

    assert has_soft_id(None) is False
    assert has_soft_id("  ") is False
    assert has_soft_id("abc") is True
    assert has_soft_id(0) is False
    assert has_soft_id(4) is True
    assert format_soft_id(4) == 4
    assert format_soft_id("15") == 15
    assert format_soft_id("partner") == "partner"
    assert normalize_task_id(None) is None
    assert normalize_task_id("") is None
    assert normalize_task_id(True) is None
    assert normalize_task_id(1.5) is None
    assert normalize_task_id("nope") is None
    assert normalize_task_id(0) is None
    assert normalize_task_id("8") == 8


def test_error_classes() -> None:
    for code, message in CAPMONSTER_ERRORS.items():
        err = create_error(message, 1, code, 200, {"errorId": 1})
        assert isinstance(err, CapMonsterError)
        assert isinstance(err, CAPMONSTER_ERROR_CLASSES[code])
        assert err.error_code == code
    unknown = create_error("custom", 7, "ERROR_UNKNOWN")
    assert type(unknown) is CapMonsterError
    assert describe_error("ERROR_UNKNOWN", None, 7) == "ERROR_UNKNOWN"
    assert describe_error(None, None, 7) == "API error #7"
    assert describe_error(None, "from api", 7) == "from api"
    assert is_retryable(create_error("down", 1, "ERROR_SERVICE_NOT_AVAILABLE"))
    assert is_retryable(create_error("gateway", 0, None, 502))
    assert is_retryable(create_error("network", 0))
    assert not is_retryable(create_error("funds", 1, "ERROR_ZERO_BALANCE"))
    assert not is_retryable(RuntimeError("nope"))
    assert "error_id=1" in repr(create_error("x", 1, "ERROR_ZERO_BALANCE"))


def test_client_key_suffixes_and_soft_id(httpx_mock: HTTPXMock) -> None:
    assert effective_client_key("API_KEY") == "API_KEY"
    assert (
        effective_client_key(
            "API_KEY",
            module_name=" solvemedia ",
            recognizing_threshold=70,
            nocache=True,
        )
        == "API_KEY__solvemedia__recognizingthreshold_70__nocache"
    )

    def custom(request: httpx.Request) -> httpx.Response:
        import json

        body = json.loads(request.content)
        assert body["clientKey"] == "API_KEY__yandex__recognizingthreshold_80__nocache"
        assert body["softId"] == "partner"
        return httpx.Response(200, json={"errorId": 0, "taskId": "15"})

    httpx_mock.add_callback(custom, url="https://api.example.test/createTask", method="POST")
    with CapMonster(
        "API_KEY",
        base_url="https://api.example.test/",
        module_name="yandex",
        recognizing_threshold=80,
        nocache=True,
        soft_id=" partner ",
    ) as client:
        assert client.create_task({"type": "ImageToTextTask", "body": "abc"}) == 15


def test_omits_blank_soft_id(httpx_mock: HTTPXMock) -> None:
    def custom(request: httpx.Request) -> httpx.Response:
        import json

        body = json.loads(request.content)
        assert "softId" not in body
        return httpx.Response(200, json={"errorId": 0, "taskId": 5})

    httpx_mock.add_callback(custom, url="https://api.capmonster.cloud/createTask")
    with CapMonster("API_KEY", soft_id=0) as client:
        assert client.create_task({"type": "ImageToTextTask", "body": "abc"}, soft_id="  ") == 5


def test_user_agent_and_reports(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://capmonster.cloud/api/useragent/actual",
        method="GET",
        text="Mozilla/5.0 Chrome/155\n",
    )
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/reportIncorrectImageCaptcha",
        method="POST",
        json={"errorId": 0, "status": "success"},
    )
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/reportIncorrectTokenCaptcha",
        method="POST",
        json={"errorId": 0, "status": "success"},
    )
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/reportIncorrectRecaptcha",
        method="POST",
        json={"errorId": 0, "status": "success"},
    )
    with CapMonster("API_KEY") as client:
        assert client.get_user_agent() == "Mozilla/5.0 Chrome/155"
        assert client.report_incorrect_image("11") == {"status": "success"}
        assert client.report_incorrect_token(11) == {"status": "success"}
        assert client.report_incorrect_recaptcha(11) == {"status": "success"}


def test_empty_user_agent_and_rejected_report(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(url="https://ua.example.test/actual", method="GET", text="  ")
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/reportIncorrectImageCaptcha",
        json={"errorId": 0, "status": "failed"},
    )
    with CapMonster("API_KEY", user_agent_url="https://ua.example.test/actual") as client:
        with pytest.raises(CapMonsterError, match="Empty user agent") as exc:
            client.get_user_agent()
        assert exc.value.error_code == "EMPTY_USER_AGENT"
        with pytest.raises(CapMonsterError, match="not accepted"):
            client.report_incorrect_image_captcha(4)


def test_solve_polling_and_timeout(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/createTask",
        json={"errorId": 0, "taskId": 3},
    )
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getTaskResult",
        json={"errorId": 1, "errorCode": "CAPTCHA_NOT_READY"},
    )
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getTaskResult",
        json={"errorId": 0, "status": "ready"},
    )
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getTaskResult",
        json={"errorId": 0, "status": "ready", "solution": "token-text"},
    )
    seen: list[str] = []
    with CapMonster("API_KEY") as client:
        solved = client.solve_detailed(
            recaptcha_v2("https://e.com", "k"),
            timeout=5,
            interval=0.01,
            initial_delay=0.01,
            on_poll=lambda update: seen.append(update["status"]),
        )
        assert solved["taskId"] == 3
        assert solved["solution"] == {"value": "token-text"}
        assert seen[0] == "processing"

        httpx_mock.add_response(
            url="https://api.capmonster.cloud/getTaskResult",
            json={"errorId": 0, "status": "processing"},
        )
        with pytest.raises(CapMonsterError) as exc:
            client.wait_for_result(3, timeout=5, interval=0.01, max_attempts=1)
        assert exc.value.error_code == "TIMEOUT"
        with pytest.raises(CapMonsterError) as aborted:
            client.join_task_result(3, timeout=5, interval=0.01, cancel=lambda: True)
        assert aborted.value.error_code == "ABORTED"


def test_invalid_ids_missing_task_and_retries(httpx_mock: HTTPXMock) -> None:
    with CapMonster("API_KEY", retries=1, retry_delay=0) as client:
        with pytest.raises(CapMonsterError) as exc:
            client.get_task_result(0)
        assert exc.value.error_code == "WRONG_CAPTCHA_ID"
        with pytest.raises(CapMonsterError):
            client.report_incorrect_token_captcha(1.5)

        httpx_mock.add_response(
            url="https://api.capmonster.cloud/createTask",
            json={"errorId": 0},
        )
        with pytest.raises(CapMonsterError, match="taskId"):
            client.create_task(recaptcha_v2("https://e.com", "k"))

        httpx_mock.add_response(
            url="https://api.capmonster.cloud/getBalance",
            json={"errorId": 1, "errorCode": "ERROR_SERVICE_NOT_AVAILABLE"},
        )
        httpx_mock.add_response(
            url="https://api.capmonster.cloud/getBalance",
            json={"errorId": 0, "balance": 2},
        )
        assert client.get_balance() == {"balance": 2.0}

        httpx_mock.add_response(
            url="https://api.capmonster.cloud/getBalance",
            status_code=503,
            text="unavailable",
        )
        httpx_mock.add_response(
            url="https://api.capmonster.cloud/getBalance",
            status_code=503,
            text="unavailable",
        )
        with pytest.raises(CapMonsterError) as http_exc:
            client.get_balance()
        assert http_exc.value.status_code == 503


def test_non_json_network_and_injected_client(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getBalance",
        text="not-json",
    )
    with CapMonster("API_KEY") as client:
        with pytest.raises(CapMonsterError, match="non-JSON"):
            client.get_balance()

    httpx_mock.add_exception(httpx.ConnectError("boom"))
    with CapMonster("API_KEY") as client:
        with pytest.raises(CapMonsterError, match="boom"):
            client.get_balance()

    external = httpx.Client(base_url="https://api.capmonster.cloud")
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getBalance",
        json={"errorId": 0},
    )
    client = CapMonster("API_KEY", http_client=external)
    try:
        assert client.get_balance() == {"balance": 0.0}
    finally:
        client.close()
    assert external.is_closed is False
    external.close()


def test_solve_timeout_and_transport(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/createTask",
        json={"errorId": 0, "taskId": 6},
    )
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getTaskResult",
        json={"errorId": 0, "status": "ready", "solution": {"token": "t"}},
    )
    with CapMonster("API_KEY") as client:
        assert client.solve(recaptcha_v2("https://e.com", "k"), timeout=2, interval=0.01) == {
            "token": "t"
        }

    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getTaskResult",
        json={"errorId": 1, "errorCode": "ERROR_CAPTCHA_UNSOLVABLE"},
    )
    with CapMonster("API_KEY") as client:
        with pytest.raises(CapMonsterError) as exc:
            client.get_task_result(6)
        assert exc.value.error_code == "ERROR_CAPTCHA_UNSOLVABLE"

    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getTaskResult",
        json={"errorId": 0, "status": "processing"},
    )
    with CapMonster("API_KEY") as client:
        with pytest.raises(CapMonsterError) as timed_out:
            client.wait_for_result(6, timeout=0, interval=1)
        assert timed_out.value.error_code == "TIMEOUT"

    httpx_mock.add_exception(
        httpx.ConnectError("ua down"),
        url="https://capmonster.cloud/api/useragent/actual",
    )
    with CapMonster("API_KEY") as client:
        with pytest.raises(CapMonsterError, match="ua down"):
            client.get_user_agent()


def test_numeric_error_and_http_error_body(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getBalance",
        json={"errorId": 4},
    )
    with CapMonster("API_KEY") as client:
        with pytest.raises(CapMonsterError, match="API error #4"):
            client.get_balance()

    httpx_mock.add_response(
        url="https://capmonster.cloud/api/useragent/actual",
        method="GET",
        status_code=500,
        json={"errorId": 1, "errorCode": "ERROR_SERVICE_NOT_AVAILABLE"},
    )
    with CapMonster("API_KEY") as client:
        with pytest.raises(CapMonsterError, match="temporarily unavailable"):
            client.get_user_agent()
