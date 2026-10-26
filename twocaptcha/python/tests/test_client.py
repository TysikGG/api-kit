import pytest
from pytest_httpx import HTTPXMock

from twocaptcha import DEFAULT_SOFT_ID, TwoCaptchaClient, TwoCaptchaError


def test_soft_id_present(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://2captcha.com/in.php?key=test_key&soft_id=5920&json=1&method=base64&body=abc",
        method="POST",
        json={"status": 1, "request": "12345"},
    )

    with TwoCaptchaClient(api_key="test_key") as client:
        assert DEFAULT_SOFT_ID == "5920"
        task_id = client.create_task({"method": "base64", "body": "abc"})
        assert task_id == "12345"


def test_get_balance(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://2captcha.com/res.php?key=test_key&json=1&action=getbalance",
        json={"status": 1, "request": "25.50"},
    )

    with TwoCaptchaClient(api_key="test_key") as client:
        bal = client.get_balance()
        assert bal == 25.50


def test_solvers(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://2captcha.com/in.php?key=test_key&soft_id=5920&json=1&method=turnstile&sitekey=sk&pageurl=https%3A%2F%2Fexample.com",
        method="POST",
        json={"status": 1, "request": "t_ts"},
    )
    httpx_mock.add_response(
        url="https://2captcha.com/res.php?key=test_key&json=1&action=get&id=t_ts",
        json={"status": 1, "request": "token_ts"},
    )

    with TwoCaptchaClient(api_key="test_key", default_polling_interval=0.01) as client:
        res = client.solve_turnstile(sitekey="sk", pageurl="https://example.com")
        assert res == "token_ts"


def test_solve_image(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://2captcha.com/in.php?key=test_key&soft_id=5920&json=1&method=base64&body=b64",
        method="POST",
        json={"status": 1, "request": "t_img"},
    )
    httpx_mock.add_response(
        url="https://2captcha.com/res.php?key=test_key&json=1&action=get&id=t_img",
        json={"status": 1, "request": "ocr_text"},
    )

    with TwoCaptchaClient(api_key="test_key", default_polling_interval=0.01) as client:
        res = client.solve_image(body="b64")
        assert res == "ocr_text"


def test_solve_recaptcha_v2(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://2captcha.com/in.php?key=test_key&soft_id=5920&json=1&method=userrecaptcha&googlekey=gk&pageurl=https%3A%2F%2Fexample.com",
        method="POST",
        json={"status": 1, "request": "t_v2"},
    )
    httpx_mock.add_response(
        url="https://2captcha.com/res.php?key=test_key&json=1&action=get&id=t_v2",
        json={"status": 1, "request": "token_v2"},
    )

    with TwoCaptchaClient(api_key="test_key", default_polling_interval=0.01) as client:
        res = client.solve_recaptcha_v2(googlekey="gk", pageurl="https://example.com")
        assert res == "token_v2"


def test_error_handling(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://2captcha.com/res.php?key=test_key&json=1&action=getbalance",
        json={"status": 0, "request": "ERROR_ZERO_BALANCE"},
    )

    with TwoCaptchaClient(api_key="test_key") as client:
        with pytest.raises(TwoCaptchaError) as exc_info:
            client.get_balance()
        assert exc_info.value.code == "ERROR_ZERO_BALANCE"


def test_reports(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://2captcha.com/res.php?key=test_key&json=1&action=reportgood&id=t1",
        json={"status": 1, "request": "OK"},
    )
    httpx_mock.add_response(
        url="https://2captcha.com/res.php?key=test_key&json=1&action=reportbad&id=t1",
        json={"status": 1, "request": "OK"},
    )

    with TwoCaptchaClient(api_key="test_key") as client:
        assert client.report_good("t1") is True
        assert client.report_bad("t1") is True
