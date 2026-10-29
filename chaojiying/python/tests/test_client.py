import base64
import hashlib
import json
import math
import urllib.parse
from io import BytesIO
from pathlib import Path

import httpx
import pytest
from pytest_httpx import HTTPXMock

from chaojiying import (
    CODE_TYPES,
    ERROR_CODES,
    SOFT_ID,
    SOFT_KEY,
    Chaojiying,
    ChaojiyingAPIError,
    ChaojiyingError,
    CodeType,
    ColorChannel,
    FreeModel,
    ImageTooLargeError,
    InsufficientPointsError,
    MalformedBase64Error,
    MissingCredentialsError,
    NetworkError,
    RateLimitError,
    ResponseIntegrityError,
    ScoreResult,
    click_instruction,
    color_instruction,
    compute_response_md5,
    create_api_error,
    describe_code_type,
    describe_error_code,
    horizontal_distance,
    parse_plates,
    parse_points,
    parse_rectangles,
    parse_text_locations,
    resolve_free_model,
    result_shape,
    verify_response_md5,
)

OK = {
    "err_no": 0,
    "err_str": "OK",
    "pic_id": "9160109360600112681",
    "pic_str": "8vka",
    "md5": "35d5c7f6f53223fbdc5b72783db0c2c0",
}


def _client(**kwargs: object) -> Chaojiying:
    options = {"username": "my_user", "password": "my_password", "retries": 0, "retry_delay": 0}
    options.update(kwargs)
    return Chaojiying(**options)  # type: ignore[arg-type]


def _body(request: httpx.Request) -> dict[str, str]:
    return dict(urllib.parse.parse_qsl(request.read().decode("utf-8")))


def test_constants():
    assert SOFT_ID == "984642"
    assert SOFT_KEY == "369fe52d5cdbb147892a40ac78f13e60"


def test_missing_credentials():
    with pytest.raises(MissingCredentialsError):
        Chaojiying(username="", password="")
    with pytest.raises(ChaojiyingError, match="password is required"):
        Chaojiying(username="user", password="")


def test_env_and_md5_password(monkeypatch: pytest.MonkeyPatch, httpx_mock: HTTPXMock):
    monkeypatch.setenv("CHAOJIYING_USER", "env_user")
    monkeypatch.setenv("CHAOJIYING_PASS", "E10ADC3949BA59ABBE56E057F20F883E")
    monkeypatch.setenv("CHAOJIYING_ACCESS_TOKEN", "tok-1")
    captured: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured.update(_body(request))
        return httpx.Response(200, json={"err_no": 0, "err_str": "OK", "tifen": "15", "tifen_lock": "2"})

    httpx_mock.add_callback(handler, is_reusable=True)
    with Chaojiying(retries=0) as client:
        score = client.get_balance()
    assert score.tifen == 15
    assert score["tifen_lock"] == 2
    assert captured["user"] == "env_user"
    assert captured["pass2"] == "e10adc3949ba59abbe56e057f20f883e"
    assert captured["access_token"] == "tok-1"


def test_access_token_only(httpx_mock: HTTPXMock):
    captured: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured.update(_body(request))
        return httpx.Response(200, json={"err_no": 0, "err_str": "OK", "tifen": 3})

    httpx_mock.add_callback(handler, is_reusable=True)
    score = Chaojiying(access_token="only-token", retries=0).get_score()
    assert "user" not in captured
    assert captured["access_token"] == "only-token"
    assert score.tifen_lock == 0


def test_get_score(httpx_mock: HTTPXMock):
    captured: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured.update(_body(request))
        assert request.url.host == "upload.example"
        assert request.headers["user-agent"] == "test-agent"
        return httpx.Response(200, json={"err_no": 0, "err_str": "OK", "tifen": 5000, "tifen_lock": 0})

    httpx_mock.add_callback(handler, is_reusable=True)
    client = _client(base_url="https://upload.example/", user_agent="test-agent", proxy="http://127.0.0.1:9")
    score = client.get_score()
    assert score["err_no"] == 0
    assert score["tifen"] == 5000
    assert captured["user"] == "my_user"
    assert len(captured["pass2"]) == 32
    assert "softid" not in captured
    assert client.proxy == "http://127.0.0.1:9"
    client.close()


