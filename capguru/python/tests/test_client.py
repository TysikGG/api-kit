import json

import httpx
import pytest

from capguru import (
    CLICK,
    DEFAULT_SOFTGURU,
    ERROR_CODE_DESCRIPTIONS,
    TEXT_INSTRUCTIONS,
    VERNET,
    AsyncCapGuru,
    AsyncCapGuruClient,
    CapGuru,
    CapGuruClient,
    CapGuruError,
    ZeroBalanceError,
)
from capguru.errors import capguru_error
from capguru.parse import (
    parse_click_answer,
    parse_geetest,
    read_solution_token,
    scale_slider_offset,
    slider_offset,
)


def test_parsers_and_error_map():
    assert parse_click_answer("OK|coordinate:x=44,y=32").points[0].x == 44
    wide = parse_click_answer("coordinates:x=143,y=53,w=42")
    assert wide.points[0].w == 42
    assert len(parse_click_answer("coordinates:x=1,y=2;x=3,y=4").points) == 2
    assert parse_click_answer("coordinates:x=1,y=2;").points[0].x == 1
    assert parse_click_answer("coordinates:nope").points is None
    assert parse_click_answer("1,2,6,9").cells == [1, 2, 6, 9]
    assert parse_click_answer("token").raw == "token"
    assert slider_offset(parse_click_answer("coordinates:x=205,y=0")) == 205
    assert slider_offset(parse_click_answer("nope")) is None
    assert scale_slider_offset(143, 260, image_width=300) == pytest.approx(143 / 300 * 260)
    assert scale_slider_offset(205, 300) == pytest.approx(205 / 271 * 300)
    assert scale_slider_offset(10, 20, image_width=0) == 10
    assert parse_geetest(json.dumps({"challenge": "c", "validate": "v", "seccode": "s"})) == type(
        parse_geetest("{}")
    )(challenge="c", validate="v", seccode="s")
    aliased = parse_geetest(
        json.dumps({"geetest_challenge": "c", "geetest_validate": "v", "geetest_seccode": "s"})
    )
    assert aliased.challenge == "c"
    assert parse_geetest("{}").validate == "{}"
    assert parse_geetest("[").seccode.endswith("|jordan")
    assert parse_geetest("raw").seccode == "raw|jordan"
    assert read_solution_token({"gRecaptchaResponse": "g"}) == "g"
    assert read_solution_token({"token": "t"}) == "t"
    assert read_solution_token({"text": "tx"}) == "tx"
    assert read_solution_token({"request": "r"}) == "r"
    assert read_solution_token("plain") == "plain"
    assert read_solution_token({"other": 1}) == json.dumps({"other": 1})
    assert read_solution_token(None) == "null"
    for code in ERROR_CODE_DESCRIPTIONS:
        err = capguru_error(f"CapGuru error: {code}", code=code, response_data={"status": 0})
        assert isinstance(err, CapGuruError)
        assert err.code == code
        assert err.description == ERROR_CODE_DESCRIPTIONS[code]
    unknown = capguru_error("CapGuru error: ERROR_CUSTOM", code="ERROR_CUSTOM")
    assert type(unknown) is CapGuruError
    assert unknown.description is None


def test_requires_key_and_alias():
    with pytest.raises(CapGuruError) as exc:
        CapGuruClient("")
    assert exc.value.code == "MISSING_API_KEY"
    with CapGuru("key", base_url="https://api2.cap.guru/", headers={"X-Test": "1"}) as client:
        assert client.base_url == "https://api2.cap.guru"
        assert DEFAULT_SOFTGURU == 164125


def _params(request: httpx.Request) -> dict[str, str]:
    return dict(request.url.params)


