"""Async client unit tests."""

import pytest
from pytest_httpx import HTTPXMock

from capmonster import AsyncCapMonster, CapMonsterError, image_to_text


@pytest.mark.asyncio
async def test_async_balance_solve_and_report(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getBalance",
        json={"errorId": 0, "balance": 3},
    )
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/createTask",
        json={"errorId": 0, "taskId": 9},
    )
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getTaskResult",
        json={"errorId": 0, "status": "ready", "solution": {"text": "ok"}},
    )
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/createTask",
        json={"errorId": 0, "taskId": 9},
    )
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getTaskResult",
        json={"errorId": 0, "status": "ready", "solution": {"text": "ok"}},
    )
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/reportIncorrectTokenCaptcha",
        json={"errorId": 0, "status": "success"},
    )
    httpx_mock.add_response(
        url="https://capmonster.cloud/api/useragent/actual",
        method="GET",
        text="Mozilla/5.0",
    )

    async with AsyncCapMonster("API_KEY") as client:
        assert (await client.get_balance())["balance"] == 3
        assert await client.get_user_agent() == "Mozilla/5.0"
        solved = await client.solve_detailed(image_to_text("abc"), timeout=2, interval=0.01)
        assert solved == {"taskId": 9, "solution": {"text": "ok"}}
        assert await client.solve(image_to_text("abc"), timeout=2, interval=0.01) == {"text": "ok"}
        assert await client.report_incorrect_token(9) == {"status": "success"}


@pytest.mark.asyncio
async def test_async_errors(httpx_mock: HTTPXMock) -> None:
    with pytest.raises(CapMonsterError, match="Client key is required"):
        AsyncCapMonster(" ")

    async with AsyncCapMonster("API_KEY", retries=1, retry_delay=0) as client:
        with pytest.raises(CapMonsterError):
            await client.get_task_result("nope")

        httpx_mock.add_response(
            url="https://api.capmonster.cloud/getTaskResult",
            json={"errorId": 0, "status": "processing"},
        )
        with pytest.raises(CapMonsterError) as exc:
            await client.wait_for_result(4, timeout=2, interval=0.01, max_attempts=1)
        assert exc.value.error_code == "TIMEOUT"

        with pytest.raises(CapMonsterError) as aborted:
            await client.join_task_result(4, timeout=2, interval=0.01, cancel=lambda: True)
        assert aborted.value.error_code == "ABORTED"

        httpx_mock.add_response(
            url="https://api.capmonster.cloud/getBalance",
            status_code=503,
            text="down",
        )
        httpx_mock.add_response(
            url="https://api.capmonster.cloud/getBalance",
            status_code=503,
            text="down",
        )
        with pytest.raises(CapMonsterError) as http_exc:
            await client.get_balance()
        assert http_exc.value.status_code == 503


@pytest.mark.asyncio
async def test_async_remaining_paths(httpx_mock: HTTPXMock) -> None:
    import httpx

    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getTaskResult",
        json={"errorId": 1, "errorCode": "CAPTCHA_NOT_READY"},
    )
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getTaskResult",
        json={"errorId": 1, "errorCode": "ERROR_CAPTCHA_UNSOLVABLE"},
    )
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getTaskResult",
        json={"errorId": 0, "status": "processing"},
    )
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/reportIncorrectImageCaptcha",
        json={"errorId": 0, "status": "success"},
    )
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/reportIncorrectRecaptcha",
        json={"errorId": 0, "status": "success"},
    )
    httpx_mock.add_exception(
        httpx.ConnectError("ua down"),
        url="https://capmonster.cloud/api/useragent/actual",
    )
    httpx_mock.add_exception(
        httpx.ConnectError("post down"),
        url="https://api.capmonster.cloud/getBalance",
    )

    seen: list[int] = []
    async with AsyncCapMonster("API_KEY", retries=0) as client:
        processing = await client.get_task_result(4)
        assert processing["status"] == "processing"
        with pytest.raises(CapMonsterError) as exc:
            await client.get_task_result(4)
        assert exc.value.error_code == "ERROR_CAPTCHA_UNSOLVABLE"
        with pytest.raises(CapMonsterError) as timed_out:
            await client.wait_for_result(
                4,
                timeout=0,
                interval=1,
                initial_delay=0.01,
                on_poll=lambda update: seen.append(update["attempt"]),
            )
        assert timed_out.value.error_code == "TIMEOUT"
        assert seen == [1]
        assert await client.report_incorrect_image(4) == {"status": "success"}
        assert await client.report_incorrect_recaptcha(4) == {"status": "success"}
        with pytest.raises(CapMonsterError, match="ua down"):
            await client.get_user_agent()
        with pytest.raises(CapMonsterError, match="post down"):
            await client.get_balance()


@pytest.mark.asyncio
async def test_async_injected_client_is_not_closed(httpx_mock: HTTPXMock) -> None:
    import httpx

    external = httpx.AsyncClient(base_url="https://api.capmonster.cloud")
    httpx_mock.add_response(
        url="https://api.capmonster.cloud/getBalance",
        json={"errorId": 0, "balance": 1},
    )
    client = AsyncCapMonster("API_KEY", http_client=external)
    try:
        assert (await client.get_balance())["balance"] == 1
        await client.close()
        assert external.is_closed is False
    finally:
        await external.aclose()
