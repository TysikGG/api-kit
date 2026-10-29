import asyncio

import httpx
import pytest
from pytest_httpx import HTTPXMock

from chaojiying import SOFT_ID, AsyncChaojiying, ChaojiyingError, CodeType, NetworkError


def test_async_methods(httpx_mock: HTTPXMock):
    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path.endswith("GetScore.php"):
            return httpx.Response(200, json={"err_no": 0, "err_str": "OK", "tifen": 11, "tifen_lock": 0})
        if path.endswith("ReportError.php"):
            body = request.read().decode()
            assert "id=pic" in body
            assert SOFT_ID in body
            return httpx.Response(200, json={"err_no": 0, "err_str": "OK"})
        if "/ocr/v2/8" in path:
            assert request.url.params["ak"] == "free-key"
            return httpx.Response(200, json={"err_no": 0, "err_str": "OK", "pic_id": "f", "pic_str": "zz"})
        return httpx.Response(
            200,
            json={"err_no": 0, "err_str": "OK", "pic_id": "1", "pic_str": "8vka", "md5": "abc"},
        )

    httpx_mock.add_callback(handler, is_reusable=True)

    async def scenario(tmp_path_holder: list[str]) -> None:
        async with AsyncChaojiying(
            username="my_user",
            password="my_password",
            retries=0,
            api_key="free-key",
        ) as client:
            score = await client.get_balance()
            assert score.tifen == 11
            result = await client.recognize(b"img", CodeType.ALNUM_1_TO_4, "note", len_min=1)
            assert result.pic_str == "8vka"
            posted = await client.post_pic_base64(b"img", 1902)
            assert posted.pic_id == "1"
            multipart = await client.post_pic(b"img", 1004)
            assert multipart.err_no == 0
            report = await client.report("pic")
            assert report.err_str == "OK"
            free = await client.recognize_free(b"img", "text")
            assert free.pic_str == "zz"
            from pathlib import Path

            path = Path(tmp_path_holder[0])
            path.write_bytes(b"disk")
            filed = await client.recognize_file(str(path), 1004)
            assert filed.pic_str == "8vka"

    async def run() -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as directory:
            from pathlib import Path

            holder = [str(Path(directory) / "cap.bin")]
            await scenario(holder)

    asyncio.run(run())


def test_async_retry_and_context_error(httpx_mock: HTTPXMock):
    state = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        state["n"] += 1
        if state["n"] == 1:
            return httpx.Response(503, text="busy")
        return httpx.Response(200, json={"err_no": 0, "err_str": "OK", "tifen": 2, "tifen_lock": 0})

    httpx_mock.add_callback(handler, is_reusable=True)

    async def scenario() -> None:
        client = AsyncChaojiying(username="u", password="p", retries=1, retry_delay=0.001)
        try:
            score = await client.get_score()
            assert score["tifen"] == 2
        finally:
            await client.aclose()

    asyncio.run(scenario())
    assert state["n"] == 2

    httpx_mock.add_response(500, text="nope")

    async def fail() -> None:
        async with AsyncChaojiying(username="u", password="p", retries=2, retry_delay=0) as client:
            await client.recognize(b"a", 1004)

    with pytest.raises(NetworkError):
        asyncio.run(fail())


def test_async_transport_errors(httpx_mock: HTTPXMock):
    httpx_mock.add_exception(httpx.ConnectError("refused"))
    httpx_mock.add_exception(httpx.ReadTimeout("slow"))

    async def scenario() -> None:
        client = AsyncChaojiying(username="u", password="p", retries=0)
        try:
            with pytest.raises(NetworkError):
                await client.get_score()
            with pytest.raises(ChaojiyingError):
                await client.recognize(b"a", 1004)
        finally:
            await client.aclose()

    asyncio.run(scenario())


@pytest.mark.httpx_mock(assert_all_requests_were_expected=False)
def test_async_missing_mock_is_not_a_client_timeout(httpx_mock: HTTPXMock):
    async def scenario() -> None:
        client = AsyncChaojiying(username="u", password="p", retries=3, retry_delay=0.001)
        try:
            with pytest.raises(httpx.TimeoutException, match="No response can be found"):
                await client.get_score()
        finally:
            await client.aclose()

    asyncio.run(scenario())