def test_create_balance_and_reports(httpx_mock):
    httpx_mock.add_response(json={"status": 1, "request": "98765"})
    httpx_mock.add_response(json={"status": 1, "request": "150.00"})
    httpx_mock.add_response(json={"status": 1, "request": 0})
    httpx_mock.add_response(json={"status": "1", "request": "12"})
    httpx_mock.add_response(content=b"45.5", headers={"content-type": "text/plain"})
    httpx_mock.add_response(content=b"OK", headers={"content-type": "text/plain"})
    httpx_mock.add_response(content=b"notpic", headers={"content-type": "text/plain"})
    httpx_mock.add_response(json={"status": 0, "request": "ERROR_WRONG_USER_KEY"})
    httpx_mock.add_response(json={"status": "0", "request": "ERROR_ZERO_BALANCE"})
    httpx_mock.add_response(json={"status": 1, "request": "OK_REPORT_RECORDED"})
    httpx_mock.add_response(json={"status": 1, "request": "OK_REPORT_RECORDED"})
    httpx_mock.add_response(json={"status": 1, "request": "OK_REPORT_RECORDED"})
    httpx_mock.add_response(json={"status": 1, "request": "OK_REPORT_RECORDED"})
    httpx_mock.add_response(content=b"OK|plain-id", headers={"content-type": "text/plain"})

    with CapGuruClient("test_key", default_polling_interval=0) as client:
        task_id = client.create_task({"method": "base64", "body": "abc", "softguru": 1, "json": 0})
        assert task_id == "98765"
        sent = httpx_mock.get_requests()[0]
        assert _params(sent)["softguru"] == "164125"
        assert _params(sent)["key"] == "test_key"
        assert _params(sent)["json"] == "1"
        assert client.get_balance() == 150
        assert client.balance() == 0
        assert client.get_balance() == 12
        assert client.get_balance() == 45.5
        with pytest.raises(CapGuruError) as parse_err:
            client.get_balance()
        assert parse_err.value.code == "PARSE_ERROR"
        with pytest.raises(CapGuruError) as notpic:
            client.get_balance()
        assert notpic.value.code == "notpic"
        with pytest.raises(CapGuruError):
            client.get_balance()
        with pytest.raises(ZeroBalanceError):
            client.get_balance()
        assert client.report_good("1") is True
        assert client.report_correct("1") is True
        assert client.report_bad("1") is True
        assert client.report_incorrect("1") is True
        assert client.create_task({"method": "base64", "body": "z"}) == "plain-id"


