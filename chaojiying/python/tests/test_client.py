import base64
import urllib.parse

import httpx
import pytest
from pytest_httpx import HTTPXMock

from chaojiying import SOFT_ID, SOFT_KEY, Chaojiying, ChaojiyingError


def test_constants():
    assert SOFT_ID == "984642"
    assert SOFT_KEY == "369fe52d5cdbb147892a40ac78f13e60"


def test_missing_credentials():
    with pytest.raises(ChaojiyingError):
        Chaojiying(username="", password="")
    with pytest.raises(ChaojiyingError):
        Chaojiying(username="user", password="")


def test_get_score(httpx_mock: HTTPXMock):
    captured_data = {}

    def handler(request: httpx.Request):
        nonlocal captured_data
        body = request.read().decode("utf-8")
        captured_data = dict(urllib.parse.parse_qsl(body))
        return httpx.Response(
            status_code=200,
            json={"err_no": 0, "err_str": "OK", "tifen": 5000, "tifen_lock": 0},
        )

    httpx_mock.add_callback(handler)

    client = Chaojiying(username="my_user", password="my_password")
    score = client.get_score()

    assert score["err_no"] == 0
    assert score["tifen"] == 5000
    assert captured_data.get("user") == "my_user"
    assert len(captured_data.get("pass2", "")) == 32


def test_recognize_sends_softid(httpx_mock: HTTPXMock):
    captured_data = {}

    def handler(request: httpx.Request):
        nonlocal captured_data
        body = request.read().decode("utf-8")
        captured_data = dict(urllib.parse.parse_qsl(body))
        return httpx.Response(
            status_code=200,
            json={
                "err_no": 0,
                "err_str": "OK",
                "pic_id": "9160109360600112681",
                "pic_str": "8vka",
                "md5": "35d5c7f6f53223fbdc5b72783db0c2c0",
            },
        )

    httpx_mock.add_callback(handler)

    client = Chaojiying(username="my_user", password="my_password")
    fake_bytes = b"fake-captcha-image-data"
    res = client.recognize(fake_bytes, code_type=1004, str_debug="custom_instruction")

    assert res["err_no"] == 0
    assert res["pic_str"] == "8vka"
    assert captured_data.get("softid") == "984642"
    assert captured_data.get("codetype") == "1004"
    assert captured_data.get("str_debug") == "custom_instruction"
    assert captured_data.get("file_base64") == base64.b64encode(fake_bytes).decode("ascii")


def test_report_error(httpx_mock: HTTPXMock):
    captured_data = {}

    def handler(request: httpx.Request):
        nonlocal captured_data
        body = request.read().decode("utf-8")
        captured_data = dict(urllib.parse.parse_qsl(body))
        return httpx.Response(
            status_code=200,
            json={"err_no": 0, "err_str": "OK"},
        )

    httpx_mock.add_callback(handler)

    client = Chaojiying(username="my_user", password="my_password")
    res = client.report_error("pic_123")

    assert res["err_no"] == 0
    assert captured_data.get("softid") == "984642"
    assert captured_data.get("id") == "pic_123"


def test_api_error_raised(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://upload.chaojiying.net/Upload/GetScore.php",
        status_code=200,
        json={"err_no": -1001, "err_str": "用户参数异常"},
    )

    client = Chaojiying(username="my_user", password="my_password")
    with pytest.raises(ChaojiyingError) as exc_info:
        client.get_score()

    assert exc_info.value.err_no == -1001
    assert "用户参数异常" in exc_info.value.err_str
