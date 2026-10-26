import pytest
from pytest_httpx import HTTPXMock

from capguru import DEFAULT_SOFTGURU, CapGuruClient, CapGuruError


def test_softguru_present(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.cap.guru/in.php?key=test_key&softguru=164125&json=1&method=base64&body=abc",
        method="POST",
        json={"status": 1, "request": "98765"},
    )

    with CapGuruClient(api_key="test_key") as client:
        assert DEFAULT_SOFTGURU == 164125
        task_id = client.create_task({"method": "base64", "body": "abc"})
        assert task_id == "98765"


def test_get_balance(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.cap.guru/res.php?key=test_key&json=1&action=getbalance",
        json={"status": 1, "request": "45.00"},
    )

    with CapGuruClient(api_key="test_key") as client:
        bal = client.get_balance()
        assert bal == 45.00


def test_solvers(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.cap.guru/in.php?key=test_key&softguru=164125&json=1&method=turnstile&sitekey=sk&pageurl=https%3A%2F%2Fexample.com",
        method="POST",
        json={"status": 1, "request": "t_ts"},
    )
    httpx_mock.add_response(
        url="https://api.cap.guru/res.php?key=test_key&json=1&action=get&id=t_ts",
        json={"status": 1, "request": "token_ts"},
    )

    with CapGuruClient(api_key="test_key", default_polling_interval=0.01) as client:
        res = client.solve_turnstile(sitekey="sk", pageurl="https://example.com")
        assert res == "token_ts"


def test_solve_image(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.cap.guru/in.php?key=test_key&softguru=164125&json=1&method=base64&body=b64",
        method="POST",
        json={"status": 1, "request": "t_img"},
    )
    httpx_mock.add_response(
        url="https://api.cap.guru/res.php?key=test_key&json=1&action=get&id=t_img",
        json={"status": 1, "request": "ocr_text"},
    )

    with CapGuruClient(api_key="test_key", default_polling_interval=0.01) as client:
        res = client.solve_image(body="b64")
        assert res == "ocr_text"


def test_solve_recaptcha_v2(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.cap.guru/in.php?key=test_key&softguru=164125&json=1&method=userrecaptcha&googlekey=gk&pageurl=https%3A%2F%2Fexample.com",
        method="POST",
        json={"status": 1, "request": "t_v2"},
    )
    httpx_mock.add_response(
        url="https://api.cap.guru/res.php?key=test_key&json=1&action=get&id=t_v2",
        json={"status": 1, "request": "token_v2"},
    )

    with CapGuruClient(api_key="test_key", default_polling_interval=0.01) as client:
        res = client.solve_recaptcha_v2(googlekey="gk", pageurl="https://example.com")
        assert res == "token_v2"


def test_error_handling(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.cap.guru/res.php?key=test_key&json=1&action=getbalance",
        json={"status": 0, "request": "ERROR_WRONG_USER_KEY"},
    )

    with CapGuruClient(api_key="test_key") as client:
        with pytest.raises(CapGuruError) as exc_info:
            client.get_balance()
        assert exc_info.value.code == "ERROR_WRONG_USER_KEY"


def test_reports(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://api.cap.guru/res.php?key=test_key&json=1&action=reportgood&id=t1",
        json={"status": 1, "request": "OK"},
    )
    httpx_mock.add_response(
        url="https://api.cap.guru/res.php?key=test_key&json=1&action=reportbad&id=t1",
        json={"status": 1, "request": "OK"},
    )

    with CapGuruClient(api_key="test_key") as client:
        assert client.report_good("t1") is True
        assert client.report_bad("t1") is True