def test_image_text_and_tokens(httpx_mock):
    httpx_mock.add_response(json={"status": 1, "request": "img"})
    httpx_mock.add_response(json={"status": "1", "request": "TEXT"})
    httpx_mock.add_response(json={"status": 1, "request": "id"})
    httpx_mock.add_response(json={"status": 1, "request": "answer"})
    httpx_mock.add_response(json={"status": 1, "request": "id"})
    httpx_mock.add_response(json={"status": 1, "request": "tok"})
    httpx_mock.add_response(json={"status": 1, "request": "id"})
    httpx_mock.add_response(json={"status": 1, "request": "tok"})
    httpx_mock.add_response(json={"status": 1, "request": "id"})
    httpx_mock.add_response(json={"status": 1, "request": "tok"})
    httpx_mock.add_response(json={"status": 1, "request": "id"})
    httpx_mock.add_response(json={"status": 1, "request": "tok"})
    httpx_mock.add_response(json={"status": 1, "request": "id"})
    httpx_mock.add_response(json={"status": 1, "request": "tok"})
    httpx_mock.add_response(json={"status": 1, "request": "id"})
    httpx_mock.add_response(
        json={
            "status": 1,
            "request": json.dumps({"challenge": "c", "validate": "v", "seccode": "s"}),
        }
    )
    httpx_mock.add_response(json={"status": 1, "request": {"nested": True}})
    httpx_mock.add_response(
        json={"status": 1, "request": {"geetest_challenge": "c2", "geetest_validate": "v2"}}
    )

    with CapGuruClient("test_key", default_polling_interval=0) as client:
        seen: list[int] = []
        text = client.solve_image(
            "img",
            phrase=1,
            regsense=1,
            numeric=1,
            calc=1,
            min_len=2,
            max_len=6,
            language=2,
            textinstructions="type it",
            vernet=VERNET["MICROSOFT"],
            extra={"header_acao": 1},
            on_not_ready=lambda info: seen.append(info["attempt"]),
            timeout=1,
        )
        assert text == "TEXT"
        assert seen == []
        first = _params(httpx_mock.get_requests()[0])
        assert first["vernet"] == str(VERNET["MICROSOFT"])
        assert first["phrase"] == "1"
        assert first["header_acao"] == "1"
        assert client.solve_text("What day?", language=1, extra={"lang": "en"}) == "answer"
        assert (
            client.solve_recaptcha_v2(
                "gk",
                "https://example.com",
                invisible=True,
                data_s="datas",
                enterprise=True,
                proxy="1.2.3.4:8080",
                proxy_type="SOCKS5",
                cookies="c",
                user_agent="ua",
                extra={"pingback": "https://example.com/hook"},
            )
            == "tok"
        )
        assert (
            client.solve_recaptcha_v3(
                "gk", "https://example.com", action="verify", min_score=0.3, enterprise=True
            )
            == "tok"
        )
        assert (
            client.solve_turnstile(
                "sk",
                "https://example.com",
                action="login",
                data="cdata",
                cookies="a=b",
                user_agent="UA",
                proxy="user:pass@1.2.3.4:8080",
                proxy_type="HTTP",
            )
            == "tok"
        )
        assert (
            client.solve_hcaptcha("sk", "https://example.com", invisible=True, data="rq") == "tok"
        )
        assert (
            client.solve_funcaptcha(
                "pk", "https://example.com", surl="https://arkose.example", data="blob"
            )
            == "tok"
        )
        result = client.solve_geetest(
            "gt", "ch", "https://example.com", api_server="api.geetest.com"
        )
        assert result.challenge == "c" and result.validate == "v" and result.seccode == "s"
        again = client.solve_geetest("gt", "ch", "https://example.com")
        assert again.challenge == "c2"


def test_file_upload_and_polling(httpx_mock):
    httpx_mock.add_response(json={"status": 1, "request": "file-id"})
    httpx_mock.add_response(json={"status": 1, "request": "FILE"})
    httpx_mock.add_response(json={"status": 1, "request": "up-id"})
    httpx_mock.add_response(json={"status": 0, "request": "CAPCHA_NOT_READY"})
    httpx_mock.add_response(content=b"OK|ready-now", headers={"content-type": "text/plain"})
    httpx_mock.add_response(json={"status": 0, "request": "CAPCHA_NOT_READY"})
    httpx_mock.add_response(json={"status": 0, "request": "ERROR_WRONG_CAPTCHA_ID"})
    httpx_mock.add_response(json={"status": 0, "request": "CAPCHA_NOT_READY"})

    with CapGuruClient("test_key", default_polling_interval=0) as client:
        assert client.solve_image_file(b"png", vernet=VERNET["YANDEX"]) == "FILE"
        upload = httpx_mock.get_requests()[0]
        body = upload.content.decode()
        assert "164125" in body
        assert 'name="file"' in body
        assert (
            client.create_task_multipart({"method": "post", "empty": None}, b"z", "z.png", "upload")
            == "up-id"
        )
        attempts: list[int] = []
        assert (
            client.wait_for_result(
                "t",
                timeout=1,
                interval=0,
                on_not_ready=lambda info: attempts.append(info["attempt"]),
            )
            == "ready-now"
        )
        assert attempts == [1]
        assert client.get_task_result("missing") is None
        with pytest.raises(CapGuruError) as bad:
            client.get_task_result("bad")
        assert bad.value.code == "ERROR_WRONG_CAPTCHA_ID"
        with pytest.raises(CapGuruError) as timeout:
            client.wait_for_result("missing", timeout=0, interval=1)
        assert timeout.value.code == "TIMEOUT"
        with pytest.raises(CapGuruError) as aborted:
            client.wait_for_result("missing", timeout=1, interval=0, should_stop=lambda: True)
        assert aborted.value.code == "ABORTED"

    httpx_mock.add_response(json={"status": 0, "request": "CAPCHA_NOT_READY"})
    flag = {"stop": False}

    def stop() -> bool:
        return flag["stop"]

    def flip(info: dict) -> None:
        flag["stop"] = True
        assert info["attempt"] == 1

    with CapGuruClient("test_key", default_polling_interval=0) as client:
        with pytest.raises(CapGuruError) as mid:
            client.wait_for_result(
                "slow", timeout=5, interval=0, on_not_ready=flip, should_stop=stop
            )
        assert mid.value.code == "ABORTED"


