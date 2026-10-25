"""Client for the YesCaptcha recognition API."""

from __future__ import annotations

import time
from collections.abc import Mapping
from typing import Any

import httpx

from .errors import YesCaptchaError
from .types import TaskResult, YesCaptchaBalance

_DEFAULT_BASE_URL = "https://api.yescaptcha.com"
_DEFAULT_TIMEOUT = 30.0

SOFT_ID = 144987


class YesCaptcha:
    """Client for the YesCaptcha recognition API.

    Args:
        client_key: YesCaptcha client key.
        base_url: Custom API base URL (defaults to `https://api.yescaptcha.com`).
        timeout: Request timeout in seconds (defaults to 30.0).

    Examples:
        >>> from yescaptcha import YesCaptcha
        >>> with YesCaptcha("your_client_key") as client:
        ...     balance = client.get_balance()
    """

    def __init__(
        self,
        client_key: str,
        *,
        base_url: str = _DEFAULT_BASE_URL,
        timeout: float = _DEFAULT_TIMEOUT,
    ) -> None:
        if not client_key or not client_key.strip():
            raise YesCaptchaError("Client key is required", 1, "MISSING_CLIENT_KEY")

        self._client_key = client_key.strip()
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

    def __enter__(self) -> YesCaptcha:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def get_balance(self) -> YesCaptchaBalance:
        """Retrieve account balance details.

        Returns:
            Dictionary with balance amounts.

        Examples:
            >>> with YesCaptcha("your_key") as client:
            ...     balance = client.get_balance()
            ...     print(balance["balance"])
        """
        response = self._post("/getBalance", {"clientKey": self._client_key})
        return {
            "balance": response.get("balance", 0.0),
            "softBalance": response.get("softBalance", 0.0),
            "inviteBalance": response.get("inviteBalance", 0.0),
            "inviteBy": response.get("inviteBy", 0),
        }

    def create_task(self, task: Mapping[str, Any]) -> str:
        """Submit a new captcha recognition task.

        Automatically attaches the application software identifier (``softID``).

        Args:
            task: Task dictionary (must include ``type``, e.g. ``NoCaptchaTaskProxyless``).

        Returns:
            The submitted task ID.

        Examples:
            >>> with YesCaptcha("your_key") as client:
            ...     task_id = client.create_task({
            ...         "type": "TurnstileTaskProxyless",
            ...         "websiteURL": "https://example.com",
            ...         "websiteKey": "0x4AAAAAAA...",
            ...     })
        """
        payload = {
            "clientKey": self._client_key,
            "softID": SOFT_ID,
            "task": dict(task),
        }

        response = self._post("/createTask", payload)

        task_id = response.get("taskId")
        if not task_id:
            raise YesCaptchaError(
                "Response missing taskId",
                response.get("errorId", 0),
                response.get("errorCode"),
                200,
                response,
            )

        return str(task_id)

    def get_task_result(self, task_id: str) -> TaskResult:
        """Query the status and solution of a submitted task.

        Args:
            task_id: Task identifier returned by ``create_task``.

        Returns:
            Dictionary containing ``status`` and optional ``solution``.

        Examples:
            >>> with YesCaptcha("your_key") as client:
            ...     res = client.get_task_result(task_id)
            ...     if res["status"] == "ready":
            ...         print(res["solution"])
        """
        response = self._post(
            "/getTaskResult",
            {"clientKey": self._client_key, "taskId": task_id},
        )

        return {
            "status": response.get("status", "processing"),
            "solution": response.get("solution", {}),
        }

    def wait_for_result(
        self,
        task_id: str,
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
            YesCaptchaError: If polling times out or task fails.
        """
        start_time = time.monotonic()

        while True:
            res = self.get_task_result(task_id)
            if res.get("status") == "ready" and res.get("solution"):
                return res["solution"]

            if time.monotonic() - start_time >= timeout:
                raise YesCaptchaError(
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
    ) -> dict[str, Any]:
        """Submit a task and wait for its solution.

        Args:
            task: Task dictionary.
            timeout: Maximum wait time in seconds.
            interval: Delay between poll attempts in seconds.

        Returns:
            The solution dictionary.

        Examples:
            >>> with YesCaptcha("your_key") as client:
            ...     solution = client.solve({
            ...         "type": "TurnstileTaskProxyless",
            ...         "websiteURL": "https://example.com",
            ...         "websiteKey": "0x4AAAAAAA...",
            ...     })
            ...     print(solution["token"])
        """
        task_id = self.create_task(task)
        return self.wait_for_result(task_id, timeout=timeout, interval=interval)

    def _post(self, path: str, json_data: Any) -> dict[str, Any]:
        try:
            res = self._http.post(path, json=json_data)
        except httpx.HTTPError as err:
            raise YesCaptchaError(str(err), 0) from err

        try:
            data = res.json()
        except ValueError:
            data = None

        if res.is_error:
            error_msg = (
                data.get("errorDescription") or data.get("errorCode")
                if isinstance(data, dict)
                else res.text or f"HTTP {res.status_code}"
            )
            error_id = data.get("errorId", 0) if isinstance(data, dict) else 0
            error_code = data.get("errorCode") if isinstance(data, dict) else None
            raise YesCaptchaError(error_msg, error_id, error_code, res.status_code, data)

        if not isinstance(data, dict):
            raise YesCaptchaError(
                "Unexpected non-JSON response from YesCaptcha API",
                0,
                None,
                res.status_code,
                res.text,
            )

        if data.get("errorId", 0) != 0:
            msg = (
                data.get("errorDescription")
                or data.get("errorCode")
                or f"API error #{data.get('errorId')}"
            )
            raise YesCaptchaError(
                msg,
                data.get("errorId", 0),
                data.get("errorCode"),
                res.status_code,
                data,
            )

        return data
