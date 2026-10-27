"""Client for the CapMonster Cloud recognition API."""

from __future__ import annotations

import time
from collections.abc import Mapping
from typing import Any

import httpx

from .errors import CapMonsterError, describe_error

_DEFAULT_BASE_URL = "https://api.capmonster.cloud"
_DEFAULT_TIMEOUT = 30.0

# Developer software id sent as `softId` on createTask.
#
# TODO: CapMonster Cloud's developer program is pending approval, so no
# softId has been issued yet. Leave this empty. When a numeric id is
# assigned, set it here. Requests omit `softId` until this constant or the
# client `soft_id` argument is a non-empty value.
#
# The createTask field name is `softId` (same name as the official client).
# https://docs.capmonster.cloud/docs/api/methods/create-task/
DEFAULT_SOFT_ID = ""


class CapMonster:
    """Client for the CapMonster Cloud recognition API.

    Args:
        client_key: CapMonster Cloud client key.
        base_url: Custom API base URL (defaults to `https://api.capmonster.cloud`).
        timeout: Request timeout in seconds (defaults to 30.0).
        soft_id: Developer software id. Empty until the developer program assigns one.

    Examples:
        >>> from capmonster import CapMonster
        >>> with CapMonster("your_client_key") as client:
        ...     balance = client.get_balance()
    """

    def __init__(
        self,
        client_key: str,
        *,
        base_url: str = _DEFAULT_BASE_URL,
        timeout: float = _DEFAULT_TIMEOUT,
        soft_id: str | int | None = None,
    ) -> None:
        if not client_key or not client_key.strip():
            raise CapMonsterError("Client key is required", 1, "MISSING_CLIENT_KEY")

        self._client_key = client_key.strip()
        self._soft_id: str | int = DEFAULT_SOFT_ID if soft_id is None else soft_id
        self._http = httpx.Client(
            base_url=base_url.rstrip("/"),
            timeout=timeout,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )

    def close(self) -> None:
        """Close the underlying HTTP client."""
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
        return {"balance": float(response.get("balance", 0.0))}

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

        Examples:
            >>> with CapMonster("your_key") as client:
            ...     task_id = client.create_task({
            ...         "type": "TurnstileTask",
            ...         "websiteURL": "https://example.com",
            ...         "websiteKey": "0x4AAAAAAA...",
            ...     })
        """
        payload: dict[str, Any] = {
            "clientKey": self._client_key,
            "task": dict(task),
        }
        chosen = self._soft_id if soft_id is None else soft_id
        if has_soft_id(chosen):
            payload["softId"] = format_soft_id(chosen)
        if callback_url:
            payload["callbackUrl"] = callback_url

        response = self._post("/createTask", payload)
        task_id = normalize_task_id(response.get("taskId"))
        if task_id is None:
            raise CapMonsterError(
                "Response missing taskId",
                response.get("errorId", 0),
                response.get("errorCode"),
                200,
                response,
            )
        return task_id

    def get_task_result(self, task_id: int | str) -> dict[str, Any]:
        """Query the status and solution of a submitted task.

        ``CAPTCHA_NOT_READY`` is returned as ``{"status": "processing"}``.

        Args:
            task_id: Task identifier returned by ``create_task``.

        Returns:
            Dictionary containing ``status`` and optional ``solution``.
        """
        normalized = normalize_task_id(task_id)
        if normalized is None:
            raise CapMonsterError(f"Invalid taskId: {task_id}", 1, "WRONG_CAPTCHA_ID")

        try:
            response = self._post(
                "/getTaskResult",
                {"clientKey": self._client_key, "taskId": normalized},
            )
        except CapMonsterError as err:
            if err.error_code == "CAPTCHA_NOT_READY":
                return {"status": "processing", "solution": {}}
            raise

        return {
            "status": response.get("status", "processing"),
            "solution": response.get("solution", {}),
        }

    def wait_for_result(
        self,
        task_id: int | str,
        *,
        timeout: float = 120.0,
        interval: float = 3.0,
    ) -> dict[str, Any]:
        """Poll ``get_task_result`` until the solution is ready.

        Args:
            task_id: Task identifier.
            timeout: Maximum wait time in seconds (defaults to 120.0).
            interval: Delay between poll attempts in seconds (defaults to 3.0).

        Returns:
            The solution dictionary.

        Raises:
            CapMonsterError: If polling times out or the task fails.
        """
        start_time = time.monotonic()

        while True:
            res = self.get_task_result(task_id)
            if res.get("status") == "ready" and res.get("solution"):
                solution = res["solution"]
                if isinstance(solution, dict):
                    return solution
                return {"value": solution}

            if time.monotonic() - start_time >= timeout:
                raise CapMonsterError(
                    "Timed out waiting for captcha solution",
                    0,
                    "TIMEOUT",
                )

            time.sleep(interval)

    def solve(
        self,
        task: Mapping[str, Any],
        *,
        timeout: float = 120.0,
        interval: float = 3.0,
        soft_id: str | int | None = None,
        callback_url: str | None = None,
    ) -> dict[str, Any]:
        """Submit a task and wait for its solution.

        Args:
            task: Task dictionary.
            timeout: Maximum wait time in seconds.
            interval: Delay between poll attempts in seconds.
            soft_id: Override the client software id for this call.
            callback_url: Optional result callback URL.

        Returns:
            The solution dictionary.
        """
        task_id = self.create_task(task, soft_id=soft_id, callback_url=callback_url)
        return self.wait_for_result(task_id, timeout=timeout, interval=interval)

    def _post(self, path: str, json_data: Any) -> dict[str, Any]:
        try:
            res = self._http.post(path, json=json_data)
        except httpx.HTTPError as err:
            raise CapMonsterError(str(err), 0) from err

        try:
            data = res.json()
        except ValueError:
            data = None

        if res.is_error:
            error_id = data.get("errorId", 0) if isinstance(data, dict) else 0
            error_code = data.get("errorCode") if isinstance(data, dict) else None
            error_description = data.get("errorDescription") if isinstance(data, dict) else None
            if isinstance(data, dict) and (error_description or error_code or error_id):
                error_msg = describe_error(error_code, error_description, error_id)
            else:
                error_msg = res.text or f"HTTP {res.status_code}"
            raise CapMonsterError(error_msg, error_id, error_code, res.status_code, data)

        if not isinstance(data, dict):
            raise CapMonsterError(
                "Unexpected non-JSON response from CapMonster Cloud API",
                0,
                None,
                res.status_code,
                res.text,
            )

        if data.get("errorId", 0) != 0:
            error_id = int(data.get("errorId", 0))
            error_code = data.get("errorCode")
            msg = describe_error(error_code, data.get("errorDescription"), error_id)
            raise CapMonsterError(msg, error_id, error_code, res.status_code, data)

        return data


def has_soft_id(value: str | int | None) -> bool:
    """True when a softId should be sent. Empty string and 0 are treated as unset."""
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip() != ""
    return value != 0


def format_soft_id(value: str | int) -> str | int:
    """CapMonster expects a numeric softId. Numeric strings are sent as integers."""
    if isinstance(value, int):
        return value
    trimmed = value.strip()
    if trimmed.isdigit():
        return int(trimmed)
    return trimmed


def normalize_task_id(task_id: Any) -> int | None:
    """Return a positive integer task id, or None when the value cannot be used."""
    if task_id is None or task_id == "":
        return None
    try:
        value = int(task_id)
    except (TypeError, ValueError):
        return None
    if value <= 0:
        return None
    return value
