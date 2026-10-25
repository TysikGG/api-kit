import json

import httpx
import pytest

from grizzly_sms import GrizzlyPartner, GrizzlySmsError, PartnerStatus


def route(httpx_mock: object, handler) -> None:
    httpx_mock.add_callback(handler, is_reusable=True)  # type: ignore[attr-defined]


def test_blank_partner_key() -> None:
    with pytest.raises(GrizzlySmsError) as exc:
        GrizzlyPartner("  ")
    assert exc.value.code == "NO_KEY"


def test_push_sms_success_and_api_error(httpx_mock: object) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/agent/api/sms"
        body = json.loads(request.content)
        assert body["action"] == "PUSH_SMS"
        assert body["key"] == "qwerty123"
        if body["text"] == "code 5015":
            assert body["smsId"] == 1
            assert body["phone"] == 447472190082
            assert body["phoneFrom"] == "Microsoft"
            return httpx.Response(200, json={"status": "SUCCESS"})
        return httpx.Response(200, json={"status": "ERROR", "error": "busy"})

    route(httpx_mock, handler)
    with GrizzlyPartner("qwerty123") as partner:
        assert partner.push_sms(
            sms_id=1,
            phone=447472190082,
            phone_from="Microsoft",
            text="code 5015",
        ) == PartnerStatus(status="SUCCESS")
        with pytest.raises(GrizzlySmsError) as exc:
            partner.push_sms(
                sms_id=1,
                phone=1,
                phone_from="A",
                text="code",
                retry_delay_ms=0,
            )
    assert exc.value.code == "ERROR"
    assert exc.value.raw == "busy"


def test_push_sms_retries_until_success(httpx_mock: object) -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(200, json={"status": "ERROR", "error": "busy"})
        return httpx.Response(200, json={"status": "SUCCESS"})

    route(httpx_mock, handler)
    with GrizzlyPartner("qwerty123") as partner:
        result = partner.push_sms(
            sms_id=1,
            phone=447472190082,
            phone_from="Microsoft",
            text="code 5015",
            retries=1,
            retry_delay_ms=0,
        )
    assert result == PartnerStatus(status="SUCCESS")
    assert calls["n"] == 2


def test_push_call_success_and_api_error(httpx_mock: object) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert body["action"] == "PUSH_CALL"
        assert body["key"] == "qwerty123"
        assert body["callId"] == 10
        if body["phone"] == 447472190082:
            return httpx.Response(200, json={"status": "SUCCESS"})
        return httpx.Response(200, json={"status": "ERROR", "error": "busy"})

    route(httpx_mock, handler)
    with GrizzlyPartner("qwerty123") as partner:
        assert partner.push_call(
            call_id=10,
            phone=447472190082,
            phone_from="100",
        ) == PartnerStatus(status="SUCCESS")
        with pytest.raises(GrizzlySmsError) as exc:
            partner.push_call(
                call_id=10,
                phone=1,
                phone_from="100",
                retry_delay_ms=0,
            )
    assert exc.value.code == "ERROR"


def test_push_call_record_success_and_api_error(httpx_mock: object) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raw = request.content.decode()
        assert "PUSH_CALL_RECORD" in raw
        assert "qwerty123" in raw
        if "your code is 5015" in raw:
            return httpx.Response(200, json={"status": "SUCCESS"})
        return httpx.Response(200, json={"status": "ERROR", "error": "busy"})

    route(httpx_mock, handler)
    with GrizzlyPartner("qwerty123") as partner:
        assert partner.push_call_record(
            call_id=10,
            phone=447472190082,
            phone_from="100",
            text="your code is 5015",
        ) == PartnerStatus(status="SUCCESS")
        with pytest.raises(GrizzlySmsError) as exc:
            partner.push_call_record(
                call_id=10,
                phone=1,
                phone_from="100",
                text="code",
                retry_delay_ms=0,
            )
    assert exc.value.code == "ERROR"


def test_push_call_record_requires_text_or_file() -> None:
    with GrizzlyPartner("qwerty123") as partner:
        with pytest.raises(GrizzlySmsError) as exc:
            partner.push_call_record(call_id=1, phone=1, phone_from="100")
    assert exc.value.code == "BAD_ACTION"