def test_click_family(httpx_mock):
    def handler(request: httpx.Request) -> httpx.Response:
        params = _params(request)
        if request.url.path.endswith("res.php"):
            ident = params.get("id", "")
            if "grid" in ident:
                return httpx.Response(200, json={"status": 1, "request": "1,2,6"})
            return httpx.Response(200, json={"status": 1, "request": "coordinates:x=8,y=9"})
        return httpx.Response(
            200, json={"status": 1, "request": params.get("textinstructions", "id")}
        )

    httpx_mock.add_callback(handler, is_reusable=True)

    with CapGuruClient("test_key", default_polling_interval=0) as client:
        click = client.solve_click("bear", CLICK["RECAPTCHA"], body="img")
        assert click.points[0].x == 8
        assert client.solve_coordinates("bear", "recap", body="img").points[0].y == 9
        assert client.solve_recaptcha_click("grid", body="img", grid=True).cells == [1, 2, 6]
        client.solve_recaptcha_click("coord", body="img")
        client.solve_hcaptcha_click("grid", body="img", grid=True)
        client.solve_hcaptcha_click("h", body="img")
        client.solve_funcaptcha_click("grid", body="img", grid=True)
        client.solve_funcaptcha_click("f", body="img")
        client.solve_geetest_click(TEXT_INSTRUCTIONS["GEE_TEST_ICON_V4"], body="img", grid=True)
        client.solve_geetest_click(TEXT_INSTRUCTIONS["SLIDER"], body="img")
        client.solve_binance(body="img", object_name="dog")
        client.solve_binance(body="img", textinstructions="binance,slider", grid=True)
        client.solve_tiktok(variant="kolesso", body0="bg", body1="piece")
        client.solve_tiktok(variant="koleso", body0="bg", body1="piece")
        client.solve_tiktok(variant="abc", body="img")
        client.solve_tiktok(variant="slider", body="img")
        client.solve_tiktok(
            variant="question", question="Which object covers your hair?", body="img"
        )
        client.solve_tiktok(body="img", textinstructions="custom")
        client.solve_aws(body="img", instruction="Place a dot at the end of the car's path")
        client.solve_aws(body="img", textinstructions="Amazon,already")
        client.solve_temu("Please click on the smaller yellow sphere", body="img")
        client.solve_slider(body="bg", piece="piece")
        client.solve_slider(body="only")
        client.solve_slider(
            body0="a", body1="b", textinstructions="kolesso", click=CLICK["GEETEST"]
        )
        client.solve_bitget(body="img")
        client.solve_linkvertise("Please click on the globe", body="img")
        client.solve_seofast("mark the bows", body="img")
        client.solve_worldcash(body="img")

    instructions = [
        _params(request)["textinstructions"]
        for request in httpx_mock.get_requests()
        if request.url.path.endswith("in.php")
    ]
    assert instructions[10:28] == [
        "binance,dog",
        "binance,slider",
        "kolesso",
        "koleso",
        "abc",
        "slider",
        "abc,Which object covers your hair?",
        "custom",
        "Amazon,Place a dot at the end of the car's path",
        "Amazon,already",
        "Please click on the smaller yellow sphere",
        "slider",
        "slider",
        "kolesso",
        "geetesticonhand",
        "custom1221,Please click on the globe",
        "custom1222,mark the bows",
        "custom1224",
    ]
    posts = [
        request for request in httpx_mock.get_requests() if request.url.path.endswith("in.php")
    ]
    assert _params(posts[11])["click"] == CLICK["GEETEST_GRID"]
    assert _params(posts[20])["click"] == CLICK["TEMU"]
    assert _params(posts[21])["body0"] == "bg"
    assert "body" not in _params(posts[21])
    assert _params(posts[22])["body"] == "only"


