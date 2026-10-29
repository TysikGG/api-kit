"""Asynchronous client for the CapMonster Cloud recognition API."""

from __future__ import annotations

import asyncio
import time
from collections.abc import Callable, Mapping
from typing import Any

import httpx

from ._core import (
    DEFAULT_BASE_URL,
    DEFAULT_SOFT_ID,
    DEFAULT_TIMEOUT,
    DEFAULT_USER_AGENT_URL,
    aborted_error,
    as_solution,
    balance_from,
    build_create_payload,
    effective_client_key,
    interpret_response,
    report_from,
    require_task_id,
    result_from,
    solution_is_ready,
    task_id_from,
    timeout_error,
    user_agent_from,
)
from .errors import CapMonsterError, create_error, is_retryable


class AsyncCapMonster:
    """Async client for the CapMonster Cloud recognition API.

    The method names match :class:`capmonster.client.CapMonster`. Use it as an
    async context manager so the HTTPX client is closed.

    Args:
        client_key: CapMonster Cloud client key.
        base_url: Custom API base URL.
        timeout: Request timeout in seconds.
        soft_id: Developer software id. Empty until the developer program assigns one.
        retries: Extra attempts for transient errors. Defaults to 0.
        retry_delay: Base delay in seconds before a retry, multiplied by the attempt.
        user_agent_url: Absolute URL of the current User-Agent endpoint.
        nocache: Append ``__nocache`` to the client key.
        recognizing_threshold: Append ``__recognizingthreshold_{n}`` to the client key.
        module_name: Append ``__module`` to the client key.
        http_client: Optional async HTTPX client. Closed only when this class created it.
    """

    def __init__(
        self,
        client_key: str,
        *,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        soft_id: str | int | None = None,
        retries: int = 0,
        retry_delay: float = 1.0,
        user_agent_url: str = DEFAULT_USER_AGENT_URL,
        nocache: bool = False,
        recognizing_threshold: int | None = None,
        module_name: str | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        if not client_key or not client_key.strip():
            raise create_error("Client key is required", 1, "MISSING_CLIENT_KEY")

        self._client_key = effective_client_key(
            client_key.strip(),
            module_name=module_name,
            recognizing_threshold=recognizing_threshold,
            nocache=nocache,
        )
        self._soft_id: str | int = DEFAULT_SOFT_ID if soft_id is None else soft_id
        self._retries = retries
        self._retry_delay = retry_delay
        self._user_agent_url = user_agent_url
        self._owns_client = http_client is None
        self._http = http_client or httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            timeout=timeout,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )

    async def aclose(self) -> None:
        """Close the underlying HTTP client when this instance created it."""
        if self._owns_client:
            await self._http.aclose()

    async def close(self) -> None:
        """Alias of :meth:`aclose`."""
        await self.aclose()

    async def __aenter__(self) -> AsyncCapMonster:
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self.aclose()

    async def get_balance(self) -> dict[str, float]:
        """Retrieve the available account balance."""
        response = await self._post("/getBalance", {"clientKey": self._client_key})
        return balance_from(response)

    async def get_user_agent(self) -> str:
        """Return the current Windows User-Agent supported by CapMonster Cloud."""

        async def send() -> str:
            try:
                res = await self._http.get(self._user_agent_url)
            except httpx.HTTPError as err:
                raise create_error(str(err), 0) from err
            if res.is_error:
                interpret_response(res)
            return user_agent_from(res.text, res.status_code)

        return await self._call(send)

    async def create_task(
        self,
        task: Mapping[str, Any],
        *,
        soft_id: str | int | None = None,
        callback_url: str | None = None,
    ) -> int:
        """Submit a new captcha recognition task."""
        chosen = self._soft_id if soft_id is None else soft_id
        payload = build_create_payload(
            self._client_key,
            dict(task),
            soft_id=chosen,
            callback_url=callback_url,
        )
        return task_id_from(await self._post("/createTask", payload))

    async def get_task_result(self, task_id: int | str) -> dict[str, Any]:
        """Query the status and solution of a submitted task."""
        normalized = require_task_id(task_id)
        try:
            response = await self._post(
                "/getTaskResult",
                {"clientKey": self._client_key, "taskId": normalized},
            )
        except CapMonsterError as err:
            if err.error_code == "CAPTCHA_NOT_READY":
                return {"status": "processing", "solution": {}}
            raise
        return result_from(response)

    async def wait_for_result(
        self,
        task_id: int | str,
        *,
        timeout: float = 120.0,
        interval: float = 3.0,
        initial_delay: float = 0.0,
        max_attempts: int | None = None,
        on_poll: Callable[[dict[str, Any]], None] | None = None,
        cancel: Callable[[], bool] | None = None,
    ) -> dict[str, Any]:
        """Poll ``get_task_result`` until the solution is ready."""
        solved = await self._poll(
            task_id,
            timeout=timeout,
            interval=interval,
            initial_delay=initial_delay,
            max_attempts=max_attempts,
            on_poll=on_poll,
            cancel=cancel,
        )
        return solved["solution"]

    async def join_task_result(self, task_id: int | str, **kwargs: Any) -> dict[str, Any]:
        """Alias of :meth:`wait_for_result`."""
        return await self.wait_for_result(task_id, **kwargs)

    async def solve(self, task: Mapping[str, Any], **kwargs: Any) -> dict[str, Any]:
        """Submit a task and wait for its solution."""
        solved = await self.solve_detailed(task, **kwargs)
        return solved["solution"]

    async def solve_detailed(self, task: Mapping[str, Any], **kwargs: Any) -> dict[str, Any]:
        """Submit a task and return ``{"taskId", "solution"}``."""
        soft_id = kwargs.pop("soft_id", None)
        callback_url = kwargs.pop("callback_url", None)
        task_id = await self.create_task(task, soft_id=soft_id, callback_url=callback_url)
        solved = await self._poll(task_id, **kwargs)
        return {"taskId": task_id, "solution": solved["solution"]}

    async def report_incorrect_image_captcha(self, task_id: int | str) -> dict[str, str]:
        """Report a wrong image-captcha answer."""
        return await self._report("/reportIncorrectImageCaptcha", task_id)

    async def report_incorrect_token_captcha(self, task_id: int | str) -> dict[str, str]:
        """Report a token the target site rejected."""
        return await self._report("/reportIncorrectTokenCaptcha", task_id)

    async def report_incorrect_recaptcha(self, task_id: int | str) -> dict[str, str]:
        """Report a rejected token via ``/reportIncorrectRecaptcha``."""
        return await self._report("/reportIncorrectRecaptcha", task_id)

    async def report_incorrect_image(self, task_id: int | str) -> dict[str, str]:
        """Alias of :meth:`report_incorrect_image_captcha`."""
        return await self.report_incorrect_image_captcha(task_id)

    async def report_incorrect_token(self, task_id: int | str) -> dict[str, str]:
        """Alias of :meth:`report_incorrect_token_captcha`."""
        return await self.report_incorrect_token_captcha(task_id)

    async def _report(self, path: str, task_id: int | str) -> dict[str, str]:
        normalized = require_task_id(task_id)
        data = await self._post(path, {"clientKey": self._client_key, "taskId": normalized})
        return report_from(data)

    async def _poll(
        self,
        task_id: int | str,
        *,
        timeout: float = 120.0,
        interval: float = 3.0,
        initial_delay: float = 0.0,
        max_attempts: int | None = None,
        on_poll: Callable[[dict[str, Any]], None] | None = None,
        cancel: Callable[[], bool] | None = None,
    ) -> dict[str, Any]:
        normalized = require_task_id(task_id)
        if initial_delay > 0:
            await self._sleep(initial_delay, cancel)
        start = time.monotonic()
        attempt = 0
        while True:
            self._raise_if_cancelled(cancel)
            attempt += 1
            result = await self.get_task_result(normalized)
            update = {**result, "attempt": attempt, "taskId": normalized}
            if on_poll is not None:
                on_poll(update)
            if solution_is_ready(result):
                return {"solution": as_solution(result["solution"]), "taskId": normalized}
            if max_attempts is not None and attempt >= max_attempts:
                raise timeout_error()
            if time.monotonic() - start >= timeout:
                raise timeout_error()
            await self._sleep(interval, cancel)

    async def _sleep(self, seconds: float, cancel: Callable[[], bool] | None) -> None:
        if seconds <= 0:
            self._raise_if_cancelled(cancel)
            return
        end = time.monotonic() + seconds
        while True:
            self._raise_if_cancelled(cancel)
            remaining = end - time.monotonic()
            if remaining <= 0:
                return
            await asyncio.sleep(min(0.05, remaining))

    def _raise_if_cancelled(self, cancel: Callable[[], bool] | None) -> None:
        if cancel is not None and cancel():
            raise aborted_error("wait_for_result aborted")

    async def _call(self, action: Callable[[], Any]) -> Any:
        attempts = max(0, self._retries) + 1
        last_error: BaseException | None = None
        for attempt in range(1, attempts + 1):
            try:
                return await action()
            except CapMonsterError as err:
                last_error = err
                if attempt >= attempts or not is_retryable(err):
                    raise
                await self._sleep(self._retry_delay * attempt, None)
        assert last_error is not None  # pragma: no cover
        raise last_error  # pragma: no cover

    async def _post(self, path: str, json_data: Any) -> dict[str, Any]:
        async def send() -> dict[str, Any]:
            try:
                res = await self._http.post(path, json=json_data)
            except httpx.HTTPError as err:
                raise create_error(str(err), 0) from err
            return interpret_response(res)

        return await self._call(send)
