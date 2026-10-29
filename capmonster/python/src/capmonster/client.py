"""Synchronous client for the CapMonster Cloud recognition API."""

from __future__ import annotations

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
    format_soft_id,
    has_soft_id,
    interpret_response,
    normalize_task_id,
    report_from,
    require_task_id,
    result_from,
    solution_is_ready,
    task_id_from,
    timeout_error,
    user_agent_from,
)
from .errors import CapMonsterError, create_error, is_retryable

__all__ = [
    "DEFAULT_SOFT_ID",
    "CapMonster",
    "effective_client_key",
    "format_soft_id",
    "has_soft_id",
    "normalize_task_id",
]


class CapMonster:
    """Client for the CapMonster Cloud recognition API.

    Args:
        client_key: CapMonster Cloud client key.
        base_url: Custom API base URL (defaults to `https://api.capmonster.cloud`).
        timeout: Request timeout in seconds (defaults to 30.0).
        soft_id: Developer software id. Empty until the developer program assigns one.
        retries: Extra attempts for transient network and API errors. Defaults to 0.
        retry_delay: Base delay in seconds before a retry, multiplied by the attempt.
        user_agent_url: Absolute URL of the current User-Agent endpoint.
        nocache: Append ``__nocache`` to the client key.
        recognizing_threshold: Append ``__recognizingthreshold_{n}`` to the client key.
        module_name: Append ``__module`` to the client key.
        http_client: Optional HTTPX client. Closed only when this class created it.

    Examples:
        >>> from capmonster import CapMonster
        >>> with CapMonster("your_client_key") as client:
        ...     balance = client.get_balance()
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
        http_client: httpx.Client | None = None,
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
        self._http = http_client or httpx.Client(
            base_url=base_url.rstrip("/"),
            timeout=timeout,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )

    def close(self) -> None:
        """Close the underlying HTTP client when this instance created it."""
        if self._owns_client:
            self._http.close()

    def __enter__(self) -> CapMonster:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def get_balance(self) -> dict[str, float]:
        """Retrieve the available account balance.

        Returns:
            Dictionary with a ``balance`` amount.

        Examples:
            >>> with CapMonster("your_key") as client:
            ...     balance = client.get_balance()
            ...     print(balance["balance"])
        """
        response = self._post("/getBalance", {"clientKey": self._client_key})
        return balance_from(response)

    def get_user_agent(self) -> str:
        """Return the current Windows User-Agent supported by CapMonster Cloud.

        See https://docs.capmonster.cloud/docs/api/methods/get-user-agent/.
        """
        def send() -> str:
            try:
                res = self._http.get(self._user_agent_url)
            except httpx.HTTPError as err:
                raise create_error(str(err), 0) from err
            if res.is_error:
                interpret_response(res)
            return user_agent_from(res.text, res.status_code)

        return self._call(send)

    def create_task(
        self,
        task: Mapping[str, Any],
        *,
        soft_id: str | int | None = None,
        callback_url: str | None = None,
    ) -> int:
        """Submit a new captcha recognition task.

        ``softId`` is included only when ``DEFAULT_SOFT_ID`` or ``soft_id`` is set.

        Args:
            task: Task dictionary (must include ``type``).
            soft_id: Override the client software id for this call.
            callback_url: Optional URL that receives the getTaskResult payload.

        Returns:
            The submitted numeric task ID.
        """
        chosen = self._soft_id if soft_id is None else soft_id
        payload = build_create_payload(
            self._client_key,
            dict(task),
            soft_id=chosen,
            callback_url=callback_url,
        )
        return task_id_from(self._post("/createTask", payload))

    def get_task_result(self, task_id: int | str) -> dict[str, Any]:
        """Query the status and solution of a submitted task.

        ``CAPTCHA_NOT_READY`` is returned as ``{"status": "processing"}``.

        Args:
            task_id: Task identifier returned by ``create_task``.

        Returns:
            Dictionary containing ``status`` and optional ``solution``.
        """
        normalized = require_task_id(task_id)
        try:
            response = self._post(
                "/getTaskResult",
                {"clientKey": self._client_key, "taskId": normalized},
            )
        except CapMonsterError as err:
            if err.error_code == "CAPTCHA_NOT_READY":
                return {"status": "processing", "solution": {}}
            raise

        return result_from(response)

    def wait_for_result(
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
        """Poll ``get_task_result`` until the solution is ready.

        Args:
            task_id: Task identifier.
            timeout: Maximum wait time in seconds (defaults to 120.0).
            interval: Delay between poll attempts in seconds (defaults to 3.0).
            initial_delay: Delay before the first poll. Defaults to 0.
            max_attempts: Stop after this many result requests.
            on_poll: Called with each result dictionary plus ``attempt`` and ``taskId``.
            cancel: Return True to abort polling.

        Returns:
            The solution dictionary.
        """
        return self._poll(
            task_id,
            timeout=timeout,
            interval=interval,
            initial_delay=initial_delay,
            max_attempts=max_attempts,
            on_poll=on_poll,
            cancel=cancel,
        )["solution"]

    def join_task_result(
        self,
        task_id: int | str,
        *,
        timeout: float = 120.0,
        interval: float = 3.0,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Alias of :meth:`wait_for_result`."""
        return self.wait_for_result(task_id, timeout=timeout, interval=interval, **kwargs)

    def solve(
        self,
        task: Mapping[str, Any],
        *,
        timeout: float = 120.0,
        interval: float = 3.0,
        soft_id: str | int | None = None,
        callback_url: str | None = None,
        initial_delay: float = 0.0,
        max_attempts: int | None = None,
        on_poll: Callable[[dict[str, Any]], None] | None = None,
        cancel: Callable[[], bool] | None = None,
    ) -> dict[str, Any]:
        """Submit a task and wait for its solution."""
        solved = self.solve_detailed(
            task,
            timeout=timeout,
            interval=interval,
            soft_id=soft_id,
            callback_url=callback_url,
            initial_delay=initial_delay,
            max_attempts=max_attempts,
            on_poll=on_poll,
            cancel=cancel,
        )
        return solved["solution"]

    def solve_detailed(
        self,
        task: Mapping[str, Any],
        *,
        timeout: float = 120.0,
        interval: float = 3.0,
        soft_id: str | int | None = None,
        callback_url: str | None = None,
        initial_delay: float = 0.0,
        max_attempts: int | None = None,
        on_poll: Callable[[dict[str, Any]], None] | None = None,
        cancel: Callable[[], bool] | None = None,
    ) -> dict[str, Any]:
        """Submit a task and return ``{"taskId", "solution"}``."""
        task_id = self.create_task(task, soft_id=soft_id, callback_url=callback_url)
        solution = self._poll(
            task_id,
            timeout=timeout,
            interval=interval,
            initial_delay=initial_delay,
            max_attempts=max_attempts,
            on_poll=on_poll,
            cancel=cancel,
        )
        return {"taskId": task_id, "solution": solution["solution"]}

    def report_incorrect_image_captcha(self, task_id: int | str) -> dict[str, str]:
        """Report a wrong image-captcha answer."""
        return self._report("/reportIncorrectImageCaptcha", task_id)

    def report_incorrect_token_captcha(self, task_id: int | str) -> dict[str, str]:
        """Report a token the target site rejected (reCAPTCHA, GeeTest, Turnstile, ...)."""
        return self._report("/reportIncorrectTokenCaptcha", task_id)

    def report_incorrect_recaptcha(self, task_id: int | str) -> dict[str, str]:
        """Report a rejected token via ``/reportIncorrectRecaptcha``."""
        return self._report("/reportIncorrectRecaptcha", task_id)

    def report_incorrect_image(self, task_id: int | str) -> dict[str, str]:
        """Alias of :meth:`report_incorrect_image_captcha`."""
        return self.report_incorrect_image_captcha(task_id)

    def report_incorrect_token(self, task_id: int | str) -> dict[str, str]:
        """Alias of :meth:`report_incorrect_token_captcha`."""
        return self.report_incorrect_token_captcha(task_id)

    def _report(self, path: str, task_id: int | str) -> dict[str, str]:
        normalized = require_task_id(task_id)
        data = self._post(path, {"clientKey": self._client_key, "taskId": normalized})
        return report_from(data)

    def _poll(
        self,
        task_id: int | str,
        *,
        timeout: float,
        interval: float,
        initial_delay: float,
        max_attempts: int | None,
        on_poll: Callable[[dict[str, Any]], None] | None,
        cancel: Callable[[], bool] | None,
    ) -> dict[str, Any]:
        normalized = require_task_id(task_id)
        if initial_delay > 0:
            self._sleep(initial_delay, cancel)
        start = time.monotonic()
        attempt = 0
        while True:
            self._raise_if_cancelled(cancel)
            attempt += 1
            result = self.get_task_result(normalized)
            update = {**result, "attempt": attempt, "taskId": normalized}
            if on_poll is not None:
                on_poll(update)
            if solution_is_ready(result):
                return {"solution": as_solution(result["solution"]), "taskId": normalized}
            if max_attempts is not None and attempt >= max_attempts:
                raise timeout_error()
            if time.monotonic() - start >= timeout:
                raise timeout_error()
            self._sleep(interval, cancel)

    def _sleep(self, seconds: float, cancel: Callable[[], bool] | None) -> None:
        if seconds <= 0:
            self._raise_if_cancelled(cancel)
            return
        end = time.monotonic() + seconds
        while True:
            self._raise_if_cancelled(cancel)
            remaining = end - time.monotonic()
            if remaining <= 0:
                return
            time.sleep(min(0.05, remaining))

    def _raise_if_cancelled(self, cancel: Callable[[], bool] | None) -> None:
        if cancel is not None and cancel():
            raise aborted_error("wait_for_result aborted")

    def _call(self, action: Callable[[], Any]) -> Any:
        attempts = max(0, self._retries) + 1
        last_error: BaseException | None = None
        for attempt in range(1, attempts + 1):
            try:
                return action()
            except CapMonsterError as err:
                last_error = err
                if attempt >= attempts or not is_retryable(err):
                    raise
                self._sleep(self._retry_delay * attempt, None)
        assert last_error is not None  # pragma: no cover
        raise last_error  # pragma: no cover

    def _post(self, path: str, json_data: Any) -> dict[str, Any]:
        def send() -> dict[str, Any]:
            try:
                res = self._http.post(path, json=json_data)
            except httpx.HTTPError as err:
                raise create_error(str(err), 0) from err
            return interpret_response(res)

        return self._call(send)