def test_recognize_sends_softid(httpx_mock: HTTPXMock):
    captured: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured.update(_body(request))
        return httpx.Response(200, json=OK)

    httpx_mock.add_callback(handler, is_reusable=True)
    client = _client()
    fake = b"fake-captcha-image-data"
    res = client.recognize(fake, code_type=1004, str_debug="custom_instruction", len_min=4, time_add=10)
    assert res["pic_str"] == "8vka"
    assert res.pic_id == OK["pic_id"]
    assert captured["softid"] == "984642"
    assert captured["codetype"] == "1004"
    assert captured["str_debug"] == "custom_instruction"
    assert captured["len_min"] == "4"
    assert captured["time_add"] == "10"
    assert captured["file_base64"] == base64.b64encode(fake).decode("ascii")
    client.close()


def test_image_variants_and_aliases(httpx_mock: HTTPXMock):
    bodies: list[dict[str, str]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.headers["content-type"].startswith("application/json"):
            bodies.append(json.loads(request.read().decode()))
        elif request.headers["content-type"].startswith("multipart/"):
            bodies.append({"multipart": request.read().decode("latin1")})
        else:
            bodies.append(_body(request))
        return httpx.Response(200, json={"err_no": "0", "err_str": "OK", "pic_id": 99, "pic_str": "12,34|56,78"})

    httpx_mock.add_callback(handler, is_reusable=True)
    raw = "iVBORw0KGgoAAAANSUhEUg=="
    client = _client()
    result = client.recognize(f"data:image/png;base64,{raw}", CodeType.ALNUM_4_TO_6)
    assert bodies[0]["file_base64"] == raw
    assert result.pic_id == "99"
    client.post_pic_base64(raw[:8] + "\n" + raw[8:], "1902")
    assert bodies[1]["file_base64"] == raw
    client.recognize(BytesIO(b"img-bytes"), 1004)
    client.recognize(bytearray(b"img-bytes"), 1004)
    assert bodies[2]["file_base64"] == base64.b64encode(b"img-bytes").decode()
    custom = _client(soft_id="cust", soft_key="key")
    parsed = custom.recognize(b"img", 9004, body_format="json", len_min=0)
    assert parsed.points[0] == {"x": 12.0, "y": 34.0}
    assert bodies[-1]["softid"] == "cust"
    multi = client.post_pic(b"img", CodeType.BLOCKS, filename="gap.png")
    assert "userfile" in bodies[-1]["multipart"]
    assert "file_base64" not in bodies[-1]["multipart"]
    assert "rectangles" not in multi
    client.close()
    custom.close()


def test_shapes_and_md5(httpx_mock: HTTPXMock):
    httpx_mock.add_response(json={"err_no": 0, "err_str": "OK", "pic_id": "p", "pic_str": r"\u67e5,10,20|找,3,4"})
    httpx_mock.add_response(
        json={
            "err_no": 0,
            "err_str": "OK",
            "pic_id": "p2",
            "pic_str": "冀AB65883,0.9995,green,482,305,579,339",
        }
    )
    httpx_mock.add_response(json={"err_no": 0, "err_str": "OK", "pic_id": "p3", "pic_str": "not-coords"})
    pic = {"err_no": 0, "err_str": "OK", "pic_id": "pic", "pic_str": "abcd"}
    digest = compute_response_md5(SOFT_ID, SOFT_KEY, "pic", "abcd")
    httpx_mock.add_response(json={**pic, "md5": digest})
    httpx_mock.add_response(json={**pic, "md5": "deadbeef"})
    httpx_mock.add_response(json=pic)
    httpx_mock.add_response(json={**pic, "md5": digest})

    client = _client()
    text = client.recognize(b"a", CodeType.LOCATE_ALL_TEXT)
    assert text.text_locations[0]["text"] == "查"
    plates = client.recognize(b"a", CodeType.LICENSE_PLATE)
    assert plates.plates[0]["number"] == "冀AB65883"
    broken = client.recognize(b"a", CodeType.CLICK_1_TO_4)
    assert broken.pic_str == "not-coords"
    assert "points" not in broken
    assert client.recognize(b"a", 1004, verify_md5=True).pic_str == "abcd"
    with pytest.raises(ResponseIntegrityError):
        client.recognize(b"a", 1004, verify_md5=True)
    with pytest.raises(ResponseIntegrityError, match="did not include"):
        client.recognize(b"a", 1004, verify_md5=True)
    client.close()
    custom = _client(soft_id="other")
    with pytest.raises(ResponseIntegrityError, match="soft_key"):
        custom.recognize(b"a", 1004, verify_md5=True)
    custom.close()
    assert verify_response_md5({"pic_id": "pic", "pic_str": "abcd"}, SOFT_ID, SOFT_KEY) is False


def test_file_and_local_validation(tmp_path: Path, httpx_mock: HTTPXMock):
    image = tmp_path / "cap.bin"
    image.write_bytes(b"file-bytes")
    httpx_mock.add_response(json=OK)
    client = _client()
    assert client.recognize_file(str(image), 1004)["pic_str"] == "8vka"
    with pytest.raises(ChaojiyingError):
        client.recognize(b"", 1004)
    with pytest.raises(ChaojiyingError):
        client.recognize("", 1004)
    with pytest.raises(MalformedBase64Error):
        client.recognize("!!!!", 1004)
    with pytest.raises(ImageTooLargeError):
        client.recognize(b"x" * (1024 * 1024 + 1), 1004)
    with pytest.raises(ChaojiyingError, match="codetype"):
        client.recognize(b"a", "")
    with pytest.raises(ChaojiyingError, match="codetype"):
        client.recognize(b"a", math.nan)
    with pytest.raises(ChaojiyingError, match="pic_id"):
        client.report_error("")
    with pytest.raises(ChaojiyingError, match="bytes"):
        client.recognize(123, 1004)  # type: ignore[arg-type]
    client.close()


def test_report_error(httpx_mock: HTTPXMock):
    captured: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured.update(_body(request))
        return httpx.Response(200, json={"err_no": 0, "err_str": "OK"})

    httpx_mock.add_callback(handler, is_reusable=True)
    client = _client()
    res = client.report("pic_123")
    assert res["err_no"] == 0
    assert captured["softid"] == "984642"
    assert captured["id"] == "pic_123"
    client.close()


def test_error_catalog_and_no_retry(httpx_mock: HTTPXMock):
    for info in ERROR_CODES:
        err = create_api_error(info["err_no"], None, {"err_no": info["err_no"]})
        assert isinstance(err, info["type"])
        assert err.err_str == info["err_str"]
        assert describe_error_code(info["err_no"])["remedy"] == info["remedy"]
        assert info["err_no"] < 0
    assert isinstance(create_api_error(-9999, "nope"), ChaojiyingAPIError)
    assert describe_error_code(0) is None
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(200, json={"err_no": -1005, "err_str": "无可用题分"})

    httpx_mock.add_callback(handler, is_reusable=True)
    client = _client(retries=3)
    with pytest.raises(InsufficientPointsError) as exc_info:
        client.get_score()
    assert exc_info.value.err_no == -1005
    assert "用户" not in (exc_info.value.err_str or "") or "题分" in exc_info.value.err_str
    assert calls["n"] == 1
    assert str(exc_info.value).startswith("[-1005]")
    client.close()


def test_retries(httpx_mock: HTTPXMock):
    state = {"score": 0, "proc": 0, "safe": 0}

    def score(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("GetScore.php"):
            state["score"] += 1
            if state["score"] == 1:
                return httpx.Response(200, json={"err_no": -429, "err_str": "请求过于频繁"})
            return httpx.Response(200, json={"err_no": 0, "err_str": "OK", "tifen": 9, "tifen_lock": 1})
        state["proc"] += 1
        return httpx.Response(500, text="upstream")

    httpx_mock.add_callback(score, is_reusable=True)
    client = _client(retries=2, retry_delay=0.001)
    assert client.get_score().tifen == 9
    with pytest.raises(NetworkError):
        client.recognize(b"a", 1004)
        assert state["proc"] == 1
        client.close()


def test_retries_server_error(httpx_mock: HTTPXMock):
    state = {"safe": 0}

    def safe(request: httpx.Request) -> httpx.Response:
        state["safe"] += 1
        if state["safe"] < 2:
            return httpx.Response(503, text="busy")
        return httpx.Response(200, json={"err_no": 0, "err_str": "OK", "tifen": 1, "tifen_lock": 0})

    httpx_mock.add_callback(safe, is_reusable=True)
    again = _client(retries=2)
    assert again.get_score()["tifen"] == 1
    assert state["safe"] == 2
    again.close()


def test_transport_errors(httpx_mock: HTTPXMock):
    httpx_mock.add_exception(httpx.ConnectError("refused"))
    httpx_mock.add_response(json={"err_no": 0, "err_str": "OK", "tifen": 4, "tifen_lock": 0})
    client = _client(retries=1)
    assert client.get_score().tifen == 4
    client.close()

    httpx_mock.add_exception(httpx.ConnectError("refused"))
    paid = _client(retries=0)
    with pytest.raises(NetworkError) as conn:
        paid.get_score()
    assert conn.value.connect_failure is True
    paid.close()

    httpx_mock.add_exception(httpx.ReadTimeout("slow"))
    timed = _client(retries=3)
    with pytest.raises(ChaojiyingError):
        timed.recognize(b"a", 1004)
    timed.close()

    httpx_mock.add_exception(httpx.ReadTimeout("slow"))
    httpx_mock.add_response(json={"err_no": 0, "err_str": "OK", "tifen": 8, "tifen_lock": 0})
    patient = _client(retries=1, retry_delay=0)
    assert patient.get_score().tifen == 8
    patient.close()


def test_bad_payloads(httpx_mock: HTTPXMock):
    client = _client()
    httpx_mock.add_response(json={"err_str": "OK"})
    with pytest.raises(ChaojiyingError, match="err_no"):
        client.get_score()
    httpx_mock.add_response(200, text="nope")
    with pytest.raises(ChaojiyingError, match="non-JSON"):
        client.get_score()
    httpx_mock.add_response(200, json=[1, 2])
    with pytest.raises(ChaojiyingError, match="non-JSON"):
        client.get_score()
    httpx_mock.add_response(429, text="slow")
    with pytest.raises(RateLimitError):
        client.get_score()
    httpx_mock.add_response(400, json={"oops": True})
    with pytest.raises(NetworkError):
        client.get_score()
    httpx_mock.add_response(200, json={"err_no": 0, "pic_str": 12, "pic_id": None})
    odd = client.recognize(b"a", 6001)
    assert odd.pic_str == "12"
    assert odd.pic_id == ""
    httpx_mock.add_response(200, json={"err_no": 0, "err_str": False, "tifen": {"bad": True}})
    with pytest.raises(ChaojiyingError, match="Expected a number"):
        client.get_score()
    httpx_mock.add_response(200, json={"err_no": 0, "err_str": False, "tifen": 1, "tifen_lock": 0})
    assert client.get_score().err_str == "False"
    httpx_mock.add_response(408, text="")
    with pytest.raises(NetworkError):
        client.recognize(b"a", 1004)
    httpx_mock.add_response(200, json={"err_no": 0, "err_str": "OK", "pic_id": "z", "pic_str": ""})
    assert client.recognize(b"a", 1004).pic_str == ""
    httpx_mock.add_response(200, json={"err_no": 0, "err_str": "OK", "tifen": "1.5", "tifen_lock": 0})
    assert client.get_score().tifen == 1.5
    httpx_mock.add_response(200, json={"err_no": 0, "err_str": "OK", "tifen": "2.0", "tifen_lock": 0})
    assert client.get_score().tifen == 2
    httpx_mock.add_response(200, json={"err_no": 0, "err_str": "OK", "tifen": "  ", "tifen_lock": 0})
    with pytest.raises(ChaojiyingError, match="Expected a number"):
        client.get_score()
    httpx_mock.add_response(200, json={"err_no": 0, "err_str": "OK", "tifen": "nope", "tifen_lock": 0})
    with pytest.raises(ChaojiyingError, match="Expected a number"):
        client.get_score()
    httpx_mock.add_response(200, json={"err_no": 0, "err_str": "OK", "tifen": "nan", "tifen_lock": 0})
    with pytest.raises(ChaojiyingError, match="Expected a number"):
        client.get_score()
    httpx_mock.add_response(200, json={"err_no": 0, "err_str": "OK", "tifen": "1e309", "tifen_lock": 0})
    with pytest.raises(ChaojiyingError, match="Expected a number"):
        client.get_score()
    httpx_mock.add_response(200, json={"err_no": -1004, "err_str": 5})
    with pytest.raises(ChaojiyingError):
        client.get_score()
    client.close()


def test_free_ocr(httpx_mock: HTTPXMock):
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["ak"] in {"key-9", "only-key"}
        if request.url.path.endswith("/9"):
            return httpx.Response(200, json={"err_no": 0, "err_str": "OK", "pic_id": "f", "pic_str": "1,2,3,4"})
        return httpx.Response(200, json={"err_no": 0, "err_str": "OK", "pic_id": "f", "pic_str": "42"})

    httpx_mock.add_callback(handler, is_reusable=True)
    client = _client(api_key="key-9", free_base_url="https://free.example/")
    assert client.recognize_free(b"a", FreeModel.TEXT).pic_str == "42"
    assert client.recognize_free("aGVsbG8=", "calc").pic_str == "42"
    blocks = client.recognize_free(b"abcd", "blocks", upload="multipart")
    assert blocks.rectangles[0]["x2"] == 3
    with pytest.raises(ChaojiyingError, match="Unknown free"):
        client.recognize_free(b"a", "nope")
    with pytest.raises(ImageTooLargeError):
        client.recognize_free(b"x" * (2 * 1024 * 1024 + 1), 8)
    client.close()
    bare = _client()
    with pytest.raises(MissingCredentialsError):
        bare.recognize_free(b"a", 8)
    bare.close()
    key_only = Chaojiying(api_key="only-key", retries=0)
    assert key_only.recognize_free(b"b", "ocr").pic_str == "42"
    key_only.close()


@pytest.mark.httpx_mock(assert_all_requests_were_expected=False)
def test_missing_mock_is_not_retried_as_timeout(httpx_mock: HTTPXMock):
    client = _client(retries=3)
    with pytest.raises(httpx.TimeoutException, match="No response can be found"):
        client.get_score()
    client.close()


def test_catalog_and_parsers():
    assert len(CODE_TYPES) == 50
    assert describe_code_type(1902)["name"] == "ALNUM_4_TO_6"
    assert describe_code_type("8601")["shape"] == "plates"
    assert describe_code_type("nope") is None
    assert result_shape(9900) == "rectangles"
    assert result_shape(9800) == "text-locations"
    assert result_shape(12345) == "text"
    assert len({info["id"] for info in CODE_TYPES}) == len(CODE_TYPES)
    assert parse_points("") == []
    assert parse_points(" 1,2 | 3,4 ")[1]["x"] == 3
    with pytest.raises(ChaojiyingError):
        parse_points("1,2,3")
    with pytest.raises(ChaojiyingError):
        parse_points("a,b")
    assert parse_rectangles("0,1,2,3")[0]["y2"] == 3
    with pytest.raises(ChaojiyingError):
        parse_rectangles("0,1")
    with pytest.raises(ChaojiyingError):
        parse_rectangles("0,1,x,3")
    assert parse_text_locations("ab,1.5,2")[0]["text"] == "ab"
    with pytest.raises(ChaojiyingError):
        parse_text_locations("nope")
    plate = parse_plates("京A,1,0.5,blue,1,2,3,4")[0]
    assert plate["number"] == "京A,1"
    with pytest.raises(ChaojiyingError):
        parse_plates("only,three,parts")
    with pytest.raises(ChaojiyingError):
        parse_plates("n,nope,blue,1,2,3,4")
    assert color_instruction(ColorChannel.RED) == "{8f:0,100,255/8f}"
    assert color_instruction("green", 10, 200) == "{8f:1,10,200/8f}"
    assert color_instruction("蓝") == "{8f:2,100,255/8f}"
    with pytest.raises(ChaojiyingError):
        color_instruction(9)
    with pytest.raises(ChaojiyingError):
        color_instruction(True)  # type: ignore[arg-type]
    with pytest.raises(ChaojiyingError):
        color_instruction("purple")
    with pytest.raises(ChaojiyingError):
        color_instruction(0, 300)
    with pytest.raises(ChaojiyingError):
        color_instruction(0, 1, -1)
    with pytest.raises(ChaojiyingError):
        color_instruction(0, True)  # type: ignore[arg-type]
    assert click_instruction(["查", "找"]) == "{8a:查,找/8a}"
    with pytest.raises(ChaojiyingError):
        click_instruction([])
    with pytest.raises(ChaojiyingError):
        click_instruction(["a,b"])
    assert horizontal_distance({"x": 10, "y": 1}, {"x": 40, "y": 9}) == 30
    digest = hashlib.md5(f"{SOFT_ID}{SOFT_KEY}picABCD".encode()).hexdigest()
    assert compute_response_md5(SOFT_ID, SOFT_KEY, "pic", "ABCD") == digest
    assert verify_response_md5({"pic_id": "pic", "pic_str": "ABCD", "md5": digest.upper()}, SOFT_ID, SOFT_KEY)
    assert resolve_free_model("OCR") == 8
    with pytest.raises(ValueError):
        resolve_free_model("slide")
    plain = ChaojiyingError("plain")
    assert plain.err_no is None
    assert str(plain) == "plain"
    with pytest.raises(AttributeError):
        _ = ScoreResult({"err_no": 0}).tifen