def test_json_api_retries_and_invalid(httpx_mock):
    httpx_mock.add_response(json={"errorId": 0, "taskId": 7654321})
    httpx_mock.add_response(json={"errorId": 0, "status": "processing"})
    httpx_mock.add_response(
        json={
            "errorId": 0,
            "status": "ready",
            "taskId": 7654321,
            "solution": {"gRecaptchaResponse": "tok"},
        }
    )
    with CapGuruClient("test_key", default_polling_interval=0) as client:
        result = client.solve_json_task(
            {
                "type": "NoCaptchaTaskProxyless",
                "websiteURL": "https://example.com",
                "websiteKey": "k",
            },
            language_pool="en",
            extra={"softId": 0},
            timeout=1,
            interval=0,
        )
        assert read_solution_token(result.solution) == "tok"
        body = json.loads(httpx_mock.get_requests()[0].content)
        assert body["softId"] == DEFAULT_SOFTGURU
        assert body["softguru"] == DEFAULT_SOFTGURU
        assert body["languagePool"] == "en"
        assert body["clientKey"] == "test_key"

    httpx_mock.add_response(json={"errorId": 1, "errorCode": "ERROR_KEY_DOES_NOT_EXIST"})
    httpx_mock.add_response(json={"status": 0, "request": "CAPCHA_NOT_READY"})
    httpx_mock.add_response(json={"status": 1, "request": "plain-token"})
    httpx_mock.add_response(json={"errorId": 0, "status": "pending"})
    httpx_mock.add_response(json={"errorId": 1, "errorCode": "CAPCHA_NOT_READY"})
    httpx_mock.add_response(content=b"nope", headers={"content-type": "text/plain"})
    httpx_mock.add_response(json={"errorId": 0})
    httpx_mock.add_response(json={"status": 0, "request": "ERROR_UPLOAD"})
    httpx_mock.add_response(
        json={"errorId": 1, "errorDescription": "ERROR_IMAGE_TYPE_NOT_SUPPORTED"}
    )
    httpx_mock.add_response(json={"errorId": 0, "status": "unknown"})
    httpx_mock.add_response(content=b"CAPCHA_NOT_READY", headers={"content-type": "text/plain"})
    httpx_mock.add_response(content=b"ERROR_UPLOAD", headers={"content-type": "text/plain"})
    httpx_mock.add_response(json={"status": 0, "request": "ERROR_WRONG_CAPTCHA_ID"})
    httpx_mock.add_response(json={"errorId": 1})
    httpx_mock.add_response(json={"status": 1, "request": True})
    httpx_mock.add_response(json={"errorId": 0, "status": "processing"})
    httpx_mock.add_response(content=b"{", headers={"content-type": "application/json"})
    httpx_mock.add_response(status_code=500, json={"status": 0, "request": "ERROR_ZERO_BALANCE"})
    httpx_mock.add_response(
        status_code=502, content=b"bad gateway", headers={"content-type": "text/plain"}
    )
    httpx_mock.add_response(json={"status": 1})
    httpx_mock.add_response(json=[])
    httpx_mock.add_response(content=b"", headers={"content-type": "text/plain"})
    httpx_mock.add_response(json={"status": 2, "request": "weird"})

    with CapGuruClient("test_key", default_polling_interval=0) as client:
        with pytest.raises(CapGuruError) as missing_key:
            client.create_json_task({"type": "ImageToTextTask", "body": "x"})
        assert missing_key.value.code == "ERROR_KEY_DOES_NOT_EXIST"
        assert client.get_json_task_result("9") is None
        assert client.get_json_task_result("9").solution == "plain-token"
        assert client.get_json_task_result("9") is None
        assert client.get_json_task_result("9") is None
        with pytest.raises(CapGuruError):
            client.get_json_task_result("9")
        with pytest.raises(CapGuruError) as invalid:
            client.create_json_task({"type": "NoCaptchaTaskProxyless"})
        assert invalid.value.code == "INVALID_RESPONSE"
        with pytest.raises(CapGuruError) as upload:
            client.create_json_task({"type": "ImageToTextTask"})
        assert upload.value.code == "ERROR_UPLOAD"
        with pytest.raises(CapGuruError) as image_type:
            client.create_json_task({"type": "ImageToTextTask"})
        assert image_type.value.code == "ERROR_IMAGE_TYPE_NOT_SUPPORTED"
        with pytest.raises(CapGuruError):
            client.get_json_task_result("1")
        assert client.get_json_task_result("1") is None
        with pytest.raises(CapGuruError) as upload_text:
            client.get_json_task_result("1")
        assert upload_text.value.code == "ERROR_UPLOAD"
        with pytest.raises(CapGuruError):
            client.get_json_task_result("1")
        with pytest.raises(CapGuruError) as generic:
            client.get_json_task_result("1")
        assert generic.value.code == "ERROR"
        assert client.get_json_task_result("1").solution is True
        with pytest.raises(CapGuruError) as timed:
            client.wait_for_json_result("42", timeout=0, interval=1)
        assert timed.value.code == "TIMEOUT"
        with pytest.raises(CapGuruError) as bad_json:
            client.get_balance()
        assert bad_json.value.code == "INVALID_RESPONSE"
        with pytest.raises(ZeroBalanceError):
            client.get_balance()
        with pytest.raises(CapGuruError) as http_err:
            client.get_balance()
        assert http_err.value.code == "HTTP_ERROR"
        with pytest.raises(CapGuruError):
            client.create_task({})
        with pytest.raises(CapGuruError):
            client.create_task({})
        with pytest.raises(CapGuruError):
            client.create_task({})
        with pytest.raises(CapGuruError):
            client.get_balance()

    httpx_mock.add_exception(httpx.ConnectError("down"))
    httpx_mock.add_response(json={"status": 1, "request": "1.25"})
    httpx_mock.add_response(json={"status": 0, "request": "ERROR_NO_SLOT_AVAILABLE"})
    httpx_mock.add_response(json={"status": 1, "request": "after"})
    httpx_mock.add_response(json={"status": 0, "request": "ERROR_GOOGLEKEY"})
    httpx_mock.add_exception(httpx.ConnectError("down"))
    httpx_mock.add_exception(httpx.ConnectError("down"))
    with CapGuruClient(
        "test_key", max_retries=1, retry_delay=0.001, default_polling_interval=0
    ) as client:
        assert client.get_balance() == 1.25
        assert client.create_task({"method": "base64", "body": "a"}) == "after"
        with pytest.raises(CapGuruError) as google:
            client.create_task({"method": "userrecaptcha"})
        assert google.value.code == "ERROR_GOOGLEKEY"
        with pytest.raises(CapGuruError) as network:
            client.create_task({"method": "base64"})
        assert network.value.code == "NETWORK_ERROR"


