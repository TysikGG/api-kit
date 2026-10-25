"""Unit tests for the SV Number Python client."""

from typing import Any

import pytest
from pytest_httpx import HTTPXMock

from sv_number import REF_KEY, SvNumber, SvNumberError


def test_missing_api_key() -> None:
    with pytest.raises(SvNumberError, match="API key is required"):
        SvNumber("")


def test_get_balance_decimal(httpx_mock: HTTPXMock) -> None:
    def callback(request: Any) -> Any:
        assert request.url.params.get("ref_key") == REF_KEY
        assert request.url.params.get("action") == "getBalance"
        return httpx_mock.Response(status_code=200, text="18.25")

    httpx_mock.add_response(
        url="https://sms-verification-number.com/stubs/handler_api?api_key=test_key&ref_key=226&lang=en&action=getBalance",
        method="GET",
        text="18.25",
    )

    with SvNumber("test_key") as client:
        balance = client.get_balance()
        assert balance == 18.25


def test_get_balance_access_prefix(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://sms-verification-number.com/stubs/handler_api?api_key=test_key&ref_key=226&lang=en&action=getBalance",
        method="GET",
        text="ACCESS_BALANCE:25.50",
    )

    with SvNumber("test_key") as client:
        balance = client.get_balance()
        assert balance == 25.50


def test_get_number_embeds_ref_key(httpx_mock: HTTPXMock) -> None:
    def callback(request: Any) -> Any:
        assert request.url.params.get("ref_key") == REF_KEY
        assert request.url.params.get("service") == "wa"
        assert request.url.params.get("country") == "0"
        return httpx_mock.Response(status_code=200, text="ACCESS_NUMBER:9988:1234567890")

    httpx_mock.add_response(
        url="https://sms-verification-number.com/stubs/handler_api?api_key=test_key&ref_key=226&lang=en&action=getNumber&service=wa&country=0",
        method="GET",
        text="ACCESS_NUMBER:9988:1234567890",
    )

    with SvNumber("test_key") as client:
        order = client.get_number("wa", country=0)
        assert order["activation_id"] == "9988"
        assert order["phone_number"] == "1234567890"


def test_get_status(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://sms-verification-number.com/stubs/handler_api?api_key=test_key&ref_key=226&lang=en&action=getStatus&id=9988",
        method="GET",
        text="STATUS_OK:445566",
    )

    with SvNumber("test_key") as client:
        status = client.get_status("9988")
        assert status["status"] == "STATUS_OK"
        assert status["code"] == "445566"


def test_wait_for_code(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://sms-verification-number.com/stubs/handler_api?api_key=test_key&ref_key=226&lang=en&action=getStatus&id=9988",
        method="GET",
        text="STATUS_WAIT_CODE",
    )
    httpx_mock.add_response(
        url="https://sms-verification-number.com/stubs/handler_api?api_key=test_key&ref_key=226&lang=en&action=getStatus&id=9988",
        method="GET",
        text="STATUS_OK:778899",
    )

    with SvNumber("test_key") as client:
        code = client.wait_for_code("9988", timeout=5.0, interval=0.01)
        assert code == "778899"


def test_api_error_raised(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://sms-verification-number.com/stubs/handler_api?api_key=test_key&ref_key=226&lang=en&action=getNumber&service=tg&country=0",
        method="GET",
        text="NO_NUMBERS",
    )

    with SvNumber("test_key") as client:
        with pytest.raises(SvNumberError) as exc_info:
            client.get_number("tg")
        assert exc_info.value.code == "NO_NUMBERS"