@pytest.mark.asyncio
async def test_async_client(httpx_mock):
    httpx_mock.add_response(json={"status": 1, "request": "9.5"})
    httpx_mock.add_response(json={"status": 1, "request": "9.5"})
    pairs = [
        ("solve_text", ("Question?",), {}),
        ("solve_recaptcha_v2", ("gk", "https://example.com"), {}),
        ("solve_recaptcha_v3", ("gk", "https://example.com"), {}),
        ("solve_turnstile", ("sk", "https://example.com"), {}),
        ("solve_hcaptcha", ("sk", "https://example.com"), {}),
        ("solve_funcaptcha", ("pk", "https://example.com"), {}),
        ("solve_image", ("img",), {}),
        ("solve_image_file", (b"png",), {}),
    ]
    for _name, _args, _kwargs in pairs:
        httpx_mock.add_response(json={"status": 1, "request": "id"})
        httpx_mock.add_response(json={"status": 1, "request": "ok"})
    httpx_mock.add_response(json={"status": 1, "request": "id"})
    httpx_mock.add_response(
        json={
            "status": 1,
            "request": json.dumps({"challenge": "c", "validate": "v", "seccode": "s"}),
        }
    )
    for _ in range(15):
        httpx_mock.add_response(json={"status": 1, "request": "id"})
        httpx_mock.add_response(json={"status": 1, "request": "coordinates:x=1,y=2"})
    httpx_mock.add_response(json={"status": 1, "request": "OK"})
    httpx_mock.add_response(json={"status": 1, "request": "OK"})
    httpx_mock.add_response(json={"status": 1, "request": "OK"})
    httpx_mock.add_response(json={"status": 1, "request": "OK"})
    httpx_mock.add_response(json={"errorId": 0, "taskId": 3})
    httpx_mock.add_response(json={"errorId": 0, "status": "ready", "solution": {"text": "hi"}})
    httpx_mock.add_response(json={"status": 1, "request": "id"})
    httpx_mock.add_response(json={"status": 0, "request": "CAPCHA_NOT_READY"})
    httpx_mock.add_response(json={"status": 0, "request": "CAPCHA_NOT_READY"})

    async with AsyncCapGuruClient(
        "test_key", default_polling_interval=0, default_polling_timeout=0
    ) as client:
        assert isinstance(client, AsyncCapGuru)
        assert await client.get_balance() == 9.5
        assert await client.balance() == 9.5
        assert await client.solve_text("Question?") == "ok"
        assert await client.solve_recaptcha_v2("gk", "https://example.com") == "ok"
        assert await client.solve_recaptcha_v3("gk", "https://example.com") == "ok"
        assert await client.solve_turnstile("sk", "https://example.com") == "ok"
        assert await client.solve_hcaptcha("sk", "https://example.com") == "ok"
        assert await client.solve_funcaptcha("pk", "https://example.com") == "ok"
        assert await client.solve_image("img") == "ok"
        assert await client.solve_image_file(b"png") == "ok"
        geetest = await client.solve_geetest("gt", "ch", "https://example.com")
        assert geetest.validate == "v"
        assert (await client.solve_click("bear", "recap", body="img")).points[0].x == 1
        assert (await client.solve_coordinates("bear", "recap", body="img")).points
        assert await client.solve_recaptcha_click("bear", body="img")
        assert await client.solve_hcaptcha_click("bear", body="img", grid=True)
        assert await client.solve_funcaptcha_click("bear", body="img")
        assert await client.solve_geetest_click("slider", body="img")
        assert await client.solve_binance(body="img", object_name="dog")
        assert await client.solve_tiktok(variant="abc", body="img")
        assert await client.solve_aws(body="img", instruction="path")
        assert await client.solve_temu("click the sphere", body="img")
        assert await client.solve_slider(body="bg", piece="piece")
        assert await client.solve_bitget(body="img")
        assert await client.solve_linkvertise("globe", body="img")
        assert await client.solve_seofast("bows", body="img")
        assert await client.solve_worldcash(body="img")
        assert await client.report_good("1") is True
        assert await client.report_bad("1") is True
        assert await client.report_correct("1") is True
        assert await client.report_incorrect("1") is True
        solved = await client.solve_json_task(
            {"type": "ImageToTextTask", "body": "x"}, timeout=1, interval=0
        )
        assert read_solution_token(solved.solution) == "hi"
        assert await client.create_task({"method": "base64", "body": "a"}) == "id"
        assert await client.get_task_result("id") is None
        with pytest.raises(CapGuruError):
            await client.wait_for_result("id", timeout=0, interval=0)
        with pytest.raises(CapGuruError):
            await client.wait_for_json_result("id", timeout=0, interval=0, should_stop=lambda: True)
